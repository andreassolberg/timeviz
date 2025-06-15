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
	private token: string;
	private homeyId: string;

	constructor(config: HomeyDataConfig) {
		this.token = config.token;
		this.homeyId = config.homeyId;
		this.homey = new Homey(config.token, config.homeyId, {
			cache: true,
			readFromCache: true
		});
		this.greenhouseDeviceId = config.greenhouseDeviceId;
	}

	/**
	 * Fetch current greenhouse temperature from most recent Insights data
	 * This is an alternative method that uses the same API as historical data
	 */
	async fetchCurrentGreenhouseTemperatureFromInsights(): Promise<TimeTick | null> {
		try {
			console.log('Fetching current greenhouse temperature from Insights API...');
			
			const logId = `homey:device:${this.greenhouseDeviceId}:measure_temperature`;
			const response: HomeyInsightResponse = await this.homey.getInsightLogs(logId, {
				resolution: 'lastHour'
			});

			if (!response?.values || response.values.length === 0) {
				console.warn('No recent insights data available for current temperature');
				return null;
			}

			// Get the most recent data point
			const mostRecent = response.values[response.values.length - 1];
			
			if (!mostRecent || mostRecent.v === null) {
				console.warn('Most recent insights data point has no valid temperature');
				return null;
			}

			const timestamp = new Date(mostRecent.t);
			const ageMinutes = (Date.now() - timestamp.getTime()) / (1000 * 60);
			
			console.log(`Using insights data as current: ${mostRecent.v}°C from ${timestamp.toLocaleString()} (${ageMinutes.toFixed(0)} min ago)`);
			
			// Only use as "current" if it's quite recent (less than 10 minutes old)
			if (ageMinutes > 10) {
				console.warn(`Insights data is too old (${ageMinutes.toFixed(0)} min) to use as current temperature`);
				return null;
			}

			return {
				ts: new Date(), // Use actual current time for positioning
				tstr: new Date().toTimeString().slice(0, 5),
				temperature: mostRecent.v as number,
				dataType: 'historical' as const,
				station: 'greenhouse-current'
			};

		} catch (error) {
			console.error('Error fetching current temperature from insights:', error);
			return null;
		}
	}

	/**
	 * Fetch current greenhouse temperature from device status
	 */
	async fetchCurrentGreenhouseTemperature(): Promise<TimeTick | null> {
		try {
			console.log('🌡️ [GREENHOUSE] Fetching current greenhouse temperature from Device API...');
			
			// Create a fresh Homey instance WITHOUT cache for real-time data
			const freshHomey = new Homey(this.token, this.homeyId, {
				cache: false,
				readFromCache: false
			});
			
			console.log('🌡️ [GREENHOUSE] 🚫 Using fresh API call (cache disabled) for current temperature');
			
			// Get all devices with fresh data (no cache)
			const devices = await freshHomey.getDevices();
			console.log(`🌡️ [GREENHOUSE] Total devices found: ${devices.items.length}`);
			
			const greenhouseDevice = devices.getItemById(this.greenhouseDeviceId);
			
			if (!greenhouseDevice) {
				console.warn(`🌡️ [GREENHOUSE] ❌ Device ${this.greenhouseDeviceId} not found`);
				
				// List all available devices for debugging
				console.log('🌡️ [GREENHOUSE] Available devices:');
				devices.items.slice(0, 10).forEach(device => {
					console.log(`  - ${device.id}: ${device.name} (${device.class})`);
				});
				return null;
			}

			// Log device details for debugging
			console.log('🌡️ [GREENHOUSE] ✅ Device found:', {
				id: greenhouseDevice.id,
				name: greenhouseDevice.name,
				class: greenhouseDevice.class,
				available: greenhouseDevice.available,
				capabilities: greenhouseDevice.capabilities,
				zoneName: greenhouseDevice.zoneName
			});

			// Get current temperature value
			const currentTemp = greenhouseDevice.getCapabilityValue('measure_temperature');
			
			console.log('🌡️ [GREENHOUSE] 📊 Current temperature from Device API:', {
				deviceId: this.greenhouseDeviceId,
				deviceName: greenhouseDevice.name,
				capability: 'measure_temperature',
				value: currentTemp,
				type: typeof currentTemp,
				timestamp: new Date().toISOString()
			});
			
			if (typeof currentTemp !== 'number') {
				console.warn('No valid current temperature found for greenhouse device');
				return null;
			}

			// Sanity check for reasonable temperature values
			if (currentTemp < -50 || currentTemp > 100) {
				console.warn(`Suspicious temperature value: ${currentTemp}°C - outside reasonable range`);
			}

			// Use same time format as historical data to ensure consistency
			const now = new Date();
			console.log(`🌡️ [GREENHOUSE] ✅ Adding current temperature: ${currentTemp}°C at ${now.toLocaleString()}`);
			
			const result = {
				ts: now,
				tstr: now.toTimeString().slice(0, 5), // HH:MM format
				temperature: currentTemp,
				dataType: 'historical' as const,
				station: 'greenhouse-current'
			};
			
			console.log(`🌡️ [GREENHOUSE] 🎯 Final TimeTick object:`, result);
			
			return result;

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
			// Fetch historical data first
			const historicalData = await this.fetchGreenhouseTemperatureData(timeWindow);
			
			// Try to get current temperature from Device API first, fallback to Insights API
			let currentTemp = await this.fetchCurrentGreenhouseTemperature();
			
			if (!currentTemp) {
				console.log('Device API failed, trying Insights API for current temperature...');
				currentTemp = await this.fetchCurrentGreenhouseTemperatureFromInsights();
			}

			let combinedData = [...historicalData];

			// Add current temperature if it's valid and within time window
			if (currentTemp && currentTemp.ts >= timeWindow.from.ts && currentTemp.ts <= timeWindow.to.ts) {
				// Check if we already have recent data to avoid duplicates
				const recentThreshold = 5 * 60 * 1000; // 5 minutes
				const hasRecentData = historicalData.some(point => 
					Math.abs(point.ts.getTime() - currentTemp.ts.getTime()) < recentThreshold
				);

				if (!hasRecentData) {
					console.log('🌡️ [GREENHOUSE] ➕ Adding current greenhouse temperature to dataset');
					
					// Compare with most recent historical data for validation
					if (historicalData.length > 0) {
						const mostRecent = historicalData[historicalData.length - 1];
						const tempDiff = Math.abs((currentTemp.temperature || 0) - (mostRecent.temperature || 0));
						const timeDiff = Math.abs(currentTemp.ts.getTime() - mostRecent.ts.getTime()) / (1000 * 60);
						
						console.log(`🌡️ [GREENHOUSE] 🔍 Validation: Current ${currentTemp.temperature}°C vs Recent ${mostRecent.temperature}°C (${tempDiff.toFixed(1)}°C diff, ${timeDiff.toFixed(0)}min apart)`);
						
						if (tempDiff > 5) {
							console.warn(`🌡️ [GREENHOUSE] ⚠️ Large temperature difference detected: ${tempDiff.toFixed(1)}°C - possible data issue!`);
							console.warn(`🌡️ [GREENHOUSE] Current temp source: Device API | Historical temp source: Insights API`);
						}
					}
					
					combinedData.push(currentTemp);
					
					// Sort by timestamp to maintain chronological order
					combinedData.sort((a, b) => a.ts.getTime() - b.ts.getTime());
					
					console.log(`🌡️ [GREENHOUSE] ✅ Final combined dataset has ${combinedData.length} points`);
					console.log(`🌡️ [GREENHOUSE] Last 3 points:`, combinedData.slice(-3).map(p => `${p.temperature}°C at ${p.ts.toLocaleString()} (${p.station})`));
				} else {
					console.log('🌡️ [GREENHOUSE] ⏭️ Current temperature too close to existing data point, skipping');
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