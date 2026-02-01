import { Building } from './entities/Building';
import { Unit } from './entities/Unit';

export interface IBuildingRepository {
    create(building: Building): Promise<Building>;
    findAll(): Promise<Building[]>;
    findById(id: string): Promise<Building | null>;
    update(building: Building): Promise<Building>;
    delete(id: string): Promise<void>;
}

export interface IUnitRepository {
    create(unit: Unit): Promise<Unit>;
    findByBuildingId(buildingId: string): Promise<Unit[]>;
    findById(id: string): Promise<Unit | null>;
    update(unit: Unit): Promise<Unit>;
    delete(id: string): Promise<void>;
    // Batch create
    createBatch(units: Unit[]): Promise<Unit[]>;
}
