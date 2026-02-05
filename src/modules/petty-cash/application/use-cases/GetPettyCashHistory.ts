import { PettyCashRepository } from '../../domain/repositories/PettyCashRepository';
import { PettyCashTransactionType, PettyCashCategory } from '@/core/domain/enums';
import { NotFoundError } from '@/core/errors';

export interface GetPettyCashHistoryFilters {
    type?: PettyCashTransactionType;
    category?: PettyCashCategory;
    page?: number;
    limit?: number;
}

export class GetPettyCashHistory {
    constructor(private pettyCashRepo: PettyCashRepository) { }

    async execute(buildingId: string, filters: GetPettyCashHistoryFilters) {
        const fund = await this.pettyCashRepo.findFundByBuildingId(buildingId);
        if (!fund) throw new NotFoundError('Petty cash fund not found for this building');

        const limit = filters.limit || 10;
        const page = filters.page || 1;
        const offset = (page - 1) * limit;

        const transactions = await this.pettyCashRepo.findTransactionsByFundId(fund.id, {
            type: filters.type,
            category: filters.category,
            limit,
            offset
        });

        return transactions.map(t => t.toJSON());
    }
}
