import { describe, expect, test, beforeEach } from "bun:test";
import { User } from "@/modules/users/domain/entities/User";
import { UserUnit } from "@/modules/users/domain/entities/UserUnit";
import { UserRole, UserStatus } from "@/core/domain/enums";

describe("User - Multi-Building Board Permissions", () => {
    test("User can be board in Building A and resident in Building B", () => {
        const user = new User({
            id: "user-1",
            email: "john@example.com",
            name: "John Doe",
            role: UserRole.BOARD,  // Global role (legacy)
            status: UserStatus.ACTIVE,
            units: [
                new UserUnit({
                    unit_id: "unit-a1",
                    building_id: "building-a",
                    role: "owner",
                    building_role: "board",  // Board in Building A
                    is_primary: true
                }),
                new UserUnit({
                    unit_id: "unit-b2",
                    building_id: "building-b",
                    role: "resident",
                    building_role: "resident",  // Only resident in Building B
                    is_primary: false
                })
            ]
        });

        // Assertions
        expect(user.isBoardInBuilding("building-a")).toBe(true);
        expect(user.isBoardInBuilding("building-b")).toBe(false);
        expect(user.isBoardMemberAnywhere()).toBe(true);

        const boardBuildings = user.getBuildingsWhereBoard();
        expect(boardBuildings).toContain("building-a");
        expect(boardBuildings).not.toContain("building-b");
        expect(boardBuildings.length).toBe(1);
    });

    test("User with multiple units in same building - board in all", () => {
        const user = new User({
            id: "user-2",
            email: "jane@example.com",
            name: "Jane Smith",
            role: UserRole.BOARD,
            status: UserStatus.ACTIVE,
            units: [
                new UserUnit({
                    unit_id: "unit-a1",
                    building_id: "building-a",
                    role: "owner",
                    building_role: "board",
                    is_primary: true
                }),
                new UserUnit({
                    unit_id: "unit-a2",
                    building_id: "building-a",
                    role: "owner",
                    building_role: "board",  // Also board for this unit
                    is_primary: false
                })
            ]
        });

        expect(user.isBoardInBuilding("building-a")).toBe(true);
        expect(user.getBuildingsWhereBoard()).toEqual(["building-a"]);
    });

    test("Regular resident has no board permissions", () => {
        const user = new User({
            id: "user-3",
            email: "resident@example.com",
            name: "Regular Resident",
            role: UserRole.RESIDENT,
            status: UserStatus.ACTIVE,
            units: [
                new UserUnit({
                    unit_id: "unit-c1",
                    building_id: "building-c",
                    role: "resident",
                    building_role: "resident",
                    is_primary: true
                })
            ]
        });

        expect(user.isBoardInBuilding("building-c")).toBe(false);
        expect(user.isBoardMemberAnywhere()).toBe(false);
        expect(user.getBuildingsWhereBoard()).toEqual([]);
    });

    test("Admin user without units has no building-specific board permissions", () => {
        const user = new User({
            id: "admin-1",
            email: "admin@example.com",
            name: "System Admin",
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE,
            units: []
        });

        expect(user.isBoardInBuilding("any-building")).toBe(false);
        expect(user.isBoardMemberAnywhere()).toBe(false);
        expect(user.isAdmin()).toBe(true);
    });

    test("UserUnit.isBoardInBuilding() method", () => {
        const boardUnit = new UserUnit({
            unit_id: "unit-1",
            building_id: "building-1",
            role: "owner",
            building_role: "board",
            is_primary: true
        });

        const residentUnit = new UserUnit({
            unit_id: "unit-2",
            building_id: "building-2",
            role: "resident",
            building_role: "resident",
            is_primary: false
        });

        expect(boardUnit.isBoardInBuilding()).toBe(true);
        expect(residentUnit.isBoardInBuilding()).toBe(false);
    });

    test("building_role defaults to resident if not specified", () => {
        const unit = new UserUnit({
            unit_id: "unit-1",
            building_id: "building-1",
            role: "resident",
            // building_role not specified
            is_primary: true
        });

        expect(unit.building_role).toBe("resident");
        expect(unit.isBoardInBuilding()).toBe(false);
    });
});
