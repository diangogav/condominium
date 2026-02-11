import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ApprovePayment } from '@/modules/payments/application/use-cases/ApprovePayment';
import { MockPaymentRepository } from '../mocks';
import { MockUserRepository } from '../../users/mocks';
import { Payment } from '@/modules/payments/domain/entities/Payment';
import { User } from '@/modules/users/domain/entities/User';
import { PaymentMethod, PaymentStatus, UserRole, UserStatus, PettyCashTransactionType, PettyCashCategory } from '@/core/domain/enums';
import { IPaymentAllocationRepository, IInvoiceRepository } from '@/modules/billing/domain/repository';
import { IUnitRepository } from '@/modules/buildings/domain/repository';
import { PettyCashRepository } from '@/modules/petty-cash/domain/repositories/PettyCashRepository';

describe('ApprovePayment Use Case', () => {
    let paymentRepo: MockPaymentRepository;
    let userRepo: MockUserRepository;
    let allocationRepo: IPaymentAllocationRepository;
    let invoiceRepo: IInvoiceRepository;
    let unitRepo: IUnitRepository;
    let pettyCashRepo: PettyCashRepository;
    let approvePayment: ApprovePayment;

    beforeEach(() => {
        paymentRepo = new MockPaymentRepository();
        userRepo = new MockUserRepository();
        allocationRepo = {
            findByPaymentId: mock(async () => []),
            create: mock(),
            findByInvoiceId: mock(),
            findPaymentsByInvoiceId: mock(),
            findInvoicesByPaymentId: mock()
        };
        invoiceRepo = {
            findById: mock(async () => null),
            create: mock(),
            findAll: mock(),
            findInvoicesForAdmin: mock(),
            update: mock(),
            createBatch: mock()
        };
        unitRepo = {
            findById: mock(async () => null),
            create: mock(),
            update: mock(),
            delete: mock(),
            findByBuildingId: mock(async () => []),
            createBatch: mock(async (u) => u)
        };
        pettyCashRepo = {
            findFundByBuildingId: mock(async () => null),
            saveFund: mock(async (f) => f),
            saveTransaction: mock(async (t) => t),
            findTransactionsByFundId: mock()
        };
        approvePayment = new ApprovePayment(
            paymentRepo,
            userRepo,
            allocationRepo,
            invoiceRepo,
            unitRepo,
            pettyCashRepo
        );
    });

    it('should approve payment when requested by admin', async () => {
        const admin = new User({
            id: 'admin-1',
            email: 'admin@test.com',
            name: 'Admin',
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE
        });
        // Admin doesn't necessarily need units, but for consistency:
        admin.setUnits([{ unit_id: 'A1', building_id: 'building-1', building_role: 'owner', is_primary: true } as any]);

        const payment = new Payment({
            id: 'payment-1',
            user_id: 'user-1',
            building_id: 'building-1',
            amount: 100,
            payment_date: new Date(),
            method: PaymentMethod.PAGO_MOVIL,
            status: PaymentStatus.PENDING,
            unit_id: 'A1'
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
            role: UserRole.BOARD,
            status: UserStatus.ACTIVE
        });
        board.setUnits([{ unit_id: 'B1', building_id: 'building-1', building_role: 'board', is_primary: true } as any]);

        const payment = new Payment({
            id: 'payment-1',
            user_id: 'user-1',
            building_id: 'building-1',
            amount: 100,
            payment_date: new Date(),
            method: PaymentMethod.TRANSFER,
            status: PaymentStatus.PENDING,
            unit_id: 'B1'
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
            role: UserRole.BOARD,
            status: UserStatus.ACTIVE
        });
        board.setUnits([{ unit_id: 'B1', building_id: 'building-2', building_role: 'board', is_primary: true } as any]);

        const payment = new Payment({
            id: 'payment-1',
            user_id: 'user-1',
            building_id: 'building-1',
            amount: 100,
            payment_date: new Date(),
            method: PaymentMethod.CASH,
            status: PaymentStatus.PENDING,
            unit_id: 'B1'
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
            role: UserRole.RESIDENT,
            status: UserStatus.ACTIVE
        });
        resident.setUnits([{ unit_id: 'C1', building_id: 'building-1', building_role: 'resident', is_primary: true } as any]);

        const payment = new Payment({
            id: 'payment-1',
            user_id: 'user-1',
            building_id: 'building-1',
            amount: 100,
            payment_date: new Date(),
            method: PaymentMethod.PAGO_MOVIL,
            status: PaymentStatus.PENDING,
            unit_id: 'C1'
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
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE
        });
        admin.setUnits([{ unit_id: 'A1', building_id: 'building-1', building_role: 'owner', is_primary: true } as any]);

        const payment = new Payment({
            id: 'payment-1',
            user_id: 'user-1',
            building_id: 'building-1',
            amount: 100,
            payment_date: new Date(),
            method: PaymentMethod.TRANSFER,
            status: PaymentStatus.PENDING,
            unit_id: 'A1'
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
