export interface UserUnitProps {
    unit_id: string;
    unit_name?: string;
    building_id?: string;
    building_name?: string;
    is_primary: boolean;
}

export class UserUnit {
    constructor(private props: UserUnitProps) { }

    get unit_id(): string { return this.props.unit_id; }
    get unit_name(): string | undefined { return this.props.unit_name; }
    get building_id(): string | undefined { return this.props.building_id; }
    get building_name(): string | undefined { return this.props.building_name; }
    get is_primary(): boolean { return this.props.is_primary; }

    toJSON(): UserUnitProps {
        return { ...this.props };
    }
}
