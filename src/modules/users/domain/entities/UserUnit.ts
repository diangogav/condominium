export interface UserUnitProps {
    unit_id: string;
    building_id?: string;
    role: 'owner' | 'resident';  // Legacy: relationship to unit
    building_role?: 'board' | 'resident' | 'owner';  // New: building-specific permissions
    is_primary: boolean;
}

export class UserUnit {
    constructor(private props: UserUnitProps) {
        // Default building_role to resident if not specified
        if (!this.props.building_role) {
            this.props.building_role = 'resident';
        }
    }

    get unit_id(): string { return this.props.unit_id; }
    get building_id(): string | undefined { return this.props.building_id; }
    get role(): 'owner' | 'resident' { return this.props.role; }
    get building_role(): 'board' | 'resident' | 'owner' { return this.props.building_role!; }
    get is_primary(): boolean { return this.props.is_primary; }

    isOwner(): boolean {
        return this.props.role === 'owner';
    }

    isBoardInBuilding(): boolean {
        return this.props.building_role === 'board';
    }

    toJSON(): UserUnitProps {
        return { ...this.props };
    }
}
