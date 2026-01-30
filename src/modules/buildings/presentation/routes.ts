import { Elysia, t } from 'elysia';
import { SupabaseBuildingRepository } from '../infrastructure/repositories/SupabaseBuildingRepository';
import { SupabaseUserRepository } from '@/modules/users/infrastructure/repositories/SupabaseUserRepository';
import { CreateBuilding } from '../application/use-cases/CreateBuilding';
import { GetBuildings } from '../application/use-cases/GetBuildings';
import { GetBuildingById } from '../application/use-cases/GetBuildingById';
import { UpdateBuilding } from '../application/use-cases/UpdateBuilding';
import { DeleteBuilding } from '../application/use-cases/DeleteBuilding';
import { authMiddleware } from '@/modules/auth/presentation/middleware';
import { supabase } from '@/infrastructure/supabase';
import { UnauthorizedError } from '@/core/errors';

// Initialize repositories
const buildingRepo = new SupabaseBuildingRepository();
const userRepo = new SupabaseUserRepository();

// Initialize use cases
const createBuilding = new CreateBuilding(buildingRepo, userRepo);
const getBuildings = new GetBuildings(buildingRepo);
const getBuildingById = new GetBuildingById(buildingRepo);
const updateBuilding = new UpdateBuilding(buildingRepo, userRepo);
const deleteBuilding = new DeleteBuilding(buildingRepo, userRepo);

export const buildingRoutes = new Elysia({ prefix: '/buildings' })
    .get('/', async () => {
        return await getBuildings.execute();
    }, {
        detail: {
            tags: ['Buildings'],
            summary: 'List all available buildings'
        }
    })
    .get('/:id', async ({ params }) => {
        return await getBuildingById.execute(params.id);
    }, {
        detail: {
            tags: ['Buildings'],
            summary: 'Get building by ID'
        }
    })
    .use(authMiddleware)
    .derive(async ({ request }) => {
        // We need the user for admin actions
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) throw new UnauthorizedError('Authentication required');

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) throw new UnauthorizedError('Invalid token');

        return { user };
    })
    .post('/', async ({ body, user }) => {
        return await createBuilding.execute({
            name: body.name,
            address: body.address,
            creatorId: user.id
        });
    }, {
        body: t.Object({
            name: t.String({ minLength: 1 }),
            address: t.String({ minLength: 1 }),
        }),
        detail: {
            tags: ['Buildings'],
            summary: 'Create a new building (Admin only)',
            security: [{ BearerAuth: [] }]
        }
    })
    .patch('/:id', async ({ params, body, user }) => {
        return await updateBuilding.execute({
            id: params.id,
            updaterId: user.id,
            name: body.name,
            address: body.address
        });
    }, {
        body: t.Object({
            name: t.Optional(t.String({ minLength: 1 })),
            address: t.Optional(t.String({ minLength: 1 })),
        }),
        detail: {
            tags: ['Buildings'],
            summary: 'Update a building (Admin only)',
            security: [{ BearerAuth: [] }]
        }
    })
    .delete('/:id', async ({ params, user }) => {
        await deleteBuilding.execute(params.id, user.id);
        return { success: true };
    }, {
        detail: {
            tags: ['Buildings'],
            summary: 'Delete a building (Admin only)',
            security: [{ BearerAuth: [] }]
        }
    });
