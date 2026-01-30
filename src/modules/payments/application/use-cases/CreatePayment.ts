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
    period?: string;
}

export class CreatePayment {
    constructor(private paymentRepo: IPaymentRepository) { }

    async execute(dto: CreatePaymentDTO): Promise<Payment> {
        // Validate amount
        if (dto.amount <= 0) {
            throw new DomainError('Amount must be greater than 0', 'INVALID_AMOUNT', 400);
        }

        // Generate ID (in real scenario, this might come from DB)
        const id = crypto.randomUUID();

        const paymentProps: PaymentProps = {
            id,
            user_id: dto.user_id,
            building_id: dto.building_id,
            amount: dto.amount,
            payment_date: dto.payment_date,
            method: dto.method,
            reference: dto.reference,
            bank: dto.bank,
            proof_url: dto.proof_url,
            status: PaymentStatus.PENDING, // Always starts as pending
            period: dto.period
        };

        const payment = new Payment(paymentProps);
        return await this.paymentRepo.create(payment);
    }
}
