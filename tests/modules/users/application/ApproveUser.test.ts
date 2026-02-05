import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { ApproveUser } from '@/modules/users/application/use-cases/ApproveUser';
import { IUserRepository } from '@/modules/users/domain/repository';
import { User } from '@/modules/users/domain/entities/User';
import { UserRole, UserStatus } from '@/core/domain/enums';
import { ForbiddenError, NotFoundError } from '@/core/errors';

// Mock Repository
class MockUserRepository implements IUserRepository {
    users: Map<string, User> = new Map();

    async create(user: User): Promise<User> {
        this.users.set(user.id, user);
        return user;
    }
    async findById(id: string): Promise<User | null> {
        return this.users.get(id) || null;
    }
    async findByEmail(email: string): Promise<User | null> {
        return null;
    }
    async update(user: User): Promise<User> {
        this.users.set(user.id, user);
        return user;
    }
    async findAll(): Promise<User[]> {
        return Array.from(this.users.values());
    }
    async delete(id: string): Promise<void> {
        this.users.delete(id);
    }
}

describe('ApproveUser Use Case', () => {
    let repo: MockUserRepository;
    let useCase: ApproveUser;

    beforeEach(() => {
        repo = new MockUserRepository();
        useCase = new ApproveUser(repo);
    });

    const createResident = (id: string, buildingId: string = 'b1') => {
        const u = new User({
            id, email: 'res@test.com', name: 'Res', role: UserRole.RESIDENT, status: UserStatus.PENDING, created_at: new Date(), updated_at: new Date()
        });
        u.setUnits([{ unit_id: 'u1', building_id: buildingId, role: 'resident', is_primary: true } as any]);
        return u;
    };

    const createBoard = (id: string, buildingId: string = 'b1') => {
        const u = new User({
            id, email: 'board@test.com', name: 'Board', role: UserRole.BOARD, status: UserStatus.ACTIVE, created_at: new Date(), updated_at: new Date()
        });
        u.setUnits([{ unit_id: 'u2', building_id: buildingId, role: 'owner', is_primary: true } as any]);
        return u;
    };

    const createAdmin = (id: string) => new User({
        id, email: 'admin@test.com', name: 'Admin', role: UserRole.ADMIN, status: UserStatus.ACTIVE, created_at: new Date(), updated_at: new Date()
    });

    it('should approve user when requested by admin', async () => {
        const admin = createAdmin('admin1');
        const resident = createResident('res1');
        await repo.create(admin);
        await repo.create(resident);

        await useCase.execute({ targetUserId: 'res1', approverId: 'admin1' });

        const updated = await repo.findById('res1');
        expect(updated?.status).toBe(UserStatus.ACTIVE);
    });

    it('should approve user when requested by board member of same building', async () => {
        const board = createBoard('board1', 'buildingA');
        const resident = createResident('res1', 'buildingA');
        await repo.create(board);
        await repo.create(resident);

        await useCase.execute({ targetUserId: 'res1', approverId: 'board1' });

        const updated = await repo.findById('res1');
        expect(updated?.status).toBe(UserStatus.ACTIVE);
    });

    it('should fail when board member is from different building', async () => {
        const board = createBoard('board1', 'buildingA');
        const resident = createResident('res1', 'buildingB');
        await repo.create(board);
        await repo.create(resident);

        expect(useCase.execute({ targetUserId: 'res1', approverId: 'board1' }))
            .rejects.toThrow(ForbiddenError);
    });

    it('should fail when approver is resident', async () => {
        const res2 = createResident('res2'); // Approver, even if active
        res2.approve();
        const resident = createResident('res1');
        await repo.create(res2);
        await repo.create(resident);

        expect(useCase.execute({ targetUserId: 'res1', approverId: 'res2' }))
            .rejects.toThrow(ForbiddenError);
    });

    it('should fail if target user does not exist', async () => {
        const admin = createAdmin('admin1');
        await repo.create(admin);

        expect(useCase.execute({ targetUserId: 'nonexistent', approverId: 'admin1' }))
            .rejects.toThrow(NotFoundError);
    });
});
