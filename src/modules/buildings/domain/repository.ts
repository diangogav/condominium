import { Building } from './entities/Building';

export interface IBuildingRepository {
    create(building: Building): Promise<Building>;
    findAll(): Promise<Building[]>;
    findById(id: string): Promise<Building | null>;
    update(building: Building): Promise<Building>;
    delete(id: string): Promise<void>;
}
