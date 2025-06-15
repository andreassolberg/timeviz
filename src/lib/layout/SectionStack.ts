import type { SectionsConfig, SectionConfig, SectionPosition, SectionPositions } from './types';
import {
	SectionStackError,
	SectionValidationError,
	CircularDependencyError,
	MissingSectionError
} from './SectionStackError';

/**
 * SectionStack manages the layout calculation for stacked sections with dependencies.
 *
 * Features:
 * - Dependency resolution via 'from' references
 * - Dynamic height calculation via 'heightRel' arrays
 * - Circular dependency detection
 * - Comprehensive validation
 * - Fail-fast error handling
 */
export class SectionStack {
	private sections: SectionsConfig;
	private calculated: SectionPositions;

	constructor(sections: SectionsConfig) {
		if (!sections || typeof sections !== 'object') {
			throw new SectionStackError('Sections configuration is required and must be an object');
		}

		this.sections = sections;
		this.validate();
		this.calculated = this.calculateAll();
	}

	/**
	 * Get the Y coordinate for a section
	 */
	getY(sectionId: string): number {
		if (!this.calculated[sectionId]) {
			throw new SectionStackError(`Section '${sectionId}' not found in calculated positions`);
		}
		return this.calculated[sectionId].y;
	}

	/**
	 * Get the height for a section
	 */
	getHeight(sectionId: string): number {
		if (!this.calculated[sectionId]) {
			throw new SectionStackError(`Section '${sectionId}' not found in calculated positions`);
		}
		return this.calculated[sectionId].height;
	}

	/**
	 * Get total height of all sections
	 */
	getTotalHeight(): number {
		return Object.values(this.calculated).reduce(
			(max, section) => Math.max(max, section.y + section.height),
			0
		);
	}

	/**
	 * Get all calculated section positions
	 */
	getAll(): SectionPositions {
		return { ...this.calculated }; // Return copy to prevent mutation
	}

	/**
	 * Check if a section exists
	 */
	hasSection(sectionId: string): boolean {
		return sectionId in this.calculated;
	}

	/**
	 * Validate section configuration
	 */
	private validate(): void {
		// Check for empty configuration
		if (Object.keys(this.sections).length === 0) {
			throw new SectionStackError('Sections configuration cannot be empty');
		}

		// Validate each section
		for (const [sectionId, section] of Object.entries(this.sections)) {
			this.validateSection(sectionId, section);
		}

		// Check for circular dependencies
		this.detectCircularDependencies();

		// Validate all referenced sections exist
		this.validateReferences();
	}

	/**
	 * Validate individual section configuration
	 */
	private validateSection(sectionId: string, section: SectionConfig): void {
		if (!section || typeof section !== 'object') {
			throw new SectionValidationError('Section configuration must be an object', sectionId);
		}

		// Must have either height or heightRel
		if (section.height === undefined && !section.heightRel) {
			throw new SectionValidationError(
				'Section must have either "height" or "heightRel" property',
				sectionId
			);
		}

		// Cannot have both height and heightRel
		if (section.height !== undefined && section.heightRel) {
			throw new SectionValidationError(
				'Section cannot have both "height" and "heightRel" properties',
				sectionId
			);
		}

		// Validate height if present
		if (section.height !== undefined) {
			if (typeof section.height !== 'number' || section.height < 0) {
				throw new SectionValidationError('Height must be a non-negative number', sectionId);
			}
		}

		// Validate heightRel if present
		if (section.heightRel) {
			if (!Array.isArray(section.heightRel) || section.heightRel.length === 0) {
				throw new SectionValidationError('heightRel must be a non-empty array', sectionId);
			}

			for (const refId of section.heightRel) {
				if (typeof refId !== 'string' || refId.trim() === '') {
					throw new SectionValidationError(
						'heightRel entries must be non-empty strings',
						sectionId
					);
				}
			}
		}

		// Validate from property
		if (section.from !== null && (typeof section.from !== 'string' || section.from.trim() === '')) {
			throw new SectionValidationError(
				'from property must be null or a non-empty string',
				sectionId
			);
		}
	}

	/**
	 * Detect circular dependencies using depth-first search
	 */
	private detectCircularDependencies(): void {
		const visited = new Set<string>();
		const visiting = new Set<string>();

		const visit = (sectionId: string, path: string[] = []): void => {
			if (visiting.has(sectionId)) {
				throw new CircularDependencyError(sectionId, path);
			}
			if (visited.has(sectionId)) {
				return;
			}

			visiting.add(sectionId);
			const section = this.sections[sectionId];

			// Check 'from' dependency
			if (section.from && this.sections[section.from]) {
				visit(section.from, [...path, sectionId]);
			}

			// Check 'heightRel' dependencies
			if (section.heightRel) {
				for (const refId of section.heightRel) {
					if (this.sections[refId]) {
						visit(refId, [...path, sectionId]);
					}
				}
			}

			visiting.delete(sectionId);
			visited.add(sectionId);
		};

		for (const sectionId of Object.keys(this.sections)) {
			visit(sectionId);
		}
	}

	/**
	 * Validate that all referenced sections exist
	 */
	private validateReferences(): void {
		for (const [sectionId, section] of Object.entries(this.sections)) {
			// Check 'from' reference
			if (section.from && !this.sections[section.from]) {
				throw new MissingSectionError(sectionId, section.from);
			}

			// Check 'heightRel' references
			if (section.heightRel) {
				for (const refId of section.heightRel) {
					if (!this.sections[refId]) {
						throw new MissingSectionError(sectionId, refId);
					}
				}
			}
		}
	}

	/**
	 * Calculate all section positions and heights
	 */
	private calculateAll(): SectionPositions {
		// Topological sort to resolve dependencies
		const sortedSections = this.topologicalSort();

		// Calculate positions in dependency order
		const positions: SectionPositions = {};

		// First pass: calculate heights (including dynamic heights)
		for (const sectionId of sortedSections) {
			const section = this.sections[sectionId];
			let height: number;

			if (section.height !== undefined) {
				height = section.height;
			} else if (section.heightRel) {
				// Calculate dynamic height from referenced sections
				height = section.heightRel.reduce((sum, refId) => {
					const refSection = this.sections[refId];
					if (refSection.height !== undefined) {
						return sum + refSection.height;
					} else if (positions[refId]) {
						return sum + positions[refId].height;
					}
					return sum;
				}, 0);
			} else {
				height = 0; // Should not happen due to validation
			}

			// Calculate Y position
			let y = 0;
			if (section.from && positions[section.from]) {
				const fromSection = positions[section.from];
				y = fromSection.y + fromSection.height;
			}

			positions[sectionId] = { y, height };
		}

		return positions;
	}

	/**
	 * Topological sort to resolve section dependencies
	 */
	private topologicalSort(): string[] {
		const visited = new Set<string>();
		const sorted: string[] = [];

		const visit = (sectionId: string): void => {
			if (visited.has(sectionId)) {
				return;
			}

			const section = this.sections[sectionId];

			// Visit dependencies first
			if (section.from && this.sections[section.from]) {
				visit(section.from);
			}

			if (section.heightRel) {
				for (const refId of section.heightRel) {
					if (this.sections[refId]) {
						visit(refId);
					}
				}
			}

			visited.add(sectionId);
			sorted.push(sectionId);
		};

		for (const sectionId of Object.keys(this.sections)) {
			visit(sectionId);
		}

		return sorted;
	}
}
