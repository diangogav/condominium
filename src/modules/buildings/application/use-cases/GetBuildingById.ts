import { IBuildingRepository } from '../../domain/repository';
import { Building } from '../../domain/entities/Building';
import { NotFoundError } from '@/core/errors';

export class GetBuildingById {
    constructor(private buildingRepo: IBuildingRepository) { }

    async execute(id: string): Promise<Building> {
        const building = await this.buildingRepo.findById(id);
        if (!building) {
            throw new NotFoundError('Building not found');
        }
        return building;
    }
}
