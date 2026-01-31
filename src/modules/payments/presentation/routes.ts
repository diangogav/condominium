import { Elysia, t } from 'elysia';
import { SupabasePaymentRepository } from '../infrastructure/repositories/SupabasePaymentRepository';
import { SupabaseUserRepository } from '@/modules/users/infrastructure/repositories/SupabaseUserRepository';
import { CreatePayment } from '../application/use-cases/CreatePayment';
import { ApprovePayment } from '../application/use-cases/ApprovePayment';
import { GetUserPayments } from '../application/use-cases/GetUserPayments';
import { GetPaymentSummary } from '../application/use-cases/GetPaymentSummary';
import { GetAllPayments } from '../application/use-cases/GetAllPayments';
import { StorageService } from '@/infrastructure/storage';
import { supabase } from '@/infrastructure/supabase';
import { UnauthorizedError } from '@/core/errors';
import { PaymentMethod } from '@/core/domain/enums';

// Initialize repositories and use cases
const paymentRepo = new SupabasePaymentRepository();
const userRepo = new SupabaseUserRepository();
const storageService = new StorageService();

const createPayment = new CreatePayment(paymentRepo);
const approvePayment = new ApprovePayment(paymentRepo, userRepo);
const getUserPayments = new GetUserPayments(paymentRepo);
const getPaymentSummary = new GetPaymentSummary(paymentRepo, userRepo);
const getAllPayments = new GetAllPayments(paymentRepo, userRepo);

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
        return await getUserPayments.execute(user.id, year);
    }, {
        query: t.Object({
            year: t.Optional(t.String())
        }),
        detail: {
            tags: ['Payments'],
            summary: 'Get user payment history'
        }
    })
    // Get payment summary with solvency status (replaces /dashboard/summary)
    .get('/summary', async ({ user }) => {
        return await getPaymentSummary.execute(user.id);
    }, {
        detail: {
            tags: ['Payments'],
            summary: 'Get payment summary with solvency status',
            description: 'Returns payment history, solvency status, pending periods, and recent transactions'
        }
    })
    // Get payment by ID
    .get('/:id', async ({ params, user }) => {
        const payment = await paymentRepo.findById(params.id);
        // Verify ownership (users can only see their own payments)
        if (payment && payment.user_id !== user.id) {
            throw new UnauthorizedError('Unauthorized');
        }

        return payment;
    }, {
        detail: {
            tags: ['Payments'],
            summary: 'Get payment details'
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

        const targetBuildingId = body.building_id || userProfile.building_id;

        // Normalize periods to array
        let periods: string[] | undefined;
        if (body.periods) {
            periods = Array.isArray(body.periods) ? body.periods : [body.periods];
        }

        const payment = await createPayment.execute({
            user_id: userId,
            building_id: targetBuildingId,
            amount: typeof body.amount === 'string' ? parseFloat(body.amount) : body.amount,
            payment_date: new Date(body.date),
            method: body.method as PaymentMethod,
            reference: body.reference,
            bank: body.bank,
            proof_url: proofUrl,
            periods: periods
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
            building_id: t.Optional(t.String())
        }),
        type: 'multipart/form-data',
        detail: {
            tags: ['Payments'],
            summary: 'Report a new payment',
            description: 'Submit a payment report with optional proof image. Payment will be in PENDING status until approved.'
        }
    })
    // Admin routes
    .get('/admin/payments', async ({ user, query }) => {
        return await getAllPayments.execute({
            requesterId: user.id,
            filters: {
                building_id: query.building_id,
                status: query.status,
                period: query.period,
                year: query.year
            }
        });
    }, {
        query: t.Object({
            building_id: t.Optional(t.String()),
            status: t.Optional(t.String()),
            period: t.Optional(t.String()),
            year: t.Optional(t.String()),
        }),
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
        detail: {
            tags: ['Payments'],
            summary: 'Update payment status (Admin/Board)',
            description: 'Approve or reject a payment',
            security: [{ BearerAuth: [] }]
        }
    });
