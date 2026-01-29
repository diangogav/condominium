import { Elysia } from 'elysia';
import { supabase } from '@/infrastructure/supabase';
import { UnauthorizedError } from '@/core/errors';

export const authMiddleware = new Elysia({ name: 'auth' })
    .derive(async ({ request }) => {
        const authHeader = request.headers.get('Authorization');
        console.log("authHeader", authHeader);
        if (!authHeader) {
            return { user: null };
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return { user: null };
        }

        return { user };
    })
    .macro(({ onBeforeHandle }) => ({
        isProtected(enabled: boolean) {
            if (!enabled) return;

            onBeforeHandle(({ user }) => {
                if (!user) {
                    throw new UnauthorizedError('Authentication required');
                }
            });
        }
    }));
