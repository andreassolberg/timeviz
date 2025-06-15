import { EnergyPricesProvider, PriceZone } from './data/EnergyPricesProvider';
import ValueScale from './ValueScale';
import Timeline from './Timeline';
import type { TimeTick } from './types/time';
import { loadConfig } from './config/ConfigLoader';

/**
 * Format energy price with appropriate suffix (kr or øre)
 * @param nokPerKwh - Price in NOK per kWh
 * @returns Formatted price string with suffix
 */
export function formatEnergyPrice(nokPerKwh: number): string {
	if (nokPerKwh >= 1) {
		// Use kr for prices 1 NOK and above
		return `${nokPerKwh.toFixed(2)} kr`;
	} else {
		// Convert to øre for prices below 1 NOK (1 NOK = 100 øre)
		const ore = Math.round(nokPerKwh * 100);
		return `${ore} øre`;
	}
}

/**
 * Configuration for EnergyData class
 */
export interface EnergyConfig {
	zone: PriceZone;
	userAgent?: string;

	// Konfigurerbare høyder for ulike skalaer:
	energyHeight?: number; // default: 80
}

/**
 * Information about a ValueScale for use in visualization
 */
export interface EnergyScaleInfo {
	height: number;
	rowMarkers: Array<{ y: number; value: number }>;
	min: number;
	max: number;
}

/**
 * Complete energy data result
 */
export interface EnergyDataResult {
	// Rådata:
	energyData: TimeTick[]; // Komplett strømpris-datasett

	// Strømpriser:
	energyMarkers: TimeTick[];
	energyScale: EnergyScaleInfo;
	extremeEnergyMarkers: TimeTick[]; // Lokale min/max strømpriser
}

/**
 * EnergyData class - Unified energy price data fetching and preparation
 *
 * Handles energy price data in a single, efficient operation:
 * - Fetches data from hvakosterstrommen.no API once
 * - Creates appropriate ValueScale for energy prices
 * - Generates markers with x,y coordinates for visualization
 * - Provides consistent, type-safe interface
 */
export class EnergyData {
	private timeline: Timeline;
	private energyProvider: EnergyPricesProvider;
	private config: EnergyConfig;

	constructor(timeline: Timeline, config: EnergyConfig) {
		this.timeline = timeline;
		const appConfig = loadConfig();

		this.config = {
			energyHeight: appConfig.visualization.layout.energyHeight || 80,
			userAgent: 'Timeviz/1.0',
			...config
		};

		this.energyProvider = new EnergyPricesProvider({
			zone: config.zone,
			userAgent: this.config.userAgent
		});
	}

	/**
	 * Fetch and prepare all energy data in a single operation
	 */
	async prepare(): Promise<EnergyDataResult> {
		// ÉT API-kall henter alt strømpris-data:
		const rawEnergyData = await this.fetchAllEnergyData();

		// Opprett value scale for strømpriser:
		const energyScale = this.createEnergyScale(rawEnergyData);

		// Generer markers for strømpriser:
		const energyMarkers = this.createEnergyMarkers(rawEnergyData, energyScale);
		const extremeEnergyMarkers = this.getExtremePriceMarkers(energyMarkers);

		return {
			energyData: rawEnergyData,
			energyMarkers,
			energyScale: this.getScaleInfo(energyScale),
			extremeEnergyMarkers
		};
	}

	/**
	 * Fetch all energy data from APIs in a single operation
	 */
	private async fetchAllEnergyData(): Promise<TimeTick[]> {
		const timeWindow = this.timeline.getTimeWindow();

		// Kun ÉT kall til EnergyPricesProvider
		const energyData = await this.energyProvider.fetchEnergyPricesForTimeWindow(timeWindow);

		// Legg til x-koordinater fra timeline
		return energyData.map((tick) => this.timeline.addXToTimeTick(tick));
	}

	/**
	 * Create ValueScale for energy price data
	 * Note: For bar charts, we want low values (0 NOK) -> y=0 and high values (2 NOK) -> y=80
	 * This is opposite to line charts, so we invert the domain
	 */
	private createEnergyScale(energyData: TimeTick[]): ValueScale {
		const appConfig = loadConfig();
		const maxEnergyPrice = appConfig.visualization.scales?.maxEnergyPrice || 2;

		const priceValues = energyData
			.map((d) => d.nokPerKwh)
			.filter((p): p is number => p !== undefined);

		const priceRange =
			priceValues.length > 0
				? {
						min: Math.min(...priceValues),
						max: Math.max(...priceValues)
					}
				: { min: 0, max: maxEnergyPrice }; // Default range if no data

		// Start scale at 0 and use actual max value (no padding)
		const scaledMin = 0; // Always start at 0 NOK
		let scaledMax = priceRange.max;

		// Ensure minimum scale goes to configured max if actual max is less
		if (scaledMax < maxEnergyPrice) {
			scaledMax = maxEnergyPrice;
		}

		// For bar charts: invert domain so 0 NOK -> y=0 and max NOK -> y=height
		return new ValueScale(scaledMax, scaledMin, this.config.energyHeight!);
	}

	/**
	 * Generate energy markers with x,y coordinates
	 */
	private createEnergyMarkers(energyData: TimeTick[], energyScale: ValueScale): TimeTick[] {
		return energyData.map((tick) => ({
			...tick,
			y: energyScale.scale(tick.nokPerKwh || 0)
		}));
	}

	/**
	 * Find extreme energy price markers (local min/max) within 24-hour windows
	 * @param energyMarkers - Array of energy markers with coordinates
	 * @returns Array of markers that are local extremes with max/min properties
	 */
	private getExtremePriceMarkers(energyMarkers: TimeTick[]): TimeTick[] {
		const extremeMarkers: TimeTick[] = [];
		const windowHours = 24; // 24-hour window (12 hours before + 12 hours after)
		const windowMs = windowHours * 60 * 60 * 1000;

		// Filter markers with valid price data
		const validMarkers = energyMarkers.filter(
			(marker) => marker.nokPerKwh !== undefined && marker.ts instanceof Date
		);

		for (let i = 0; i < validMarkers.length; i++) {
			const currentMarker = validMarkers[i];
			const currentTime = currentMarker.ts.getTime();
			const currentPrice = currentMarker.nokPerKwh!;

			// Find all markers within 24-hour window (12 hours before + 12 hours after)
			const windowMarkers = validMarkers.filter((marker) => {
				const markerTime = marker.ts.getTime();
				const timeDiff = Math.abs(markerTime - currentTime);
				return timeDiff <= windowMs / 2; // ±12 hours
			});

			if (windowMarkers.length < 3) continue; // Need at least 3 points for meaningful comparison

			// Check if current marker is local maximum (highest price)
			const isLocalMax = windowMarkers.every((marker) => marker.nokPerKwh! <= currentPrice);

			// Check if current marker is local minimum (lowest price)
			const isLocalMin = windowMarkers.every((marker) => marker.nokPerKwh! >= currentPrice);

			// Only mark as extreme if it's clearly max or min (not equal to all others)
			const hasVariation = windowMarkers.some((marker) => marker.nokPerKwh! !== currentPrice);

			if (hasVariation && (isLocalMax || isLocalMin)) {
				extremeMarkers.push({
					...currentMarker,
					priceMax: isLocalMax,
					priceMin: isLocalMin
				});
			}
		}

		// Remove consecutive extremes of the same type to avoid clutter
		return this.filterConsecutivePriceExtremes(extremeMarkers);
	}

	/**
	 * Filter out consecutive extreme markers of the same type to reduce clutter
	 * @param extremeMarkers - Array of extreme markers
	 * @returns Filtered array with no consecutive same-type extremes
	 */
	private filterConsecutivePriceExtremes(extremeMarkers: TimeTick[]): TimeTick[] {
		if (extremeMarkers.length <= 1) return extremeMarkers;

		const filtered: TimeTick[] = [extremeMarkers[0]];

		for (let i = 1; i < extremeMarkers.length; i++) {
			const current = extremeMarkers[i];
			const previous = filtered[filtered.length - 1];

			// Add current marker if it's a different type than the previous
			if ((current.priceMax && !previous.priceMax) || (current.priceMin && !previous.priceMin)) {
				filtered.push(current);
			} else {
				// If same type, keep the one with more extreme price
				if (current.priceMax && previous.priceMax && current.nokPerKwh! > previous.nokPerKwh!) {
					filtered[filtered.length - 1] = current;
				} else if (
					current.priceMin &&
					previous.priceMin &&
					current.nokPerKwh! < previous.nokPerKwh!
				) {
					filtered[filtered.length - 1] = current;
				}
			}
		}

		return filtered;
	}

	/**
	 * Get ValueScale information for visualization
	 * @param valueScale - The ValueScale to get info from
	 */
	private getScaleInfo(valueScale: ValueScale): EnergyScaleInfo {
		const domain = valueScale.getDomain();
		const range = valueScale.getRange();
		const height = range[0]; // First value is the height (bottom of SVG)

		return {
			height,
			rowMarkers: valueScale.getRowMarkers(),
			min: domain[0],
			max: domain[1]
		};
	}

	/**
	 * Get the energy zone this instance is configured for
	 * @returns Current energy zone
	 */
	getZone(): PriceZone {
		return this.config.zone;
	}

	/**
	 * Log debug information about the energy data
	 */
	logDebugInfo(result: EnergyDataResult) {
		const timeWindow = this.timeline.getTimeWindow();

		console.log('=== UNIFIED ENERGY DATA DEBUG ===');
		console.log('Time window:', {
			from: timeWindow.from.ts,
			to: timeWindow.to.ts
		});
		console.log('Zone:', this.config.zone);
		console.log('Total energy data points:', result.energyData.length);

		const priceValues = result.energyData
			.map((d) => d.nokPerKwh)
			.filter((p): p is number => p !== undefined);
		console.log('Price points:', priceValues.length);
		if (priceValues.length > 0) {
			console.log('NOK/kWh range:', {
				min: Math.min(...priceValues).toFixed(4),
				max: Math.max(...priceValues).toFixed(4),
				avg: (priceValues.reduce((a, b) => a + b, 0) / priceValues.length).toFixed(4)
			});
		}

		console.log('Scale domain:', result.energyScale.min, 'to', result.energyScale.max);
		console.log('Scale height:', result.energyScale.height);

		// Debug first few markers with input price -> output y mapping
		console.log('First 5 price->y mappings:');
		result.energyMarkers.slice(0, 5).forEach((marker, i) => {
			console.log(`  ${i}: ${marker.nokPerKwh?.toFixed(4)} NOK -> y=${marker.y?.toFixed(2)}`);
		});

		console.log('First 3 energy points:', result.energyData.slice(0, 3));
		console.log('==================================');
	}
}

export default EnergyData;
