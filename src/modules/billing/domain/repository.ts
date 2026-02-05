import { Invoice } from './entities/Invoice';
import { PaymentAllocation } from './entities/PaymentAllocation';

export interface FindAllInvoicesFilters {
    unit_id?: string;
    building_id?: string;
    user_id?: string;
    status?: string;
    period?: string;
    type?: string;
}

export interface IInvoiceRepository {
    create(invoice: Invoice): Promise<Invoice>;
    findById(id: string): Promise<Invoice | null>;
    findAll(filters?: FindAllInvoicesFilters): Promise<Invoice[]>;
    findInvoicesForAdmin(filters?: FindAllInvoicesFilters): Promise<any[]>;
    update(invoice: Invoice): Promise<Invoice>;
    // delete? usually void invoices cancel them
}

export interface IPaymentAllocationRepository {
    create(allocation: PaymentAllocation): Promise<PaymentAllocation>;
    findByPaymentId(paymentId: string): Promise<PaymentAllocation[]>;
    findByInvoiceId(invoiceId: string): Promise<PaymentAllocation[]>;
    findPaymentsByInvoiceId(invoiceId: string): Promise<any[]>; // Returns Payment details joined
}
