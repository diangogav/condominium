import { IUserRepository } from '../../domain/repository';
import { User } from '../../domain/entities/User';
import { ForbiddenError, NotFoundError } from '@/core/errors';

interface GetUserByIdRequest {
    targetId: string;
    requesterId: string;
}

export class GetUserById {
    constructor(private userRepo: IUserRepository) { }

    async execute({ targetId, requesterId }: GetUserByIdRequest): Promise<User> {
        const requester = await this.userRepo.findById(requesterId);
        if (!requester) {
            // Technically this might be 401 if we trusted the token, but here it's 404 in domain
            throw new NotFoundError('Requester not found');
        }

        // If fetching self, always allow
        if (targetId === requesterId) {
            return requester;
        }

        // If fetching others, check permissions
        if (!requester.isAdmin() && !requester.isBoardMember()) {
            throw new ForbiddenError('You can only view your own profile');
        }

        const targetUser = await this.userRepo.findById(targetId);
        if (!targetUser) {
            throw new NotFoundError('User not found');
        }

        if (requester.isBoardMember()) {
            if (requester.building_id !== targetUser.building_id) {
                throw new ForbiddenError('You can only view users from your building');
            }
        }

        return targetUser;
    }
}
