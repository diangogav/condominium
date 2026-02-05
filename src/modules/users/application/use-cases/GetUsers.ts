import { IUserRepository, FindAllUsersFilters } from '../../domain/repository';
import { User } from '../../domain/entities/User';
import { UserRole } from '@/core/domain/enums';
import { ForbiddenError, NotFoundError } from '@/core/errors';

interface GetUsersRequest {
    requesterId: string;
    filters?: {
        building_id?: string;
        unit_id?: string;
        role?: string;
        status?: string;
    };
}

export class GetUsers {
    constructor(private userRepo: IUserRepository) { }

    async execute(request: GetUsersRequest): Promise<User[]> {
        const requester = await this.userRepo.findById(request.requesterId);
        if (!requester) {
            throw new NotFoundError('Requester not found');
        }

        if (!requester.isAdmin() && !requester.isBoardMember()) {
            throw new ForbiddenError('Only admins and board members can list users');
        }

        const filters: FindAllUsersFilters = {};

        // Map string filters to Enums if present
        // Note: In a real app validation would be handled before this, or we trust the types if casted
        if (request.filters?.role) filters.role = request.filters.role as any; // Cast for now, validation in Controller
        if (request.filters?.status) filters.status = request.filters.status as any;

        // Enforce building scope for Board members
        if (requester.isBoardMember()) {
            const validBuildings = requester.units.map(u => u.building_id).filter((id): id is string => !!id);
            if (validBuildings.length === 0) {
                // Should not happen for a valid board member
                return [];
            }
            filters.building_id = validBuildings[0]; // Default to first building
        } else {
            // Admin or other (if expanded) - allow filtering by building if requested
            if (request.filters?.building_id) {
                filters.building_id = request.filters.building_id;
            }
        }

        if (request.filters?.unit_id) {
            filters.unit_id = request.filters.unit_id;
        }

        return await this.userRepo.findAll(filters);
    }
}
