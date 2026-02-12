import { describe, expect, test, mock, beforeEach } from "bun:test";
import { GetUsers } from "@/modules/users/application/use-cases/GetUsers";
import { User } from "@/modules/users/domain/entities/User";
import { UserRole, UserStatus } from "@/core/domain/enums";
import { createMockUserRepository } from "../../../mocks/repositories";
import { BuildingRole } from "@/modules/users/domain/entities/BuildingRole";

describe("GetUsers Building Filter", () => {
    let mockRepo: ReturnType<typeof createMockUserRepository>;
    let useCase: GetUsers;

    beforeEach(() => {
        mockRepo = createMockUserRepository();
        useCase = new GetUsers(mockRepo);
    });

    test("should filter users by building_id including detached roles", async () => {
        const admin = new User({
            id: "admin-1",
            email: "admin@test.com",
            name: "Admin",
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE,
            units: [],
            buildingRoles: []
        });

        const usersInBuilding = [
            new User({
                id: "user-1",
                email: "u1@test.com",
                name: "User 1",
                role: UserRole.RESIDENT,
                status: UserStatus.ACTIVE,
                units: [{ unit_id: "u1", building_id: "building-A", is_primary: true } as any],
                buildingRoles: []
            }),
            new User({
                id: "user-2",
                email: "u2@test.com",
                name: "User 2",
                role: UserRole.BOARD,
                status: UserStatus.ACTIVE,
                units: [],
                buildingRoles: [new BuildingRole({ building_id: "building-A", role: "board" })]
            })
        ];

        mockRepo.findById = mock(async () => admin);
        mockRepo.findAll = mock(async (f) => {
            // Verify filters were passed correctly
            expect(f?.building_id).toBe("building-A");
            return usersInBuilding;
        });

        const result = await useCase.execute({
            requesterId: "admin-1",
            filters: { building_id: "building-A" }
        });

        expect(result.length).toBe(2);
        expect(result[0].id).toBe("user-1");
        expect(result[1].id).toBe("user-2");
    });
});
