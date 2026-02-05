import { describe, expect, test, mock, beforeEach } from "bun:test";
import { AssignUnitToUser } from "@/modules/users/application/use-cases/AssignUnitToUser";
import { User } from "@/modules/users/domain/entities/User";
import { UserRole, UserStatus } from "@/core/domain/enums";
import { createMockUserRepository } from "../../mocks/repositories";

describe("AssignUnitToUser Use Case", () => {
    let mockRepo: ReturnType<typeof createMockUserRepository>;
    let useCase: AssignUnitToUser;

    beforeEach(() => {
        mockRepo = createMockUserRepository();
        useCase = new AssignUnitToUser(mockRepo);
    });

    test("should assign a new unit to a user", async () => {
        const user = new User({
            id: "user-1",
            email: "test@example.com",
            name: "Test User",
            role: UserRole.RESIDENT,
            status: UserStatus.ACTIVE
        });

        // Mock findById to return the user
        mockRepo.findById = mock(async () => user);

        await useCase.execute({
            userId: "user-1",
            unitId: "unit-A",
            role: "owner",
            isPrimary: true
        });

        expect(mockRepo.update).toHaveBeenCalled();
        expect(user.units.length).toBe(1);
        expect(user.units[0].unit_id).toBe("unit-A");
        expect(user.units[0].role).toBe("owner");
        expect(user.units[0].is_primary).toBe(true);
    });

    test("should update role if unit already assigned", async () => {
        const user = new User({
            id: "user-1",
            email: "test@example.com",
            name: "Test User",
            role: UserRole.RESIDENT,
            status: UserStatus.ACTIVE
        });
        // Pre-assign
        user.setUnits([{
            unit_id: "unit-A",
            role: "resident",
            building_role: "resident",
            is_primary: false,
            isOwner: () => false,
            isBoardInBuilding: () => false,
            toJSON: () => ({})
        } as any]);

        mockRepo.findById = mock(async () => user);

        await useCase.execute({
            userId: "user-1",
            unitId: "unit-A",
            role: "owner",
            isPrimary: true
        });

        expect(user.units.length).toBe(1);
        expect(user.units[0].role).toBe("owner");
        expect(user.units[0].is_primary).toBe(true);
    });

    test("should throw error if user not found", async () => {
        mockRepo.findById = mock(async () => null);

        expect(useCase.execute({
            userId: "missing",
            unitId: "unit-A",
            role: "owner",
            isPrimary: true
        })).rejects.toThrow("User not found");
    });
});
