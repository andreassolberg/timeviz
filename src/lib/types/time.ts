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

	/** Optional Y position in the visualization */
	y?: number;

	/** Optional label for this tick */
	label?: string;

	/** Weather data properties */
	temperature?: number;
	humidity?: number;
	windSpeed?: number;
	uvIndex?: number;
	uv?: number;
	weatherSymbol?: string;

	/** Temperature extreme markers */
	max?: boolean; // Is local temperature maximum
	min?: boolean; // Is local temperature minimum

	/** Precipitation data properties */
	precipitation?: number; // mm per time
	precipitationMax?: number; // maks mm per time
	precipitationMin?: number; // min mm per time

	/** Precipitation extreme markers */
	precipMax?: boolean; // Is maximum precipitation for period

	/** Energy price data properties */
	nokPerKwh?: number; // NOK per kWh
	eurPerKwh?: number; // EUR per kWh
	exchangeRate?: number; // NOK/EUR exchange rate
	zone?: string; // Energy price zone (NO1-NO5)

	/** Energy price extreme markers */
	priceMax?: boolean; // Is local energy price maximum
	priceMin?: boolean; // Is local energy price minimum

	/** Data source type */
	dataType?: 'forecast' | 'historical' | 'solar' | 'energy';
	station?: string;

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
	return obj && obj.ts instanceof Date && typeof obj.tstr === 'string';
}

/**
 * Type guard to check if an object is a valid TimeWindow
 */
export function isTimeWindow(obj: any): obj is TimeWindow {
	return obj && isTimeTick(obj.from) && isTimeTick(obj.to);
}
