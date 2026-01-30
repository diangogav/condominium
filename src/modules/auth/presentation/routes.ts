import { Elysia, t } from 'elysia';
import { SupabaseAuthRepository } from '../infrastructure/repositories/SupabaseAuthRepository';
import { SupabaseUserRepository } from '@/modules/users/infrastructure/repositories/SupabaseUserRepository';
import { RegisterResident } from '../domain/use-cases/register-resident';
import { LoginUser } from '../domain/use-cases/login-user';

// Setup dependencies (Manual DI for simplicity in this scale)
const authRepo = new SupabaseAuthRepository();
const userRepo = new SupabaseUserRepository();
const registerResidentUseCase = new RegisterResident(authRepo, userRepo);
const loginUserUseCase = new LoginUser(authRepo, userRepo);

export const authRoutes = new Elysia({ prefix: '/auth' })
    .post('/register', async ({ body }) => {
        const session = await registerResidentUseCase.execute({
            name: body.name,
            email: body.email,
            password: body.password,
            unit: body.unit,
            building_id: body.building_id
        });

        return session;
    }, {
        body: t.Object({
            name: t.String({ minLength: 1, examples: ['Juan Pérez'] }),
            email: t.String({ format: 'email', examples: ['juan.perez@example.com'] }),
            password: t.String({ minLength: 6, examples: ['SecurePass123'] }),
            unit: t.String({ examples: ['5-B', '101', 'PH-1'] }),
            building_id: t.String({ format: 'uuid', examples: ['d047cca7-d97f-480f-b747-042b88c26228'] })
        }),
        detail: {
            tags: ['Auth'],
            summary: 'Register a new resident',
            description: 'Creates a new user account and profile. Returns JWT token for immediate login.'
        }
    })
    .post('/login', async ({ body }) => {
        const result = await loginUserUseCase.execute(body.email, body.password);
        return result;
    }, {
        body: t.Object({
            email: t.String({ format: 'email', examples: ['juan.perez@example.com'] }),
            password: t.String({ examples: ['SecurePass123'] })
        }),
        detail: {
            tags: ['Auth'],
            summary: 'Login user',
            description: 'Authenticates user and returns JWT token with user profile.'
        }
    });
