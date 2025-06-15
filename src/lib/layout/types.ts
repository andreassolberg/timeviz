/**
 * Configuration for a single section in the layout
 */
export interface SectionConfig {
	/** Fixed height in pixels */
	height?: number;
	
	/** Array of section IDs to sum heights from for dynamic height calculation */
	heightRel?: string[];
	
	/** Section ID to position this section relative to (null for root sections) */
	from: string | null;
}

/**
 * Calculated position and dimensions for a section
 */
export interface SectionPosition {
	/** Y coordinate in pixels */
	y: number;
	
	/** Height in pixels */
	height: number;
}

/**
 * Complete section configuration object
 */
export interface SectionsConfig {
	[sectionId: string]: SectionConfig;
}

/**
 * Calculated positions for all sections
 */
export interface SectionPositions {
	[sectionId: string]: SectionPosition;
}