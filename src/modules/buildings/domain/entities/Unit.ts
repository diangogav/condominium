import { DomainError } from '../../../../core/errors';

export interface UnitProps {
    id: string;
    building_id: string;
    name: string;
    floor?: string | null;
    aliquot?: number | null;
    created_at?: Date;
    updated_at?: Date;
}

export class Unit {
    constructor(private props: UnitProps) {
        this.validate();
    }

    private validate() {
        if (!this.props.name || this.props.name.trim().length === 0) {
            throw new DomainError('Unit name is required', 'VALIDATION_ERROR', 400);
        }
        if (!this.props.building_id) {
            throw new DomainError('Building ID is required', 'VALIDATION_ERROR', 400);
        }
    }

    get id(): string { return this.props.id; }
    get building_id(): string { return this.props.building_id; }
    get name(): string { return this.props.name; }
    get floor(): string | null { return this.props.floor ?? null; }
    get aliquot(): number | null { return this.props.aliquot ?? null; }
    get created_at(): Date { return this.props.created_at || new Date(); }
    get updated_at(): Date { return this.props.updated_at || new Date(); }

    update(props: Partial<Omit<UnitProps, 'id' | 'building_id' | 'created_at'>>) {
        if (props.name !== undefined) this.props.name = props.name;
        if (props.floor !== undefined) this.props.floor = props.floor;
        if (props.aliquot !== undefined) this.props.aliquot = props.aliquot;
        this.props.updated_at = new Date();
        this.validate();
    }

    toJSON() {
        return {
            id: this.props.id,
            building_id: this.props.building_id,
            name: this.props.name,
            floor: this.props.floor ?? null,
            aliquot: this.props.aliquot ?? null,
            created_at: this.props.created_at,
            updated_at: this.props.updated_at
        };
    }
}
