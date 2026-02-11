import { IPaymentRepository } from '../../domain/repository';
import { IUserRepository } from '@/modules/users/domain/repository';
import { IPaymentAllocationRepository } from '@/modules/billing/domain/repository';
import { IInvoiceRepository } from '@/modules/billing/domain/repository';
import { InvoiceType } from '@/modules/billing/domain/entities/Invoice';
import { IUnitRepository } from '@/modules/buildings/domain/repository';
import { PettyCashRepository } from '@/modules/petty-cash/domain/repositories/PettyCashRepository';
import { PettyCashTransaction } from '@/modules/petty-cash/domain/entities/PettyCashTransaction';
import { PettyCashTransactionType } from '@/core/domain/enums';
import { ForbiddenError, NotFoundError } from '@/core/errors';

export interface ApprovePaymentDTO {
    paymentId: string;
    approverId: string;
    notes?: string;
    periods?: string[];
}

export interface RejectPaymentDTO {
    paymentId: string;
    approverId: string;
    notes?: string;
}

export class ApprovePayment {
    constructor(
        private paymentRepo: IPaymentRepository,
        private userRepo: IUserRepository,
        private allocationRepo: IPaymentAllocationRepository,
        private invoiceRepo: IInvoiceRepository,
        private unitRepo: IUnitRepository,
        private pettyCashRepo: PettyCashRepository
    ) { }

    async approve({ paymentId, approverId, notes, periods }: ApprovePaymentDTO): Promise<void> {
        const approver = await this.userRepo.findById(approverId);
        if (!approver) {
            throw new NotFoundError('Approver not found');
        }

        if (!approver.isAdmin() && !approver.isBoardMember()) {
            throw new ForbiddenError('Only admins and board members can approve payments');
        }

        const payment = await this.paymentRepo.findById(paymentId);
        if (!payment) {
            throw new NotFoundError('Payment not found');
        }

        // Board members can only approve payments from their building
        if (approver.isBoardMember()) {
            const hasAccess = approver.units.some(u => u.building_id === payment.building_id);
            if (!hasAccess) {
                // Determine if we need to strictly fail or if checking units is enough.
                // If units array is empty on approver, they effectively "have no building".
                throw new ForbiddenError('You can only approve payments from your building');
            }
        }

        payment.approve(notes, periods);
        await this.paymentRepo.update(payment);

        // Replenish Petty Cash if any allocation is for a replenishment invoice
        const allocations = await this.allocationRepo.findByPaymentId(paymentId);
        for (const alloc of allocations) {
            const invoice = await this.invoiceRepo.findById(alloc.invoice_id);
            if (invoice?.type !== InvoiceType.PETTY_CASH_REPLENISHMENT) continue;

            const unit = await this.unitRepo.findById(invoice.unit_id);
            if (!unit) continue;

            const fund = await this.pettyCashRepo.findFundByBuildingId(unit.building_id);
            if (!fund) continue;

            fund.addIncome(alloc.amount);
            await this.pettyCashRepo.saveFund(fund);

            const transaction = new PettyCashTransaction(
                '',
                fund.id,
                PettyCashTransactionType.INCOME,
                alloc.amount,
                `Reposición por pago de factura: ${invoice.description}`,
                'Otro' as any, // Or a specific category
                approverId
            );
            await this.pettyCashRepo.saveTransaction(transaction);
        }
    }

    async reject({ paymentId, approverId, notes }: RejectPaymentDTO): Promise<void> {
        const approver = await this.userRepo.findById(approverId);
        if (!approver) {
            throw new NotFoundError('Approver not found');
        }

        if (!approver.isAdmin() && !approver.isBoardMember()) {
            throw new ForbiddenError('Only admins and board members can reject payments');
        }

        const payment = await this.paymentRepo.findById(paymentId);
        if (!payment) {
            throw new NotFoundError('Payment not found');
        }

        // Board members can only reject payments from their building
        if (approver.isBoardMember()) {
            const hasAccess = approver.units.some(u => u.building_id === payment.building_id);
            if (!hasAccess) {
                throw new ForbiddenError('You can only reject payments from your building');
            }
        }

        payment.reject(notes);
        await this.paymentRepo.update(payment);
    }
}
