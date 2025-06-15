/**
 * Custom error class for SectionStack validation and calculation errors
 */
export class SectionStackError extends Error {
	constructor(
		message: string,
		public sectionId?: string
	) {
		super(message);
		this.name = 'SectionStackError';
	}
}

/**
 * Error thrown when a section configuration is invalid
 */
export class SectionValidationError extends SectionStackError {
	constructor(message: string, sectionId: string) {
		super(`Section '${sectionId}': ${message}`, sectionId);
		this.name = 'SectionValidationError';
	}
}

/**
 * Error thrown when there are circular dependencies between sections
 */
export class CircularDependencyError extends SectionStackError {
	constructor(sectionId: string, dependencyChain: string[]) {
		const chain = dependencyChain.join(' → ');
		super(`Circular dependency detected: ${chain} → ${sectionId}`, sectionId);
		this.name = 'CircularDependencyError';
	}
}

/**
 * Error thrown when a referenced section doesn't exist
 */
export class MissingSectionError extends SectionStackError {
	constructor(referencedBy: string, missingSectionId: string) {
		super(
			`Section '${referencedBy}' references missing section '${missingSectionId}'`,
			referencedBy
		);
		this.name = 'MissingSectionError';
	}
}
