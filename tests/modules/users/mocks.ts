import { IUserRepository, FindAllUsersFilters } from '@/modules/users/domain/repository';
import { User } from '@/modules/users/domain/entities/User';

export class MockUserRepository implements IUserRepository {
    public users: User[] = [];

    async create(user: User): Promise<User> {
        this.users.push(user);
        return user;
    }

    async findById(id: string): Promise<User | null> {
        return this.users.find(u => u.id === id) || null;
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.users.find(u => u.email === email) || null;
    }

    async update(user: User): Promise<User> {
        const index = this.users.findIndex(u => u.id === user.id);
        if (index !== -1) {
            this.users[index] = user;
        }
        return user;
    }

    async findAll(filters?: FindAllUsersFilters): Promise<User[]> {
        let filtered = [...this.users];
        if (filters?.building_id) {
            filtered = filtered.filter(u => u.building_id === filters.building_id);
        }
        return filtered;
    }

    async delete(id: string): Promise<void> {
        this.users = this.users.filter(u => u.id !== id);
    }
}
