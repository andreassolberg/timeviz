import { YrDataProvider } from './data/YrDataProvider';
import { HomeyDataProvider } from './data/HomeyDataProvider';
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
	temperatureHeight?: number; // default: 100
	precipitationHeight?: number; // default: 60

	// Homey smart home integration (optional):
	homeyToken?: string;
	homeyId?: string;
	greenhouseDeviceId?: string; // Device ID for greenhouse temperature sensor
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
	weatherData: TimeTick[]; // Komplett værdatasett

	// Temperatur:
	temperatureMarkers: TimeTick[];
	temperatureScale: ValueScaleInfo;
	extremeTemperatureMarkers: TimeTick[]; // Lokale min/max temperaturer

	// Drivhus temperatur (Homey integration):
	greenhouseTemperatureMarkers?: TimeTick[]; // Historiske temperaturdata fra drivhus
	extremeGreenhouseTemperatureMarkers?: TimeTick[]; // Lokale min/max for drivhus

	// Nedbør:
	precipitationMarkers: TimeTick[];
	precipitationScale: ValueScaleInfo;
	extremePrecipitationMarkers: TimeTick[]; // Maks nedbør for perioden

	// Værsymbol:
	weatherSymbolMarkers: TimeTick[]; // Værsymboler med korrekt posisjonering
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
	private homeyProvider: HomeyDataProvider | null;
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

		// Initialize Homey provider if configured
		this.homeyProvider = null;
		if (config.homeyToken && config.homeyId && config.greenhouseDeviceId) {
			this.homeyProvider = new HomeyDataProvider({
				token: config.homeyToken,
				homeyId: config.homeyId,
				greenhouseDeviceId: config.greenhouseDeviceId,
				userAgent: this.config.userAgent
			});
		}
	}

	/**
	 * Fetch and prepare all weather data in a single operation
	 */
	async prepare(): Promise<WeatherDataResult> {
		const timeWindow = this.timeline.getTimeWindow();

		// Fetch weather data and greenhouse data in parallel
		const [rawWeatherData, rawGreenhouseData] = await Promise.all([
			this.fetchAllWeatherData(),
			this.fetchGreenhouseData()
		]);

		// Create combined temperature scale including both weather and greenhouse data
		const temperatureScale = this.createCombinedTemperatureScale(rawWeatherData, rawGreenhouseData);
		const precipitationScale = this.createPrecipitationScale();

		// Generate markers for weather data
		const temperatureMarkers = this.createTemperatureMarkers(rawWeatherData, temperatureScale);
		const extremeTemperatureMarkers = this.getExtremeTemperatureMarkers(temperatureMarkers);

		// Generate markers for greenhouse data
		const greenhouseTemperatureMarkers = rawGreenhouseData.length > 0 
			? this.createGreenhouseTemperatureMarkers(rawGreenhouseData, temperatureScale)
			: undefined;
		const extremeGreenhouseTemperatureMarkers = greenhouseTemperatureMarkers 
			? this.getExtremeTemperatureMarkers(greenhouseTemperatureMarkers)
			: undefined;

		// Generate other markers
		const precipitationMarkers = this.createPrecipitationMarkers(rawWeatherData, precipitationScale);
		const extremePrecipitationMarkers = this.getExtremePrecipitationMarkers(precipitationMarkers);
		const weatherSymbolMarkers = this.createWeatherSymbolMarkers(temperatureMarkers);

		return {
			weatherData: rawWeatherData,
			temperatureMarkers,
			temperatureScale: this.getScaleInfo(temperatureScale),
			extremeTemperatureMarkers,
			greenhouseTemperatureMarkers,
			extremeGreenhouseTemperatureMarkers,
			precipitationMarkers,
			precipitationScale: this.getScaleInfo(precipitationScale, true), // true = skip row markers
			extremePrecipitationMarkers,
			weatherSymbolMarkers
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
		return weatherData.map((tick) => this.timeline.addXToTimeTick(tick));
	}

	/**
	 * Fetch greenhouse temperature data from Homey if configured
	 */
	private async fetchGreenhouseData(): Promise<TimeTick[]> {
		if (!this.homeyProvider) {
			return [];
		}

		const timeWindow = this.timeline.getTimeWindow();
		
		try {
			// Use the new complete data method that includes current temperature
			const greenhouseData = await this.homeyProvider.fetchCompleteGreenhouseData(timeWindow);
			
			// Add x-coordinates from timeline
			return greenhouseData.map((tick) => this.timeline.addXToTimeTick(tick));
		} catch (error) {
			console.error('Error fetching greenhouse data:', error);
			return [];
		}
	}

	/**
	 * Create ValueScale for temperature data (legacy method for backward compatibility)
	 */
	private createTemperatureScale(weatherData: TimeTick[]): ValueScale {
		return this.createCombinedTemperatureScale(weatherData, []);
	}

	/**
	 * Create ValueScale for combined temperature data (weather + greenhouse)
	 */
	private createCombinedTemperatureScale(weatherData: TimeTick[], greenhouseData: TimeTick[]): ValueScale {
		// Combine temperature values from both weather and greenhouse data
		const weatherTempValues = weatherData
			.map((d) => d.temperature)
			.filter((t): t is number => t !== undefined);

		const greenhouseTempValues = greenhouseData
			.map((d) => d.temperature)
			.filter((t): t is number => t !== undefined);

		const allTempValues = [...weatherTempValues, ...greenhouseTempValues];

		const tempRange =
			allTempValues.length > 0
				? {
						min: Math.min(...allTempValues),
						max: Math.max(...allTempValues)
					}
				: { min: 0, max: 20 };

		console.log(`Temperature scale created with range: ${tempRange.min}°C to ${tempRange.max}°C`);
		console.log(`Weather temps: ${weatherTempValues.length}, Greenhouse temps: ${greenhouseTempValues.length}`);

		return new ValueScale(tempRange.min, tempRange.max, this.config.temperatureHeight!);
	}

	/**
	 * Create ValueScale for precipitation data
	 */
	private createPrecipitationScale(): ValueScale {
		// Fast 5mm maksimum skala for nedbør, uavhengig av data
		// Dette gir konsistent skala og lar store verdier "sprenge" skalaen
		const precipRange = {
			min: 0, // Nedbør starter alltid fra 0
			max: 5 // Fast 5mm maksimum
		};

		// Ikke clamp - lar verdier over 5mm gå utenfor skalaen
		// inverted=false for høyde-verdier (0mm = 0px høyde, 5mm = full høyde)
		return new ValueScale(
			precipRange.min,
			precipRange.max,
			this.config.precipitationHeight!,
			false,
			false
		);
	}

	/**
	 * Generate temperature markers with x,y coordinates
	 */
	private createTemperatureMarkers(
		weatherData: TimeTick[],
		temperatureScale: ValueScale
	): TimeTick[] {
		return weatherData.map((tick) => ({
			...tick,
			y: temperatureScale.scale(tick.temperature || 0)
		}));
	}

	/**
	 * Generate greenhouse temperature markers with x,y coordinates
	 */
	private createGreenhouseTemperatureMarkers(
		greenhouseData: TimeTick[],
		temperatureScale: ValueScale
	): TimeTick[] {
		return greenhouseData.map((tick) => ({
			...tick,
			y: temperatureScale.scale(tick.temperature || 0)
		}));
	}

	/**
	 * Generate precipitation markers with x,y coordinates
	 */
	private createPrecipitationMarkers(
		weatherData: TimeTick[],
		precipitationScale: ValueScale
	): TimeTick[] {
		return weatherData.map((tick) => ({
			...tick,
			y: precipitationScale.scale(tick.precipitation || 0)
		}));
	}

	/**
	 * Generate weather symbol markers with corrected positioning
	 * Weather symbols represent the NEXT hour, so they should be positioned:
	 * - X: centered in the hour they represent (current time + 0.5 hours)
	 * - Y: average temperature between current and next hour
	 *
	 * VIKTIG: YrDataProvider filtrerer nå bort weatherSymbol på siste tidspunkt
	 * fordi det ville representere en time utenfor tidsvinduet.
	 */
	private createWeatherSymbolMarkers(temperatureMarkers: TimeTick[]): TimeTick[] {
		const hourWidth = this.timeline.getHourWidth();
		const symbolMarkers: TimeTick[] = [];

		for (let i = 0; i < temperatureMarkers.length; i++) {
			const current = temperatureMarkers[i];
			const next = temperatureMarkers[i + 1];

			// Skip if no weather symbol or no coordinates
			// (weatherSymbol kan nå være undefined på siste tidspunkt - dette er korrekt)
			if (!current.weatherSymbol || current.x === undefined || current.y === undefined) {
				continue;
			}

			// For the last marker, we don't have next temperature data
			// So we skip it as the weather symbol would apply to unknown future data
			if (!next || next.x === undefined || next.y === undefined) {
				continue;
			}

			// X position: centered in the hour the symbol represents (halfway to next marker)
			const symbolX = current.x + hourWidth / 2;

			// Y position: average temperature between current and next hour
			const symbolY = (current.y + next.y) / 2;

			symbolMarkers.push({
				...current,
				x: symbolX,
				y: symbolY
			});
		}

		return symbolMarkers;
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
		const validMarkers = temperatureMarkers.filter(
			(marker) => marker.temperature !== undefined && marker.ts instanceof Date
		);

		for (let i = 0; i < validMarkers.length; i++) {
			const currentMarker = validMarkers[i];
			const currentTime = currentMarker.ts.getTime();
			const currentTemp = currentMarker.temperature!;

			// Find all markers within 12-hour window (6 hours before + 6 hours after)
			const windowMarkers = validMarkers.filter((marker) => {
				const markerTime = marker.ts.getTime();
				const timeDiff = Math.abs(markerTime - currentTime);
				return timeDiff <= windowMs / 2; // ±6 hours
			});

			if (windowMarkers.length < 3) continue; // Need at least 3 points for meaningful comparison

			// Check if current marker is local maximum
			const isLocalMax = windowMarkers.every((marker) => marker.temperature! <= currentTemp);

			// Check if current marker is local minimum
			const isLocalMin = windowMarkers.every((marker) => marker.temperature! >= currentTemp);

			// Only mark as extreme if it's clearly max or min (not equal to all others)
			const hasVariation = windowMarkers.some((marker) => marker.temperature! !== currentTemp);

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
	 * Find extreme precipitation marker (maximum) for the entire period
	 * @param precipitationMarkers - Array of precipitation markers with coordinates
	 * @returns Array with single marker for max precipitation, or empty array if no precipitation
	 */
	private getExtremePrecipitationMarkers(precipitationMarkers: TimeTick[]): TimeTick[] {
		// Filter markers with valid precipitation data
		const validMarkers = precipitationMarkers.filter(
			(marker) => marker.precipitation !== undefined && marker.precipitation > 0
		);

		// If no precipitation at all, return empty array
		if (validMarkers.length === 0) {
			return [];
		}

		// Find marker with maximum precipitation
		let maxMarker = validMarkers[0];
		let maxPrecipitation = maxMarker.precipitation!;

		for (const marker of validMarkers) {
			if (marker.precipitation! > maxPrecipitation) {
				maxPrecipitation = marker.precipitation!;
				maxMarker = marker;
			}
		}

		// Return array with single max marker
		// Add precipMax property to indicate this is a maximum
		return [
			{
				...maxMarker,
				precipMax: true
			}
		];
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
			.map((d) => d.temperature)
			.filter((t): t is number => t !== undefined);
		console.log('Temperature points:', tempValues.length);
		if (tempValues.length > 0) {
			console.log('Temperature range:', {
				min: Math.min(...tempValues),
				max: Math.max(...tempValues)
			});
		}

		const precipValues = result.weatherData
			.map((d) => d.precipitation)
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
