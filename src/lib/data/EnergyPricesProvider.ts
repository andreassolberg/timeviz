import type { TimeWindow, TimeTick } from '../types/time';

/**
 * Norwegian electricity price zones
 */
export enum PriceZone {
	NO1 = 'NO1', // Oslo / East Norway
	NO2 = 'NO2', // Kristiansand / South Norway  
	NO3 = 'NO3', // Trondheim / Central Norway
	NO4 = 'NO4', // Tromsø / North Norway
	NO5 = 'NO5'  // Bergen / West Norway
}

/**
 * Raw API response from hvakosterstrommen.no
 */
export interface EnergyPriceResponse {
	time_start: string;      // ISO 8601 time string
	time_end: string;        // ISO 8601 time string
	NOK_per_kWh: number;     // Price in NOK/kWh (excl. VAT)
	EUR_per_kWh: number;     // Price in EUR/kWh (excl. VAT)
	EXR: number;             // Exchange rate NOK/EUR
}

/**
 * Processed energy price data for visualization
 */
export interface EnergyPriceData {
	timestamp: Date;
	nokPerKwh: number;
	eurPerKwh: number;
	exchangeRate: number;
	zone: PriceZone;
}

/**
 * Configuration for EnergyPrices class
 */
export interface EnergyPricesConfig {
	zone: PriceZone;
	userAgent?: string;
}

/**
 * EnergyPricesProvider class - Fetches Norwegian electricity prices from hvakosterstrommen.no API
 * 
 * Features:
 * - Fetches hourly electricity prices for specified time windows
 * - Supports all Norwegian price zones (NO1-NO5)
 * - Handles multiple API calls for date ranges spanning multiple days
 * - Converts raw API data to visualization-ready format
 * - Includes proper error handling and retry logic
 */
export class EnergyPricesProvider {
	private zone: PriceZone;
	private userAgent: string;
	private baseUrl = 'https://www.hvakosterstrommen.no/api/v1/prices';

	constructor(config: EnergyPricesConfig) {
		this.zone = config.zone;
		this.userAgent = config.userAgent || 'Timeviz/1.0 (Weather Timeline Visualization)';
	}

	/**
	 * Fetch energy prices for a given time window
	 * @param timeWindow - The time period to fetch prices for
	 * @returns Array of energy price data points
	 */
	async fetchEnergyPricesForTimeWindow(timeWindow: TimeWindow): Promise<TimeTick[]> {
		try {
			console.log(`Fetching energy prices for zone ${this.zone} from ${timeWindow.from.ts} to ${timeWindow.to.ts}`);
			
			// Get all unique dates we need to fetch
			const dates = this.getDateRange(timeWindow.from.ts, timeWindow.to.ts);
			console.log(`Need to fetch ${dates.length} dates:`, dates.map(d => d.toISOString().split('T')[0]));
			
			// Fetch prices for each date
			const allPrices: EnergyPriceData[] = [];
			for (const date of dates) {
				try {
					console.log(`Fetching prices for ${date.toISOString().split('T')[0]}...`);
					const dayPrices = await this.fetchDayPrices(date);
					console.log(`Got ${dayPrices.length} price points for ${date.toISOString().split('T')[0]}`);
					allPrices.push(...dayPrices);
				} catch (error) {
					console.warn(`Failed to fetch prices for ${date.toISOString().split('T')[0]}:`, error);
					// Continue with other dates even if one fails
				}
			}
			
			console.log(`Total raw prices collected: ${allPrices.length}`);
			console.log(`Time window filter: ${timeWindow.from.ts.toISOString()} to ${timeWindow.to.ts.toISOString()}`);
			
			// Filter to only include prices within the time window and convert to TimeTick
			const filteredPrices = allPrices
				.filter(price => {
					const inRange = price.timestamp >= timeWindow.from.ts && price.timestamp <= timeWindow.to.ts;
					if (!inRange) {
						console.log(`Filtering out price at ${price.timestamp.toISOString()} (outside window)`);
					}
					return inRange;
				})
				.map(price => this.convertToTimeTick(price));
			
			console.log(`Successfully fetched ${filteredPrices.length} energy price data points after filtering`);
			return filteredPrices;
			
		} catch (error) {
			console.error('Error fetching energy prices:', error);
			throw new Error(`Failed to fetch energy prices: ${error}`);
		}
	}

	/**
	 * Fetch energy prices for a specific date
	 * @param date - The date to fetch prices for
	 * @returns Array of energy price data for that day
	 */
	private async fetchDayPrices(date: Date): Promise<EnergyPriceData[]> {
		const year = date.getFullYear();
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const day = date.getDate().toString().padStart(2, '0');
		
		const url = `${this.baseUrl}/${year}/${month}-${day}_${this.zone}.json`;
		console.log(`Attempting to fetch: ${url}`);
		
		try {
			const response = await fetch(url, {
				headers: {
					'User-Agent': this.userAgent,
					'Accept': 'application/json'
				}
			});
			
			if (!response.ok) {
				console.error(`Failed to fetch ${url}: HTTP ${response.status}: ${response.statusText}`);
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			
			const rawData: EnergyPriceResponse[] = await response.json();
			console.log(`Successfully fetched ${rawData.length} price points from ${url}`);
			
			// Convert raw API data to our format
			return rawData.map(item => ({
				timestamp: new Date(item.time_start),
				nokPerKwh: item.NOK_per_kWh,
				eurPerKwh: item.EUR_per_kWh,
				exchangeRate: item.EXR,
				zone: this.zone
			}));
			
		} catch (error) {
			console.error(`Failed to fetch prices for ${year}-${month}-${day}:`, error);
			throw new Error(`Failed to fetch prices for ${year}-${month}-${day}: ${error}`);
		}
	}

	/**
	 * Get array of unique dates between start and end dates
	 * @param startDate - Start of date range
	 * @param endDate - End of date range
	 * @returns Array of Date objects for each day in range
	 */
	private getDateRange(startDate: Date, endDate: Date): Date[] {
		const dates: Date[] = [];
		const current = new Date(startDate);
		current.setHours(0, 0, 0, 0); // Start at midnight
		
		const end = new Date(endDate);
		end.setHours(0, 0, 0, 0); // End at midnight
		
		console.log(`Date range calculation: ${current.toISOString()} to ${end.toISOString()}`);
		
		while (current <= end) {
			dates.push(new Date(current));
			current.setDate(current.getDate() + 1);
		}
		
		console.log(`Generated ${dates.length} dates:`, dates.map(d => d.toISOString().split('T')[0]));
		return dates;
	}

	/**
	 * Convert energy price data to TimeTick format
	 * @param priceData - Raw energy price data
	 * @returns TimeTick with energy price information
	 */
	private convertToTimeTick(priceData: EnergyPriceData): TimeTick {
		return {
			ts: priceData.timestamp,
			tstr: this.formatTime(priceData.timestamp),
			nokPerKwh: priceData.nokPerKwh,
			eurPerKwh: priceData.eurPerKwh,
			exchangeRate: priceData.exchangeRate,
			zone: priceData.zone,
			dataType: 'energy'
		};
	}

	/**
	 * Format timestamp for display
	 * @param date - Date to format
	 * @returns Formatted time string
	 */
	private formatTime(date: Date): string {
		return date.toLocaleTimeString('no-NO', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	/**
	 * Get the price zone this instance is configured for
	 * @returns Current price zone
	 */
	getZone(): PriceZone {
		return this.zone;
	}

	/**
	 * Log debug information about energy price data
	 * @param prices - Array of energy price TimeTicks
	 */
	logDebugInfo(prices: TimeTick[]) {
		console.log('=== ENERGY PRICES DEBUG ===');
		console.log('Zone:', this.zone);
		console.log('Total data points:', prices.length);
		
		const nokPrices = prices
			.map(p => p.nokPerKwh)
			.filter((p): p is number => p !== undefined);
		
		if (nokPrices.length > 0) {
			console.log('NOK/kWh range:', {
				min: Math.min(...nokPrices).toFixed(4),
				max: Math.max(...nokPrices).toFixed(4),
				avg: (nokPrices.reduce((a, b) => a + b, 0) / nokPrices.length).toFixed(4)
			});
		}
		
		console.log('First 3 prices:', prices.slice(0, 3));
		console.log('===========================');
	}
}

export default EnergyPricesProvider;