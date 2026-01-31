export interface BuildingProps {
    id: string;
    name: string;
    address: string;
    created_at?: Date;
    updated_at?: Date;
}

export class Building {
    constructor(private props: BuildingProps) {
        if (!props.created_at) {
            this.props.created_at = new Date();
        }
        if (!props.updated_at) {
            this.props.updated_at = new Date();
        }
    }

    get id(): string { return this.props.id; }
    get name(): string { return this.props.name; }
    get address(): string { return this.props.address; }
    get created_at(): Date { return this.props.created_at!; }
    get updated_at(): Date { return this.props.updated_at!; }

    updateName(name: string): void {
        if (!name || name.trim().length === 0) {
            throw new Error('Building name cannot be empty');
        }
        this.props.name = name;
        this.props.updated_at = new Date();
    }

    updateAddress(address: string): void {
        if (!address || address.trim().length === 0) {
            throw new Error('Building address cannot be empty');
        }
        this.props.address = address;
        this.props.updated_at = new Date();
    }

    toJSON(): BuildingProps {
        return this.props;
    }

    toString(): string {
        return JSON.stringify(this.toJSON());
    }
}
