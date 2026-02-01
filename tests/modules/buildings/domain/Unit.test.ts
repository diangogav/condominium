import { describe, it, expect } from 'bun:test';
import { Unit } from '@/modules/buildings/domain/entities/Unit';

describe('Unit Entity', () => {
    it('should create a valid unit', () => {
        const unit = new Unit({
            id: 'unit-1',
            building_id: 'building-1',
            name: '1A',
            floor: '1',
            aliquot: 1.5
        });

        expect(unit.name).toBe('1A');
        expect(unit.building_id).toBe('building-1');
        expect(unit.floor).toBe('1');
        expect(unit.aliquot).toBe(1.5);
    });

    it('should throw error if name is empty', () => {
        expect(() => {
            new Unit({
                id: 'unit-1',
                building_id: 'building-1',
                name: ''
            });
        }).toThrow();
    });

    it('should throw error if building_id is missing', () => {
        expect(() => {
            new Unit({
                id: 'unit-1',
                building_id: '',
                name: '1A'
            });
        }).toThrow();
    });

    it('should update unit properties', () => {
        const unit = new Unit({
            id: 'unit-1',
            building_id: 'building-1',
            name: '1A',
            aliquot: 1.0
        });

        unit.update({
            name: '1B',
            aliquot: 2.0
        });

        expect(unit.name).toBe('1B');
        expect(unit.aliquot).toBe(2.0);
    });
});
