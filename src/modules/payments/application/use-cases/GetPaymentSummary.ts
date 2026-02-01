import { IPaymentRepository } from '../../domain/repository';
import { IUserRepository } from '@/modules/users/domain/repository';
import { SolvencyStatus, PaymentStatus } from '@/core/domain/enums';
import { DomainError, NotFoundError } from '@/core/errors';
import { Payment } from '../../domain/entities/Payment';

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
    periods?: string[];
}

export class GetPaymentSummary {
    constructor(
        private paymentRepo: IPaymentRepository,
        private userRepo: IUserRepository
    ) { }

    async execute(userId: string): Promise<PaymentSummaryDTO> {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12

        // Get user to determine billing start date
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        const userCreatedAt = new Date(user.created_at);
        const startYear = userCreatedAt.getFullYear();
        const startMonth = userCreatedAt.getMonth() + 1; // 1-12

        if (!user.building_id || !user.unit) {
            throw new DomainError('User is not assigned to a building or unit', 'USER_ERROR', 400);
        }

        // Get all payments for the unit (apartment) in the current year
        const payments = await this.paymentRepo.findByUnit(user.building_id, user.unit, currentYear);

        // Get approved payments only
        const approvedPayments = payments.filter(p => p.isApproved());

        // Calculate which months have been paid
        const paidMonths = new Set<string>();
        approvedPayments.forEach(payment => {
            if (payment.periods && payment.periods.length > 0) {
                payment.periods.forEach(period => paidMonths.add(period));
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
        let solvencyStatus: SolvencyStatus = SolvencyStatus.SOLVENT;

        if (pendingPeriods.length > 0) {
            // Check if current month is pending
            const currentPeriod = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
            const isCurrentMonthPending = pendingPeriods.includes(currentPeriod);

            if (isCurrentMonthPending && pendingPeriods.length === 1) {
                // Only current month pending - check if within grace period (5 days)
                const dayOfMonth = now.getDate();
                if (dayOfMonth <= 5) {
                    solvencyStatus = SolvencyStatus.SOLVENT; // Within grace period
                } else {
                    solvencyStatus = SolvencyStatus.PENDING;
                }
            } else if (pendingPeriods.length > 1 || !isCurrentMonthPending) {
                // Multiple months pending or past months pending
                solvencyStatus = SolvencyStatus.OVERDUE;
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
            periods: p.periods
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
