export interface UserUnitProps {
    unit_id: string;
    building_id?: string;
    role: 'owner' | 'resident';
    is_primary: boolean;
}

export class UserUnit {
    constructor(private props: UserUnitProps) { }

    get unit_id(): string { return this.props.unit_id; }
    get building_id(): string | undefined { return this.props.building_id; }
    get role(): 'owner' | 'resident' { return this.props.role; }
    get is_primary(): boolean { return this.props.is_primary; }

    isOwner(): boolean {
        return this.props.role === 'owner';
    }

    toJSON(): UserUnitProps {
        return { ...this.props };
    }
}
