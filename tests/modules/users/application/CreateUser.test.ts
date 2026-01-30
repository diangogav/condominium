import { describe, it, expect, beforeEach } from 'bun:test';
import { CreateUser } from '@/modules/users/application/use-cases/CreateUser';
import { MockUserRepository } from '../mocks';
import { UserRole, UserStatus } from '@/core/domain/enums';
import { DomainError } from '@/core/errors';

describe('CreateUser Use Case', () => {
    let repo: MockUserRepository;
    let useCase: CreateUser;

    beforeEach(() => {
        repo = new MockUserRepository();
        useCase = new CreateUser(repo);
    });

    it('should create a resident with pending status by default', async () => {
        const newUser = await useCase.execute({
            id: 'u1',
            email: 'test@test.com',
            name: 'Test',
            role: UserRole.RESIDENT
        });

        expect(newUser.role).toBe(UserRole.RESIDENT);
        expect(newUser.status).toBe(UserStatus.PENDING);
        expect(repo.users.has('u1')).toBe(true);
    });

    it('should create an admin with active status', async () => {
        const admin = await useCase.execute({
            id: 'admin1',
            email: 'admin@test.com',
            name: 'Admin',
            role: UserRole.ADMIN
        });

        expect(admin.role).toBe(UserRole.ADMIN);
        expect(admin.status).toBe(UserStatus.ACTIVE);
    });

    it('should fail if user already exists', async () => {
        await useCase.execute({ id: 'u1', email: 'test@test.com', name: 'Test', role: UserRole.RESIDENT });

        expect(useCase.execute({ id: 'u1', email: 'test@test.com', name: 'Test' }))
            .rejects.toThrow(DomainError);
    });
});
