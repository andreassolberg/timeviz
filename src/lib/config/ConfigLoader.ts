import fs from 'fs';
import path from 'path';

/**
 * Configuration interface for the application
 */
export interface AppConfig {
	visualization: {
		fontSize: {
			temperatureExtremes: number;
			hourTicks: number;
			dayLabels: number;
			scaleLabels: number;
		};
		colors: {
			temperatureMax: string;
			temperatureMin: string;
			temperatureLine: string;
			solar: string;
			precipitation: string;
		};
		layout: {
			temperatureHeight: number;
			precipitationHeight: number;
			solarHeight: number;
		};
	};
}

/**
 * Default configuration fallback
 */
const DEFAULT_CONFIG: AppConfig = {
	visualization: {
		fontSize: {
			temperatureExtremes: 8,
			hourTicks: 6,
			dayLabels: 12,
			scaleLabels: 8
		},
		colors: {
			temperatureMax: '#dc2626',
			temperatureMin: '#2563eb',
			temperatureLine: '#dc2626',
			solar: '#f59e0b',
			precipitation: 'rgba(54, 162, 235, 0.7)'
		},
		layout: {
			temperatureHeight: 100,
			precipitationHeight: 60,
			solarHeight: 80
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