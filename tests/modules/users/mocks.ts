import { IUserRepository, FindAllUsersFilters } from '@/modules/users/domain/repository';
import { User } from '@/modules/users/domain/entities/User';

export class MockUserRepository implements IUserRepository {
    users: Map<string, User> = new Map();

    async create(user: User): Promise<User> {
        this.users.set(user.id, user);
        return user;
    }
    async findById(id: string): Promise<User | null> {
        return this.users.get(id) || null;
    }
    async findByEmail(email: string): Promise<User | null> {
        // Simple search
        for (const user of this.users.values()) {
            if (user.email === email) return user;
        }
        return null;
    }
    async update(user: User): Promise<User> {
        this.users.set(user.id, user);
        return user;
    }
    async findAll(filters?: FindAllUsersFilters): Promise<User[]> {
        let result = Array.from(this.users.values());
        if (filters) {
            if (filters.building_id) {
                result = result.filter(u => u.building_id === filters.building_id);
            }
            if (filters.role) {
                result = result.filter(u => u.role === filters.role);
            }
            if (filters.status) {
                result = result.filter(u => u.status === filters.status);
            }
        }
        return result;
    }
    async delete(id: string): Promise<void> {
        this.users.delete(id);
    }
}
