import { IPaymentRepository } from '../../domain/repository';
import { Payment } from '../../domain/entities/Payment';

export class GetUserPayments {
    constructor(private paymentRepo: IPaymentRepository) { }

    async execute(userId: string, year?: number): Promise<Payment[]> {
        return await this.paymentRepo.findByUserId(userId, year);
    }
}
