import { IInvoiceRepository } from '@/modules/billing/domain/repository';
import { IUnitRepository } from '@/modules/buildings/domain/repository';
import { Invoice, InvoiceStatus, InvoiceType } from '@/modules/billing/domain/entities/Invoice';
import { Unit } from '@/modules/buildings/domain/entities/Unit';

export interface ConfirmedInvoice {
    unitName: string;
    amount: number;
    period: string;
    issueDate: string; // ISO string from JSON
    receiptNumber: string;
    status: 'EXISTS' | 'TO_BE_CREATED';
}

export interface BulkLoadInvoicesRequest {
    invoices: ConfirmedInvoice[];
    buildingId: string;
}

export class BulkLoadInvoicesFromExcel {
    constructor(
        private invoiceRepository: IInvoiceRepository,
        private unitRepository: IUnitRepository
    ) { }

    async execute(request: BulkLoadInvoicesRequest): Promise<void> {
        const { invoices, buildingId } = request;

        await this.ensureUnitsExist(invoices, buildingId);

        const unitsMap = await this.getUnitsMap(buildingId);
        const existingReceipts = await this.getExistingReceipts(buildingId);

        const invoicesToCreate = this.mapToInvoices(invoices, unitsMap, existingReceipts);

        if (invoicesToCreate.length > 0) {
            await this.invoiceRepository.createBatch(invoicesToCreate);
        }
    }

    private async ensureUnitsExist(invoices: ConfirmedInvoice[], buildingId: string): Promise<void> {
        const unitsToCreateNames = Array.from(new Set(
            invoices
                .filter(inv => inv.status === 'TO_BE_CREATED')
                .map(inv => inv.unitName)
        ));

        if (unitsToCreateNames.length === 0) return;

        const unitsToCreate = unitsToCreateNames.map(name => new Unit({
            id: crypto.randomUUID(),
            building_id: buildingId,
            name
        }));

        await this.unitRepository.createBatch(unitsToCreate);
    }

    private async getUnitsMap(buildingId: string): Promise<Map<string, string>> {
        const allUnits = await this.unitRepository.findByBuildingId(buildingId);
        return new Map(allUnits.map(u => [u.name.toLowerCase(), u.id]));
    }

    private async getExistingReceipts(buildingId: string): Promise<Set<string>> {
        const existingInvoices = await this.invoiceRepository.findAll({ building_id: buildingId });
        return new Set(
            existingInvoices
                .map(inv => inv.receipt_number)
                .filter((r): r is string => !!r)
        );
    }

    private mapToInvoices(
        invoices: ConfirmedInvoice[],
        unitsMap: Map<string, string>,
        existingReceipts: Set<string>
    ): Invoice[] {
        return invoices
            .filter(item => !existingReceipts.has(item.receiptNumber))
            .map(item => {
                const unitId = unitsMap.get(item.unitName.toLowerCase());
                if (!unitId) {
                    throw new Error(`Unit ${item.unitName} not found after creation attempt`);
                }

                return new Invoice({
                    id: crypto.randomUUID(),
                    unit_id: unitId,
                    amount: item.amount,
                    period: item.period,
                    issue_date: new Date(item.issueDate),
                    status: InvoiceStatus.PENDING,
                    type: InvoiceType.DEBT,
                    receipt_number: item.receiptNumber,
                    description: `Carga inicial - Recibo ${item.receiptNumber}`
                });
            });
    }
}
