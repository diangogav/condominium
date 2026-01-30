import type { Payment } from '../domain/entities';
import { supabase } from '@/infrastructure/supabase';
import { DomainError } from '@/core/errors';

export interface PaymentFilters {
    building_id?: string;
    status?: string;
    period?: string;
    year?: string;
}

export class PaymentAdminRepository {
    async findAll(filters?: PaymentFilters): Promise<Payment[]> {
        let query = supabase
            .from('payments')
            .select(`
                *,
                user:profiles!payments_user_id_fkey (
                    id,
                    name,
                    email,
                    building_id
                )
            `)
            .order('payment_date', { ascending: false });

        if (filters?.building_id) {
            query = query.eq('user.building_id', filters.building_id);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.period) {
            query = query.eq('period', filters.period);
        }
        if (filters?.year) {
            query = query.gte('payment_date', `${filters.year}-01-01`)
                .lte('payment_date', `${filters.year}-12-31`);
        }

        const { data, error } = await query;

        if (error) {
            throw new DomainError('Error fetching payments', 'DB_ERROR', 500);
        }

        return data as Payment[];
    }

    async updateStatus(id: string, status: string, notes?: string): Promise<Payment> {
        const { data, error } = await supabase
            .from('payments')
            .update({ status, notes, updated_at: new Date() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                throw new DomainError('Payment not found', 'NOT_FOUND', 404);
            }
            throw new DomainError('Error updating payment', 'DB_ERROR', 500);
        }

        return data as Payment;
    }
}
