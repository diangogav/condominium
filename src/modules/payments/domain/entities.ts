export type PaymentMethod = 'PAGO_MOVIL' | 'TRANSFER' | 'CASH';
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Payment {
    id: string;
    user_id: string;
    amount: number;
    payment_date: Date;
    method: PaymentMethod;
    reference?: string;
    bank?: string;
    proof_url?: string;
    status: PaymentStatus;
    period?: string; // e.g., "2024-03" for March 2024
    notes?: string;
    created_at: Date;
    updated_at: Date;
}

export interface CreatePaymentProps {
    user_id: string;
    amount: number;
    payment_date: Date;
    method: PaymentMethod;
    reference?: string;
    bank?: string;
    proof_url?: string;
    period?: string;
}
