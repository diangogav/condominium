import { describe, it, expect, beforeEach } from 'bun:test';
import { CreateUser } from '@/modules/users/application/use-cases/CreateUser';
import { MockUserRepository } from '../mocks';
import { MockAuthRepository } from '../../auth/mocks';
import { UserRole, UserStatus } from '@/core/domain/enums';
import { DomainError, ForbiddenError, UnauthorizedError } from '@/core/errors';
import { User } from '@/modules/users/domain/entities/User';

describe('CreateUser Use Case', () => {
    let userRepo: MockUserRepository;
    let authRepo: MockAuthRepository;
    let useCase: CreateUser;

    const ADMIN_ID = 'admin-user-id';
    const RESIDENT_ID = 'resident-user-id';
    const BUILDING_ID = 'building-1';

    beforeEach(async () => {
        userRepo = new MockUserRepository();
        authRepo = new MockAuthRepository();
        useCase = new CreateUser(userRepo, authRepo);

        // Seed an admin user
        await userRepo.create(new User({
            id: ADMIN_ID,
            email: 'admin@test.com',
            name: 'Admin User',
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE,
            building_id: BUILDING_ID,
            created_at: new Date(),
            updated_at: new Date()
        }));

        // Seed a resident user
        await userRepo.create(new User({
            id: RESIDENT_ID,
            email: 'resident@test.com',
            name: 'Resident User',
            role: UserRole.RESIDENT,
            status: UserStatus.ACTIVE,
            building_id: BUILDING_ID,
            created_at: new Date(),
            updated_at: new Date()
        }));
    });

    it('should allow admin to create a new user', async () => {
        const newUser = await useCase.execute({
            requesterId: ADMIN_ID,
            email: 'newuser@test.com',
            password: 'password123',
            name: 'New User',
            role: UserRole.RESIDENT,
            building_id: BUILDING_ID,
            unit: '101'
        });

        expect(newUser.email).toBe('newuser@test.com');
        expect(newUser.status).toBe(UserStatus.ACTIVE); // Created by admin is active
    });

    it('should forbid non-admin from creating users', async () => {
        const request = {
            requesterId: RESIDENT_ID,
            email: 'hacker@test.com',
            password: 'password123',
            name: 'Hacker',
            role: UserRole.ADMIN,
            building_id: BUILDING_ID
        };

        expect(useCase.execute(request)).rejects.toThrow(ForbiddenError);
    });

    it('should throw error if requester not found', async () => {
        const request = {
            requesterId: 'unknown-id',
            email: 'test@test.com',
            password: 'pass',
            name: 'Test',
            role: UserRole.RESIDENT,
            building_id: BUILDING_ID
        };

        expect(useCase.execute(request)).rejects.toThrow(UnauthorizedError);
    });
});
