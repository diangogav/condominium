import { Elysia, t } from 'elysia';
import { SupabaseUserRepository } from '../infrastructure/repositories/SupabaseUserRepository';
import { SupabaseAuthRepository } from '@/modules/auth/infrastructure/repositories/SupabaseAuthRepository';
import { GetUserById } from '../application/use-cases/GetUserById';
import { GetUsers } from '../application/use-cases/GetUsers';
import { CreateUser } from '../application/use-cases/CreateUser';
import { UpdateUser } from '../application/use-cases/UpdateUser';
import { ApproveUser } from '../application/use-cases/ApproveUser';
import { DeleteUser } from '../application/use-cases/DeleteUser';
import { UnauthorizedError } from '@/core/errors';
import { supabase } from '@/infrastructure/supabase';

// Initialize Repository and Use Cases
// In a real DI system context, these would be injected
const userRepo = new SupabaseUserRepository();
const authRepo = new SupabaseAuthRepository(); // Need auth repo for creation
const getUserById = new GetUserById(userRepo);
const getUsers = new GetUsers(userRepo);
const updateUser = new UpdateUser(userRepo);
const approveUser = new ApproveUser(userRepo);
const deleteUser = new DeleteUser(userRepo);
const createUser = new CreateUser(userRepo, authRepo);

export const userRoutes = new Elysia({ prefix: '/users' })
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
    .get('/me', async ({ user }) => {
        // Use case calling itself as target
        return await getUserById.execute({ targetId: user.id, requesterId: user.id });
    }, {
        detail: {
            tags: ['Users'],
            summary: 'Get current user profile'
        }
    })
    .patch('/me', async ({ user, body }) => {
        return await updateUser.execute({
            id: user.id,
            updaterId: user.id,
            data: body
        });
    }, {
        body: t.Object({
            name: t.Optional(t.String({ examples: ['Juan Pérez Actualizado'] })),
            phone: t.Optional(t.String({ examples: ['+58 412-1234567', '04121234567'] })),
            settings: t.Optional(t.Any())
        }),
        detail: {
            tags: ['Users'],
            summary: 'Update user profile',
            description: 'Update current user profile information. All fields are optional.'
        }
    })
    // Admin/Board routes
    .get('/', async ({ user, query }) => {
        return await getUsers.execute({
            requesterId: user.id,
            filters: {
                building_id: query.building_id,
                role: query.role,
                status: query.status
            }
        });
    }, {
        query: t.Object({
            building_id: t.Optional(t.String()),
            role: t.Optional(t.String()),
            status: t.Optional(t.String()),
        }),
        detail: {
            tags: ['Users'],
            summary: 'List all users (Admin/Board)',
            description: 'Admin sees all users, Board members see only their building users',
            security: [{ BearerAuth: [] }]
        }
    })
    .get('/:id', async ({ user, params }) => {
        return await getUserById.execute({
            targetId: params.id,
            requesterId: user.id
        });
    }, {
        detail: {
            tags: ['Users'],
            summary: 'Get user by ID (Admin/Board)',
            security: [{ BearerAuth: [] }]
        }
    })
    .patch('/:id', async ({ user, params, body }) => {
        return await updateUser.execute({
            id: params.id,
            updaterId: user.id,
            data: body as any // Type cast as validation is handled by schema and logic
        });
    }, {
        body: t.Object({
            name: t.Optional(t.String()),
            phone: t.Optional(t.String()),
            unit: t.Optional(t.String()),
            role: t.Optional(t.Union([t.Literal('resident'), t.Literal('board'), t.Literal('admin')])),
            status: t.Optional(t.String()),
            building_id: t.Optional(t.String()),
        }),
        detail: {
            tags: ['Users'],
            summary: 'Update user (Admin/Board)',
            description: 'Update user information. Only admins can change roles.',
            security: [{ BearerAuth: [] }]
        }
    })
    .post('/:id/approve', async ({ user, params }) => {
        await approveUser.execute({
            targetUserId: params.id,
            approverId: user.id
        });
        return { success: true };
    }, {
        detail: {
            tags: ['Users'],
            summary: 'Approve user registration (Admin/Board)',
            security: [{ BearerAuth: [] }]
        }
    })
    .post('/', async ({ user, body }) => {
        return await createUser.execute({
            requesterId: user.id,
            email: body.email,
            password: body.password,
            name: body.name,
            role: body.role as any,
            building_id: body.building_id,
            unit: body.unit,
            phone: body.phone
        });
    }, {
        body: t.Object({
            email: t.String(),
            password: t.String(),
            name: t.String(),
            role: t.Union([t.Literal('admin'), t.Literal('board'), t.Literal('resident')]),
            building_id: t.String(),
            unit: t.Optional(t.String()),
            phone: t.Optional(t.String())
        }),
        detail: {
            tags: ['Users'],
            summary: 'Create new user (Admin only)',
            description: 'Creates a new user with specified role (e.g. board member). User is auto-activated.',
            security: [{ BearerAuth: [] }]
        }
    })
    .delete('/:id', async ({ user, params }) => {
        await deleteUser.execute({
            targetId: params.id,
            deleterId: user.id
        });
        return { success: true };
    }, {
        detail: {
            tags: ['Users'],
            summary: 'Delete user (Admin only)',
            security: [{ BearerAuth: [] }]
        }
    });
