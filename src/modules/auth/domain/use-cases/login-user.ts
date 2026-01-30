import { IAuthRepository, AuthSession } from '../repository';
import { IUserRepository } from '@/modules/users/domain/repository';
import { User } from '@/modules/users/domain/entities/User';

export interface LoginResponse {
    token: AuthSession;
    user: User;
}

export class LoginUser {
    constructor(
        private authRepo: IAuthRepository,
        private userRepo: IUserRepository
    ) { }

    async execute(email: string, password: string): Promise<LoginResponse> {
        const session = await this.authRepo.signIn(email, password);

        let user = await this.userRepo.findById(session.user.id);

        if (!user) {
            // Fallback or Error? 
            // If user exists in Auth but not in Profile (edge case), maybe return basic info or throw?
            // For now, let's assume consistence or throw.
            throw new Error('User profile not found');
        }

        return {
            token: session,
            user
        };
    }
}
