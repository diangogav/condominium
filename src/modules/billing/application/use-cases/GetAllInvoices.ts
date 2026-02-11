import { IInvoiceRepository, FindAllInvoicesFilters, AdminInvoiceResult } from '../../domain/repository';

export class GetAllInvoices {
    constructor(private invoiceRepository: IInvoiceRepository) { }

    async execute(filters?: FindAllInvoicesFilters): Promise<AdminInvoiceResult[]> {
        return await this.invoiceRepository.findInvoicesForAdmin(filters);
    }
}
