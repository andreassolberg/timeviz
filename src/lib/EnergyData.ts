import { EnergyPricesProvider, PriceZone } from './data/EnergyPricesProvider';
import ValueScale from './ValueScale';
import Timeline from './Timeline';
import type { TimeTick } from './types/time';
import { loadConfig } from './config/ConfigLoader';

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
		return {
			energyData: rawEnergyData,
			energyMarkers: this.createEnergyMarkers(rawEnergyData, energyScale),
			energyScale: this.getScaleInfo(energyScale)
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
