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
}
