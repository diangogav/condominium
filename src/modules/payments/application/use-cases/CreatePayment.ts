import { IUserRepository } from '@/modules/users/domain/repository';
import { IPaymentRepository } from '../../domain/repository';
import { Payment, PaymentProps } from '../../domain/entities/Payment';
import { PaymentStatus, PaymentMethod } from '@/core/domain/enums';
import { DomainError } from '@/core/errors';

export interface CreatePaymentDTO {
    user_id: string;
    building_id?: string;
    amount: number;
    payment_date: Date;
    method: PaymentMethod;
    reference?: string;
    bank?: string;
    proof_url?: string;
    periods?: string[];
    // unit is no longer passed manually, inferred from user
}

export class CreatePayment {
    constructor(
        private paymentRepo: IPaymentRepository,
        private userRepo: IUserRepository
    ) { }

    async execute(request: CreatePaymentDTO): Promise<Payment> {
        if (request.amount <= 0) {
            throw new DomainError('Amount must be greater than zero', 'VALIDATION_ERROR', 400);
        }

        const user = await this.userRepo.findById(request.user_id);
        if (!user) {
            throw new DomainError('User not found', 'NOT_FOUND', 404);
        }

        if (!user.unit_id) {
            throw new DomainError('User must be assigned to a unit to make payments', 'VALIDATION_ERROR', 400);
        }

        const payment = new Payment({
            id: crypto.randomUUID(),
            user_id: request.user_id,
            building_id: request.building_id || user.building_id,
            amount: request.amount,
            payment_date: request.payment_date,
            method: request.method,
            reference: request.reference,
            bank: request.bank,
            proof_url: request.proof_url,
            status: PaymentStatus.PENDING,
            periods: request.periods,
            unit_id: user.unit_id
        });

        return await this.paymentRepo.create(payment);
    }
}
