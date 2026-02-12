export interface BuildingRoleProps {
    building_id: string;
    role: string;
    building_name?: string;
}

export class BuildingRole {
    constructor(private props: BuildingRoleProps) { }

    get building_id(): string { return this.props.building_id; }
    get role(): string { return this.props.role; }
    get building_name(): string | undefined { return this.props.building_name; }

    isBoardMember(): boolean {
        return this.props.role === 'board';
    }

    toJSON(): BuildingRoleProps {
        return { ...this.props };
    }
}
