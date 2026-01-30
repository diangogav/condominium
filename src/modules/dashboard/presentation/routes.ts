import { Elysia } from 'elysia';
import { PaymentRepository } from '@/modules/payments/data/payment-repository';
import { UserRepository } from '@/modules/users/data/user-repository';
import { CalculateSolvency } from '../domain/use-cases/calculate-solvency';
import { supabase } from '@/infrastructure/supabase';
import { UnauthorizedError } from '@/core/errors';

const paymentRepo = new PaymentRepository();
const userRepo = new UserRepository();
const calculateSolvencyUseCase = new CalculateSolvency(paymentRepo, userRepo);

export const dashboardRoutes = new Elysia({ prefix: '/dashboard' })
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
    .get('/summary', async ({ user }) => {
        const userId = user.id;
        return await calculateSolvencyUseCase.execute(userId);
    }, {
        detail: {
            tags: ['Dashboard'],
            summary: 'Get dashboard summary with solvency status'
        }
    });
