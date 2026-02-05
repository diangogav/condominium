import { IUserRepository } from '@/modules/users/domain/repository';
import { IAuthRepository } from '@/modules/auth/domain/repository';
import { User, UserProps } from '../../domain/entities/User';
import { UserRole, UserStatus } from '@/core/domain/enums';
import { ForbiddenError, UnauthorizedError } from '@/core/errors';

interface CreateUserRequest {
    requesterId: string;
    email: string;
    password: string;
    name: string;
    role: UserRole;
    building_id: string; // Required for all users in this context (even admin usually belongs to system, but let's assume mandatory for now based on app logic)
    unit_id?: string;
    phone?: string;
}

export class CreateUser {
    constructor(
        private userRepo: IUserRepository,
        private authRepo: IAuthRepository
    ) { }

    async execute(request: CreateUserRequest): Promise<User> {
        // 1. Verify Requester is Admin
        const requester = await this.userRepo.findById(request.requesterId);
        if (!requester) {
            throw new UnauthorizedError('User not found');
        }

        if (!requester.isAdmin()) {
            throw new ForbiddenError('Only admins can create users');
        }

        // 2. Create Auth User (without login)
        const authUser = await this.authRepo.createUser(request.email, request.password);

        // 3. Create Profile
        const newUser = new User({
            id: authUser.id,
            email: request.email,
            name: request.name,
            role: request.role,
            status: UserStatus.ACTIVE, // Created by admin = auto active
            phone: request.phone
        });

        // Assign unit if provided
        if (request.unit_id) {
            // Determine building_role based on user's global role
            // Board members get 'board' role in their building
            // Others get 'resident' or 'owner' based on role field
            const buildingRole = request.role === UserRole.BOARD
                ? 'board'
                : (request.role === UserRole.RESIDENT ? 'resident' : 'owner');

            newUser.setUnits([{
                unit_id: request.unit_id,
                building_id: request.building_id,
                role: request.role === UserRole.RESIDENT ? 'resident' : 'owner',
                building_role: buildingRole as 'board' | 'resident' | 'owner',
                is_primary: true
            } as any]);
        }

        return await this.userRepo.create(newUser);
    }
}
