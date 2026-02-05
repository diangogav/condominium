import { IPaymentAllocationRepository } from '../../domain/repository';
import { PaymentAllocation } from '../../domain/entities/PaymentAllocation';
import { supabaseAdmin as supabase } from '@/infrastructure/supabase';
import { DomainError } from '@/core/errors';

export class SupabasePaymentAllocationRepository implements IPaymentAllocationRepository {
    private toDomain(data: any): PaymentAllocation {
        return new PaymentAllocation({
            id: data.id,
            payment_id: data.payment_id,
            invoice_id: data.invoice_id,
            amount: data.amount,
            created_at: new Date(data.created_at)
        });
    }

    async create(allocation: PaymentAllocation): Promise<PaymentAllocation> {
        const { data, error } = await supabase
            .from('payment_allocations')
            .insert({
                id: allocation.id,
                payment_id: allocation.payment_id,
                invoice_id: allocation.invoice_id,
                amount: allocation.amount,
                created_at: allocation.created_at
            })
            .select() // This will trigger the trigger_update_invoice_status in DB
            .single();

        if (error) {
            throw new DomainError('Error creating allocation: ' + error.message, 'DB_ERROR', 500);
        }

        return this.toDomain(data);
    }

    async findByPaymentId(paymentId: string): Promise<PaymentAllocation[]> {
        const { data, error } = await supabase
            .from('payment_allocations')
            .select('*')
            .eq('payment_id', paymentId);

        if (error) throw new DomainError('Error fetching allocations', 'DB_ERROR', 500);
        return data.map(this.toDomain);
    }

    async findByInvoiceId(invoiceId: string): Promise<PaymentAllocation[]> {
        const { data, error } = await supabase
            .from('payment_allocations')
            .select('*')
            .eq('invoice_id', invoiceId);

        if (error) throw new DomainError('Error fetching allocations', 'DB_ERROR', 500);
        return data.map(this.toDomain);
    }

    async findPaymentsByInvoiceId(invoiceId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('payment_allocations')
            .select('*, payments(*)')
            .eq('invoice_id', invoiceId);

        if (error) throw new DomainError('Error fetching payments for invoice', 'DB_ERROR', 500);

        // Map to return the payment object mixed with allocation info?
        // User asked for "related payment object". 
        // We can return the Payment object enriched with "allocated_amount_explicitly_for_this_invoice"?

        return data.map((allocation: any) => {
            return {
                ...allocation.payments,
                allocated_amount: allocation.amount, // The part of this payment that went to this invoice
                allocation_id: allocation.id,
                allocated_at: allocation.created_at
            };
        });
    }
}
