import { IUserRepository } from '../../domain/repository';
import { UserUnit, UserUnitProps } from '../../domain/entities/UserUnit';
import { DomainError } from '@/core/errors';

export interface AssignUnitToUserDTO {
    userId: string;
    unitId: string;
    role: 'owner' | 'resident';
    building_role?: 'board' | 'resident' | 'owner';  // Optional: defaults to resident
    isPrimary: boolean;
}

export class AssignUnitToUser {
    constructor(private userRepository: IUserRepository) { }

    async execute(dto: AssignUnitToUserDTO): Promise<void> {
        const user = await this.userRepository.findById(dto.userId);
        if (!user) {
            throw new DomainError('User not found', 'NOT_FOUND', 404);
        }

        // Logic to update user units. 
        // Note: Repository update usually replaces the whole user or we might need a specific method 
        // if we are updating a relation table directly. 
        // But Domain-wise, we add it to the user entity and save.
        // However, Supabase/SQL fetch/save might be tricky with relations.
        // We will assume repository.update handles saving the units list to profile_units.

        const currentUnits = user.units;

        // Check if already assigned
        const exists = currentUnits.find(u => u.unit_id === dto.unitId);
        if (exists) {
            // Update role/primary status if needed, or throw error?
            // Let's allow updating.
            // But UserUnit is a Value Object (immutable-ish usually). 
            // We'll replace the list.
            const newUnits = currentUnits.filter(u => u.unit_id !== dto.unitId);
            newUnits.push(new UserUnit({
                unit_id: dto.unitId,
                role: dto.role,
                building_role: dto.building_role || 'resident',
                is_primary: dto.isPrimary
            }));
            user.setUnits(newUnits);
        } else {
            const newUnits = [...currentUnits, new UserUnit({
                unit_id: dto.unitId,
                role: dto.role,
                building_role: dto.building_role || 'resident',
                is_primary: dto.isPrimary
            })];
            user.setUnits(newUnits);
        }

        // Handle primary flag logic: if new is primary, unset others?
        if (dto.isPrimary) {
            // TODO: Unset other primaries if we enforce single primary
            const updatedUnits = user.units.map(u => {
                if (u.unit_id === dto.unitId) return u;
                return new UserUnit({ ...u.toJSON(), is_primary: false });
            });
            user.setUnits(updatedUnits);
        }

        await this.userRepository.update(user);
    }
}
