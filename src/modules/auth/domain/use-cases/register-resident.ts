import { IAuthRepository, AuthSession } from '../repository';
import { IUserRepository } from '@/modules/users/domain/repository';
import { User } from '@/modules/users/domain/entities/User'; // Updated import
import { UserRole, UserStatus } from '@/core/domain/enums';

interface RegisterRequest {
    name: string;
    email: string;
    password: string;

    unit_id: string;
    building_id: string; // ID of the pre-existing building
}

export class RegisterResident {
    constructor(
        private authRepo: IAuthRepository,
        private userRepo: IUserRepository
    ) { }

    async execute(request: RegisterRequest): Promise<AuthSession> {
        // 1. Create Auth User in Supabase
        const authUser = await this.authRepo.signUp(request.email, request.password);

        // 2. Create Public Profile
        const user = new User({
            id: authUser.id,
            email: request.email,
            name: request.name,
            unit_id: request.unit_id,
            building_id: request.building_id,
            role: UserRole.RESIDENT,
            status: UserStatus.PENDING
        });

        await this.userRepo.create(user);

        // 3. Auto-login to return session
        return await this.authRepo.signIn(request.email, request.password);
    }
}


