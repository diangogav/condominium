import { User, CreateUserProps, UpdateUserProps } from './entities';

export interface IUserRepository {
    create(user: CreateUserProps): Promise<User>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    update(id: string, data: UpdateUserProps): Promise<User>;
}
