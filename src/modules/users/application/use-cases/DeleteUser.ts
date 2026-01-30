import { IUserRepository } from '../../domain/repository';
import { ForbiddenError, NotFoundError } from '@/core/errors';

interface DeleteUserRequest {
    targetId: string;
    deleterId: string;
}

export class DeleteUser {
    constructor(private userRepo: IUserRepository) { }

    async execute({ targetId, deleterId }: DeleteUserRequest): Promise<void> {
        const deleter = await this.userRepo.findById(deleterId);
        if (!deleter) throw new NotFoundError('Deleter not found');

        if (!deleter.isAdmin()) {
            throw new ForbiddenError('Only admins can delete users');
        }

        const userToCheck = await this.userRepo.findById(targetId);
        if (!userToCheck) {
            throw new NotFoundError('User not found');
        }

        await this.userRepo.delete(targetId);
    }
}
