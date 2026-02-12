import { User } from '../../domain/entities/User';
import { UserUnit } from '../../domain/entities/UserUnit';
import { BuildingRole } from '../../domain/entities/BuildingRole';
import { IUserRepository } from '../../domain/repository';
import { IAuthRepository } from '@/modules/auth/domain/repository';
import { UserRole, UserStatus } from '@/core/domain/enums';
import { DomainError } from '@/core/errors';

export interface CreateUserDTO {
    email: string;
    name: string;
    phone?: string;
    role: UserRole;
    unit_id?: string;
    building_id?: string; // Optional building for initial role
    password?: string;    // Required for auth creation
}

export class CreateUser {
    constructor(
        private userRepository: IUserRepository,
        private authRepository: IAuthRepository
    ) { }

    async execute(data: CreateUserDTO): Promise<User> {
        const existing = await this.userRepository.findByEmail(data.email);
        if (existing) {
            throw new DomainError('User already exists', 'USER_EXISTS', 400);
        }

        // 1. Create Auth User
        const password = data.password || Math.random().toString(36).slice(-10);
        const authUser = await this.authRepository.createUser(data.email, password);

        // 2. Create Profile
        const user = new User({
            id: authUser.id,
            email: data.email,
            name: data.name,
            phone: data.phone,
            role: data.role,
            status: UserStatus.ACTIVE, // Created by admin = auto active
        });

        // If unit_id is provided, associate it
        if (data.unit_id) {
            user.setUnits([
                new UserUnit({
                    unit_id: data.unit_id,
                    is_primary: true,
                    building_id: data.building_id
                })
            ]);
        }

        // If building_id is provided and role is BOARD, add building role
        if (data.building_id && (data.role === UserRole.BOARD)) {
            user.setBuildingRoles([
                new BuildingRole({
                    building_id: data.building_id,
                    role: 'board'
                })
            ]);
        }

        return await this.userRepository.create(user);
    }
}
