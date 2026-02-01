import { Payment } from './entities/Payment';
import { PaymentStatus } from '@/core/domain/enums';

export interface FindAllPaymentsFilters {
    building_id?: string;
    status?: PaymentStatus;
    user_id?: string;
    unit_id?: string;
    period?: string;
    year?: number;
}

export interface IPaymentRepository {
    create(payment: Payment): Promise<Payment>;
    findById(id: string): Promise<Payment | null>;
    findByUserId(userId: string, year?: number): Promise<Payment[]>;
    findByUnit(buildingId: string, unitId: string, year?: number): Promise<Payment[]>;
    update(payment: Payment): Promise<Payment>;
    findAll(filters?: FindAllPaymentsFilters): Promise<Payment[]>;
    delete(id: string): Promise<void>;
}
