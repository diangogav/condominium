import { describe, it, expect } from 'bun:test';
import { Payment, PaymentProps } from '@/modules/payments/domain/entities/Payment';
import { PaymentStatus, PaymentMethod } from '@/core/domain/enums';

describe('Payment Entity', () => {
    it('should create a payment instance', () => {
        const props: PaymentProps = {
            id: '1',
            user_id: 'user-1',
            building_id: 'building-1',
            amount: 100,
            payment_date: new Date('2024-01-15'),
            method: PaymentMethod.PAGO_MOVIL,
            proof_url: 'http://example.com/proof.jpg',
            status: PaymentStatus.PENDING,
            periods: ['2024-03'],
            notes: 'Test payment'
        };

        const payment = new Payment(props);

        expect(payment.id).toBe('1');
        expect(payment.user_id).toBe('user-1');
        expect(payment.amount).toBe(100);
        expect(payment.proof_url).toBe(props.proof_url);
        expect(payment.status).toBe(props.status);
        expect(payment.periods).toEqual(props.periods);
        expect(payment.notes).toBe(props.notes);
        expect(payment.reference).toBeUndefined();
        expect(payment.bank).toBeUndefined();
    });

    it('should correctly identify pending payment', () => {
        const payment = new Payment({
            id: '1',
            user_id: 'user-1',
            amount: 100,
            payment_date: new Date(),
            method: PaymentMethod.TRANSFER,
            status: PaymentStatus.PENDING
        });

        expect(payment.isPending()).toBe(true);
        expect(payment.isApproved()).toBe(false);
        expect(payment.isRejected()).toBe(false);
    });

    it('should approve a payment', () => {
        const payment = new Payment({
            id: '1',
            user_id: 'user-1',
            amount: 100,
            payment_date: new Date(),
            method: PaymentMethod.CASH,
            status: PaymentStatus.PENDING
        });

        payment.approve('Approved by admin');

        expect(payment.status).toBe(PaymentStatus.APPROVED);
        expect(payment.notes).toBe('Approved by admin');
        expect(payment.isApproved()).toBe(true);
    });

    it('should not change status if already approved', () => {
        const payment = new Payment({
            id: '1',
            user_id: 'user-1',
            amount: 100,
            payment_date: new Date(),
            method: PaymentMethod.PAGO_MOVIL,
            status: PaymentStatus.APPROVED
        });

        payment.approve();

        expect(payment.status).toBe(PaymentStatus.APPROVED);
    });

    it('should reject a payment', () => {
        const payment = new Payment({
            id: '1',
            user_id: 'user-1',
            amount: 100,
            payment_date: new Date(),
            method: PaymentMethod.TRANSFER,
            status: PaymentStatus.PENDING
        });

        payment.reject('Invalid proof');

        expect(payment.status).toBe(PaymentStatus.REJECTED);
        expect(payment.notes).toBe('Invalid proof');
        expect(payment.isRejected()).toBe(true);
    });

    it('should update notes', () => {
        const payment = new Payment({
            id: '1',
            user_id: 'user-1',
            amount: 100,
            payment_date: new Date(),
            method: PaymentMethod.CASH,
            status: PaymentStatus.PENDING
        });

        payment.updateNotes('Additional information');

        expect(payment.notes).toBe('Additional information');
    });
});
