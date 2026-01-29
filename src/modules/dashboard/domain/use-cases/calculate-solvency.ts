import type { SolvencyStatus, DashboardSummary } from '../entities';
import type { IPaymentRepository } from '@/modules/payments/domain/repository';

export class CalculateSolvency {
    constructor(private paymentRepo: IPaymentRepository) { }

    async execute(userId: string): Promise<DashboardSummary> {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12

        // Get all payments for current year
        const payments = await this.paymentRepo.findByUserId(userId, currentYear);

        // Get approved payments only
        const approvedPayments = payments.filter(p => p.status === 'APPROVED');

        // Calculate which months have been paid
        const paidMonths = new Set<string>();
        approvedPayments.forEach(payment => {
            if (payment.period) {
                paidMonths.add(payment.period);
            }
        });

        // Determine pending periods (months not paid yet)
        const pendingPeriods: string[] = [];
        for (let month = 1; month <= currentMonth; month++) {
            const period = `${currentYear}-${String(month).padStart(2, '0')}`;
            if (!paidMonths.has(period)) {
                pendingPeriods.push(period);
            }
        }

        // Calculate solvency status
        let solvencyStatus: SolvencyStatus = 'SOLVENT';

        if (pendingPeriods.length > 0) {
            // Check if current month is pending
            const currentPeriod = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
            const isCurrentMonthPending = pendingPeriods.includes(currentPeriod);

            if (isCurrentMonthPending && pendingPeriods.length === 1) {
                // Only current month pending - check if within grace period (5 days)
                const dayOfMonth = now.getDate();
                if (dayOfMonth <= 5) {
                    solvencyStatus = 'SOLVENT'; // Within grace period
                } else {
                    solvencyStatus = 'PENDING';
                }
            } else if (pendingPeriods.length > 1 || !isCurrentMonthPending) {
                // Multiple months pending or past months pending
                solvencyStatus = 'OVERDUE';
            }
        }

        // Get last payment date
        const lastPaymentDate = approvedPayments.length > 0
            ? approvedPayments[0].payment_date.toISOString().split('T')[0]
            : null;

        // Get recent transactions (last 5)
        const recentTransactions = payments.slice(0, 5).map(p => ({
            id: p.id,
            amount: p.amount,
            payment_date: p.payment_date.toISOString().split('T')[0],
            method: p.method,
            status: p.status,
            period: p.period
        }));

        return {
            solvency_status: solvencyStatus,
            last_payment_date: lastPaymentDate,
            pending_periods: pendingPeriods,
            recent_transactions: recentTransactions
        };
    }
}
