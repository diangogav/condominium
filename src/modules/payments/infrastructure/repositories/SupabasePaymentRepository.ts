import { Payment, PaymentProps } from '../../domain/entities/Payment';
import { IPaymentRepository, FindAllPaymentsFilters } from '../../domain/repository';
import { supabaseAdmin as supabase } from '@/infrastructure/supabase';
import { DomainError } from '@/core/errors';
import { PaymentStatus, PaymentMethod } from '@/core/domain/enums';

const SELECT_QUERY = '*, user:profiles!user_id(id, name), processor:profiles!processed_by(id, name)';

export class SupabasePaymentRepository implements IPaymentRepository {
    private toDomain(data: any): Payment {
        const props: PaymentProps = {
            id: data.id,
            user_id: data.user_id,
            building_id: data.building_id,
            amount: parseFloat(data.amount),
            payment_date: new Date(data.payment_date),
            method: data.method as PaymentMethod,
            reference: data.reference,
            bank: data.bank,
            proof_url: data.proof_url,
            status: data.status as PaymentStatus,
            processed_by: data.processed_by,
            processed_at: data.processed_at ? new Date(data.processed_at) : undefined,
            unit_id: data.unit_id,
            notes: data.notes,
            created_at: new Date(data.created_at),
            updated_at: new Date(data.updated_at),
            user: data.user ? {
                id: data.user.id,
                name: data.user.name
            } : undefined,
            processor: data.processor ? {
                id: data.processor.id,
                name: data.processor.name
            } : undefined
        };
        return new Payment(props);
    }

    private toPersistence(payment: Payment): any {
        return {
            id: payment.id,
            user_id: payment.user_id,
            building_id: payment.building_id,
            amount: payment.amount,
            payment_date: payment.payment_date,
            method: payment.method,
            reference: payment.reference,
            bank: payment.bank,
            proof_url: payment.proof_url,
            status: payment.status,
            processed_by: payment.processed_by,
            processed_at: payment.processed_at,
            unit_id: payment.unit_id,
            notes: payment.notes,
            updated_at: payment.updated_at,
        };
    }

    async create(payment: Payment): Promise<Payment> {
        const persistenceData = {
            ...this.toPersistence(payment),
            created_at: payment.created_at,
        };

        const { data, error } = await supabase
            .from('payments')
            .insert(persistenceData)
            .select(SELECT_QUERY)
            .single();

        if (error) {
            throw new DomainError('Error creating payment: ' + error.message, 'DB_ERROR', 500);
        }

        return this.toDomain(data);
    }

    async findById(id: string): Promise<Payment | null> {
        const { data, error } = await supabase
            .from('payments')
            .select(SELECT_QUERY)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new DomainError('Error fetching payment', 'DB_ERROR', 500);
        }

        return this.toDomain(data);
    }

    async findByUserId(userId: string, year?: number): Promise<Payment[]> {
        let query = supabase
            .from('payments')
            .select(SELECT_QUERY)
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

        return data.map(this.toDomain);
    }

    async findByUnit(buildingId: string, unitId: string, year?: number): Promise<Payment[]> {
        let query = supabase
            .from('payments')
            .select(SELECT_QUERY)
            .eq('unit_id', unitId)
            // If building_id is null in DB but unit matches, we still want it (legacy/bug fix)
            // or we strictly enforce it. Given the bug just fixed, let's allow matching just by unit_id
            // if we are sure the unit_id is unique across buildings (which it is, uuid).
            // However, to be safe and clean, we eq('unit_id', unitId) and then filter or or.
            .order('payment_date', { ascending: false });

        // If we want to be strict but allow the recently created null building_ids:
        // query = query.or(`building_id.eq.${buildingId},building_id.is.null`);
        // But eq('unit_id', unitId) should be enough if unit_id is UUID.


        if (year) {
            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;
            query = query.gte('payment_date', startDate).lte('payment_date', endDate);
        }

        const { data, error } = await query;

        if (error) {
            throw new DomainError('Error fetching payments for unit', 'DB_ERROR', 500);
        }

        return data.map(this.toDomain);
    }

    async update(payment: Payment): Promise<Payment> {
        const persistenceData = this.toPersistence(payment);

        const { data, error } = await supabase
            .from('payments')
            .update(persistenceData)
            .eq('id', payment.id)
            .select(SELECT_QUERY)
            .single();

        if (error) {
            throw new DomainError('Error updating payment', 'DB_ERROR', 500);
        }

        return this.toDomain(data);
    }

    async findAll(filters?: FindAllPaymentsFilters): Promise<Payment[]> {
        let query = supabase
            .from('payments')
            .select(SELECT_QUERY)
            .order('created_at', { ascending: false });

        if (filters?.building_id) {
            query = query.eq('building_id', filters.building_id);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        /* Legacy period filter removed in favor of allocations */
        if (filters?.year) {
            const startDate = `${filters.year}-01-01`;
            const endDate = `${filters.year}-12-31`;
            query = query.gte('payment_date', startDate).lte('payment_date', endDate);
        }
        if (filters?.user_id) {
            query = query.eq('user_id', filters.user_id);
        }
        if (filters?.unit_id) {
            query = query.eq('unit_id', filters.unit_id);
        }

        const { data, error } = await query;

        if (error) {
            throw new DomainError('Error fetching payments', 'DB_ERROR', 500);
        }

        return data.map(this.toDomain);
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('payments')
            .delete()
            .eq('id', id);

        if (error) {
            throw new DomainError('Error deleting payment', 'DB_ERROR', 500);
        }
    }
}
