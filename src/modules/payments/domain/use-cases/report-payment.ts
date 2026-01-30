import type { IPaymentRepository } from '../repository';
import type { Payment, PaymentMethod } from '../entities';
import { StorageService } from '@/infrastructure/storage';

interface ReportPaymentRequest {
    user_id: string;
    building_id?: string; // Add building_id
    amount: number;
    payment_date: Date;
    method: PaymentMethod;
    reference?: string;
    bank?: string;
    proof_file?: File;
    period?: string;
}

export class ReportPayment {
    constructor(
        private paymentRepo: IPaymentRepository,
        private storageService: StorageService
    ) { }

    async execute(request: ReportPaymentRequest): Promise<Payment> {
        let proofUrl: string | undefined;

        // Upload proof if provided
        if (request.proof_file) {
            proofUrl = await this.storageService.uploadProof(
                request.proof_file,
                request.user_id
            );
        }

        // Create payment record
        const payment = await this.paymentRepo.create({
            user_id: request.user_id,
            building_id: request.building_id, // Pass building_id
            amount: request.amount,
            payment_date: request.payment_date,
            method: request.method,
            reference: request.reference,
            bank: request.bank,
            proof_url: proofUrl,
            period: request.period
        });

        return payment;
    }
}
