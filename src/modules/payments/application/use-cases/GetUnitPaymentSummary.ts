import { IPaymentRepository } from '../../domain/repository';
import { IUserRepository } from '@/modules/users/domain/repository';
import { SolvencyStatus } from '@/core/domain/enums';
import { DomainError, NotFoundError } from '@/core/errors';

export interface PaymentSummaryDTO {
    solvency_status: SolvencyStatus;
    last_payment_date: string | null;
    pending_periods: string[];
    paid_periods: string[];
    recent_transactions: PaymentTransactionDTO[];
}

export interface PaymentTransactionDTO {
    id: string;
    amount: number;
    payment_date: string;
    method: string;
    status: string;
    periods?: string[] | null; // This is now legacy/empty
}

export class GetUnitPaymentSummary {
    constructor(
        private paymentRepo: IPaymentRepository,
        private userRepo: IUserRepository,
        private getUnitBalance: { execute: (unitId: string) => Promise<{ totalDebt: number, details: any[] }> }
    ) { }

    async execute(userId: string): Promise<PaymentSummaryDTO> {
        const now = new Date();
        const currentYear = now.getFullYear();

        // Get user to determine unit
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        const unit = user.units.find(u => u.is_primary) || user.units[0];

        if (!unit || !unit.building_id || !unit.unit_id) {
            throw new DomainError('User is not assigned to a building or unit', 'USER_ERROR', 400);
        }

        // Get Balance details (Total Debt & Pending Invoices)
        const balance = await this.getUnitBalance.execute(unit.unit_id);

        // Get all payments for the unit (apartment) in the current year
        const payments = await this.paymentRepo.findByUnit(unit.unit_id, currentYear);
        const approvedPayments = payments.filter(p => p.isApproved());

        // Calculate pending periods based on Balance (Invoices)
        // If an invoice is PENDING (status logic checked in GetUnitBalance), it's a pending period.
        const pendingPeriods = balance.details
            .filter(d => d.status === 'PENDING') // Redundant check if balance only returns pending, but safe
            .map(d => d.period); // Assuming period format is consistent

        // Calculate paid periods based on Allocations (Invoices that are PAID)
        // Ideally we should query Paid Invoices, but for now we can infer from "Not Pending" 
        // OR rely on the `periods` string in payments primarily for "what user said they paid" vs "what is actually covered".
        // The user want `paid_periods` to be based on Invoices logic? 
        // Actually, "paid_periods" usually helps to color the calendar. 
        // If we strictly follow Invoices: we need to fetch PAID invoices for the year.
        // But GetUnitBalance only gives Pending. 
        // Let's stick to the user request: "summary logic ... based on invoices".
        // Use `periods` from Approved Payments for "Paid Periods" history (visual) as it reflects cash flow,
        // BUT use Pending Invoices for "Solvency".

        const paidMonths = new Set<string>();
        // Legacy paid months calculation from periods removed

        // Solvency Status Logic
        let solvencyStatus: SolvencyStatus = SolvencyStatus.SOLVENT;

        if (balance.totalDebt > 0) {
            // There is debt. Check if it's just current month or overdue.
            const currentPeriod = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const isCurrentMonthPending = pendingPeriods.includes(currentPeriod);

            // If we have pending items other than current month, or multiple items -> Overdue
            const historicalPending = pendingPeriods.filter(p => p !== currentPeriod);

            if (historicalPending.length > 0) {
                solvencyStatus = SolvencyStatus.OVERDUE;
            } else if (isCurrentMonthPending) {
                // Only current month is pending. Check grace period.
                const dayOfMonth = now.getDate();
                if (dayOfMonth <= 5) {
                    solvencyStatus = SolvencyStatus.SOLVENT;
                } else {
                    solvencyStatus = SolvencyStatus.PENDING;
                }
            } else {
                // Returns debt but no specific period match (maybe old debt or extra charge), defaulting to Pending
                solvencyStatus = SolvencyStatus.PENDING;
            }
        }

        // Get last payment date
        const lastPaymentDate = approvedPayments.length > 0
            ? approvedPayments[0].payment_date.toISOString()
            : null;

        // Get recent transactions (last 5)
        const recentTransactions: PaymentTransactionDTO[] = payments.slice(0, 5).map(p => ({
            id: p.id,
            amount: p.amount,
            payment_date: p.payment_date.toISOString(),
            method: p.method,
            status: p.status,
            periods: [] // Explicitly empty as it's legacy
        }));

        return {
            solvency_status: solvencyStatus,
            last_payment_date: lastPaymentDate,
            pending_periods: pendingPeriods,
            paid_periods: Array.from(paidMonths),
            recent_transactions: recentTransactions
        };
    }
}
