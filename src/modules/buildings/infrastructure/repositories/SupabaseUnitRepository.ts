import { IUnitRepository } from '../../domain/repository';
import { Unit, UnitProps } from '../../domain/entities/Unit';
import { supabaseAdmin as supabase } from '@/infrastructure/supabase';
import { DomainError } from '@/core/errors';

export class SupabaseUnitRepository implements IUnitRepository {
    private toDomain(data: any): Unit {
        const props: UnitProps = {
            id: data.id,
            building_id: data.building_id,
            name: data.name,
            floor: data.floor,
            aliquot: data.aliquot,
            created_at: new Date(data.created_at),
            updated_at: new Date(data.updated_at),
        };
        return new Unit(props);
    }

    private toPersistence(unit: Unit): any {
        return {
            id: unit.id,
            building_id: unit.building_id,
            name: unit.name,
            floor: unit.floor,
            aliquot: unit.aliquot,
            updated_at: unit.updated_at,
        };
    }

    async create(unit: Unit): Promise<Unit> {
        const persistenceData = {
            ...this.toPersistence(unit),
            created_at: unit.created_at,
        };

        const { data, error } = await supabase
            .from('units')
            .insert(persistenceData)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique violation
                throw new DomainError(`Unit ${unit.name} already exists in this building`, 'VALIDATION_ERROR', 409);
            }
            throw new DomainError('Error creating unit', 'DB_ERROR', 500);
        }

        return this.toDomain(data);
    }

    async createBatch(units: Unit[]): Promise<Unit[]> {
        const persistenceData = units.map(u => ({
            ...this.toPersistence(u),
            created_at: u.created_at,
        }));

        const { data, error } = await supabase
            .from('units')
            .insert(persistenceData)
            .select();

        if (error) {
            throw new DomainError('Error creating batch units: ' + error.message, 'DB_ERROR', 500);
        }

        return data.map(this.toDomain);
    }

    async findByBuildingId(buildingId: string): Promise<Unit[]> {
        const { data, error } = await supabase
            .from('units')
            .select('*')
            .eq('building_id', buildingId)
            .order('name', { ascending: true });

        if (error) {
            throw new DomainError('Error fetching units', 'DB_ERROR', 500);
        }

        return data.map(this.toDomain);
    }

    async findById(id: string): Promise<Unit | null> {
        const { data, error } = await supabase
            .from('units')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new DomainError('Error fetching unit', 'DB_ERROR', 500);
        }

        return this.toDomain(data);
    }

    async update(unit: Unit): Promise<Unit> {
        const persistenceData = this.toPersistence(unit);

        const { data, error } = await supabase
            .from('units')
            .update(persistenceData)
            .eq('id', unit.id)
            .select()
            .single();

        if (error) {
            throw new DomainError('Error updating unit', 'DB_ERROR', 500);
        }

        return this.toDomain(data);
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('units')
            .delete()
            .eq('id', id);

        if (error) {
            throw new DomainError('Error deleting unit', 'DB_ERROR', 500);
        }
    }
}
