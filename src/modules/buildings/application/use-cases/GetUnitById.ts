import { IUnitRepository } from '../../domain/repository';
import { Unit } from '../../domain/entities/Unit';
import { NotFoundError } from '@/core/errors';

export class GetUnitById {
    constructor(private unitRepo: IUnitRepository) { }

    async execute(id: string): Promise<Unit> {
        const unit = await this.unitRepo.findById(id);

        if (!unit) {
            throw new NotFoundError('Unit not found');
        }

        return unit;
    }
}
