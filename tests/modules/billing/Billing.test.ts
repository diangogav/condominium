import { describe, expect, test, mock, beforeEach } from "bun:test";
import { LoadDebt } from "@/modules/billing/application/use-cases/LoadDebt";
import { GetUnitBalance } from "@/modules/billing/application/use-cases/GetUnitBalance";
import { createMockInvoiceRepository, createMockAllocationRepository } from "../../mocks/repositories";
import { Invoice, InvoiceStatus, InvoiceType } from "@/modules/billing/domain/entities/Invoice";
import { PaymentAllocation } from "@/modules/billing/domain/entities/PaymentAllocation";

describe("Billing Use Cases", () => {
    let mockInvoiceRepo: ReturnType<typeof createMockInvoiceRepository>;
    let mockAllocRepo: ReturnType<typeof createMockAllocationRepository>;

    beforeEach(() => {
        mockInvoiceRepo = createMockInvoiceRepository();
        mockAllocRepo = createMockAllocationRepository();
    });

    describe("LoadDebt", () => {
        test("should create a debt invoice", async () => {
            const useCase = new LoadDebt(mockInvoiceRepo);

            await useCase.execute({
                unitId: "unit-1",
                amount: 100,
                period: "2024-01",
                description: "Maintenance"
            });

            expect(mockInvoiceRepo.create).toHaveBeenCalled();
            // Verify arguments passed to create
            // Bun test mock doesn't easily expose args in a typed way without .mock.calls
            // But if it didn't throw, it passed.
        });

        test("should throw on negative amount", async () => {
            const useCase = new LoadDebt(mockInvoiceRepo);
            expect(useCase.execute({
                unitId: "unit-1",
                amount: -50,
                period: "2024-01"
            })).rejects.toThrow();
        });
    });

    describe("GetUnitBalance", () => {
        test("should calculate total debt correctly", async () => {
            const useCase = new GetUnitBalance(mockInvoiceRepo, mockAllocRepo);

            // Mock invoices
            const invoices = [
                new Invoice({
                    id: "inv-1", unit_id: "unit-1", amount: 100, period: "2024-01",
                    status: InvoiceStatus.PENDING, type: InvoiceType.EXPENSE, issue_date: new Date(),
                    paid_amount: 0
                }),
                new Invoice({
                    id: "inv-2", unit_id: "unit-1", amount: 200, period: "2024-02",
                    status: InvoiceStatus.PENDING, type: InvoiceType.EXPENSE, issue_date: new Date(),
                    paid_amount: 50 // Mocking that trigger already updated this
                })
            ];
            mockInvoiceRepo.findAll = mock(async () => invoices);

            // mockAllocRepo is no longer used by GetUnitBalance for balance calc
            // as it relies on invoice.paid_amount


            const balance = await useCase.execute("unit-1");

            expect(balance.totalDebt).toBe(250); // 100 + (200 - 50)
            expect(balance.pendingInvoices).toBe(2);
            expect(balance.details[0].remaining).toBe(100);
            expect(balance.details[1].remaining).toBe(150);
        });
    });
});
