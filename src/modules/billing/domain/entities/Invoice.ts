import { DomainError } from '@/core/errors';

export enum InvoiceStatus {
    PENDING = 'PENDING',
    PAID = 'PAID',
    CANCELLED = 'CANCELLED'
}

export enum InvoiceType {
    EXPENSE = 'EXPENSE',
    DEBT = 'DEBT',
    EXTRAORDINARY = 'EXTRAORDINARY'
}

export interface InvoiceProps {
    id: string;
    unit_id: string;
    amount: number;
    period: string;
    issue_date: Date;
    due_date?: Date;
    status: InvoiceStatus;
    type: InvoiceType;
    description?: string;
    paid_amount?: number;
    created_at?: Date;
    updated_at?: Date;
}

export class Invoice {
    constructor(private props: InvoiceProps) {
        this.validate();
        if (!this.props.created_at) this.props.created_at = new Date();
        if (!this.props.updated_at) this.props.updated_at = new Date();
    }

    private validate() {
        if (this.props.amount < 0) {
            throw new DomainError('Invoice amount cannot be negative', 'VALIDATION_ERROR', 400);
        }
        if (!this.props.period) {
            throw new DomainError('Invoice period is required', 'VALIDATION_ERROR', 400);
        }
    }

    get id(): string { return this.props.id; }
    get unit_id(): string { return this.props.unit_id; }
    get amount(): number { return this.props.amount; }
    get period(): string { return this.props.period; }
    get issue_date(): Date { return this.props.issue_date; }
    get due_date(): Date | undefined { return this.props.due_date; }
    get status(): InvoiceStatus { return this.props.status; }
    get type(): InvoiceType { return this.props.type; }
    get description(): string | undefined { return this.props.description; }
    get paid_amount(): number { return this.props.paid_amount || 0; }
    get created_at(): Date { return this.props.created_at!; }
    get updated_at(): Date { return this.props.updated_at!; }

    isPaid(): boolean {
        return this.props.status === InvoiceStatus.PAID;
    }

    markAsPaid(): void {
        this.props.status = InvoiceStatus.PAID;
        this.props.updated_at = new Date();
    }

    markAsPartiallyPaid(): void {
        if (this.props.status !== InvoiceStatus.PAID) {
            this.props.status = InvoiceStatus.PENDING;
            this.props.updated_at = new Date();
        }
    }

    cancel(): void {
        this.props.status = InvoiceStatus.CANCELLED;
        this.props.updated_at = new Date();
    }

    toJSON(): InvoiceProps {
        return { ...this.props };
    }
}
