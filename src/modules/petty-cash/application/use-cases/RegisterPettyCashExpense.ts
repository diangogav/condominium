import { PettyCashRepository } from '../../domain/repositories/PettyCashRepository';
import { PettyCashTransaction } from '../../domain/entities/PettyCashTransaction';
import { IUnitRepository } from '../../../buildings/domain/repository';
import { IInvoiceRepository } from '../../../billing/domain/repository';
import { Invoice, InvoiceStatus, InvoiceType } from '../../../billing/domain/entities/Invoice';
import { PettyCashTransactionType, PettyCashCategory } from '../../../../core/domain/enums';
import { ValidationError, NotFoundError } from '../../../../core/errors';

export interface RegisterExpenseDTO {
    buildingId: string;
    amount: number;
    description: string;
    category: PettyCashCategory;
    userId: string;
    evidenceUrl?: string;
}

export class RegisterPettyCashExpense {
    constructor(
        private pettyCashRepo: PettyCashRepository,
        private unitRepo: IUnitRepository,
        private invoiceRepo: IInvoiceRepository
    ) { }

    async execute(dto: RegisterExpenseDTO) {
        const fund = await this.pettyCashRepo.findFundByBuildingId(dto.buildingId);
        if (!fund) throw new NotFoundError('Petty cash fund not found for this building');

        const totalAmount = dto.amount;
        let amountFromFund = totalAmount;
        let overage = 0;

        if (!fund.canAfford(totalAmount)) {
            amountFromFund = fund.current_balance;
            overage = totalAmount - amountFromFund;
        }

        // Deduct from fund if there's anything to deduct
        if (amountFromFund > 0) {
            fund.registerExpense(amountFromFund);
            await this.pettyCashRepo.saveFund(fund);
        }

        // Handle overage if exists
        if (overage > 0) {
            const units = await this.unitRepo.findByBuildingId(dto.buildingId);
            if (units.length === 0) {
                throw new ValidationError('No units found for this building to split the overage');
            }

            const amountPerUnit = overage / units.length;
            const period = new Date().toISOString().substring(0, 7); // YYYY-MM

            for (const unit of units) {
                const invoice = new Invoice({
                    id: (globalThis as any).crypto?.randomUUID?.() || Math.random().toString(36).substring(2),
                    unit_id: unit.id,
                    amount: amountPerUnit,
                    period: period,
                    issue_date: new Date(),
                    status: InvoiceStatus.PENDING,
                    type: InvoiceType.PETTY_CASH_REPLENISHMENT,
                    description: `Diferencia de gasto de caja chica: ${dto.description}`
                });
                await this.invoiceRepo.create(invoice);
            }
        }

        const transaction = new PettyCashTransaction(
            '',
            fund.id,
            PettyCashTransactionType.EXPENSE,
            totalAmount,
            dto.description,
            dto.category,
            dto.userId,
            dto.evidenceUrl
        );

        return await this.pettyCashRepo.saveTransaction(transaction);
    }
}
