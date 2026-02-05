import { IPaymentRepository } from '../../domain/repository';
// Note: Payment repo is likely in modules/payments/domain/repository
import { IUserRepository } from '@/modules/users/domain/repository';
import { Payment } from '../../domain/entities/Payment';
import { PaymentAllocation } from '@/modules/billing/domain/entities/PaymentAllocation';
import { PaymentStatus, PaymentMethod } from '@/core/domain/enums';
import { DomainError } from '@/core/errors';

// We need to import IInvoiceRepository and IPaymentAllocationRepository from billing module
// but here we are in Payments module (users said module/payments).
// However, RegisterPaymentUseCase crosses domains (Payments -> Billing).
// It should probably reside in Payments module but use Billing repositories.

import { IInvoiceRepository as IBillingInvoiceRepository, IPaymentAllocationRepository as IBillingAllocationRepository } from '@/modules/billing/domain/repository';
// And PaymentRepository from local module
import { IPaymentRepository as ILocalPaymentRepository } from '../../domain/repository';

export interface RegisterPaymentDTO {
    userId: string;
    unitId: string;
    buildingId?: string;
    amount: number;
    method: PaymentMethod;
    paymentDate: Date;
    reference?: string;
    bank?: string;
    proofUrl?: string;
    notes?: string;
    periods?: string[];
    allocations?: {
        invoiceId: string;
        amount: number;
    }[];
}

export class RegisterPayment {
    constructor(
        private paymentRepository: ILocalPaymentRepository,
        private invoiceRepository: IBillingInvoiceRepository,
        private paymentAllocationRepository: IBillingAllocationRepository
    ) { }

    async execute(dto: RegisterPaymentDTO): Promise<Payment> {
        if (dto.amount <= 0) {
            throw new DomainError('Payment amount must be positive', 'VALIDATION_ERROR', 400);
        }

        // Validate allocations sum vs payment amount
        let allocatedAmount = 0;
        if (dto.allocations) {
            for (const alloc of dto.allocations) {
                if (alloc.amount <= 0) throw new DomainError('Allocation amount must be positive', 'VALIDATION_ERROR', 400);
                allocatedAmount += alloc.amount;
            }
            if (allocatedAmount > dto.amount) {
                throw new DomainError('Allocated amount cannot exceed payment amount', 'VALIDATION_ERROR', 400);
            }
        }

        const payment = new Payment({
            id: crypto.randomUUID(),
            user_id: dto.userId,
            unit_id: dto.unitId,
            building_id: dto.buildingId,
            amount: dto.amount,
            payment_date: dto.paymentDate,
            method: dto.method,
            reference: dto.reference,
            bank: dto.bank,
            proof_url: dto.proofUrl,
            status: PaymentStatus.PENDING, // Or APPROVED if auto-approve
            notes: dto.notes,
            periods: dto.periods
        });

        const createdPayment = await this.paymentRepository.create(payment);

        if (dto.allocations) {
            for (const alloc of dto.allocations) {
                // Verify invoice exists and check balance?
                // For now, trust the ID. Repository creates allocation.
                const allocation = new PaymentAllocation({
                    id: crypto.randomUUID(),
                    payment_id: createdPayment.id,
                    invoice_id: alloc.invoiceId,
                    amount: alloc.amount
                });
                await this.paymentAllocationRepository.create(allocation);
            }
        }

        return createdPayment;
    }
}
