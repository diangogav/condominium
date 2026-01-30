import { Elysia, t } from 'elysia';
import { BuildingRepository } from '../data/building-repository';
import { authMiddleware } from '@/modules/auth/presentation/middleware';

const buildingRepo = new BuildingRepository();

export const buildingRoutes = new Elysia({ prefix: '/buildings' })
    .get('/', async () => {
        return await buildingRepo.findAll();
    }, {
        detail: {
            tags: ['Buildings'],
            summary: 'List all available buildings'
        }
    })
    .get('/:id', async ({ params }) => {
        return await buildingRepo.findById(params.id);
    }, {
        detail: {
            tags: ['Buildings'],
            summary: 'Get building by ID'
        }
    })
    .use(authMiddleware)
    .post('/', async ({ body }) => {
        return await buildingRepo.create(body);
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
    .patch('/:id', async ({ params, body }) => {
        return await buildingRepo.update(params.id, body);
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
    .delete('/:id', async ({ params }) => {
        await buildingRepo.delete(params.id);
        return { success: true };
    }, {
        detail: {
            tags: ['Buildings'],
            summary: 'Delete a building (Admin only)',
            security: [{ BearerAuth: [] }]
        }
    });
