import { IUnitRepository } from '@/modules/buildings/domain/repository';
import { Unit } from '@/modules/buildings/domain/entities/Unit';

export class GetUnitsByBuilding {
    constructor(private unitRepo: IUnitRepository) { }

    async execute(buildingId: string): Promise<Unit[]> {
        return await this.unitRepo.findByBuildingId(buildingId);
    }
}
