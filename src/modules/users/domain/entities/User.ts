import { UserRole, UserStatus } from '@/core/domain/enums';
import { DomainError } from '@/core/errors';

import { UserUnit } from './UserUnit';

export interface UserProps {
    id: string;
    email: string;
    name: string;
    phone?: string;
    units?: UserUnit[]; // New multi-unit support
    role: UserRole;
    status: UserStatus;
    created_at?: Date;
    updated_at?: Date;
}

export class User {
    constructor(private props: UserProps) {
        if (!props.created_at) {
            this.props.created_at = new Date();
        }
        if (!props.updated_at) {
            this.props.updated_at = new Date();
        }
        if (!props.units) {
            this.props.units = [];
        }
    }

    get id(): string { return this.props.id; }
    get email(): string { return this.props.email; }
    get name(): string { return this.props.name; }
    get phone(): string | undefined { return this.props.phone; }

    // Multi-apartment support
    get units(): UserUnit[] { return this.props.units || []; }

    // Helper to get primary unit ID if needed for backward compat in logic
    get primaryUnitId(): string | undefined {
        return this.primaryUnit?.unit_id || this.units[0]?.unit_id;
    }

    get role(): UserRole { return this.props.role; }
    get status(): UserStatus { return this.props.status; }
    get created_at(): Date { return this.props.created_at!; }
    get updated_at(): Date { return this.props.updated_at!; }

    get primaryUnit(): UserUnit | undefined {
        return this.units.find(u => u.is_primary);
    }

    isAdmin(): boolean {
        return this.props.role === UserRole.ADMIN;
    }

    isBoardMember(): boolean {
        return this.props.role === UserRole.BOARD;
    }

    isResident(): boolean {
        return this.props.role === UserRole.RESIDENT;
    }

    approve(): void {
        if (this.props.status === UserStatus.ACTIVE) return;
        this.props.status = UserStatus.ACTIVE;
        this.props.updated_at = new Date();
    }

    reject(): void {
        this.props.status = UserStatus.REJECTED;
        this.props.updated_at = new Date();
    }

    isActive(): boolean {
        return this.props.status === UserStatus.ACTIVE;
    }

    updateProfile(data: Partial<Omit<UserProps, 'id' | 'email' | 'role' | 'status' | 'created_at' | 'updated_at' | 'units'>>): void {
        this.props = {
            ...this.props,
            ...data,
            updated_at: new Date()
        };
    }

    changeRole(newRole: UserRole): void {
        this.props.role = newRole;
        this.props.updated_at = new Date();
    }

    setUnits(units: UserUnit[]) {
        this.props.units = units;
        this.props.updated_at = new Date();
    }

    /**
     * Check if user is board member in a specific building
     */
    isBoardInBuilding(buildingId: string): boolean {
        return this.units.some(u =>
            u.building_id === buildingId && u.isBoardInBuilding()
        );
    }

    /**
     * Get all buildings where user is board
     */
    getBuildingsWhereBoard(): string[] {
        const buildingIds = this.units
            .filter(u => u.isBoardInBuilding())
            .map(u => u.building_id!)
            .filter(Boolean);
        // Use Set to ensure uniqueness (user might have multiple units in same building)
        return Array.from(new Set(buildingIds));
    }

    /**
     * Check if user has any board role in any building
     */
    isBoardMemberAnywhere(): boolean {
        return this.units.some(u => u.isBoardInBuilding());
    }

    toJSON(): UserProps {
        return this.props;
    }

    toString(): string {
        return JSON.stringify(this.toJSON());
    }
}
