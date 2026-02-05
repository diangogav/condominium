import { IUserRepository } from '../../domain/repository';
import { UserUnit } from '../../domain/entities/UserUnit';
import { DomainError } from '@/core/errors';

export class GetUserUnits {
    constructor(private userRepository: IUserRepository) { }

    async execute(userId: string): Promise<UserUnit[]> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new DomainError('User not found', 'NOT_FOUND', 404);
        }
        return user.units;
    }
}
