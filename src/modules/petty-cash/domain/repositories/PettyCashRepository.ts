import { PettyCashFund } from '../entities/PettyCashFund';
import { PettyCashTransaction } from '../entities/PettyCashTransaction';
import { PettyCashTransactionType, PettyCashCategory } from '@/core/domain/enums';

export interface PettyCashRepository {
    findFundByBuildingId(buildingId: string): Promise<PettyCashFund | null>;
    saveFund(fund: PettyCashFund): Promise<PettyCashFund>;
    saveTransaction(transaction: PettyCashTransaction): Promise<PettyCashTransaction>;
    findTransactionsByFundId(
        fundId: string,
        filters: {
            type?: PettyCashTransactionType;
            category?: PettyCashCategory;
            limit?: number;
            offset?: number;
        }
    ): Promise<PettyCashTransaction[]>;
}
