import fs from 'fs';
import path from 'path';

/**
 * Configuration interface for the application
 */
export interface AppConfig {
	data: {
		timeline: {
			hoursPast: number;
			hoursFuture: number;
		};
	};
	visualization: {
		sections?: {
			[sectionId: string]: {
				height?: number;
				heightRel?: string[];
				from: string | null;
			};
		};
		fontSize: {
			temperatureExtremes: number;
			energyExtremes: number;
			hourTicks: number;
			dayLabels: number;
			scaleLabels: number;
			uvIndex: number;
		};
		colors: {
			temperatureMax: string;
			temperatureMin: string;
			temperatureLine: string;
			energyPriceMax: string;
			energyPriceMin: string;
			solar: string;
			precipitation: string;
		};
		layout: {
			temperatureHeight: number;
			precipitationHeight: number;
			solarHeight: number;
			energyHeight: number;
		};
		scales?: {
			maxEnergyPrice: number;
		};
		timeline?: {
			dayWidth: number;
		};
	};
}

/**
 * Default configuration fallback
 */
const DEFAULT_CONFIG: AppConfig = {
	data: {
		timeline: {
			hoursPast: 48,
			hoursFuture: 48
		}
	},
	visualization: {
		fontSize: {
			temperatureExtremes: 8,
			energyExtremes: 8,
			hourTicks: 6,
			dayLabels: 12,
			scaleLabels: 8,
			uvIndex: 6
		},
		colors: {
			temperatureMax: '#dc2626',
			temperatureMin: '#2563eb',
			temperatureLine: '#dc2626',
			energyPriceMax: '#dc2626',
			energyPriceMin: '#16a34a',
			solar: '#f59e0b',
			precipitation: 'rgba(54, 162, 235, 0.7)'
		},
		layout: {
			temperatureHeight: 100,
			precipitationHeight: 60,
			solarHeight: 80,
			energyHeight: 80
		},
		scales: {
			maxEnergyPrice: 2
		},
		timeline: {
			dayWidth: 200
		}
	}
};

/**
 * Load configuration from JSON file with fallback to defaults
 */
export function loadConfig(): AppConfig {
	try {
		// Try to load config.json from project root
		const configPath = path.resolve(process.cwd(), 'config.json');

		if (fs.existsSync(configPath)) {
			const configData = fs.readFileSync(configPath, 'utf-8');
			const userConfig = JSON.parse(configData) as Partial<AppConfig>;

			// Deep merge with defaults
			return mergeConfig(DEFAULT_CONFIG, userConfig);
		}

		console.log('Config file not found, using defaults');
		return DEFAULT_CONFIG;
	} catch (error) {
		console.error('Error loading config file, using defaults:', error);
		return DEFAULT_CONFIG;
	}
}

/**
 * Deep merge configuration objects
 */
function mergeConfig(defaultConfig: AppConfig, userConfig: Partial<AppConfig>): AppConfig {
	const merged = { ...defaultConfig };

	if (userConfig.data) {
		merged.data = {
			...merged.data,
			...userConfig.data
		};

		if (userConfig.data.timeline) {
			merged.data.timeline = {
				...merged.data.timeline,
				...userConfig.data.timeline
			};
		}
	}

	if (userConfig.visualization) {
		merged.visualization = {
			...merged.visualization,
			...userConfig.visualization
		};

		if (userConfig.visualization.fontSize) {
			merged.visualization.fontSize = {
				...merged.visualization.fontSize,
				...userConfig.visualization.fontSize
			};
		}

		if (userConfig.visualization.colors) {
			merged.visualization.colors = {
				...merged.visualization.colors,
				...userConfig.visualization.colors
			};
		}

		if (userConfig.visualization.layout) {
			merged.visualization.layout = {
				...merged.visualization.layout,
				...userConfig.visualization.layout
			};
		}

		if (userConfig.visualization.scales) {
			merged.visualization.scales = {
				...merged.visualization.scales,
				...userConfig.visualization.scales
			};
		}

		if (userConfig.visualization.timeline) {
			merged.visualization.timeline = {
				...merged.visualization.timeline,
				...userConfig.visualization.timeline
			};
		}

		if (userConfig.visualization.sections) {
			merged.visualization.sections = {
				...merged.visualization.sections,
				...userConfig.visualization.sections
			};
		}
	}

	return merged;
}

/**
 * Get a specific config value with type safety
 */
export function getConfigValue<T>(config: AppConfig, path: string): T {
	const keys = path.split('.');
	let value: any = config;

	for (const key of keys) {
		if (value && typeof value === 'object' && key in value) {
			value = value[key];
		} else {
			throw new Error(`Config path '${path}' not found`);
		}
	}

	return value as T;
}

export default loadConfig;
