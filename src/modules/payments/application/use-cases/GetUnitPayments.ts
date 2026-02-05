import { IPaymentRepository } from '../../domain/repository';
import { IUserRepository } from '@/modules/users/domain/repository';
import { Payment } from '../../domain/entities/Payment';
import { NotFoundError } from '@/core/errors';

export class GetUnitPayments {
    constructor(
        private paymentRepo: IPaymentRepository,
        private userRepo: IUserRepository
    ) { }

    async execute(userId: string, year?: number, filters?: { unitId?: string, buildingId?: string }): Promise<Payment[]> {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        // If specific unit requested, verify user owns it
        if (filters?.unitId) {
            const hasAccess = user.units.some(u => u.unit_id === filters.unitId);
            if (!hasAccess) {
                // Or just return empty? Better to return empty or error?
                // Given this is a "Get My Payments", if I ask for a unit I don't own, it should probably be empty or unauthorized.
                // Let's filter user units by the requested ID.
            }
        }

        let validUnits = user.units.filter(u => u.building_id && u.unit_id);

        if (filters?.unitId) {
            validUnits = validUnits.filter(u => u.unit_id === filters.unitId);
        }
        if (filters?.buildingId) {
            validUnits = validUnits.filter(u => u.building_id === filters.buildingId);
        }

        if (validUnits.length === 0) {
            return [];
        }

        const allPayments: Payment[] = [];
        for (const unit of validUnits) {
            const payments = await this.paymentRepo.findByUnit(unit.building_id!, unit.unit_id!, year);
            allPayments.push(...payments);
        }

        return allPayments;
    }
}
