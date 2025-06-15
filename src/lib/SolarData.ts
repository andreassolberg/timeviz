import { getSunAltitudeAtTime, getSunriseSunset } from './solar/SolarCalculations';
import ValueScale from './ValueScale';
import Timeline from './Timeline';
import type { TimeTick } from './types/time';

/**
 * Configuration for SolarData class
 */
export interface SolarConfig {
	latitude: number;
	longitude: number;
	timezoneOffset?: number; // Hours from UTC, defaults to local timezone
	solarHeight?: number; // Height of solar visualization area, default: 80
	intervalMinutes?: number; // Data point interval in minutes, default: 15
}

/**
 * Information about solar scale for visualization
 */
export interface SolarScaleInfo {
	height: number;
	rowMarkers: Array<{ y: number; value: number }>;
	min: number;
	max: number;
}

/**
 * Complete solar data result
 */
export interface SolarDataResult {
	solarMarkers: TimeTick[];
	solarScale: SolarScaleInfo;
}

/**
 * SolarData class - Sun altitude time series generation
 *
 * Generates continuous sun altitude curves for each day in the timeline:
 * - Calculates sun position using astronomical formulas
 * - Creates time series starting and ending at horizon (0°)
 * - Provides markers with x,y coordinates for SVG path visualization
 * - Handles polar day/night conditions gracefully
 */
export class SolarData {
	private timeline: Timeline;
	private config: SolarConfig;

	constructor(timeline: Timeline, config: SolarConfig) {
		this.timeline = timeline;
		this.config = {
			timezoneOffset: new Date().getTimezoneOffset() / -60, // Convert to hours from UTC
			solarHeight: 80,
			intervalMinutes: 15,
			...config
		};
	}

	/**
	 * Generate and prepare solar altitude data
	 */
	async prepare(): Promise<SolarDataResult> {
		const solarMarkers = this.generateSolarTimeSeries();
		const solarScale = this.createSolarScale(solarMarkers);

		return {
			solarMarkers: this.addCoordinates(solarMarkers, solarScale),
			solarScale: this.getScaleInfo(solarScale)
		};
	}

	/**
	 * Generate solar altitude time series for the timeline
	 */
	private generateSolarTimeSeries(): TimeTick[] {
		const markers: TimeTick[] = [];
		const timeWindow = this.timeline.getTimeWindow();

		// Process each day in the timeline
		const currentDay = new Date(timeWindow.from.ts);
		currentDay.setHours(0, 0, 0, 0);

		while (currentDay <= timeWindow.to.ts) {
			const dayMarkers = this.generateDayAltitudeSeries(currentDay);
			markers.push(...dayMarkers);

			// Move to next day
			currentDay.setDate(currentDay.getDate() + 1);
		}

		// Filter to only include points within timeline window
		return markers.filter(
			(marker) => marker.ts >= timeWindow.from.ts && marker.ts <= timeWindow.to.ts
		);
	}

	/**
	 * Generate sun altitude series for a single day
	 */
	private generateDayAltitudeSeries(date: Date): TimeTick[] {
		const markers: TimeTick[] = [];
		const { latitude, longitude, timezoneOffset, intervalMinutes } = this.config;

		// Get sunrise and sunset for this day
		const { sunrise, sunset } = getSunriseSunset(date, latitude!, longitude!, timezoneOffset!);

		// Handle polar day/night conditions
		if (!sunrise || !sunset) {
			// For polar conditions, we might want to sample throughout the day
			// and let negative altitudes be handled by the scale
			return this.generateFullDaySeries(date);
		}

		// Start slightly before sunrise to ensure we start at 0°
		const startTime = new Date(sunrise.getTime() - 30 * 60 * 1000); // 30 minutes before
		const endTime = new Date(sunset.getTime() + 30 * 60 * 1000); // 30 minutes after

		const current = new Date(startTime);

		while (current <= endTime) {
			const altitude = getSunAltitudeAtTime(current, latitude!, longitude!, timezoneOffset!);

			// Include all points (even slightly negative ones for smooth curves)
			if (altitude >= -2) {
				// Include points slightly below horizon for smoother curves
				markers.push({
					ts: new Date(current),
					tstr: this.formatTime(current),
					altitude: Math.max(0, altitude), // Clamp to 0 minimum for visualization
					dataType: 'solar'
				});
			}

			// Advance by interval
			current.setMinutes(current.getMinutes() + intervalMinutes!);
		}

		return markers;
	}

	/**
	 * Generate full day series for polar conditions
	 */
	private generateFullDaySeries(date: Date): TimeTick[] {
		const markers: TimeTick[] = [];
		const { latitude, longitude, timezoneOffset, intervalMinutes } = this.config;

		// Sample throughout the entire day
		const current = new Date(date);
		current.setHours(0, 0, 0, 0);

		const endOfDay = new Date(date);
		endOfDay.setHours(23, 59, 59, 999);

		while (current <= endOfDay) {
			const altitude = getSunAltitudeAtTime(current, latitude!, longitude!, timezoneOffset!);

			// For polar day, include positive altitudes; for polar night, we'll get no points
			if (altitude > 0) {
				markers.push({
					ts: new Date(current),
					tstr: this.formatTime(current),
					altitude: altitude,
					dataType: 'solar'
				});
			}

			current.setMinutes(current.getMinutes() + intervalMinutes!);
		}

		return markers;
	}

	/**
	 * Create ValueScale for solar altitude (0° to ~90°)
	 */
	private createSolarScale(markers: TimeTick[]): ValueScale {
		// Find the maximum altitude in the data
		const altitudes = markers
			.map((m) => m.altitude)
			.filter((alt): alt is number => alt !== undefined);

		const maxAltitude = altitudes.length > 0 ? Math.max(...altitudes) : 90;

		// Scale from 0 to the maximum altitude (rounded up to nice number)
		const maxScale = Math.max(30, Math.ceil(maxAltitude / 10) * 10);

		return new ValueScale(0, maxScale, this.config.solarHeight!);
	}

	/**
	 * Add x,y coordinates to solar markers
	 */
	private addCoordinates(markers: TimeTick[], scale: ValueScale): TimeTick[] {
		return markers.map((marker) => ({
			...marker,
			x: this.timeline.scale(marker.ts),
			y: scale.scale(marker.altitude || 0)
		}));
	}

	/**
	 * Get ValueScale information for visualization
	 */
	private getScaleInfo(valueScale: ValueScale): SolarScaleInfo {
		const domain = valueScale.getDomain();
		const range = valueScale.getRange();
		const height = range[0]; // First value is the height (bottom of SVG)

		return {
			height,
			rowMarkers: [], // No row markers for solar data, like precipitation
			min: domain[0],
			max: domain[1]
		};
	}

	/**
	 * Format time for display
	 */
	private formatTime(date: Date): string {
		return date.toLocaleTimeString('no-NO', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	/**
	 * Log debug information about solar data
	 */
	logDebugInfo(result: SolarDataResult) {
		const timeWindow = this.timeline.getTimeWindow();

		console.log('=== SOLAR DATA DEBUG ===');
		console.log('Time window:', {
			from: timeWindow.from.ts,
			to: timeWindow.to.ts
		});
		console.log('Solar data points:', result.solarMarkers.length);

		const altitudes = result.solarMarkers
			.map((m) => m.altitude)
			.filter((alt): alt is number => alt !== undefined);

		if (altitudes.length > 0) {
			console.log('Altitude range:', {
				min: Math.min(...altitudes),
				max: Math.max(...altitudes)
			});
		}

		console.log('First 3 solar points:', result.solarMarkers.slice(0, 3));
		console.log('=========================');
	}
}

export default SolarData;
