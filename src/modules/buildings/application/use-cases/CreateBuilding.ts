import { IBuildingRepository } from '../../domain/repository';
import { Building, BuildingProps } from '../../domain/entities/Building';
import { IUserRepository } from '@/modules/users/domain/repository';
import { ForbiddenError, NotFoundError } from '@/core/errors';

export interface CreateBuildingDTO {
    name: string;
    address: string;
    creatorId: string;
}

export class CreateBuilding {
    constructor(
        private buildingRepo: IBuildingRepository,
        private userRepo: IUserRepository
    ) { }

    async execute(dto: CreateBuildingDTO): Promise<Building> {
        const creator = await this.userRepo.findById(dto.creatorId);
        if (!creator) {
            throw new NotFoundError('User not found');
        }

        if (!creator.isAdmin()) {
            throw new ForbiddenError('Only admins can create buildings');
        }

        const id = crypto.randomUUID();
        const buildingProps: BuildingProps = {
            id,
            name: dto.name,
            address: dto.address
        };

        const building = new Building(buildingProps);
        return await this.buildingRepo.create(building);
    }
}
