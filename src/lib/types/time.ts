/**
 * Core time-related data structures for the Timeviz application
 */

/**
 * Represents a single point in time with its formatted string representation
 * Can be extended with additional properties like styling, etc.
 */
export interface TimeTick {
	/** The timestamp for this tick */
	ts: Date;
	
	/** Human-readable string representation of the time */
	tstr: string;
	
	/** Optional X position in the visualization */
	x?: number;
	
	/** Optional label for this tick */
	label?: string;
	
	/** Allow additional properties to be added */
	[key: string]: any;
}

/**
 * Represents a time range defined by two TimeTick endpoints
 * Can be extended with properties like duration, midpoint, etc.
 */
export interface TimeWindow {
	/** Start of the time window */
	from: TimeTick;
	
	/** End of the time window */
	to: TimeTick;
	
	/** Optional label for this time window */
	label?: string;
	
	/** Allow additional properties to be added */
	[key: string]: any;
}

/**
 * Type guard to check if an object is a valid TimeTick
 */
export function isTimeTick(obj: any): obj is TimeTick {
	return obj && 
		obj.ts instanceof Date && 
		typeof obj.tstr === 'string';
}

/**
 * Type guard to check if an object is a valid TimeWindow
 */
export function isTimeWindow(obj: any): obj is TimeWindow {
	return obj && 
		isTimeTick(obj.from) && 
		isTimeTick(obj.to);
}