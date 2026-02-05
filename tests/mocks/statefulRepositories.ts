import { IUserRepository } from "@/modules/users/domain/repository";
import { IInvoiceRepository, IPaymentAllocationRepository } from "@/modules/billing/domain/repository";
import { IPaymentRepository } from "@/modules/payments/domain/repository";
import { User } from "@/modules/users/domain/entities/User";
import { Invoice } from "@/modules/billing/domain/entities/Invoice";
import { Payment } from "@/modules/payments/domain/entities/Payment";
import { PaymentAllocation } from "@/modules/billing/domain/entities/PaymentAllocation";

export const createStatefulMockRepositories = () => {
    const users = new Map<string, User>();
    const invoices = new Map<string, Invoice>();
    const payments = new Map<string, Payment>();
    const allocations = new Map<string, PaymentAllocation>();

    const userRepo: IUserRepository = {
        create: async (u) => { users.set(u.id, u); return u; },
        findById: async (id) => users.get(id) || null,
        findByEmail: async (email) => Array.from(users.values()).find(u => u.email === email) || null,
        update: async (u) => { users.set(u.id, u); return u; },
        findAll: async () => Array.from(users.values()),
        delete: async (id) => { users.delete(id); }
    };

    const invoiceRepo: IInvoiceRepository = {
        create: async (i) => { invoices.set(i.id, i); return i; },
        findById: async (id) => invoices.get(id) || null,
        findAll: async (filters) => {
            let res = Array.from(invoices.values());
            if (filters?.unit_id) res = res.filter(i => i.unit_id === filters.unit_id);
            if (filters?.status) res = res.filter(i => i.status === filters.status);
            return res;
        },
        update: async (i) => { invoices.set(i.id, i); return i; }
    };

    const paymentRepo: IPaymentRepository = {
        create: async (p) => { payments.set(p.id, p); return p; },
        findById: async (id) => payments.get(id) || null,
        findAll: async () => Array.from(payments.values()),
        update: async (p) => { payments.set(p.id, p); return p; },
        findByUserId: async (uid) => Array.from(payments.values()).filter(p => p.user_id === uid),
        findByUnit: async (bid, uid) => Array.from(payments.values()).filter(p => p.unit_id === uid), // Mock implementation logic
        delete: async (id) => { payments.delete(id); }
    };

    const allocationRepo: IPaymentAllocationRepository = {
        create: async (a) => { allocations.set(a.id, a); return a; },
        findByPaymentId: async (pid) => Array.from(allocations.values()).filter(a => a.payment_id === pid),
        findByInvoiceId: async (iid) => Array.from(allocations.values()).filter(a => a.invoice_id === iid)
    };

    return { userRepo, invoiceRepo, paymentRepo, allocationRepo };
};
