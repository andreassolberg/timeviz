import Homey from './homey/Homey.js';
import type { TimeWindow, TimeTick } from '../types/time';

/**
 * Configuration for Homey data provider
 */
export interface HomeyDataConfig {
	token: string;
	homeyId: string;
	greenhouseDeviceId: string;
	userAgent?: string;
}

/**
 * Raw Homey insight data point
 */
export interface HomeyDataPoint {
	t: string; // ISO timestamp
	v: number | null; // Value (temperature)
}

/**
 * Homey insight response
 */
export interface HomeyInsightResponse {
	values: HomeyDataPoint[];
}

/**
 * HomeyDataProvider class - Fetches temperature data from Homey smart home system
 * 
 * Features:
 * - Fetches historical temperature data from specific Homey device
 * - Converts Homey insight data to TimeTick format
 * - Handles time window filtering
 * - Provides consistent interface with other data providers
 */
export class HomeyDataProvider {
	private homey: Homey;
	private greenhouseDeviceId: string;

	constructor(config: HomeyDataConfig) {
		this.homey = new Homey(config.token, config.homeyId, {
			cache: true,
			readFromCache: true
		});
		this.greenhouseDeviceId = config.greenhouseDeviceId;
	}

	/**
	 * Fetch current greenhouse temperature from device status
	 */
	async fetchCurrentGreenhouseTemperature(): Promise<TimeTick | null> {
		try {
			console.log('Fetching current greenhouse temperature...');
			
			// Get all devices to find our greenhouse device
			const devices = await this.homey.getDevices();
			const greenhouseDevice = devices.getItemById(this.greenhouseDeviceId);
			
			if (!greenhouseDevice) {
				console.warn(`Greenhouse device ${this.greenhouseDeviceId} not found`);
				return null;
			}

			// Get current temperature value
			const currentTemp = greenhouseDevice.getCapabilityValue('measure_temperature');
			
			if (typeof currentTemp !== 'number') {
				console.warn('No valid current temperature found for greenhouse device');
				return null;
			}

			const now = new Date();
			return {
				ts: now,
				tstr: now.toTimeString().slice(0, 5), // HH:MM format
				temperature: currentTemp,
				dataType: 'historical' as const,
				station: 'greenhouse-current'
			};

		} catch (error) {
			console.error('Error fetching current greenhouse temperature:', error);
			return null;
		}
	}

	/**
	 * Fetch greenhouse temperature data for the given time window
	 */
	async fetchGreenhouseTemperatureData(timeWindow: TimeWindow): Promise<TimeTick[]> {
		try {
			// Calculate time span in hours to determine appropriate resolution
			const timeSpanMs = timeWindow.to.ts.getTime() - timeWindow.from.ts.getTime();
			const timeSpanHours = timeSpanMs / (1000 * 60 * 60);
			
			// Choose resolution based on time span
			let resolution: string;
			if (timeSpanHours <= 6) {
				resolution = 'last6Hours';
			} else if (timeSpanHours <= 24) {
				resolution = 'last24Hours';
			} else if (timeSpanHours <= 168) { // 7 days
				resolution = 'last7Days';
			} else {
				resolution = 'last14Days';
			}

			// Build device log ID for temperature capability
			const logId = `homey:device:${this.greenhouseDeviceId}:measure_temperature`;

			console.log(`Fetching Homey greenhouse data with resolution: ${resolution}`);
			
			// Fetch data from Homey Insights API
			const response: HomeyInsightResponse = await this.homey.getInsightLogs(logId, {
				resolution
			});

			if (!response?.values || !Array.isArray(response.values)) {
				console.warn('No valid greenhouse temperature data received from Homey');
				return [];
			}

			console.log(`Received ${response.values.length} greenhouse temperature data points`);

			// Convert Homey data points to TimeTick format
			const timeTicks: TimeTick[] = response.values
				.filter((point): point is HomeyDataPoint => 
					point && 
					typeof point.t === 'string' && 
					point.v !== null && 
					typeof point.v === 'number'
				)
				.map((point) => {
					const timestamp = new Date(point.t);
					return {
						ts: timestamp,
						tstr: timestamp.toTimeString().slice(0, 5), // HH:MM format
						temperature: point.v as number, // Cast to number since we filtered out null values
						dataType: 'historical' as const,
						station: 'greenhouse'
					};
				})
				.filter((tick) => {
					// Filter to time window
					return tick.ts >= timeWindow.from.ts && tick.ts <= timeWindow.to.ts;
				});

			console.log(`Filtered to ${timeTicks.length} greenhouse data points within time window`);
			
			return timeTicks;

		} catch (error) {
			console.error('Error fetching greenhouse temperature data:', error);
			// Return empty array instead of throwing to allow application to continue
			return [];
		}
	}

	/**
	 * Fetch complete greenhouse temperature data (historical + current)
	 */
	async fetchCompleteGreenhouseData(timeWindow: TimeWindow): Promise<TimeTick[]> {
		try {
			// Fetch historical data and current temperature in parallel
			const [historicalData, currentTemp] = await Promise.all([
				this.fetchGreenhouseTemperatureData(timeWindow),
				this.fetchCurrentGreenhouseTemperature()
			]);

			let combinedData = [...historicalData];

			// Add current temperature if it's valid and within time window
			if (currentTemp && currentTemp.ts >= timeWindow.from.ts && currentTemp.ts <= timeWindow.to.ts) {
				// Check if we already have recent data to avoid duplicates
				const recentThreshold = 5 * 60 * 1000; // 5 minutes
				const hasRecentData = historicalData.some(point => 
					Math.abs(point.ts.getTime() - currentTemp.ts.getTime()) < recentThreshold
				);

				if (!hasRecentData) {
					console.log('Adding current greenhouse temperature to dataset');
					combinedData.push(currentTemp);
					
					// Sort by timestamp to maintain chronological order
					combinedData.sort((a, b) => a.ts.getTime() - b.ts.getTime());
				} else {
					console.log('Current temperature too close to existing data point, skipping');
				}
			}

			return combinedData;
		} catch (error) {
			console.error('Error fetching complete greenhouse data:', error);
			return [];
		}
	}

	/**
	 * Check if Homey integration is properly configured
	 */
	isConfigured(): boolean {
		return !!(this.homey && this.greenhouseDeviceId);
	}
}

export default HomeyDataProvider;