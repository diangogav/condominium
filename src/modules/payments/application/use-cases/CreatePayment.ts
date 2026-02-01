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
    unit?: string;
}

export class CreatePayment {
    constructor(private paymentRepo: IPaymentRepository) { }

    async execute(request: CreatePaymentDTO): Promise<Payment> {
        if (request.amount <= 0) {
            throw new DomainError('Amount must be greater than zero', 'VALIDATION_ERROR', 400);
        }

        const payment = new Payment({
            id: crypto.randomUUID(),
            user_id: request.user_id,
            building_id: request.building_id,
            amount: request.amount,
            payment_date: request.payment_date,
            method: request.method,
            reference: request.reference,
            bank: request.bank,
            proof_url: request.proof_url,
            status: PaymentStatus.PENDING,
            periods: request.periods,
            unit: request.unit || '' // Should be populated by caller or fetched
        });

        return await this.paymentRepo.create(payment);
    }
}
