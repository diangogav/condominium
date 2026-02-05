import { PettyCashTransactionType, PettyCashCategory } from '@/core/domain/enums';

export class PettyCashTransaction {
    constructor(
        public readonly id: string,
        public readonly fund_id: string,
        public readonly type: PettyCashTransactionType,
        public readonly amount: number,
        public readonly description: string,
        public readonly category: PettyCashCategory,
        public readonly created_by: string,
        public readonly evidence_url?: string,
        public readonly created_at?: Date
    ) { }

    public toJSON() {
        return {
            id: this.id,
            fund_id: this.fund_id,
            type: this.type,
            amount: this.amount,
            description: this.description,
            category: this.category,
            created_by: this.created_by,
            evidence_url: this.evidence_url,
            created_at: this.created_at
        };
    }
}
