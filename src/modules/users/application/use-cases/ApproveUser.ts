import { IUserRepository } from '../../domain/repository';
import { UserRole } from '@/core/domain/enums';
import { DomainError, ForbiddenError, NotFoundError } from '@/core/errors';

interface ApproveUserDTO {
    targetUserId: string;
    approverId: string;
}

export class ApproveUser {
    constructor(private userRepo: IUserRepository) { }

    async execute({ targetUserId, approverId }: ApproveUserDTO): Promise<void> {
        const approver = await this.userRepo.findById(approverId);
        if (!approver) {
            throw new NotFoundError('Approver not found');
        }

        if (!approver.isAdmin() && !approver.isBoardMember()) {
            throw new ForbiddenError('Only admins and board members can approve users');
        }

        const targetUser = await this.userRepo.findById(targetUserId);
        if (!targetUser) {
            throw new NotFoundError('Target user not found');
        }

        // Board members can only approve users in their building
        if (approver.isBoardMember()) {
            if (approver.building_id !== targetUser.building_id) {
                throw new ForbiddenError('You can only approve users from your building');
            }
        }

        targetUser.approve();
        await this.userRepo.update(targetUser);
    }
}
