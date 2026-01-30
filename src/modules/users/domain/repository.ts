import { User } from './entities/User';
import { UserRole, UserStatus } from '@/core/domain/enums';

export interface FindAllUsersFilters {
    building_id?: string;
    role?: UserRole;
    status?: UserStatus;
}

export interface IUserRepository {
    create(user: User): Promise<User>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    update(user: User): Promise<User>;
    findAll(filters?: FindAllUsersFilters): Promise<User[]>;
    delete(id: string): Promise<void>;
}
