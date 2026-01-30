import { describe, it, expect, beforeEach } from 'bun:test';
import { ApprovePayment } from '@/modules/payments/application/use-cases/ApprovePayment';
import { MockPaymentRepository } from '../mocks';
import { MockUserRepository } from '../../users/mocks';
import { Payment } from '@/modules/payments/domain/entities/Payment';
import { User } from '@/modules/users/domain/entities/User';
import { PaymentMethod, PaymentStatus, UserRole, UserStatus } from '@/core/domain/enums';

describe('ApprovePayment Use Case', () => {
    let paymentRepo: MockPaymentRepository;
    let userRepo: MockUserRepository;
    let approvePayment: ApprovePayment;

    beforeEach(() => {
        paymentRepo = new MockPaymentRepository();
        userRepo = new MockUserRepository();
        approvePayment = new ApprovePayment(paymentRepo, userRepo);
    });

    it('should approve payment when requested by admin', async () => {
        const admin = new User({
            id: 'admin-1',
            email: 'admin@test.com',
            name: 'Admin',
            unit: 'A1',
            building_id: 'building-1',
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE
        });

        const payment = new Payment({
            id: 'payment-1',
            user_id: 'user-1',
            building_id: 'building-1',
            amount: 100,
            payment_date: new Date(),
            method: PaymentMethod.PAGO_MOVIL,
            status: PaymentStatus.PENDING
        });

        await userRepo.create(admin);
        await paymentRepo.create(payment);

        await approvePayment.approve({
            paymentId: 'payment-1',
            approverId: 'admin-1',
            notes: 'Approved'
        });

        const updated = await paymentRepo.findById('payment-1');
        expect(updated?.status).toBe(PaymentStatus.APPROVED);
        expect(updated?.notes).toBe('Approved');
    });

    it('should approve payment when requested by board member of same building', async () => {
        const board = new User({
            id: 'board-1',
            email: 'board@test.com',
            name: 'Board Member',
            unit: 'B1',
            building_id: 'building-1',
            role: UserRole.BOARD,
            status: UserStatus.ACTIVE
        });

        const payment = new Payment({
            id: 'payment-1',
            user_id: 'user-1',
            building_id: 'building-1',
            amount: 100,
            payment_date: new Date(),
            method: PaymentMethod.TRANSFER,
            status: PaymentStatus.PENDING
        });

        await userRepo.create(board);
        await paymentRepo.create(payment);

        await approvePayment.approve({
            paymentId: 'payment-1',
            approverId: 'board-1'
        });

        const updated = await paymentRepo.findById('payment-1');
        expect(updated?.status).toBe(PaymentStatus.APPROVED);
    });

    it('should fail when board member is from different building', async () => {
        const board = new User({
            id: 'board-1',
            email: 'board@test.com',
            name: 'Board Member',
            unit: 'B1',
            building_id: 'building-2',
            role: UserRole.BOARD,
            status: UserStatus.ACTIVE
        });

        const payment = new Payment({
            id: 'payment-1',
            user_id: 'user-1',
            building_id: 'building-1',
            amount: 100,
            payment_date: new Date(),
            method: PaymentMethod.CASH,
            status: PaymentStatus.PENDING
        });

        await userRepo.create(board);
        await paymentRepo.create(payment);

        expect(async () => {
            await approvePayment.approve({
                paymentId: 'payment-1',
                approverId: 'board-1'
            });
        }).toThrow();
    });

    it('should fail when approver is resident', async () => {
        const resident = new User({
            id: 'resident-1',
            email: 'resident@test.com',
            name: 'Resident',
            unit: 'C1',
            building_id: 'building-1',
            role: UserRole.RESIDENT,
            status: UserStatus.ACTIVE
        });

        const payment = new Payment({
            id: 'payment-1',
            user_id: 'user-1',
            building_id: 'building-1',
            amount: 100,
            payment_date: new Date(),
            method: PaymentMethod.PAGO_MOVIL,
            status: PaymentStatus.PENDING
        });

        await userRepo.create(resident);
        await paymentRepo.create(payment);

        expect(async () => {
            await approvePayment.approve({
                paymentId: 'payment-1',
                approverId: 'resident-1'
            });
        }).toThrow();
    });

    it('should reject payment', async () => {
        const admin = new User({
            id: 'admin-1',
            email: 'admin@test.com',
            name: 'Admin',
            unit: 'A1',
            building_id: 'building-1',
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE
        });

        const payment = new Payment({
            id: 'payment-1',
            user_id: 'user-1',
            building_id: 'building-1',
            amount: 100,
            payment_date: new Date(),
            method: PaymentMethod.TRANSFER,
            status: PaymentStatus.PENDING
        });

        await userRepo.create(admin);
        await paymentRepo.create(payment);

        await approvePayment.reject({
            paymentId: 'payment-1',
            approverId: 'admin-1',
            notes: 'Invalid proof'
        });

        const updated = await paymentRepo.findById('payment-1');
        expect(updated?.status).toBe(PaymentStatus.REJECTED);
        expect(updated?.notes).toBe('Invalid proof');
    });
});
