import type { Building } from './entities';

export interface IBuildingRepository {
    findAll(): Promise<Building[]>;
    findById(id: string): Promise<Building | null>;
}
