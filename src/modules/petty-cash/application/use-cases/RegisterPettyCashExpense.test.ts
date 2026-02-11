import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterPettyCashExpense, RegisterExpenseDTO } from './RegisterPettyCashExpense';
import { PettyCashRepository } from '../../domain/repositories/PettyCashRepository';
import { IUnitRepository } from '../../../../modules/buildings/domain/repository';
import { IInvoiceRepository } from '../../../../modules/billing/domain/repository';
import { PettyCashFund } from '../../domain/entities/PettyCashFund';
import { Unit } from '../../../../modules/buildings/domain/entities/Unit';
import { PettyCashCategory, PettyCashTransactionType } from '../../../../core/domain/enums';
import { InvoiceStatus, InvoiceType } from '../../../../modules/billing/domain/entities/Invoice';

describe('RegisterPettyCashExpense with Overage', () => {
    let useCase: RegisterPettyCashExpense;
    let mockPettyCashRepo: any;
    let mockUnitRepo: any;
    let mockInvoiceRepo: any;

    beforeEach(() => {
        mockPettyCashRepo = {
            findFundByBuildingId: vi.fn(),
            saveFund: vi.fn(),
            saveTransaction: vi.fn(),
        };
        mockUnitRepo = {
            findByBuildingId: vi.fn(),
        };
        mockInvoiceRepo = {
            create: vi.fn(),
        };
        useCase = new RegisterPettyCashExpense(mockPettyCashRepo, mockUnitRepo, mockInvoiceRepo);
    });

    it('should split overage equally among units when balance is insufficient', async () => {
        const buildingId = 'b1';
        const fund = new PettyCashFund('f1', buildingId, 500, 'USD', new Date());
        mockPettyCashRepo.findFundByBuildingId.mockResolvedValue(fund);

        const units = [
            new Unit({ id: 'u1', building_id: buildingId, name: 'Unit 1' }),
            new Unit({ id: 'u2', building_id: buildingId, name: 'Unit 2' }),
        ];
        mockUnitRepo.findByBuildingId.mockResolvedValue(units);

        const dto: RegisterExpenseDTO = {
            buildingId,
            amount: 600,
            description: 'Test Overage',
            category: PettyCashCategory.REPAIR,
            userId: 'user1'
        };

        await useCase.execute(dto);

        // Fund should be fully used (deduct 500)
        expect(fund.current_balance).toBe(0);
        expect(mockPettyCashRepo.saveFund).toHaveBeenCalledWith(fund);

        // Overage calculation: 600 - 500 = 100. Split among 2 units: 50 each.
        expect(mockInvoiceRepo.create).toHaveBeenCalledTimes(2);

        const firstCall = mockInvoiceRepo.create.mock.calls[0][0];
        expect(firstCall.amount).toBe(50);
        expect(firstCall.type).toBe(InvoiceType.PETTY_CASH_REPLENISHMENT);
        expect(firstCall.description).toContain('Test Overage');

        // Transaction should be saved with full amount 600
        expect(mockPettyCashRepo.saveTransaction).toHaveBeenCalledWith(expect.objectContaining({
            amount: 600,
            description: 'Test Overage'
        }));
    });

    it('should deduct full amount from fund when balance is sufficient', async () => {
        const buildingId = 'b1';
        const fund = new PettyCashFund('f1', buildingId, 1000, 'USD', new Date());
        mockPettyCashRepo.findFundByBuildingId.mockResolvedValue(fund);

        const dto: RegisterExpenseDTO = {
            buildingId,
            amount: 600,
            description: 'Test Sufficient',
            category: PettyCashCategory.REPAIR,
            userId: 'user1'
        };

        await useCase.execute(dto);

        expect(fund.current_balance).toBe(400);
        expect(mockPettyCashRepo.saveFund).toHaveBeenCalledWith(fund);
        expect(mockInvoiceRepo.create).not.toHaveBeenCalled();
    });
});
