import { describe, it, expect } from 'bun:test';
import { Building, BuildingProps } from '@/modules/buildings/domain/entities/Building';

describe('Building Entity', () => {
    it('should create a building instance', () => {
        const props: BuildingProps = {
            id: '1',
            name: 'Residencias Paraíso',
            address: 'Av. Principal 123'
        };

        const building = new Building(props);

        expect(building.id).toBe('1');
        expect(building.name).toBe('Residencias Paraíso');
        expect(building.address).toBe('Av. Principal 123');
        expect(building.created_at).toBeDefined();
        expect(building.updated_at).toBeDefined();
    });

    it('should update building name', () => {
        const building = new Building({
            id: '1',
            name: 'Old Name',
            address: 'Address'
        });

        building.updateName('New Name');
        expect(building.name).toBe('New Name');
    });

    it('should fail when updating name with empty string', () => {
        const building = new Building({
            id: '1',
            name: 'Old Name',
            address: 'Address'
        });

        expect(() => building.updateName('')).toThrow();
        expect(() => building.updateName('   ')).toThrow();
    });

    it('should update building address', () => {
        const building = new Building({
            id: '1',
            name: 'Name',
            address: 'Old Address'
        });

        building.updateAddress('New Address');
        expect(building.address).toBe('New Address');
    });

    it('should fail when updating address with empty string', () => {
        const building = new Building({
            id: '1',
            name: 'Name',
            address: 'Old Address'
        });

        expect(() => building.updateAddress('')).toThrow();
        expect(() => building.updateAddress('   ')).toThrow();
    });
});
