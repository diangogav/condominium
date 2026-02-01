import { IPaymentRepository } from '../../domain/repository';
import { IUserRepository } from '@/modules/users/domain/repository';
import { Payment } from '../../domain/entities/Payment';
import { NotFoundError } from '@/core/errors';

export class GetUnitPayments {
    constructor(
        private paymentRepo: IPaymentRepository,
        private userRepo: IUserRepository
    ) { }

    async execute(userId: string, year?: number): Promise<Payment[]> {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        if (!user.building_id || !user.unit_id) {
            return []; // No unit assigned yet
        }

        return await this.paymentRepo.findByUnit(user.building_id, user.unit_id, year);
    }
}
