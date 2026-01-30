import { IAuthRepository } from '../repository';
import { IUserRepository } from '@/modules/users/domain/repository';
import { User } from '@/modules/users/domain/entities/User'; // Updated import
import { UserRole, UserStatus } from '@/core/domain/enums';

interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    unit: string;
    building_id: string; // ID of the pre-existing building
}

export class RegisterResident {
    constructor(
        private authRepo: IAuthRepository,
        private userRepo: IUserRepository
    ) { }

    async execute(request: RegisterRequest): Promise<User> {
        // 1. Create Auth User in Supabase
        const authUser = await this.authRepo.signUp(request.email, request.password);

        // 2. Create Public Profile
        // Note: Ideally this should be transactional or handled via Supabase Triggers, 
        // but for this implementation we do it explicitly as requested.
        const user = new User({
            id: authUser.id,
            email: request.email,
            name: request.name,
            unit: request.unit,
            building_id: request.building_id,
            role: UserRole.RESIDENT,
            status: UserStatus.PENDING
        });

        return await this.userRepo.create(user);
    }
}


