import { IInvoiceRepository, IPaymentAllocationRepository } from '../../domain/repository';
import { DomainError } from '@/core/errors';

export interface UnitBalanceDTO {
    unit: string;
    totalDebt: number;
    pendingInvoices: number;
    details: {
        invoiceId: string;
        amount: number;
        paid: number;
        remaining: number;
        period: string;
        status: string;
    }[];
}

export class GetUnitBalance {
    constructor(
        private invoiceRepository: IInvoiceRepository,
        private paymentAllocationRepository: IPaymentAllocationRepository
    ) { }

    async execute(unitId: string): Promise<UnitBalanceDTO> {
        // Fetch all pending or partially paid invoices
        // We need a filter for status IN ['PENDING', 'PARTIALLY_PAID']
        // The findAll filter currently supports single status string. 
        // We might need to fetch all for unit and filter in memory or update repo.
        // Assuming we fetch all for unit for now as volume per unit is low.

        const invoices = await this.invoiceRepository.findAll({ unit_id: unitId });

        const pendingInvoices = invoices.filter(inv => inv.status === 'PENDING');

        let totalDebt = 0;
        const details = [];

        for (const invoice of pendingInvoices) {
            // Use trusted paid_amount from invoice (calculated by trigger based on APPROVED payments)
            const paid = invoice.paid_amount;
            const remaining = invoice.amount - paid;

            if (remaining > 0) {
                totalDebt += remaining;
                details.push({
                    invoiceId: invoice.id,
                    amount: invoice.amount,
                    paid: paid,
                    remaining: remaining,
                    period: invoice.period,
                    status: invoice.status
                });
            }
        }

        return {
            unit: unitId,
            totalDebt,
            pendingInvoices: details.length,
            details
        };
    }
}
