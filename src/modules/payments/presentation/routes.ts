import { Elysia, t } from 'elysia';
import { SupabasePaymentRepository } from '../infrastructure/repositories/SupabasePaymentRepository';
import { SupabaseUserRepository } from '@/modules/users/infrastructure/repositories/SupabaseUserRepository';

import { ApprovePayment } from '../application/use-cases/ApprovePayment';
import { GetUnitPayments } from '../application/use-cases/GetUnitPayments';
import { GetUnitPaymentSummary } from '../application/use-cases/GetUnitPaymentSummary';
import { GetAllPayments } from '../application/use-cases/GetAllPayments';
import { GetUnitBalance } from '@/modules/billing/application/use-cases/GetUnitBalance';
import { StorageService } from '@/infrastructure/storage';
import { supabase } from '@/infrastructure/supabase';
import { UnauthorizedError, NotFoundError } from '@/core/errors';
import { PaymentMethod, UserRole } from '@/core/domain/enums';

// Initialize repositories and use cases
const paymentRepo = new SupabasePaymentRepository();
const userRepo = new SupabaseUserRepository();
const storageService = new StorageService();

// New Repo for allocations
import { SupabaseInvoiceRepository } from '@/modules/billing/infrastructure/repositories/SupabaseInvoiceRepository';
import { SupabasePaymentAllocationRepository } from '@/modules/billing/infrastructure/repositories/SupabasePaymentAllocationRepository';
const invoiceRepo = new SupabaseInvoiceRepository();
const allocationRepo = new SupabasePaymentAllocationRepository();
const getUnitBalance = new GetUnitBalance(invoiceRepo, allocationRepo);

const approvePayment = new ApprovePayment(paymentRepo, userRepo);
const getUnitPayments = new GetUnitPayments(paymentRepo, userRepo);
const getUnitPaymentSummary = new GetUnitPaymentSummary(paymentRepo, userRepo, getUnitBalance);
const getAllPayments = new GetAllPayments(paymentRepo, userRepo);

// Updated Creation Use Case
import { RegisterPayment } from '../application/use-cases/RegisterPayment';
const registerPayment = new RegisterPayment(paymentRepo, invoiceRepo, allocationRepo);

const PaymentSchema = t.Object({
    id: t.String(),
    amount: t.Number(),
    currency: t.Optional(t.String()),
    payment_date: t.Any(), // Date object or string
    status: t.String(),
    method: t.String(),
    reference: t.Optional(t.String()),
    bank: t.Optional(t.String()),
    unit_id: t.String(),
    building_id: t.Optional(t.String()),
    proof_url: t.Optional(t.String()),
    notes: t.Optional(t.String()),
    periods: t.Optional(t.Array(t.String())),
    allocations: t.Optional(t.Array(t.Any())),
    created_at: t.Optional(t.Any()),
    updated_at: t.Optional(t.Any()),
    user: t.Optional(t.Object({
        id: t.String(),
        name: t.String()
    }))
});

const PaymentTransactionSchema = t.Object({
    id: t.String(),
    amount: t.Number(),
    payment_date: t.String(),
    method: t.String(),
    status: t.String(),
    periods: t.Optional(t.Array(t.String())),
    user: t.Optional(t.Object({
        id: t.String(),
        name: t.String()
    }))
});

const PaymentSummarySchema = t.Object({
    solvency_status: t.String(),
    last_payment_date: t.Union([t.String(), t.Null()]),
    pending_periods: t.Array(t.String()),
    paid_periods: t.Array(t.String()),
    recent_transactions: t.Array(PaymentTransactionSchema)
});

const SuccessResponse = t.Object({
    success: t.Boolean()
});

export const paymentRoutes = new Elysia({ prefix: '/payments' })
    .derive(async ({ request }) => {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader) {
            throw new UnauthorizedError('Authentication required');
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            throw new UnauthorizedError('Invalid or expired token');
        }

        return { user };
    })
    // Get user's payment history
    .get('/', async ({ user, query }) => {
        const year = query.year ? parseInt(query.year) : undefined;
        const payments = await getUnitPayments.execute(user.id, year, {
            unitId: query.unit_id,
            buildingId: query.building_id
        });
        return payments.map(p => p.toJSON());
    }, {
        query: t.Object({
            year: t.Optional(t.String()),
            unit_id: t.Optional(t.String()),
            building_id: t.Optional(t.String())
        }),
        response: t.Array(PaymentSchema),
        detail: {
            tags: ['Payments'],
            summary: 'Get user payment history'
        }
    })
    // Get payment summary with solvency status (replaces /dashboard/summary)
    .get('/summary', async ({ user }) => {
        return await getUnitPaymentSummary.execute(user.id);
    }, {
        response: PaymentSummarySchema,
        detail: {
            tags: ['Payments'],
            summary: 'Get payment summary with solvency status',
            description: 'Returns payment history, solvency status, pending periods, and recent transactions'
        }
    })
    // Get payment by ID
    .get('/:id', async ({ params, user }) => {
        const payment = await paymentRepo.findById(params.id);
        if (!payment) throw new NotFoundError('Payment not found');

        // Get user profile for authorization
        const userProfile = await userRepo.findById(user.id);
        if (!userProfile) throw new UnauthorizedError('User profile not found');

        // Authorization Logic:
        // 1. Admin has full access
        if (userProfile.role === UserRole.ADMIN) return payment.toJSON();

        // 2. Board can see payments for their building
        // 2. Board can see payments for their building
        // 2. Board can see payments for their building
        if (userProfile.role === UserRole.BOARD) {
            const authorizedBuildings = userProfile.units.map(u => u.building_id);
            if (authorizedBuildings.includes(payment.building_id)) {
                return payment.toJSON();
            }
        }

        // 3. Residents can see payments for their unit (Unit-Centric)
        // Check if the payment belongs to one of the user's units
        const userUnitIds = userProfile.units.map(u => u.unit_id);
        if (userUnitIds.includes(payment.unit_id)) {
            return payment.toJSON();
        }

        throw new UnauthorizedError('Unauthorized access to payment details');
    }, {
        response: t.Union([PaymentSchema, t.Null()]),
        detail: {
            tags: ['Payments'],
            summary: 'Get payment details',
            description: 'Allows residents of the same unit, board members of the same building, and admins to view payment details.'
        }
    })
    // Report new payment
    .post('/', async ({ body, user }) => {
        const userId = user.id;

        // Get full user profile to get building_id
        const userProfile = await userRepo.findById(userId);
        if (!userProfile) {
            throw new UnauthorizedError('User profile not found');
        }

        // Upload proof if provided
        let proofUrl: string | undefined;
        if (body.proof_image) {
            proofUrl = await storageService.uploadPaymentProof(body.proof_image, userId);
        }

        const primaryUnit = userProfile.units.find(u => u.is_primary) || userProfile.units[0];
        const defaultBuildingId = primaryUnit?.building_id;
        const defaultUnitId = primaryUnit?.unit_id;

        const targetBuildingId = body.building_id || defaultBuildingId;

        // Normalize periods to array
        let periods: string[] | undefined;
        if (body.periods) {
            periods = Array.isArray(body.periods) ? body.periods : [body.periods];
        }

        const payment = await registerPayment.execute({
            userId: userId,
            unitId: body.unit_id || defaultUnitId || '', // Fallback
            buildingId: targetBuildingId, // FIXED: use targetBuildingId instead of body.building_id
            // If user has multiple units, frontend MUST send unit_id.
            // The old flow relied on inferred or single unit.
            amount: typeof body.amount === 'string' ? parseFloat(body.amount) : body.amount,
            paymentDate: new Date(body.date),
            method: body.method as PaymentMethod,
            reference: body.reference,
            bank: body.bank,
            proofUrl: proofUrl,
            notes: body.notes,
            periods: periods, // ADDED: pass periods to use case
            allocations: body.allocations?.map(a => ({
                invoiceId: a.invoice_id,
                amount: a.amount
            }))
        });

        console.log("payment.toJSON()", payment.toJSON())

        return payment.toJSON();
    }, {
        body: t.Object({
            amount: t.Union([t.Number(), t.String()], { minimum: 0, examples: [50.00, '75.50', 100] }),
            date: t.String({ examples: ['2026-01-15', '2026-01-29'] }),
            method: t.Union([
                t.Literal('PAGO_MOVIL'),
                t.Literal('TRANSFER'),
                t.Literal('CASH')
            ], { examples: ['PAGO_MOVIL'] }),
            reference: t.Optional(t.String({ examples: ['123456789', 'REF-2024-001'] })),
            bank: t.Optional(t.String({ examples: ['Banco de Venezuela', 'Banesco', 'Mercantil'] })),
            proof_image: t.Optional(t.File()),
            periods: t.Optional(t.Union([t.String(), t.Array(t.String())], { examples: ['2026-01', ['2026-01', '2026-02']] })),
            building_id: t.Optional(t.String()),
            unit_id: t.Optional(t.String()),
            notes: t.Optional(t.String()),
            // Allocation Support
            allocations: t.Optional(t.Array(t.Object({
                invoice_id: t.String(),
                amount: t.Number()
            })))
        }),
        type: 'multipart/form-data',
        response: PaymentSchema,
        detail: {
            tags: ['Payments'],
            summary: 'Report a new payment',
            description: 'Submit a payment report with optional proof image. Payment will be in PENDING status until approved.'
        }
    })
    // Admin routes
    .get('/admin/payments', async ({ user, query }) => {
        const payments = await getAllPayments.execute({
            requesterId: user.id,
            filters: {
                building_id: query.building_id,
                status: query.status,
                period: query.period,
                year: query.year,
                unit_id: query.unit_id
            }
        });

        return payments.map(p => p.toJSON());
    }, {
        query: t.Object({
            building_id: t.Optional(t.String()),
            status: t.Optional(t.String()),
            period: t.Optional(t.String()),
            year: t.Optional(t.String()),
            unit_id: t.Optional(t.String()),
        }),
        response: t.Array(PaymentSchema),
        detail: {
            tags: ['Payments'],
            summary: 'List all payments (Admin/Board)',
            description: 'Admin sees all payments, Board members see only their building payments',
            security: [{ BearerAuth: [] }]
        }
    })
    .patch('/admin/payments/:id', async ({ user, params, body }) => {
        if (body.status === 'APPROVED') {
            await approvePayment.approve({
                paymentId: params.id,
                approverId: user.id,
                notes: body.notes,
                periods: body.approved_periods
            });
        } else if (body.status === 'REJECTED') {
            await approvePayment.reject({
                paymentId: params.id,
                approverId: user.id,
                notes: body.notes
            });
        }

        return { success: true };
    }, {
        body: t.Object({
            status: t.Union([t.Literal('PENDING'), t.Literal('APPROVED'), t.Literal('REJECTED')]),
            notes: t.Optional(t.String()),
            approved_periods: t.Optional(t.Array(t.String()))
        }),
        response: SuccessResponse,
        detail: {
            tags: ['Payments'],
            summary: 'Update payment status (Admin/Board)',
            description: 'Approve or reject a payment',
            security: [{ BearerAuth: [] }]
        }
    });
