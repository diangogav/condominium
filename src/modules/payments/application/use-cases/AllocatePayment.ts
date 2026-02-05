import { IPaymentRepository } from '../../domain/repository';
import { PaymentAllocation } from '@/modules/billing/domain/entities/PaymentAllocation';
import { PaymentStatus } from '@/core/domain/enums';
import { DomainError } from '@/core/errors';

// Cross-module imports (Payment -> Billing)
import { IInvoiceRepository as IBillingInvoiceRepository, IPaymentAllocationRepository as IBillingAllocationRepository } from '@/modules/billing/domain/repository';
import { IPaymentRepository as ILocalPaymentRepository } from '../../domain/repository';

export interface AllocatePaymentDTO {
    paymentId: string;
    allocations: {
        invoiceId: string;
        amount: number;
    }[];
}

export class AllocatePayment {
    constructor(
        private paymentRepository: ILocalPaymentRepository,
        private invoiceRepository: IBillingInvoiceRepository,
        private paymentAllocationRepository: IBillingAllocationRepository
    ) { }

    async execute(dto: AllocatePaymentDTO): Promise<void> {
        const payment = await this.paymentRepository.findById(dto.paymentId);
        if (!payment) {
            throw new DomainError('Payment not found', 'NOT_FOUND', 404);
        }

        // Calculate total previously allocated
        const existingAllocations = await this.paymentAllocationRepository.findByPaymentId(dto.paymentId);
        const previouslyAllocated = existingAllocations.reduce((sum, a) => sum + a.amount, 0);

        // Calculate new allocations total
        let newAllocationTotal = 0;
        for (const alloc of dto.allocations) {
            if (alloc.amount <= 0) throw new DomainError('Allocation amount must be positive', 'VALIDATION_ERROR', 400);
            newAllocationTotal += alloc.amount;
        }

        // Check if total exceeds payment amount
        if (previouslyAllocated + newAllocationTotal > payment.amount) {
            throw new DomainError('Total allocations exceed payment amount', 'VALIDATION_ERROR', 400);
        }

        // Create new allocations
        for (const alloc of dto.allocations) {
            // Check Invoice exists?
            // Trust repo/DB constraints for now or fetch.
            const allocation = new PaymentAllocation({
                id: crypto.randomUUID(),
                payment_id: dto.paymentId,
                invoice_id: alloc.invoiceId,
                amount: alloc.amount
            });
            await this.paymentAllocationRepository.create(allocation);
        }

        // If fully allocated, maybe update status? 
        // Payment status usually reflects "money received", not "money used".
        // So we leave it as APPROVED/PENDING.
    }
}
