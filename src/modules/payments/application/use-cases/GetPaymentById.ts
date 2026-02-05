import { IPaymentRepository } from '../../domain/repository';
import { Payment } from '../../domain/entities/Payment';
import { IUserRepository } from '@/modules/users/domain/repository';
import { NotFoundError, UnauthorizedError } from '@/core/errors';

export class GetPaymentById {
    constructor(
        private paymentRepo: IPaymentRepository,
        private userRepo: IUserRepository // To check generic permissions if needed, but simple ID check suffices
    ) { }

    async execute(paymentId: string, requesterId: string): Promise<Payment> {
        const payment = await this.paymentRepo.findById(paymentId);

        if (!payment) {
            throw new NotFoundError('Payment not found');
        }

        // Authorization checks
        const requester = await this.userRepo.findById(requesterId);
        if (!requester) {
            throw new UnauthorizedError('User not found');
        }

        // 1. Owner can see own payment
        if (payment.user_id === requesterId) {
            return payment;
        }

        // 2. Admin can see any payment
        if (requester.isAdmin()) {
            return payment;
        }

        // 3. Board member can see payments from their building
        if (requester.isBoardMember()) {
            const validBuildingIds = requester.units.map(u => u.building_id);
            if (validBuildingIds.includes(payment.building_id)) {
                return payment;
            }
        }

        throw new UnauthorizedError('You are not authorized to view this payment');
    }
}
