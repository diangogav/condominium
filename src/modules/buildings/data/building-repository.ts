import type { IBuildingRepository } from '../domain/repository';
import type { Building } from '../domain/entities';
import { supabase } from '@/infrastructure/supabase';
import { DomainError } from '@/core/errors';

export class BuildingRepository implements IBuildingRepository {
    async findAll(): Promise<Building[]> {
        const { data, error } = await supabase
            .from('buildings')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            throw new DomainError('Error fetching buildings: ' + error.message, 'DB_ERROR', 500);
        }

        return data as Building[];
    }

    async findById(id: string): Promise<Building | null> {
        const { data, error } = await supabase
            .from('buildings')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw new DomainError('Error fetching building', 'DB_ERROR', 500);
        }

        return data as Building;
    }

    async create(building: Omit<Building, 'id' | 'created_at'>): Promise<Building> {
        const { data, error } = await supabase
            .from('buildings')
            .insert(building)
            .select()
            .single();

        if (error) {
            throw new DomainError('Error creating building: ' + error.message, 'DB_ERROR', 500);
        }

        return data as Building;
    }

    async update(id: string, building: Partial<Omit<Building, 'id' | 'created_at'>>): Promise<Building> {
        const { data, error } = await supabase
            .from('buildings')
            .update(building)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                throw new DomainError('Building not found', 'NOT_FOUND', 404);
            }
            throw new DomainError('Error updating building: ' + error.message, 'DB_ERROR', 500);
        }

        return data as Building;
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('buildings')
            .delete()
            .eq('id', id);

        if (error) {
            throw new DomainError('Error deleting building: ' + error.message, 'DB_ERROR', 500);
        }
    }
}
