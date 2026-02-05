import { IInvoiceRepository } from '../../domain/repository';
import { Invoice, InvoiceStatus, InvoiceType } from '../../domain/entities/Invoice';
import { DomainError } from '@/core/errors';

export interface LoadDebtDTO {
    unitId: string;
    amount: number;
    period: string;
    description?: string;
    dueDate?: Date;
}

export class LoadDebt {
    constructor(private invoiceRepository: IInvoiceRepository) { }

    async execute(dto: LoadDebtDTO): Promise<Invoice> {
        if (dto.amount <= 0) {
            throw new DomainError('Amount must be positive', 'VALIDATION_ERROR', 400);
        }

        const invoice = new Invoice({
            id: crypto.randomUUID(), // Assuming global crypto or uuid gen
            unit_id: dto.unitId,
            amount: dto.amount,
            period: dto.period,
            issue_date: new Date(),
            due_date: dto.dueDate,
            status: InvoiceStatus.PENDING,
            type: InvoiceType.DEBT,
            description: dto.description
        });

        return await this.invoiceRepository.create(invoice);
    }
}
