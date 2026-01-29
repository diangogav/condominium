export type SolvencyStatus = 'SOLVENT' | 'PENDING' | 'OVERDUE';

export interface DashboardSummary {
    solvency_status: SolvencyStatus;
    last_payment_date: string | null;
    pending_periods: string[];
    recent_transactions: PaymentSummary[];
}

export interface PaymentSummary {
    id: string;
    amount: number;
    payment_date: string;
    method: string;
    status: string;
    period?: string;
}
