import { PettyCashRepository } from '../../domain/repositories/PettyCashRepository';
import { PettyCashTransaction } from '../../domain/entities/PettyCashTransaction';
import { PettyCashTransactionType, PettyCashCategory } from '@/core/domain/enums';
import { ValidationError, NotFoundError } from '@/core/errors';

export interface RegisterExpenseDTO {
    buildingId: string;
    amount: number;
    description: string;
    category: PettyCashCategory;
    userId: string;
    evidenceUrl?: string;
}

export class RegisterPettyCashExpense {
    constructor(private pettyCashRepo: PettyCashRepository) { }

    async execute(dto: RegisterExpenseDTO) {
        const fund = await this.pettyCashRepo.findFundByBuildingId(dto.buildingId);
        if (!fund) throw new NotFoundError('Petty cash fund not found for this building');

        if (!fund.canAfford(dto.amount)) {
            throw new ValidationError(`Insufficient funds. Current balance: ${fund.current_balance} ${fund.currency}`);
        }

        fund.registerExpense(dto.amount);
        await this.pettyCashRepo.saveFund(fund);

        const transaction = new PettyCashTransaction(
            '',
            fund.id,
            PettyCashTransactionType.EXPENSE,
            dto.amount,
            dto.description,
            dto.category,
            dto.userId,
            dto.evidenceUrl
        );

        return await this.pettyCashRepo.saveTransaction(transaction);
    }
}
