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
            newUser.setUnits([{
                unit_id: request.unit_id,
                // building_id is theoretically retrievable from request.building_id or via DB.
                // For now, we rely on what's passed or what's needed.
                // Actually, if we pass building_id in request, we can store it in UserUnit.
                building_id: request.building_id,

                role: request.role === UserRole.RESIDENT ? 'resident' : 'owner',
                // Simplification: Residents are residents, others (Board/Admin) might be owners 
                // or just have access. Let's assume 'owner' for board/admin for now or 'resident' if unspecified.
                // Better logic: If role is Resident -> Resident. If Owner (not a role, but a relation) -> Owner.
                // Use case doesn't specify relation type. Defaulting to 'resident' or checking role.
                is_primary: true
            } as any]);
        }

        return await this.userRepo.create(newUser);
    }
}
