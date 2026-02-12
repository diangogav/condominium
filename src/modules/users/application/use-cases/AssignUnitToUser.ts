import { IUserRepository } from '../../domain/repository';
import { UserUnit } from '../../domain/entities/UserUnit';
import { DomainError } from '@/core/errors';
import { BuildingRole } from '../../domain/entities/BuildingRole';
import { User } from '../../domain/entities/User';

export interface AssignUnitDTO {
    userId: string;
    unitId: string;
    buildingId: string;
    buildingRole?: string;
    isPrimary?: boolean;
}

export class AssignUnitToUser {
    constructor(private userRepository: IUserRepository) { }

    async execute(data: AssignUnitDTO): Promise<void> {
        const user = await this.userRepository.findById(data.userId);
        if (!user) {
            throw new DomainError('User not found', 'USER_NOT_FOUND', 404);
        }

        this.applyUnitAssignment(user, data);
        this.applyBuildingRole(user, data);

        await this.userRepository.update(user);
    }

    private applyUnitAssignment(user: User, data: AssignUnitDTO): void {
        const existingUnit = user.units.find(u => u.unit_id === data.unitId);

        if (!existingUnit) {
            this.addNewUnit(user, data);
            return;
        }

        if (data.isPrimary && !existingUnit.is_primary) {
            this.promoteToPrimary(user, data.unitId);
        }
    }

    private addNewUnit(user: User, data: AssignUnitDTO): void {
        let currentUnits = user.units;

        if (data.isPrimary) {
            currentUnits = currentUnits.map(u =>
                new UserUnit({ ...u.toJSON(), is_primary: false })
            );
        }

        const newUnit = new UserUnit({
            unit_id: data.unitId,
            building_id: data.buildingId,
            is_primary: !!data.isPrimary
        });

        user.setUnits([...currentUnits, newUnit]);
    }

    private promoteToPrimary(user: User, unitId: string): void {
        const updatedUnits = user.units.map(u =>
            new UserUnit({
                ...u.toJSON(),
                is_primary: u.unit_id === unitId
            })
        );
        user.setUnits(updatedUnits);
    }

    private applyBuildingRole(user: User, data: AssignUnitDTO): void {
        if (!data.buildingRole) return;

        const alreadyHasRole = user.buildingRoles.some(r =>
            r.building_id === data.buildingId && r.role === data.buildingRole
        );

        if (alreadyHasRole) return;

        // Ensure we don't duplicate roles for the same building/role pair
        // (though 'some' check above covers basic case)
        const otherRoles = user.buildingRoles.filter(r =>
            !(r.building_id === data.buildingId && r.role === data.buildingRole)
        );

        const newBuildingRole = new BuildingRole({
            building_id: data.buildingId,
            role: data.buildingRole
        });

        user.setBuildingRoles([...otherRoles, newBuildingRole]);
    }
}
