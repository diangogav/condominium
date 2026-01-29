import { Elysia, t } from 'elysia';
import { PaymentRepository } from '../data/payment-repository';
import { ReportPayment } from '../domain/use-cases/report-payment';
import { StorageService } from '@/infrastructure/storage';
import { supabase } from '@/infrastructure/supabase';
import { UnauthorizedError } from '@/core/errors';

const paymentRepo = new PaymentRepository();
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

        const payment = await reportPaymentUseCase.execute({
            user_id: userId,
            amount: body.amount,
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
            amount: t.Number({ minimum: 0, examples: [50.00, 75.50, 100] }),
            date: t.String({ examples: ['2026-01-15', '2026-01-29'] }),
            method: t.Union([
                t.Literal('PAGO_MOVIL'),
                t.Literal('TRANSFER'),
                t.Literal('CASH')
            ], { examples: ['PAGO_MOVIL'] }),
            reference: t.Optional(t.String({ examples: ['123456789', 'REF-2024-001'] })),
            bank: t.Optional(t.String({ examples: ['Banco de Venezuela', 'Banesco', 'Mercantil'] })),
            proof_image: t.Optional(t.File()),
            period: t.Optional(t.String({ examples: ['2026-01', '2024-12'] }))
        }),
        type: 'multipart/form-data',
        detail: {
            tags: ['Payments'],
            summary: 'Report a new payment',
            description: 'Submit a payment report with optional proof image. Payment will be in PENDING status until approved.'
        }
    });
