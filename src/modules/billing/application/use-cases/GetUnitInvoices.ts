import { IInvoiceRepository } from '../../domain/repository';
import { Invoice } from '../../domain/entities/Invoice';

export class GetUnitInvoices {
    constructor(private invoiceRepository: IInvoiceRepository) { }

    async execute(unitId: string): Promise<Invoice[]> {
        return await this.invoiceRepository.findAll({ unit_id: unitId });
    }
}
