import { YrDataProvider } from './data/YrDataProvider';
import ValueScale from './ValueScale';
import Timeline from './Timeline';
import type { TimeTick } from './types/time';

/**
 * TemperatureData class - Handles fetching and preparing temperature data for visualization
 * 
 * Takes a Timeline instance and handles:
 * - Weather data fetching from APIs
 * - Creating appropriate ValueScale for temperature range
 * - Adding x,y coordinates to temperature markers
 * - Providing grid markers for visualization
 */
export class TemperatureData {
	private timeline: Timeline;
	private weatherProvider: YrDataProvider;
	private valueScale: ValueScale | null = null;
	private height: number;

	constructor(
		timeline: Timeline, 
		latitude: number, 
		longitude: number, 
		frostClientId?: string, 
		userAgent: string = 'Timeviz/1.0',
		height: number = 100
	) {
		this.timeline = timeline;
		this.height = height;
		this.weatherProvider = new YrDataProvider(latitude, longitude, frostClientId, userAgent);
	}

	/**
	 * Fetch and prepare all temperature data
	 * @returns Promise with weather data, temperature markers, and value scale info
	 */
	async prepare() {
		const timeWindow = this.timeline.getTimeWindow();
		
		// Fetch weather data
		const weatherData = await this.weatherProvider.fetchWeatherDataForTimeWindow(timeWindow);
		
		// Add x-coordinates to weather data
		const weatherDataWithX = weatherData.map(tick => this.timeline.addXToTimeTick(tick));

		// Create ValueScale based on temperature range
		this.createValueScale(weatherDataWithX);

		// Generate temperature markers with x,y coordinates
		const temperatureMarkers = this.createTemperatureMarkers(weatherDataWithX);

		return {
			weatherData: weatherDataWithX,
			temperatureMarkers,
			valueScale: {
				height: this.height,
				rowMarkers: this.valueScale?.getRowMarkers() || []
			}
		};
	}

	/**
	 * Create ValueScale based on temperature range in the data
	 */
	private createValueScale(weatherData: TimeTick[]) {
		const tempRange = weatherData.length > 0 ? {
			min: Math.min(...weatherData.map(d => d.temperature || 0)),
			max: Math.max(...weatherData.map(d => d.temperature || 0))
		} : { min: 0, max: 20 };

		this.valueScale = new ValueScale(tempRange.min, tempRange.max, this.height);
	}

	/**
	 * Generate temperature markers with x,y coordinates
	 */
	private createTemperatureMarkers(weatherData: TimeTick[]) {
		if (!this.valueScale) {
			throw new Error('ValueScale not created. Call createValueScale first.');
		}

		return weatherData.map(tick => ({
			...tick,
			y: this.valueScale!.scale(tick.temperature || 0)
		}));
	}

	/**
	 * Log debug information about the weather data
	 */
	logDebugInfo(weatherData: TimeTick[], weatherDataWithX: TimeTick[]) {
		const timeWindow = this.timeline.getTimeWindow();
		
		console.log('=== WEATHER DATA DEBUG ===');
		console.log('Time window:', {
			from: timeWindow.from.ts,
			to: timeWindow.to.ts
		});
		console.log('Weather data points:', weatherData.length);
		console.log('First 5 weather points:', weatherData.slice(0, 5));
		if (weatherData[0]) {
			console.log('Weather data structure:', JSON.stringify(weatherData[0], null, 2));
		}
		console.log('Weather data with X coordinates (first 3):', weatherDataWithX.slice(0, 3));
		console.log('==========================');
	}
}

export default TemperatureData;