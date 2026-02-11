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

        // 1. Identify and create missing units
        const unitsToCreateNames = Array.from(new Set(
            invoices
                .filter(inv => inv.status === 'TO_BE_CREATED')
                .map(inv => inv.unitName)
        ));

        const createdUnits: Unit[] = [];
        if (unitsToCreateNames.length > 0) {
            const unitsToCreate = unitsToCreateNames.map(name => new Unit({
                id: crypto.randomUUID(),
                building_id: buildingId,
                name
            }));
            const bulkCreated = await this.unitRepository.createBatch(unitsToCreate);
            createdUnits.push(...bulkCreated);
        }

        // 2. Fetch all current units for the building to get their IDs
        const allUnits = await this.unitRepository.findByBuildingId(buildingId);
        const unitsMap = new Map(allUnits.map(u => [u.name.toLowerCase(), u.id]));

        // 3. Fetch existing invoices to avoid duplicates (idempotency)
        const existingInvoices = await this.invoiceRepository.findAll({ building_id: buildingId });
        const existingReceipts = new Set(
            existingInvoices
                .map(inv => inv.receipt_number)
                .filter((r): r is string => !!r)
        );

        // 4. Create Invoices (filter out already existing receipts)
        const invoicesToCreate = invoices
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

        if (invoicesToCreate.length > 0) {
            await this.invoiceRepository.createBatch(invoicesToCreate);
        }
    }
}
