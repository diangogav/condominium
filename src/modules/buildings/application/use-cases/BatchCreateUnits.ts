import { IUnitRepository, IBuildingRepository } from '@/modules/buildings/domain/repository';
import { Unit } from '@/modules/buildings/domain/entities/Unit';
import { DomainError, NotFoundError } from '@/core/errors';

export interface BatchCreateUnitsDTO {
    building_id: string;
    floors: string[]; // e.g., ["1", "2", "3"] or ["PB", "1", "2"]
    unitsPerFloor: string[]; // e.g., ["A", "B", "C", "D"]
}

export class BatchCreateUnits {
    constructor(
        private unitRepo: IUnitRepository,
        private buildingRepo: IBuildingRepository
    ) { }

    async execute(data: BatchCreateUnitsDTO): Promise<Unit[]> {
        // Validate building exists
        const building = await this.buildingRepo.findById(data.building_id);
        if (!building) {
            throw new NotFoundError('Building not found');
        }

        const unitsToCreate: Unit[] = [];

        for (const floor of data.floors) {
            for (const letter of data.unitsPerFloor) {
                const name = `${floor}-${letter}`; // Standard naming convention for now

                unitsToCreate.push(new Unit({
                    id: crypto.randomUUID(),
                    building_id: data.building_id,
                    name: name,
                    floor: floor,
                    // Aliquot defaults to 0, can be updated later
                }));
            }
        }

        if (unitsToCreate.length === 0) {
            throw new DomainError('No units generated from parameters', 'VALIDATION_ERROR', 400);
        }

        return await this.unitRepo.createBatch(unitsToCreate);
    }
}
