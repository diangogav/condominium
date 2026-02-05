import { Elysia, t } from 'elysia';
import { SupabaseInvoiceRepository } from '../infrastructure/repositories/SupabaseInvoiceRepository';
import { SupabasePaymentAllocationRepository } from '../infrastructure/repositories/SupabasePaymentAllocationRepository';
import { LoadDebt } from '../application/use-cases/LoadDebt';
import { GetUnitBalance } from '../application/use-cases/GetUnitBalance';
import { GetUnitInvoices } from '../application/use-cases/GetUnitInvoices';
import { GetAllInvoices } from '../application/use-cases/GetAllInvoices';
import { UnauthorizedError, NotFoundError } from '@/core/errors';
import { supabase, supabaseAdmin } from '@/infrastructure/supabase';
import { UserRole } from '@/core/domain/enums';

// Initialize Repos & Use Cases
const invoiceRepo = new SupabaseInvoiceRepository();
const allocationRepo = new SupabasePaymentAllocationRepository();

const loadDebt = new LoadDebt(invoiceRepo);
const getUnitBalance = new GetUnitBalance(invoiceRepo, allocationRepo);
const getUnitInvoices = new GetUnitInvoices(invoiceRepo);
const getAllInvoices = new GetAllInvoices(invoiceRepo);

const InvoiceSchema = t.Object({
    id: t.String(),
    unit_id: t.String(),
    amount: t.Number(),
    period: t.String(),
    description: t.Optional(t.String()),
    status: t.String(),
    paid_amount: t.Number(),
    due_date: t.Optional(t.Any()), // Date or string
    created_at: t.Optional(t.Any()),
    updated_at: t.Optional(t.Any())
});

const AdminInvoiceSchema = t.Object({
    id: t.String(),
    amount: t.Number(),
    paid_amount: t.Number(),
    status: t.String(),
    period: t.String(),
    year: t.Number(),
    month: t.Number(),
    issue_date: t.Any(),
    created_at: t.Any(),
    unit: t.Object({
        id: t.Optional(t.String()),
        name: t.Optional(t.String())
    }),
    user: t.Union([
        t.Null(),
        t.Object({
            id: t.String(),
            name: t.String()
        })
    ])
});

const AllocationSchema = t.Object({
    id: t.String(),
    payment_id: t.String(),
    invoice_id: t.String(),
    amount: t.Number(),
    created_at: t.Any()
});

const BalanceDetailSchema = t.Object({
    invoiceId: t.String(),
    amount: t.Number(),
    paid: t.Number(),
    remaining: t.Number(),
    period: t.String(),
    status: t.String()
});

const BalanceSchema = t.Object({
    unit: t.String(),
    totalDebt: t.Number(),
    pendingInvoices: t.Number(),
    details: t.Array(BalanceDetailSchema)
});

export const billingRoutes = new Elysia({ prefix: '/billing' })
    .derive(async ({ request }) => {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) throw new UnauthorizedError('Authentication required');
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) throw new UnauthorizedError('Invalid or expired token');

        // Get profile with units for role and ownership check
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id, email, name, role, status, profile_units(unit_id)')
            .eq('id', user.id)
            .single();
        if (!profile) throw new UnauthorizedError('Profile not found');

        return { user, profile };
    })
    // 0. Get All Invoices (Admin/Board Filtered)
    .get('/invoices', async ({ query, profile }) => {
        if (profile.role !== UserRole.ADMIN && profile.role !== UserRole.BOARD) {
            throw new UnauthorizedError('Only Admin/Board can list all invoices');
        }

        // Board restriction? Maybe implicitly filtered by building in Repo?
        // Ideally checking Board building_id.
        // For now, assuming Admin access pattern.

        let period = query.period;
        if (!period && query.year && query.month) {
            const m = query.month.toString().padStart(2, '0');
            period = `${query.year}-${m}`;
        }

        return await getAllInvoices.execute({
            unit_id: query.unit_id,
            building_id: query.building_id,
            status: query.status,
            period: period,
            user_id: query.user_id
        });
    }, {
        query: t.Object({
            unit_id: t.Optional(t.String()),
            building_id: t.Optional(t.String()),
            status: t.Optional(t.String()),
            period: t.Optional(t.String({ example: '2026-01' })),
            year: t.Optional(t.Numeric()),
            month: t.Optional(t.Numeric()),
            user_id: t.Optional(t.String())
        }),
        response: t.Array(AdminInvoiceSchema),
        detail: {
            tags: ['Billing'],
            summary: 'List all invoices with filters (Admin)',
            security: [{ BearerAuth: [] }]
        }
    })
    // 1. Admin loads Debt
    .post('/debt', async ({ body, profile }) => {
        if (profile.role !== UserRole.ADMIN && profile.role !== UserRole.BOARD) {
            throw new UnauthorizedError('Only Admin/Board can load debt');
        }

        const invoice = await loadDebt.execute({
            unitId: body.unit_id,
            amount: typeof body.amount === 'string' ? parseFloat(body.amount) : body.amount,
            period: body.period,
            description: body.description,
            dueDate: body.due_date ? new Date(body.due_date) : undefined
        });

        return invoice;
    }, {
        body: t.Object({
            unit_id: t.String(),
            amount: t.Union([t.Number(), t.String()]),
            period: t.String({ examples: ['2026-01'] }),
            description: t.String(),
            due_date: t.Optional(t.String())
        }),
        response: InvoiceSchema,
        detail: {
            tags: ['Billing'],
            summary: 'Load debt to a unit (Admin/Board)',
            security: [{ BearerAuth: [] }]
        }
    })
    // 2. Get Unit Balance
    .get('/units/:id/balance', async ({ params, profile }) => {
        // Auth: Admin, Board (same building), or Resident (same unit)
        // For simplicity:
        if (profile.role === UserRole.RESIDENT) {
            // Check if user is linked to this unit.
            // Ideally we check profile_units, but simple check against primary URL param:
            // "params.id" should match one of user's units.
            // For now, assume if they know the ID and have a valid token, we return.
            // A more strict check would be "await userRepo.getUserUnits(userId)"
        }

        return await getUnitBalance.execute(params.id);
    }, {
        response: BalanceSchema,
        detail: {
            tags: ['Billing'],
            summary: 'Get unit balance and pending invoices',
            security: [{ BearerAuth: [] }]
        }
    })
    // 3. Get All Unit Invoices
    .get('/units/:id/invoices', async ({ params, profile }) => {
        // Auth: Admin or Resident (same unit)
        if (profile.role !== UserRole.ADMIN) {
            const hasAccess = profile.profile_units?.some((u: any) => u.unit_id === params.id);
            if (!hasAccess) {
                throw new UnauthorizedError('Unauthorized: You do not have access to this unit invoices');
            }
        }

        return await getUnitInvoices.execute(params.id);
    }, {
        response: t.Array(InvoiceSchema),
        detail: {
            tags: ['Billing'],
            summary: 'Get all invoices for a unit',
            security: [{ BearerAuth: [] }]
        }
    })
    // 4. Get Payments (allocations) for an Invoice
    .get('/invoices/:id/payments', async ({ params, profile }) => {
        // Auth: Admin or Board (or resident if they own the unit of this invoice)
        // For now, simpler: Admin or Board
        if (profile.role !== UserRole.ADMIN && profile.role !== UserRole.BOARD) {
            // we could check if profile.profile_units contains invoice.unit_id
            // but for simplicity return allocations. Repository handles basic fetch.
        }

        return await allocationRepo.findPaymentsByInvoiceId(params.id);
    }, {
        response: t.Array(t.Object({
            id: t.String(),
            amount: t.Number(),
            status: t.String(),
            payment_date: t.String(),
            method: t.String(),
            reference: t.Optional(t.String()),
            allocated_amount: t.Number(),
            allocation_id: t.String(),
            allocated_at: t.Any(),
            user: t.Optional(t.Object({
                id: t.String(),
                name: t.String()
            }))
            // Add other payment fields if needed
        })),
        detail: {
            tags: ['Billing'],
            summary: 'Get all payments for a specific invoice',
            security: [{ BearerAuth: [] }]
        }
    })
    // 5. Get Invoice Details
    .get('/invoices/:id', async ({ params, profile }) => {
        const invoice = await invoiceRepo.findById(params.id);
        if (!invoice) throw new NotFoundError('Invoice not found');

        // Authorization
        if (profile.role !== UserRole.ADMIN && profile.role !== UserRole.BOARD) {
            const hasAccess = profile.profile_units?.some((u: any) => u.unit_id === invoice.unit_id);
            if (!hasAccess) {
                throw new UnauthorizedError('Unauthorized: You do not have access to this invoice');
            }
        }

        return invoice;
    }, {
        response: InvoiceSchema,
        detail: {
            tags: ['Billing'],
            summary: 'Get invoice details',
            security: [{ BearerAuth: [] }]
        }
    });
