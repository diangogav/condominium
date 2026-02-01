import { Elysia, t } from 'elysia';
import { SupabaseBuildingRepository } from '../infrastructure/repositories/SupabaseBuildingRepository';
import { SupabaseUnitRepository } from '../infrastructure/repositories/SupabaseUnitRepository';
import { SupabaseUserRepository } from '@/modules/users/infrastructure/repositories/SupabaseUserRepository';
import { CreateBuilding } from '../application/use-cases/CreateBuilding';
import { GetBuildings } from '../application/use-cases/GetBuildings';
import { GetBuildingById } from '../application/use-cases/GetBuildingById';
import { UpdateBuilding } from '../application/use-cases/UpdateBuilding';
import { DeleteBuilding } from '../application/use-cases/DeleteBuilding';
import { CreateUnit } from '../application/use-cases/CreateUnit';
import { BatchCreateUnits } from '../application/use-cases/BatchCreateUnits';
import { GetUnitsByBuilding } from '../application/use-cases/GetUnitsByBuilding';
import { GetUnitById } from '../application/use-cases/GetUnitById';
import { authMiddleware } from '@/modules/auth/presentation/middleware';
import { supabase } from '@/infrastructure/supabase';
import { UnauthorizedError } from '@/core/errors';

// Initialize repositories
const buildingRepo = new SupabaseBuildingRepository();
const unitRepo = new SupabaseUnitRepository();
const userRepo = new SupabaseUserRepository();

// Initialize use cases
const createBuilding = new CreateBuilding(buildingRepo, userRepo);
const getBuildings = new GetBuildings(buildingRepo);
const getBuildingById = new GetBuildingById(buildingRepo);
const updateBuilding = new UpdateBuilding(buildingRepo, userRepo);
const deleteBuilding = new DeleteBuilding(buildingRepo, userRepo);
const createUnit = new CreateUnit(unitRepo, buildingRepo);
const batchCreateUnits = new BatchCreateUnits(unitRepo, buildingRepo);
const getUnitsByBuilding = new GetUnitsByBuilding(unitRepo);
const getUnitById = new GetUnitById(unitRepo);

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
    // Unit Routes (Public for Registration)
    .get('/:id/units', async ({ params }) => {
        return await getUnitsByBuilding.execute(params.id);
    }, {
        detail: {
            tags: ['Units'],
            summary: 'List units for a building'
        }
    })
    // Get single unit by ID
    .get('/units/:id', async ({ params }) => {
        const unit = await getUnitById.execute(params.id);
        return unit.toJSON();
    }, {
        detail: {
            tags: ['Units'],
            summary: 'Get unit by ID'
        }
    })
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


    .post('/:id/units', async ({ params, body }) => {
        return await createUnit.execute({
            building_id: params.id,
            name: body.name,
            floor: body.floor,
            aliquot: body.aliquot
        });
    }, {
        body: t.Object({
            name: t.String({ minLength: 1 }),
            floor: t.Optional(t.String()),
            aliquot: t.Optional(t.Number())
        }),
        detail: {
            tags: ['Units'],
            summary: 'Create a single unit (Admin only)',
            security: [{ BearerAuth: [] }]
        }
    })
    .post('/:id/units/batch', async ({ params, body }) => {
        return await batchCreateUnits.execute({
            building_id: params.id,
            floors: body.floors,
            unitsPerFloor: body.unitsPerFloor
        });
    }, {
        body: t.Object({
            floors: t.Array(t.String()),
            unitsPerFloor: t.Array(t.String())
        }),
        detail: {
            tags: ['Units'],
            summary: 'Batch create units (Admin only)',
            security: [{ BearerAuth: [] }]
        }
    });
