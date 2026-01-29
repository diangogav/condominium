import type { Payment, CreatePaymentProps } from './entities';

export interface IPaymentRepository {
    create(payment: CreatePaymentProps): Promise<Payment>;
    findById(id: string): Promise<Payment | null>;
    findByUserId(userId: string, year?: number): Promise<Payment[]>;
    findAll(): Promise<Payment[]>;
}
