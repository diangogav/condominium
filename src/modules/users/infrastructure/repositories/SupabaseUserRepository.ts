import { IUserRepository, FindAllUsersFilters } from '../../domain/repository';
import { User, UserProps } from '../../domain/entities/User';
import { supabase } from '@/infrastructure/supabase';
import { DomainError } from '@/core/errors';
import { UserRole, UserStatus } from '@/core/domain/enums';

export class SupabaseUserRepository implements IUserRepository {
    private toDomain(data: any): User {
        const props: UserProps = {
            id: data.id,
            email: data.email,
            name: data.name,
            phone: data.phone,
            unit: data.unit,
            building_id: data.building_id,
            role: data.role as UserRole,
            status: data.status as UserStatus || UserStatus.PENDING, // Default to PENDING if not set
            created_at: new Date(data.created_at),
            updated_at: new Date(data.updated_at),
        };
        return new User(props);
    }

    private toPersistence(user: User): any {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            unit: user.unit,
            building_id: user.building_id,
            role: user.role,
            status: user.status,
            updated_at: user.updated_at,
            // created_at is usually handled by DB default or only on insert
        };
    }

    async create(user: User): Promise<User> {
        const persistenceData = {
            ...this.toPersistence(user),
            created_at: user.created_at, // Explicitly set for new users if needed
        };

        const { data, error } = await supabase
            .from('profiles')
            .insert(persistenceData)
            .select()
            .single();

        if (error) {
            throw new DomainError('Error creating user profile: ' + error.message, 'DB_ERROR', 500);
        }

        return this.toDomain(data);
    }

    async findById(id: string): Promise<User | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw new DomainError('Error fetching user profile', 'DB_ERROR', 500);
        }

        return this.toDomain(data);
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

        return this.toDomain(data);
    }

    async update(user: User): Promise<User> {
        const persistenceData = this.toPersistence(user);
        // Exclude immutable fields if necessary, but update usually handles what you pass
        const { data, error } = await supabase
            .from('profiles')
            .update(persistenceData)
            .eq('id', user.id)
            .select()
            .single();

        if (error) {
            throw new DomainError('Error updating user profile', 'DB_ERROR', 500);
        }

        return this.toDomain(data);
    }

    async findAll(filters?: FindAllUsersFilters): Promise<User[]> {
        let query = supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters?.building_id) {
            query = query.eq('building_id', filters.building_id);
        }
        if (filters?.role) {
            query = query.eq('role', filters.role);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        const { data, error } = await query;

        if (error) {
            throw new DomainError('Error fetching users', 'DB_ERROR', 500);
        }

        return data.map(this.toDomain);
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id);

        if (error) {
            throw new DomainError('Error deleting user', 'DB_ERROR', 500);
        }
    }
}
