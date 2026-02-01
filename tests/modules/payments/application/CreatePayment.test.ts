import { describe, it, expect, beforeEach } from 'bun:test';
import { CreatePayment } from '@/modules/payments/application/use-cases/CreatePayment';
import { MockPaymentRepository } from '../mocks';
import { MockUserRepository } from '../../users/mocks';
import { PaymentMethod, PaymentStatus, UserRole, UserStatus } from '@/core/domain/enums';
import { User } from '@/modules/users/domain/entities/User';

describe('CreatePayment Use Case', () => {
    let paymentRepo: MockPaymentRepository;
    let userRepo: MockUserRepository;
    let createPayment: CreatePayment;

    beforeEach(() => {
        paymentRepo = new MockPaymentRepository();
        userRepo = new MockUserRepository();
        createPayment = new CreatePayment(paymentRepo, userRepo);
    });

    it('should create a payment with pending status by default', async () => {
        // Setup user
        await userRepo.create(new User({
            id: 'user-1',
            name: 'Test',
            email: 'test@example.com',
            role: UserRole.RESIDENT,
            status: UserStatus.ACTIVE,
            building_id: 'building-1',
            unit_id: 'unit-1'
        }));

        const payment = await createPayment.execute({
            user_id: 'user-1',
            building_id: 'building-1',
            amount: 100,
            payment_date: new Date('2024-01-15'),
            method: PaymentMethod.PAGO_MOVIL,
            reference: '123456',
            periods: ['2024-01']
        });

        expect(payment.status).toBe(PaymentStatus.PENDING);
        expect(payment.amount).toBe(100);
        expect(payment.user_id).toBe('user-1');
    });

    it('should fail if amount is zero or negative', async () => {
        await expect(createPayment.execute({
            user_id: 'user-1',
            amount: 0,
            payment_date: new Date(),
            method: PaymentMethod.CASH
        })).rejects.toThrow();

        await expect(createPayment.execute({
            user_id: 'user-1',
            amount: -50,
            payment_date: new Date(),
            method: PaymentMethod.TRANSFER
        })).rejects.toThrow();
    });
});
