import { DomainError } from '@/core/errors';

export interface PaymentAllocationProps {
    id: string;
    payment_id: string;
    invoice_id: string;
    amount: number;
    created_at?: Date;
}

export class PaymentAllocation {
    constructor(private props: PaymentAllocationProps) {
        this.validate();
        if (!this.props.created_at) this.props.created_at = new Date();
    }

    private validate() {
        if (this.props.amount <= 0) {
            throw new DomainError('Allocation amount must be greater than zero', 'VALIDATION_ERROR', 400);
        }
    }

    get id(): string { return this.props.id; }
    get payment_id(): string { return this.props.payment_id; }
    get invoice_id(): string { return this.props.invoice_id; }
    get amount(): number { return this.props.amount; }
    get created_at(): Date { return this.props.created_at!; }

    toJSON(): PaymentAllocationProps {
        return { ...this.props };
    }
}
