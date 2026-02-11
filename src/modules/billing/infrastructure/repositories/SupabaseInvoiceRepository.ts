import { IInvoiceRepository, FindAllInvoicesFilters, AdminInvoiceResult } from '../../domain/repository';
import { Invoice, InvoiceProps, InvoiceStatus, InvoiceType } from '../../domain/entities/Invoice';
import { supabaseAdmin as supabase } from '@/infrastructure/supabase';
import { DomainError } from '@/core/errors';

export class SupabaseInvoiceRepository implements IInvoiceRepository {
    private toDomain(data: Record<string, unknown>): Invoice {
        return new Invoice({
            id: data.id as string,
            unit_id: data.unit_id as string,
            amount: data.amount as number,
            period: data.period as string,
            issue_date: new Date(data.issue_date as string),
            due_date: data.due_date ? new Date(data.due_date as string) : undefined,
            status: data.status as InvoiceStatus,
            type: data.type as InvoiceType,
            description: data.description as string | undefined,
            receipt_number: data.receipt_number as string | undefined,
            paid_amount: parseFloat(data.paid_amount as string || '0'),
            created_at: data.created_at ? new Date(data.created_at as string) : undefined,
            updated_at: data.updated_at ? new Date(data.updated_at as string) : undefined
        });
    }

    private toPersistence(invoice: Invoice): Record<string, unknown> {
        return {
            id: invoice.id,
            unit_id: invoice.unit_id,
            amount: invoice.amount,
            period: invoice.period,
            issue_date: invoice.issue_date,
            due_date: invoice.due_date,
            status: invoice.status,
            type: invoice.type,
            description: invoice.description,
            receipt_number: invoice.receipt_number,
            updated_at: invoice.updated_at
        };
    }

    async create(invoice: Invoice): Promise<Invoice> {
        const { data, error } = await supabase
            .from('invoices')
            .insert({
                ...this.toPersistence(invoice),
                created_at: invoice.created_at
            })
            .select()
            .single();

        if (error) {
            throw new DomainError('Error creating invoice: ' + error.message, 'DB_ERROR', 500);
        }

        return this.toDomain(data);
    }

    async findById(id: string): Promise<Invoice | null> {
        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new DomainError('Error fetching invoice', 'DB_ERROR', 500);
        }

        return this.toDomain(data);
    }

    async findAll(filters?: FindAllInvoicesFilters): Promise<Invoice[]> {
        // Need to join profile_units -> profiles to get user? 
        // Or invoices -> profile_units -> units.
        // The Invoice entity only has `unit_id`.
        // To get Unit Name and User Name as requested, we need joins.
        // But our Repository returns Domain Entities which don't have "unit_name" or "user_name" properties.
        // The Use Case or Route should ideally handle the enrichment, OR we extend the Entity/DTO.
        // For now, let's keep returning Invoice Entities and let the Controller fetch/map extra data?
        // OR we can fetch it here and maybe return an enriched DTO - but that violates Repo pattern (should return Entities).
        // Best approach: Return Invoice[] and have a "GetInvoicesDetails" UseCase that enriches them.

        // HOWEVER, to FILTER by building_id, we DO need a join here if invoices table doesn't have building_id directly?
        // Wait, Invoices have `unit_id`. `units` table has `building_id`.
        // Re-checking DB schema... invoices table only has unit_id.

        let query = supabase.from('invoices').select('*, units!inner(building_id)').order('created_at', { ascending: false });

        if (filters?.unit_id) query = query.eq('unit_id', filters.unit_id);
        if (filters?.building_id) query = query.eq('units.building_id', filters.building_id);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.period) query = query.eq('period', filters.period);
        if (filters?.type) query = query.eq('type', filters.type);

        // Date filters for Year/Month provided separately or via custom logic?
        // The user asked for `year` and `month` query params.
        // We can filter by `period` (YYYY-MM) string constructing it from year/month?
        // Or filter by `issue_date`? Usually billing is "Period" based.
        // Let's assume filtering by `period` string "YYYY-MM" is safest if adhering to strict period logic.

        const { data, error } = await query;
        if (error) throw new DomainError('Error fetching invoices: ' + error.message, 'DB_ERROR', 500);

        return data.map(d => this.toDomain(d));
    }

    async update(invoice: Invoice): Promise<Invoice> {
        const { data, error } = await supabase
            .from('invoices')
            .update(this.toPersistence(invoice))
            .eq('id', invoice.id)
            .select()
            .single();

        if (error) throw new DomainError('Error updating invoice', 'DB_ERROR', 500);
        return this.toDomain(data);
    }

    async createBatch(invoices: Invoice[]): Promise<Invoice[]> {
        const persistenceData = invoices.map(inv => ({
            ...this.toPersistence(inv),
            created_at: inv.created_at
        }));

        const { data, error } = await supabase
            .from('invoices')
            .insert(persistenceData)
            .select();

        if (error) {
            throw new DomainError('Error creating batch invoices: ' + error.message, 'DB_ERROR', 500);
        }

        return data.map(d => this.toDomain(d));
    }

    // Admin view with joins
    async findInvoicesForAdmin(filters?: FindAllInvoicesFilters): Promise<AdminInvoiceResult[]> {
        // We select invoice fields + unit details + profile details (via profile_units? No, invoices map to units. Units map to... profiles?
        // Wait, User <-> Unit is N:N via profile_units.
        // Who acts as the "User" for an invoice? The Invoice is on the Unit.
        // Usually we want to show the "Owner" or "Resident" of that unit.
        // We can join units -> profile_units -> profiles.
        // We filter profile_units where role = 'owner' specifically? Or just list all assigned.
        // User request: "user": { "id": "...", "name": "Juan Pérez" }
        // We'll pick the PRIMARY owner or the first assigned user if no primary.

        // Supabase Query:
        // invoices (*), units (id, name, building_id), profile_units (is_primary, profiles (id, name))

        let query = supabase
            .from('invoices')
            .select(`
                *,
                units!inner (
                    id,
                    name,
                    building_id,
                    profile_units (
                        is_primary,
                        profiles (id, name, email)
                    )
                )
            `)
            .order('created_at', { ascending: false });

        if (filters?.unit_id) query = query.eq('unit_id', filters.unit_id);

        // !inner join helps filtering by child properties
        if (filters?.building_id) query = query.eq('units.building_id', filters.building_id);

        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.period) query = query.eq('period', filters.period);

        if (filters?.user_id) {
            query = query.eq('units.profile_units.profiles.id', filters.user_id);
        }

        const { data, error } = await query;
        if (error) throw new DomainError('Error fetching admin invoices: ' + error.message, 'DB_ERROR', 500);

        // Map to requested structure
        return (data || []).map((inv) => {
            const unit = inv.units as unknown as {
                id: string;
                name: string;
                building_id: string;
                profile_units: {
                    is_primary: boolean;
                    profiles: {
                        id: string;
                        name: string;
                        email: string;
                    };
                }[];
            };
            const residents = unit?.profile_units?.map(pu => pu.profiles) || [];
            const primary = unit?.profile_units?.find(pu => pu.is_primary)?.profiles;
            const displayUser = primary || residents[0] || null;

            const [yearStr, monthStr] = (inv.period || '0-0').split('-');

            return {
                id: inv.id as string,
                amount: inv.amount as number,
                paid_amount: parseFloat(inv.paid_amount || 0),
                status: inv.status as string,
                period: inv.period as string,
                year: parseInt(yearStr),
                month: parseInt(monthStr),
                issue_date: inv.issue_date as string,
                receipt_number: inv.receipt_number as string | undefined,
                created_at: inv.created_at as string,
                unit: {
                    id: unit?.id as string,
                    name: unit?.name as string
                },
                user: displayUser ? {
                    id: displayUser.id as string,
                    name: displayUser.name as string
                } : null
            };
        });
    }
}
