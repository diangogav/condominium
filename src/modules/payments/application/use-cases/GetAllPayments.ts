import { IPaymentRepository, FindAllPaymentsFilters } from '../../domain/repository';
import { IUserRepository } from '@/modules/users/domain/repository';
import { Payment } from '../../domain/entities/Payment';
import { ForbiddenError, NotFoundError } from '@/core/errors';

export interface GetAllPaymentsRequest {
    requesterId: string;
    filters?: {
        building_id?: string;
        status?: string;
        period?: string;
        year?: string;
        unit_id?: string;
    };
}

export class GetAllPayments {
    constructor(
        private paymentRepo: IPaymentRepository,
        private userRepo: IUserRepository
    ) { }

    async execute(request: GetAllPaymentsRequest): Promise<Payment[]> {
        const requester = await this.userRepo.findById(request.requesterId);
        if (!requester) {
            throw new NotFoundError('Requester not found');
        }

        if (!requester.isAdmin() && !requester.isBoardMember()) {
            throw new ForbiddenError('Only admins and board members can list all payments');
        }

        const filters: FindAllPaymentsFilters = {};

        // Map string filters to Enums if present
        if (request.filters?.status) filters.status = request.filters.status as any;
        if (request.filters?.period) filters.period = request.filters.period;
        if (request.filters?.year) filters.year = parseInt(request.filters.year);
        if (request.filters?.unit_id) filters.unit_id = request.filters.unit_id;

        // Enforce building scope for Board members
        if (requester.isBoardMember()) {
            const validBuildingIds = requester.units.map(u => u.building_id).filter((id): id is string => !!id);

            if (validBuildingIds.length === 0) {
                return [];
            }

            // If specific building requested, validate access
            if (filters.building_id) {
                if (!validBuildingIds.includes(filters.building_id)) {
                    // For listing, maybe just return empty if filters don't match permissions?
                    // Or throw forbidden. Let's return empty to be safe/standard for list filters.
                    return [];
                }
            } else {
                // If no building specified, and we can only filter by one in the repo (assuming),
                // we might default to the first one. 
                // Ideally repo should support 'in' queries.
                // For now, let's use the first one if not specified.
                filters.building_id = validBuildingIds[0];
            }
            // Note: This logic assumes 1 building filter. 
        } else {
            // Admin - allow filtering by building if requested
            if (request.filters?.building_id) {
                filters.building_id = request.filters.building_id;
            }
        }

        return await this.paymentRepo.findAll(filters);
    }
}
