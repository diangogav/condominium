import { Elysia, t } from 'elysia';
import { PaymentRepository } from '../data/payment-repository';
import { PaymentAdminRepository } from '../data/payment-admin-repository';
import { ReportPayment } from '../domain/use-cases/report-payment';
import { StorageService } from '@/infrastructure/storage';
import { supabase } from '@/infrastructure/supabase';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '@/core/errors';
import { SupabaseUserRepository } from '@/modules/users/infrastructure/repositories/SupabaseUserRepository';

const paymentRepo = new PaymentRepository();
const paymentAdminRepo = new PaymentAdminRepository();
const userRepo = new SupabaseUserRepository();
const storageService = new StorageService();
const reportPaymentUseCase = new ReportPayment(paymentRepo, storageService);

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
        const userId = user.id;
        const year = query.year ? parseInt(query.year) : undefined;
        return await paymentRepo.findByUserId(userId, year);
    }, {
        query: t.Object({
            year: t.Optional(t.String())
        }),
        detail: {
            tags: ['Payments'],
            summary: 'Get user payment history'
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

        // Debug logging
        console.log('📝 Payment creation request received');
        console.log('User ID:', userId);
        console.log('Building ID (Profile):', userProfile.building_id);
        console.log('Building ID (Request):', body.building_id);

        // Prioritize building_id from request body (if valid/present), otherwise use profile default
        // In a real multi-tenancy scenario, we should verify the user actually belongs to this buildingId
        // For now, we allow the app to specify it, fallback to profile.
        const targetBuildingId = body.building_id || userProfile.building_id;

        const payment = await reportPaymentUseCase.execute({
            user_id: userId,
            building_id: targetBuildingId, // Use determined building ID
            amount: typeof body.amount === 'string' ? parseFloat(body.amount) : body.amount,
            payment_date: new Date(body.date),
            method: body.method,
            reference: body.reference,
            bank: body.bank,
            proof_file: body.proof_image,
            period: body.period
        });

        return payment;
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
            period: t.Optional(t.String({ examples: ['2026-01', '2024-12'] })),
            building_id: t.Optional(t.String()) // Enable receiving building_id
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
        const currentUser = await userRepo.findById(user.id);
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'board')) {
            throw new ForbiddenError('Only admins and board members can view all payments');
        }

        const filters: any = {};
        if (currentUser.role === 'board' && currentUser.building_id) {
            filters.building_id = currentUser.building_id;
        } else if (query.building_id) {
            filters.building_id = query.building_id as string;
        }

        if (query.status) filters.status = query.status as string;
        if (query.period) filters.period = query.period as string;
        if (query.year) filters.year = query.year as string;

        return await paymentAdminRepo.findAll(filters);
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
        const currentUser = await userRepo.findById(user.id);
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'board')) {
            throw new ForbiddenError('Only admins and board members can update payments');
        }

        const payment = await paymentRepo.findById(params.id);
        if (!payment) throw new NotFoundError('Payment not found');

        // Board members can only update payments from their building
        if (currentUser.role === 'board') {
            const paymentUser = await userRepo.findById(payment.user_id);
            if (!paymentUser || paymentUser.building_id !== currentUser.building_id) {
                throw new ForbiddenError('You can only update payments from your building');
            }
        }

        return await paymentAdminRepo.updateStatus(params.id, body.status, body.notes);
    }, {
        body: t.Object({
            status: t.Union([t.Literal('PENDING'), t.Literal('APPROVED'), t.Literal('REJECTED')]),
            notes: t.Optional(t.String()),
        }),
        detail: {
            tags: ['Payments'],
            summary: 'Update payment status (Admin/Board)',
            description: 'Approve or reject a payment',
            security: [{ BearerAuth: [] }]
        }
    });
