import { IBuildingRepository } from '../../domain/repository';
import { Building } from '../../domain/entities/Building';

export class GetBuildings {
    constructor(private buildingRepo: IBuildingRepository) { }

    async execute(): Promise<Building[]> {
        return await this.buildingRepo.findAll();
    }
}
