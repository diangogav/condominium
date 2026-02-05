import { IUserRepository } from '../../domain/repository';
import { User, UserProps } from '../../domain/entities/User';
import { UserRole } from '@/core/domain/enums';
import { ForbiddenError, NotFoundError } from '@/core/errors';

interface UpdateUserDTO {
    id: string; // ID of the user to update
    updaterId: string; // ID of the user performing the update
    data: Partial<Omit<UserProps, 'id' | 'email' | 'created_at' | 'updated_at'>>;
}

export class UpdateUser {
    constructor(private userRepo: IUserRepository) { }

    async execute({ id, updaterId, data }: UpdateUserDTO): Promise<User> {
        const updater = await this.userRepo.findById(updaterId);
        if (!updater) throw new NotFoundError('Updater not found');

        const targetUser = await this.userRepo.findById(id);
        if (!targetUser) throw new NotFoundError('User not found');

        const isSelfUpdate = id === updaterId;
        const isAdmin = updater.isAdmin();
        const isBoard = updater.isBoardMember();

        // Permission logic
        if (!isSelfUpdate) {
            if (!isAdmin && !isBoard) {
                throw new ForbiddenError('You can only update your own profile');
            }
            if (isBoard) {
                const updaterBuildings = updater.units.map(u => u.building_id).filter(Boolean);
                const targetBuildings = targetUser.units.map(u => u.building_id).filter(Boolean);
                const hasCommonBuilding = updaterBuildings.some(ub => targetBuildings.includes(ub));

                if (!hasCommonBuilding) {
                    throw new ForbiddenError('Board members can only update users in their building');
                }
            }
        }

        // Role change restriction
        if (data.role && data.role !== targetUser.role) {
            if (!isAdmin) {
                throw new ForbiddenError('Only admins can change user roles');
            }
        }

        // Update the user entity
        targetUser.updateProfile(data);

        return await this.userRepo.update(targetUser);
    }
}
