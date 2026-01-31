import { IPaymentRepository } from '../../domain/repository';
import { IUserRepository } from '@/modules/users/domain/repository';
import { ForbiddenError, NotFoundError } from '@/core/errors';

export interface ApprovePaymentDTO {
    paymentId: string;
    approverId: string;
    notes?: string;
    periods?: string[];
}

export interface RejectPaymentDTO {
    paymentId: string;
    approverId: string;
    notes?: string;
}

export class ApprovePayment {
    constructor(
        private paymentRepo: IPaymentRepository,
        private userRepo: IUserRepository
    ) { }

    async approve({ paymentId, approverId, notes, periods }: ApprovePaymentDTO): Promise<void> {
        const approver = await this.userRepo.findById(approverId);
        if (!approver) {
            throw new NotFoundError('Approver not found');
        }

        if (!approver.isAdmin() && !approver.isBoardMember()) {
            throw new ForbiddenError('Only admins and board members can approve payments');
        }

        const payment = await this.paymentRepo.findById(paymentId);
        if (!payment) {
            throw new NotFoundError('Payment not found');
        }

        // Board members can only approve payments from their building
        if (approver.isBoardMember()) {
            if (approver.building_id !== payment.building_id) {
                throw new ForbiddenError('You can only approve payments from your building');
            }
        }

        payment.approve(notes, periods);
        await this.paymentRepo.update(payment);
    }

    async reject({ paymentId, approverId, notes }: RejectPaymentDTO): Promise<void> {
        const approver = await this.userRepo.findById(approverId);
        if (!approver) {
            throw new NotFoundError('Approver not found');
        }

        if (!approver.isAdmin() && !approver.isBoardMember()) {
            throw new ForbiddenError('Only admins and board members can reject payments');
        }

        const payment = await this.paymentRepo.findById(paymentId);
        if (!payment) {
            throw new NotFoundError('Payment not found');
        }

        // Board members can only reject payments from their building
        if (approver.isBoardMember()) {
            if (approver.building_id !== payment.building_id) {
                throw new ForbiddenError('You can only reject payments from your building');
            }
        }

        payment.reject(notes);
        await this.paymentRepo.update(payment);
    }
}
