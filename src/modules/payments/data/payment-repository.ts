import type { IPaymentRepository } from '../domain/repository';
import type { Payment, CreatePaymentProps } from '../domain/entities';
import { supabase, supabaseAdmin } from '@/infrastructure/supabase';
import { DomainError } from '@/core/errors';

export class PaymentRepository implements IPaymentRepository {
    async create(props: CreatePaymentProps): Promise<Payment> {
        // Use supabaseAdmin to bypass RLS for insertion
        const { data, error } = await supabaseAdmin
            .from('payments')
            .insert({
                user_id: props.user_id,
                amount: props.amount,
                payment_date: props.payment_date,
                method: props.method,
                reference: props.reference,
                bank: props.bank,
                proof_url: props.proof_url,
                period: props.period,
                status: 'PENDING',
                updated_at: new Date()
            })
            .select()
            .single();

        if (error) {
            throw new DomainError('Error creating payment: ' + error.message, 'DB_ERROR', 500);
        }

        return {
            ...data,
            payment_date: new Date(data.payment_date),
            created_at: data.created_at ? new Date(data.created_at) : undefined,
            updated_at: data.updated_at ? new Date(data.updated_at) : undefined
        } as Payment;
    }

    async findById(id: string): Promise<Payment | null> {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new DomainError('Error fetching payment', 'DB_ERROR', 500);
        }

        return {
            ...data,
            payment_date: new Date(data.payment_date),
            created_at: data.created_at ? new Date(data.created_at) : undefined,
            updated_at: data.updated_at ? new Date(data.updated_at) : undefined
        } as Payment;
    }

    async findByUserId(userId: string, year?: number): Promise<Payment[]> {
        let query = supabase
            .from('payments')
            .select('*')
            .eq('user_id', userId)
            .order('payment_date', { ascending: false });

        if (year) {
            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;
            query = query.gte('payment_date', startDate).lte('payment_date', endDate);
        }

        const { data, error } = await query;

        if (error) {
            throw new DomainError('Error fetching payments', 'DB_ERROR', 500);
        }

        return data.map((p: any) => ({
            ...p,
            payment_date: new Date(p.payment_date),
            created_at: p.created_at ? new Date(p.created_at) : undefined,
            updated_at: p.updated_at ? new Date(p.updated_at) : undefined
        })) as Payment[];
    }

    async findAll(): Promise<Payment[]> {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .order('payment_date', { ascending: false });

        if (error) {
            throw new DomainError('Error fetching payments', 'DB_ERROR', 500);
        }

        return data as Payment[];
    }
}
