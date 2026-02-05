import { User, UserProps } from '../../domain/entities/User';
import { UserUnit } from '../../domain/entities/UserUnit';
import { supabaseAdmin as supabase } from '@/infrastructure/supabase';
import { DomainError } from '@/core/errors';
import { UserRole, UserStatus } from '@/core/domain/enums';
import { IUserRepository, FindAllUsersFilters } from '../../domain/repository';

export class SupabaseUserRepository implements IUserRepository {
    private toDomain(data: any): User {
        const units = data.profile_units?.map((u: any) => new UserUnit({
            unit_id: u.unit_id,
            building_id: u.units?.building_id, // Map from joined units table
            role: u.role,
            is_primary: u.is_primary
        })) || [];

        const props: UserProps = {
            id: data.id,
            email: data.email,
            name: data.name,
            phone: data.phone,
            units: units,
            role: data.role as UserRole,
            status: data.status as UserStatus || UserStatus.PENDING,
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
            role: user.role,
            status: user.status,
            updated_at: user.updated_at
        };
    }

    async create(user: User): Promise<User> {
        const persistenceData = {
            ...this.toPersistence(user),
            created_at: user.created_at,
        };

        const { data, error } = await supabase
            .from('profiles')
            .insert(persistenceData)
            .select('id, email, name, phone, role, status, created_at, updated_at')
            .single();

        if (error) {
            throw new DomainError('Error creating user profile: ' + error.message, 'DB_ERROR', 500);
        }

        // Handle units if any (usually empty on create unless specified)
        if (user.units.length > 0) {
            await this.saveUnits(user.id, user.units);
        }

        return this.toDomain({ ...data, profile_units: [] }); // Start empty or re-fetch
    }

    async findById(id: string): Promise<User | null> {
        // Fetch profile with units
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, name, phone, role, status, created_at, updated_at, profile_units(*, units(building_id))')
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
            .select('id, email, name, phone, role, status, created_at, updated_at, profile_units(*, units(building_id))')
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
        const { data, error } = await supabase
            .from('profiles')
            .update(persistenceData)
            .eq('id', user.id)
            .select('id, email, name, phone, role, status, created_at, updated_at, profile_units(*, units(building_id))')
            .single();

        if (error) {
            throw new DomainError('Error updating user profile', 'DB_ERROR', 500);
        }

        // Update units
        await this.saveUnits(user.id, user.units);

        // Re-fetch to be sure? Or just return domain. 
        // saveUnits might change DB state.

        return await this.findById(user.id) as User;
    }

    private async saveUnits(userId: string, units: UserUnit[]) {
        // Naive implementation: Delete all and re-insert. 
        // Safe for small number of units.

        await supabase.from('profile_units').delete().eq('profile_id', userId);

        if (units.length > 0) {
            const unitsData = units.map(u => ({
                profile_id: userId,
                unit_id: u.unit_id,
                role: u.role,
                is_primary: u.is_primary
            }));

            const { error } = await supabase.from('profile_units').insert(unitsData);
            if (error) {
                throw new DomainError('Error saving user units: ' + error.message, 'DB_ERROR', 500);
            }
        }
    }

    async findAll(filters?: FindAllUsersFilters): Promise<User[]> {
        // Base query with joins
        // We use !inner only when filtering to enforce existence, otherwise likely left join (default in select)
        // But we want to start with a query that allows filtering if needed.
        // Actually, simpler to construct the query based on filters.

        let query = supabase.from('profiles').select('id, email, name, phone, role, status, created_at, updated_at, profile_units(*, units(building_id))');

        if (filters?.role) {
            query = query.eq('role', filters.role);
        }
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        if (filters?.unit_id) {
            // Filter users who have a specific unit assignment
            // Need !inner on profile_units to filter the parent profile
            query = supabase.from('profiles')
                .select('id, email, name, phone, role, status, created_at, updated_at, profile_units!inner(*, units(building_id))')
                .eq('profile_units.unit_id', filters.unit_id);
        }

        if (filters?.building_id) {
            // Filter users who have a unit in specific building
            // Need !inner on profile_units AND units
            query = supabase.from('profiles')
                .select('id, email, name, phone, role, status, created_at, updated_at, profile_units!inner(*, units!inner(building_id))')
                .eq('profile_units.units.building_id', filters.building_id);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;


        if (error) {
            throw new DomainError('Error fetching users', 'DB_ERROR', 500);
        }

        return data.map((d: any) => this.toDomain(d));
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
