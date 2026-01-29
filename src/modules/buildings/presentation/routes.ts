import { Elysia } from 'elysia';
import { BuildingRepository } from '../data/building-repository';

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
    });
