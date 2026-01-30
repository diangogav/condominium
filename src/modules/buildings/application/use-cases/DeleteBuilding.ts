import { IBuildingRepository } from '../../domain/repository';
import { IUserRepository } from '@/modules/users/domain/repository';
import { ForbiddenError, NotFoundError } from '@/core/errors';

export class DeleteBuilding {
    constructor(
        private buildingRepo: IBuildingRepository,
        private userRepo: IUserRepository
    ) { }

    async execute(id: string, deleterId: string): Promise<void> {
        const deleter = await this.userRepo.findById(deleterId);
        if (!deleter) {
            throw new NotFoundError('User not found');
        }

        if (!deleter.isAdmin()) {
            throw new ForbiddenError('Only admins can delete buildings');
        }

        const building = await this.buildingRepo.findById(id);
        if (!building) {
            throw new NotFoundError('Building not found');
        }

        await this.buildingRepo.delete(id);
    }
}
