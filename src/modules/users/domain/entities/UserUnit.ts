export interface UserUnitProps {
    unit_id: string;
    building_id?: string;
    building_role: 'board' | 'resident' | 'owner';
    is_primary: boolean;
}

export class UserUnit {
    constructor(private props: UserUnitProps) { }

    get unit_id(): string { return this.props.unit_id; }
    get building_id(): string | undefined { return this.props.building_id; }
    get building_role(): 'board' | 'resident' | 'owner' { return this.props.building_role; }
    get is_primary(): boolean { return this.props.is_primary; }

    isOwner(): boolean {
        return this.props.building_role === 'owner';
    }

    isBoardInBuilding(): boolean {
        return this.props.building_role === 'board';
    }

    isResident(): boolean {
        return this.props.building_role === 'resident';
    }

    toJSON(): UserUnitProps {
        return { ...this.props };
    }
}
