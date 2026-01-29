import { IUserRepository } from '../domain/repository';
import { User, CreateUserProps, UpdateUserProps } from '../domain/entities';
import { supabase } from '@/infrastructure/supabase';
import { DomainError } from '@/core/errors';

export class UserRepository implements IUserRepository {
    async create(props: CreateUserProps): Promise<User> {
        const { data, error } = await supabase
            .from('profiles')
            .insert({
                id: props.id,
                email: props.email,
                name: props.name,
                unit: props.unit,
                building_id: props.building_id,
                role: props.role || 'resident',
                updated_at: new Date(),
            })
            .select()
            .single();

        if (error) {
            throw new DomainError('Error creating user profile: ' + error.message, 'DB_ERROR', 500);
        }

        return data as User;
    }

    async findById(id: string): Promise<User | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found code
            throw new DomainError('Error fetching user profile', 'DB_ERROR', 500);
        }

        return data as User;
    }

    async findByEmail(email: string): Promise<User | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new DomainError('Error fetching user profile', 'DB_ERROR', 500);
        }

        return data as User;
    }

    async update(id: string, props: UpdateUserProps): Promise<User> {
        const { data, error } = await supabase
            .from('profiles')
            .update({
                ...props,
                updated_at: new Date()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new DomainError('Error updating user profile', 'DB_ERROR', 500);
        }

        return data as User;
    }
}
