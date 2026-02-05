import { describe, expect, test, beforeEach } from "bun:test";
import { createStatefulMockRepositories } from "../mocks/statefulRepositories";
import { AssignUnitToUser } from "@/modules/users/application/use-cases/AssignUnitToUser";
import { LoadDebt } from "@/modules/billing/application/use-cases/LoadDebt";
import { RegisterPayment } from "@/modules/payments/application/use-cases/RegisterPayment";
import { GetUnitBalance } from "@/modules/billing/application/use-cases/GetUnitBalance";
import { User } from "@/modules/users/domain/entities/User";
import { UserRole, UserStatus } from "@/core/domain/enums";
import { PaymentMethod } from "@/core/domain/enums";

describe("Integration Scenario: Happy Path", () => {
    let repos: ReturnType<typeof createStatefulMockRepositories>;

    // Use Cases
    let assignUnit: AssignUnitToUser;
    let loadDebt: LoadDebt;
    let registerPayment: RegisterPayment;
    let getBalance: GetUnitBalance;

    beforeEach(() => {
        repos = createStatefulMockRepositories();
        assignUnit = new AssignUnitToUser(repos.userRepo);
        loadDebt = new LoadDebt(repos.invoiceRepo);
        registerPayment = new RegisterPayment(repos.paymentRepo, repos.invoiceRepo, repos.allocationRepo);
        getBalance = new GetUnitBalance(repos.invoiceRepo, repos.allocationRepo);
    });

    test("Full Cycle: Assign Unit -> Load Debt -> Partial Payment -> Final Payment -> Verification", async () => {
        // 1. Create User
        const user = new User({
            id: "user-1", email: "larry@example.com", name: "Larry",
            role: UserRole.RESIDENT, status: UserStatus.ACTIVE
        });
        await repos.userRepo.create(user);

        // 2. Assign Unit
        await assignUnit.execute({
            userId: "user-1", unitId: "Unit-101", role: "owner", isPrimary: true
        });

        const updatedUser = await repos.userRepo.findById("user-1");
        expect(updatedUser?.units[0].unit_id).toBe("Unit-101");

        // 3. Load Debt for Unit-101 (Jan Expense: $100)
        const invoice = await loadDebt.execute({
            unitId: "Unit-101", amount: 100, period: "2024-01", description: "Jan Expense"
        });
        expect(invoice.id).toBeDefined();

        // 4. Check Balance (Should be $100)
        let balance = await getBalance.execute("Unit-101");
        expect(balance.totalDebt).toBe(100);

        // 5. User makes Partial Payment ($60) allocated to invoice
        await registerPayment.execute({
            userId: "user-1", unitId: "Unit-101", amount: 60,
            method: PaymentMethod.TRANSFER, paymentDate: new Date(),
            allocations: [{ invoiceId: invoice.id, amount: 60 }]
        });

        // 6. Check Balance (Should be $40)
        balance = await getBalance.execute("Unit-101");
        expect(balance.totalDebt).toBe(40);
        expect(balance.details[0].paid).toBe(60);

        // 7. User makes Final Payment ($40) allocated to invoice
        await registerPayment.execute({
            userId: "user-1", unitId: "Unit-101", amount: 40,
            method: PaymentMethod.TRANSFER, paymentDate: new Date(),
            allocations: [{ invoiceId: invoice.id, amount: 40 }]
        });

        // 8. Check Balance (Should be $0)
        // Note: GetUnitBalance filters for PENDING/PARTIALLY_PAID. 
        // We need to ensure logic updates invoice status to PAID if fully paid.
        // The Trigger in DB handles this, but our Mock Repo doesn't! 
        // We need to simulate the trigger or update getBalance to handle it.
        // Actually, RegisterPayment just creates allocation. 
        // The DB Trigger handles status update.
        // Our test Mock needs to simulate this side effect or we manually check.
        // Let's rely on GetUnitBalance logic which sums allocations.
        // But GetUnitBalance filters by status? 
        // "const invoices = await this.invoiceRepository.findAll({ unit_id: unitId });"
        // "const pendingInvoices = invoices.filter(inv => inv.status === 'PENDING' || inv.status === 'PARTIALLY_PAID');"

        // ISSUE: Invoice status in Mock Repo remains PENDING because only DB Trigger updates it.
        // FIX: We should manually update invoice status in the test or mock to simulate DB trigger.
        // OR: Update LoadDebt/RegisterPayment use case to update status (Application logic vs DB Logic).
        // Best practice: Application logic should ideally handle it or Use Case calls domain method.
        // But Implementation Plan relied on DB Trigger.
        // For this test, we can manually check remaining calculation which should be 0.

        // Let's inspect the balance calculation logic in GetUnitBalance:
        // It fetches ALL invoices (repo.findAll filters by unit_id).
        // Then it filters in memory by status.
        // Since mock invoice status is still PENDING, it will include it.
        // Then it sums allocations: 60 + 40 = 100.
        // Remaining = 100 - 100 = 0.
        // So balance.totalDebt should be 0.
        // However, if remaining is 0, does it include it in the list?
        // "if (remaining > 0) { totalDebt += ...; details.push(...) }"
        // So if remaining is 0, it won't add to totalDebt.
        // So expected totalDebt is 0.

        balance = await getBalance.execute("Unit-101");
        expect(balance.totalDebt).toBe(0);
        expect(balance.details.length).toBe(0); // Should be empty as fully paid
    });
});
