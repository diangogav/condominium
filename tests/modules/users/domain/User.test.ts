import { describe, it, expect } from 'bun:test';
import { User, UserProps } from '@/modules/users/domain/entities/User';
import { UserRole, UserStatus } from '@/core/domain/enums';

describe('User Entity', () => {
    const defaultProps: UserProps = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.RESIDENT,
        status: UserStatus.PENDING,
        created_at: new Date(),
        updated_at: new Date()
    };

    it('should create a user instance', () => {
        const user = new User(defaultProps);
        expect(user).toBeInstanceOf(User);
        expect(user.id).toBe('123');
    });

    it('should correctly identify admin', () => {
        const user = new User({ ...defaultProps, role: UserRole.ADMIN });
        expect(user.isAdmin()).toBe(true);
        expect(user.isBoardMember()).toBe(false);
    });

    it('should correctly identify board member', () => {
        const user = new User({ ...defaultProps, role: UserRole.BOARD });
        expect(user.isBoardMember()).toBe(true);
        expect(user.isAdmin()).toBe(false);
    });

    it('should approve a user', () => {
        const user = new User({ ...defaultProps, status: UserStatus.PENDING });
        user.approve();
        expect(user.status).toBe(UserStatus.ACTIVE);
        expect(user.isActive()).toBe(true);
    });

    it('should not change status if already active when approving', () => {
        const user = new User({ ...defaultProps, status: UserStatus.ACTIVE });
        const oldUpdatedAt = user.updated_at.getTime();

        // Sleep small amount to ensure time diff if it were to update (won't happen in synchronous valid test usually but good to know logic)
        // actually if logic returns early, updated_at shouldn't change.

        user.approve();
        expect(user.status).toBe(UserStatus.ACTIVE);
    });

    it('should reject a user', () => {
        const user = new User({ ...defaultProps, status: UserStatus.PENDING });
        user.reject();
        expect(user.status).toBe(UserStatus.REJECTED);
    });

    it('should change role', () => {
        const user = new User({ ...defaultProps, role: UserRole.RESIDENT });
        user.changeRole(UserRole.BOARD);
        expect(user.role).toBe(UserRole.BOARD);
    });
});
