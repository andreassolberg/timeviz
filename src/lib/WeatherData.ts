import { YrDataProvider } from './data/YrDataProvider';
import ValueScale from './ValueScale';
import Timeline from './Timeline';
import type { TimeTick } from './types/time';

/**
 * Configuration for WeatherData class
 */
export interface WeatherConfig {
	latitude: number;
	longitude: number;
	frostClientId?: string;
	userAgent?: string;
	
	// Konfigurerbare høyder for ulike skalaer:
	temperatureHeight?: number;    // default: 100
	precipitationHeight?: number;  // default: 60
}

/**
 * Information about a ValueScale for use in visualization
 */
export interface ValueScaleInfo {
	height: number;
	rowMarkers: Array<{ y: number; value: number }>;
	min: number;
	max: number;
}

/**
 * Complete weather data result with all weather types
 */
export interface WeatherDataResult {
	// Rådata:
	weatherData: TimeTick[];           // Komplett værdatasett
	
	// Temperatur:
	temperatureMarkers: TimeTick[];
	temperatureScale: ValueScaleInfo;
	extremeTemperatureMarkers: TimeTick[];  // Lokale min/max temperaturer
	
	// Nedbør:
	precipitationMarkers: TimeTick[];
	precipitationScale: ValueScaleInfo;
}

/**
 * WeatherData class - Unified weather data fetching and preparation
 * 
 * Handles all weather data types in a single, efficient operation:
 * - Fetches data from APIs once
 * - Creates appropriate ValueScales for each weather type
 * - Generates markers with x,y coordinates for visualization
 * - Provides consistent, type-safe interface
 */
export class WeatherData {
	private timeline: Timeline;
	private weatherProvider: YrDataProvider;
	private config: WeatherConfig;

	constructor(timeline: Timeline, config: WeatherConfig) {
		this.timeline = timeline;
		this.config = {
			temperatureHeight: 100,
			precipitationHeight: 60,
			userAgent: 'Timeviz/1.0',
			...config
		};
		
		this.weatherProvider = new YrDataProvider(
			config.latitude,
			config.longitude,
			config.frostClientId,
			this.config.userAgent
		);
	}

	/**
	 * Fetch and prepare all weather data in a single operation
	 */
	async prepare(): Promise<WeatherDataResult> {
		// ÉT API-kall henter alt værdata:
		const rawWeatherData = await this.fetchAllWeatherData();
		
		// Opprett value scales for hver værtype:
		const temperatureScale = this.createTemperatureScale(rawWeatherData);
		const precipitationScale = this.createPrecipitationScale();
		
		// Generer markers for hver værtype:
		const temperatureMarkers = this.createTemperatureMarkers(rawWeatherData, temperatureScale);
		const extremeTemperatureMarkers = this.getExtremeTemperatureMarkers(temperatureMarkers);
		
		return {
			weatherData: rawWeatherData,
			temperatureMarkers,
			temperatureScale: this.getScaleInfo(temperatureScale),
			extremeTemperatureMarkers,
			precipitationMarkers: this.createPrecipitationMarkers(rawWeatherData, precipitationScale),
			precipitationScale: this.getScaleInfo(precipitationScale, true) // true = skip row markers
		};
	}

	/**
	 * Fetch all weather data from APIs in a single operation
	 */
	private async fetchAllWeatherData(): Promise<TimeTick[]> {
		const timeWindow = this.timeline.getTimeWindow();
		
		// Kun ÉT kall til YrDataProvider som nå henter både temperatur og nedbør
		const weatherData = await this.weatherProvider.fetchWeatherDataForTimeWindow(timeWindow);
		
		// Legg til x-koordinater fra timeline
		return weatherData.map(tick => this.timeline.addXToTimeTick(tick));
	}

	/**
	 * Create ValueScale for temperature data
	 */
	private createTemperatureScale(weatherData: TimeTick[]): ValueScale {
		const tempValues = weatherData
			.map(d => d.temperature)
			.filter((t): t is number => t !== undefined);
		
		const tempRange = tempValues.length > 0 ? {
			min: Math.min(...tempValues),
			max: Math.max(...tempValues)
		} : { min: 0, max: 20 };

		return new ValueScale(tempRange.min, tempRange.max, this.config.temperatureHeight!);
	}

	/**
	 * Create ValueScale for precipitation data
	 */
	private createPrecipitationScale(): ValueScale {
		// Fast 5mm maksimum skala for nedbør, uavhengig av data
		// Dette gir konsistent skala og lar store verdier "sprenge" skalaen
		const precipRange = {
			min: 0,   // Nedbør starter alltid fra 0
			max: 5    // Fast 5mm maksimum
		};

		// Ikke clamp - lar verdier over 5mm gå utenfor skalaen
		return new ValueScale(precipRange.min, precipRange.max, this.config.precipitationHeight!, false);
	}

	/**
	 * Generate temperature markers with x,y coordinates
	 */
	private createTemperatureMarkers(weatherData: TimeTick[], temperatureScale: ValueScale): TimeTick[] {
		return weatherData.map(tick => ({
			...tick,
			y: temperatureScale.scale(tick.temperature || 0)
		}));
	}

	/**
	 * Generate precipitation markers with x,y coordinates
	 */
	private createPrecipitationMarkers(weatherData: TimeTick[], precipitationScale: ValueScale): TimeTick[] {
		return weatherData.map(tick => ({
			...tick,
			y: precipitationScale.scale(tick.precipitation || 0)
		}));
	}

	/**
	 * Find extreme temperature markers (local min/max) within 12-hour windows
	 * @param temperatureMarkers - Array of temperature markers with coordinates
	 * @returns Array of markers that are local extremes with max/min properties
	 */
	private getExtremeTemperatureMarkers(temperatureMarkers: TimeTick[]): TimeTick[] {
		const extremeMarkers: TimeTick[] = [];
		const windowHours = 12; // 12-hour window (6 hours before + 6 hours after)
		const windowMs = windowHours * 60 * 60 * 1000;
		
		// Filter markers with valid temperature data
		const validMarkers = temperatureMarkers.filter(marker => 
			marker.temperature !== undefined && marker.ts instanceof Date
		);
		
		for (let i = 0; i < validMarkers.length; i++) {
			const currentMarker = validMarkers[i];
			const currentTime = currentMarker.ts.getTime();
			const currentTemp = currentMarker.temperature!;
			
			// Find all markers within 12-hour window (6 hours before + 6 hours after)
			const windowMarkers = validMarkers.filter(marker => {
				const markerTime = marker.ts.getTime();
				const timeDiff = Math.abs(markerTime - currentTime);
				return timeDiff <= windowMs / 2; // ±6 hours
			});
			
			if (windowMarkers.length < 3) continue; // Need at least 3 points for meaningful comparison
			
			// Check if current marker is local maximum
			const isLocalMax = windowMarkers.every(marker => 
				marker.temperature! <= currentTemp
			);
			
			// Check if current marker is local minimum
			const isLocalMin = windowMarkers.every(marker => 
				marker.temperature! >= currentTemp
			);
			
			// Only mark as extreme if it's clearly max or min (not equal to all others)
			const hasVariation = windowMarkers.some(marker => 
				marker.temperature! !== currentTemp
			);
			
			if (hasVariation && (isLocalMax || isLocalMin)) {
				extremeMarkers.push({
					...currentMarker,
					max: isLocalMax,
					min: isLocalMin
				});
			}
		}
		
		// Remove consecutive extremes of the same type to avoid clutter
		return this.filterConsecutiveExtremes(extremeMarkers);
	}
	
	/**
	 * Filter out consecutive extreme markers of the same type to reduce clutter
	 * @param extremeMarkers - Array of extreme markers
	 * @returns Filtered array with no consecutive same-type extremes
	 */
	private filterConsecutiveExtremes(extremeMarkers: TimeTick[]): TimeTick[] {
		if (extremeMarkers.length <= 1) return extremeMarkers;
		
		const filtered: TimeTick[] = [extremeMarkers[0]];
		
		for (let i = 1; i < extremeMarkers.length; i++) {
			const current = extremeMarkers[i];
			const previous = filtered[filtered.length - 1];
			
			// Add current marker if it's a different type than the previous
			if ((current.max && !previous.max) || (current.min && !previous.min)) {
				filtered.push(current);
			} else {
				// If same type, keep the one with more extreme temperature
				if (current.max && previous.max && current.temperature! > previous.temperature!) {
					filtered[filtered.length - 1] = current;
				} else if (current.min && previous.min && current.temperature! < previous.temperature!) {
					filtered[filtered.length - 1] = current;
				}
			}
		}
		
		return filtered;
	}

	/**
	 * Get ValueScale information for visualization
	 * @param valueScale - The ValueScale to get info from
	 * @param skipRowMarkers - Whether to skip row markers (for precipitation scale)
	 */
	private getScaleInfo(valueScale: ValueScale, skipRowMarkers: boolean = false): ValueScaleInfo {
		const domain = valueScale.getDomain();
		const range = valueScale.getRange();
		const height = range[0]; // First value is the height (bottom of SVG)
		
		return {
			height,
			rowMarkers: skipRowMarkers ? [] : valueScale.getRowMarkers(),
			min: domain[0],
			max: domain[1]
		};
	}

	/**
	 * Log debug information about the weather data
	 */
	logDebugInfo(result: WeatherDataResult) {
		const timeWindow = this.timeline.getTimeWindow();
		
		console.log('=== UNIFIED WEATHER DATA DEBUG ===');
		console.log('Time window:', {
			from: timeWindow.from.ts,
			to: timeWindow.to.ts
		});
		console.log('Total weather data points:', result.weatherData.length);
		
		const tempValues = result.weatherData
			.map(d => d.temperature)
			.filter((t): t is number => t !== undefined);
		console.log('Temperature points:', tempValues.length);
		if (tempValues.length > 0) {
			console.log('Temperature range:', {
				min: Math.min(...tempValues),
				max: Math.max(...tempValues)
			});
		}
		
		const precipValues = result.weatherData
			.map(d => d.precipitation)
			.filter((p): p is number => p !== undefined && p > 0);
		console.log('Non-zero precipitation points:', precipValues.length);
		if (precipValues.length > 0) {
			console.log('Precipitation range:', {
				min: Math.min(...precipValues),
				max: Math.max(...precipValues)
			});
		}
		
		console.log('First 3 weather points:', result.weatherData.slice(0, 3));
		console.log('==================================');
	}
}

export default WeatherData;