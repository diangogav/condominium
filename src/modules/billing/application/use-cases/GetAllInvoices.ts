import { IInvoiceRepository, FindAllInvoicesFilters } from '../../domain/repository';

export class GetAllInvoices {
    constructor(private invoiceRepository: IInvoiceRepository) { }

    async execute(filters?: FindAllInvoicesFilters): Promise<any[]> {
        return await this.invoiceRepository.findInvoicesForAdmin(filters);
    }
}
