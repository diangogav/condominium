import type { SolvencyStatus, DashboardSummary } from '../entities';
import type { IPaymentRepository } from '@/modules/payments/domain/repository';
import type { IUserRepository } from '@/modules/users/domain/repository';

export class CalculateSolvency {
    constructor(
        private paymentRepo: IPaymentRepository,
        private userRepo: IUserRepository
    ) { }

    async execute(userId: string): Promise<DashboardSummary> {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12

        // Get user to determine billing start date
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const userCreatedAt = new Date(user.created_at);
        const startYear = userCreatedAt.getFullYear();
        const startMonth = userCreatedAt.getMonth() + 1; // 1-12

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

        // Determine pending periods (only months since user registration)
        const pendingPeriods: string[] = [];

        // Only check current year if user was created this year
        if (startYear === currentYear) {
            // Start from registration month
            for (let month = startMonth; month <= currentMonth; month++) {
                const period = `${currentYear}-${String(month).padStart(2, '0')}`;
                if (!paidMonths.has(period)) {
                    pendingPeriods.push(period);
                }
            }
        } else {
            // User registered in previous year, check all months of current year
            for (let month = 1; month <= currentMonth; month++) {
                const period = `${currentYear}-${String(month).padStart(2, '0')}`;
                if (!paidMonths.has(period)) {
                    pendingPeriods.push(period);
                }
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
            ? approvedPayments[0].payment_date.toISOString()
            : null;

        // Get recent transactions (last 5)
        const recentTransactions = payments.slice(0, 5).map(p => ({
            id: p.id,
            amount: p.amount,
            payment_date: p.payment_date.toISOString(),
            method: p.method,
            status: p.status,
            period: p.period
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
