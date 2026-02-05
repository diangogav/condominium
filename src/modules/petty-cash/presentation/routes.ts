import { Elysia, t } from 'elysia';
import { SupabasePettyCashRepository } from '../infrastructure/repositories/SupabasePettyCashRepository';
import { GetPettyCashBalance } from '../application/use-cases/GetPettyCashBalance';
import { GetPettyCashHistory } from '../application/use-cases/GetPettyCashHistory';
import { RegisterPettyCashIncome } from '../application/use-cases/RegisterPettyCashIncome';
import { RegisterPettyCashExpense } from '../application/use-cases/RegisterPettyCashExpense';
import { StorageService } from '@/infrastructure/storage';
import { supabase } from '@/infrastructure/supabase';
import { UnauthorizedError, ForbiddenError } from '@/core/errors';
import { UserRole, PettyCashTransactionType, PettyCashCategory } from '@/core/domain/enums';

// Initialize repo and use cases
const pettyCashRepo = new SupabasePettyCashRepository();
const storageService = new StorageService();

const getBalance = new GetPettyCashBalance(pettyCashRepo);
const getHistory = new GetPettyCashHistory(pettyCashRepo);
const registerIncome = new RegisterPettyCashIncome(pettyCashRepo);
const registerExpense = new RegisterPettyCashExpense(pettyCashRepo);

const PettyCashFundSchema = t.Object({
    id: t.String(),
    building_id: t.String(),
    current_balance: t.Number(),
    currency: t.String(),
    updated_at: t.Any()
});

const PettyCashTransactionSchema = t.Object({
    id: t.String(),
    fund_id: t.String(),
    type: t.String(),
    amount: t.Number(),
    description: t.String(),
    category: t.String(),
    created_by: t.String(),
    evidence_url: t.Optional(t.String()),
    created_at: t.Optional(t.Any())
});

export const pettyCashRoutes = new Elysia({ prefix: '/petty-cash' })
    .derive(async ({ request }) => {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) throw new UnauthorizedError('Authentication required');

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) throw new UnauthorizedError('Invalid or expired token');

        // Fetch user profile to check role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        return { user, profile };
    })
    .get('/balance/:buildingId', async ({ params }) => {
        return await getBalance.execute(params.buildingId);
    }, {
        response: PettyCashFundSchema,
        detail: {
            tags: ['Petty Cash'],
            summary: 'Get current balance'
        }
    })
    .get('/history/:buildingId', async ({ params, query }) => {
        return await getHistory.execute(params.buildingId, {
            type: query.type as PettyCashTransactionType,
            category: query.category as PettyCashCategory,
            page: query.page ? Number(query.page) : 1,
            limit: query.limit ? Number(query.limit) : 10
        });
    }, {
        query: t.Object({
            type: t.Optional(t.String()),
            category: t.Optional(t.String()),
            page: t.Optional(t.Numeric()),
            limit: t.Optional(t.Numeric())
        }),
        response: t.Array(PettyCashTransactionSchema),
        detail: {
            tags: ['Petty Cash'],
            summary: 'Get transaction history'
        }
    })
    .post('/income', async ({ body, user, profile }) => {
        // Only Admin or Board
        if (profile?.role !== UserRole.ADMIN && profile?.role !== UserRole.BOARD) {
            throw new ForbiddenError('Only Admin or Board members can register income');
        }

        return await registerIncome.execute({
            buildingId: body.building_id,
            amount: typeof body.amount === 'string' ? parseFloat(body.amount) : body.amount,
            description: body.description,
            userId: user.id
        });
    }, {
        body: t.Object({
            building_id: t.String(),
            amount: t.Union([t.Number(), t.String()]),
            description: t.String()
        }),
        response: PettyCashTransactionSchema,
        detail: {
            tags: ['Petty Cash'],
            summary: 'Register income'
        }
    })
    .post('/expense', async ({ body, user, profile }) => {
        // Only Admin or Board
        if (profile?.role !== UserRole.ADMIN && profile?.role !== UserRole.BOARD) {
            throw new ForbiddenError('Only Admin or Board members can register expenses');
        }

        let evidenceUrl: string | undefined;
        if (body.evidence_image) {
            evidenceUrl = await storageService.uploadProof(body.evidence_image, user.id);
        }

        return await registerExpense.execute({
            buildingId: body.building_id,
            amount: typeof body.amount === 'string' ? parseFloat(body.amount) : body.amount,
            description: body.description,
            category: body.category as PettyCashCategory,
            userId: user.id,
            evidenceUrl
        });
    }, {
        body: t.Object({
            building_id: t.String(),
            amount: t.Union([t.Number(), t.String()]),
            description: t.String(),
            category: t.String(),
            evidence_image: t.Optional(t.File())
        }),
        type: 'multipart/form-data',
        response: PettyCashTransactionSchema,
        detail: {
            tags: ['Petty Cash'],
            summary: 'Register expense'
        }
    });
