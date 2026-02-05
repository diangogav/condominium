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
            // We need to check if targetUser belongs to a building that access matches
            // Target user might have multiple units. Check if ANY overlap.
            const approverBuildings = approver.units.map(u => u.building_id).filter(Boolean);
            const targetBuildings = targetUser.units.map(u => u.building_id).filter(Boolean);

            const hasCommonBuilding = approverBuildings.some(b => targetBuildings.includes(b));

            if (!hasCommonBuilding) {
                // If target user is new, they might not have units yet?
                // Actually they apply with building_id in DTO, but Entity doesn't store it.
                // Wait, if User is PENDING, they likely don't have units assigned via UserUnit yet?
                // Usually Admin/Board assigns unit.
                // Creating a user involves profile creation. Does it assign units?
                // CreateUser use case: `saveUnits`. Yes.

                throw new ForbiddenError('You can only approve users from your building');
            }
        }

        targetUser.approve();
        await this.userRepo.update(targetUser);
    }
}
