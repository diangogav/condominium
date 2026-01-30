import { Payment } from './entities/Payment';
import { PaymentStatus } from '@/core/domain/enums';

export interface FindAllPaymentsFilters {
    building_id?: string;
    status?: PaymentStatus;
    period?: string;
    year?: string;
    user_id?: string;
}

export interface IPaymentRepository {
    create(payment: Payment): Promise<Payment>;
    findById(id: string): Promise<Payment | null>;
    findByUserId(userId: string, year?: number): Promise<Payment[]>;
    update(payment: Payment): Promise<Payment>;
    findAll(filters?: FindAllPaymentsFilters): Promise<Payment[]>;
    delete(id: string): Promise<void>;
}
