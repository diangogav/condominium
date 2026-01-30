import { IUserRepository } from '../../domain/repository';
import { User, UserProps } from '../../domain/entities/User';
import { UserRole, UserStatus } from '@/core/domain/enums';
import { DomainError } from '@/core/errors';

interface CreateUserDTO {
    id: string; // From Auth provider
    email: string;
    name: string;
    unit?: string;
    building_id?: string;
    role?: UserRole; // Optional, defaults to resident
}

export class CreateUser {
    constructor(private userRepo: IUserRepository) { }

    async execute(dto: CreateUserDTO): Promise<User> {
        const existingUser = await this.userRepo.findById(dto.id);
        if (existingUser) {
            throw new DomainError('User already exists', 'USER_EXISTS', 409);
        }

        const role = dto.role || UserRole.RESIDENT;

        // Residents are pending by default, others might be active depending on business rule
        // But for now let's say creation is always pending for residents
        let status = UserStatus.PENDING;
        if (role === UserRole.ADMIN) {
            status = UserStatus.ACTIVE; // Admins created directly might be active
        }

        // TODO: logic for creating board members? 
        // Usually board members are created by admins or promoted.

        const userProps: UserProps = {
            id: dto.id,
            email: dto.email,
            name: dto.name,
            unit: dto.unit,
            building_id: dto.building_id,
            role: role,
            status: status
        };

        const user = new User(userProps);
        return await this.userRepo.create(user);
    }
}
