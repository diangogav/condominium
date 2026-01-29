import { Elysia, t } from 'elysia';
import { UserRepository } from '../data/user-repository';
import { supabase } from '@/infrastructure/supabase';
import { UnauthorizedError, NotFoundError } from '@/core/errors';

const userRepo = new UserRepository();

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
        const profile = await userRepo.findById(user.id);
        if (!profile) throw new NotFoundError('User profile not found');

        return profile;
    }, {
        detail: {
            tags: ['Users'],
            summary: 'Get current user profile'
        }
    })
    .patch('/me', async ({ user, body }) => {
        const profile = await userRepo.update(user.id, body);
        return profile;
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
    });
