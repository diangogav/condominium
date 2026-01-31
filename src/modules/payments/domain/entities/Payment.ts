import { PaymentStatus, PaymentMethod } from '@/core/domain/enums';

export interface PaymentProps {
    id: string;
    user_id: string;
    building_id?: string;
    amount: number;
    payment_date: Date;
    method: PaymentMethod;
    reference?: string;
    bank?: string;
    proof_url?: string;
    status: PaymentStatus;
    periods?: string[]; // e.g., ["2024-03", "2024-04"]
    notes?: string;
    created_at?: Date;
    updated_at?: Date;
}

export class Payment {
    constructor(private props: PaymentProps) {
        if (!props.created_at) {
            this.props.created_at = new Date();
        }
        if (!props.updated_at) {
            this.props.updated_at = new Date();
        }
    }

    get id(): string { return this.props.id; }
    get user_id(): string { return this.props.user_id; }
    get building_id(): string | undefined { return this.props.building_id; }
    get amount(): number { return this.props.amount; }
    get payment_date(): Date { return this.props.payment_date; }
    get method(): PaymentMethod { return this.props.method; }
    get reference(): string | undefined { return this.props.reference; }
    get bank(): string | undefined { return this.props.bank; }
    get proof_url(): string | undefined { return this.props.proof_url; }
    get status(): PaymentStatus { return this.props.status; }
    get periods(): string[] | undefined { return this.props.periods; }
    get notes(): string | undefined { return this.props.notes; }
    get created_at(): Date { return this.props.created_at!; }
    get updated_at(): Date { return this.props.updated_at!; }

    isPending(): boolean {
        return this.props.status === PaymentStatus.PENDING;
    }

    isApproved(): boolean {
        return this.props.status === PaymentStatus.APPROVED;
    }

    isRejected(): boolean {
        return this.props.status === PaymentStatus.REJECTED;
    }

    approve(notes?: string, overriddenPeriods?: string[]): void {
        if (this.props.status === PaymentStatus.APPROVED) return;
        this.props.status = PaymentStatus.APPROVED;
        if (notes) this.props.notes = notes;
        if (overriddenPeriods && overriddenPeriods.length > 0) {
            this.props.periods = overriddenPeriods;
        }
        this.props.updated_at = new Date();
    }

    reject(notes?: string): void {
        if (this.props.status === PaymentStatus.REJECTED) return;
        this.props.status = PaymentStatus.REJECTED;
        if (notes) this.props.notes = notes;
        this.props.updated_at = new Date();
    }

    updateNotes(notes: string): void {
        this.props.notes = notes;
        this.props.updated_at = new Date();
    }

    toJSON(): PaymentProps {
        return this.props;
    }

    toString(): string {
        return JSON.stringify(this.toJSON());
    }
}
