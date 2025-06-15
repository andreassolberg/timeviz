import { describe, it, expect } from 'vitest';
import { SectionStack } from './SectionStack';
import { SectionValidationError, CircularDependencyError, MissingSectionError } from './SectionStackError';

describe('SectionStack', () => {
	it('should calculate positions correctly for simple configuration', () => {
		const sections = {
			header: { height: 20, from: null },
			solar: { height: 30, from: 'header' },
			temperature: { height: 150, from: 'solar' }
		};

		const stack = new SectionStack(sections);
		const positions = stack.getAll();

		expect(positions.header).toEqual({ y: 0, height: 20 });
		expect(positions.solar).toEqual({ y: 20, height: 30 });
		expect(positions.temperature).toEqual({ y: 50, height: 150 });
		expect(stack.getTotalHeight()).toBe(200);
	});

	it('should calculate dynamic heights with heightRel', () => {
		const sections = {
			header: { height: 20, from: null },
			section1: { height: 30, from: 'header' },
			section2: { height: 50, from: 'section1' },
			main: { heightRel: ['section1', 'section2'], from: 'header' }
		};

		const stack = new SectionStack(sections);
		const positions = stack.getAll();

		expect(positions.main).toEqual({ y: 20, height: 80 }); // 30 + 50
	});

	it('should detect circular dependencies', () => {
		const sections = {
			a: { height: 10, from: 'b' },
			b: { height: 20, from: 'a' }
		};

		expect(() => new SectionStack(sections)).toThrow(CircularDependencyError);
	});

	it('should throw error for missing section reference', () => {
		const sections = {
			header: { height: 20, from: 'missing' }
		};

		expect(() => new SectionStack(sections)).toThrow(MissingSectionError);
	});

	it('should validate section configuration', () => {
		const sections = {
			invalid: { from: null } // Missing height and heightRel
		};

		expect(() => new SectionStack(sections)).toThrow(SectionValidationError);
	});

	it('should handle complex nested dependencies', () => {
		const sections = {
			header: { height: 0, from: null },
			solar: { height: 80, from: 'header' },
			temperature: { height: 150, from: 'solar' },
			padding1: { height: 30, from: 'temperature' },
			energy: { height: 80, from: 'padding1' },
			main: { heightRel: ['temperature', 'padding1', 'energy'], from: 'solar' }
		};

		const stack = new SectionStack(sections);
		const positions = stack.getAll();

		expect(positions.header).toEqual({ y: 0, height: 0 });
		expect(positions.solar).toEqual({ y: 0, height: 80 });
		expect(positions.temperature).toEqual({ y: 80, height: 150 });
		expect(positions.padding1).toEqual({ y: 230, height: 30 });
		expect(positions.energy).toEqual({ y: 260, height: 80 });
		expect(positions.main).toEqual({ y: 80, height: 260 }); // 150 + 30 + 80
	});
});