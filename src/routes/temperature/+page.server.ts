import { YrDataProvider } from '$lib/data/YrDataProvider';
import Timeline from '$lib/Timeline';
import ValueScale from '$lib/ValueScale';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';
import { loadConfig } from '$lib/config/ConfigLoader';

export const load: PageServerLoad = async () => {
	try {
		// Load configuration
		const config = loadConfig();

		// Read environment variables
		const latitude = parseFloat(env.LAT || '63.4305'); // Default: Trondheim
		const longitude = parseFloat(env.LON || '10.3951');
		const frostClientId = env.FROST_CLIENT_ID;
		const userAgent = env.USER_AGENT || 'Timeviz/1.0 (github.com/yourproject/timeviz)';

		console.log('Environment variables:', {
			latitude,
			longitude,
			hasFrostClientId: !!frostClientId,
			userAgent
		});

		// Create timeline with config values
		const timeline = new Timeline(
			config.data.timeline.hoursPast,
			config.data.timeline.hoursFuture,
			config.visualization.timeline?.dayWidth
		);
		const timeWindow = timeline.getTimeWindow();

		const weatherProvider = new YrDataProvider(latitude, longitude, frostClientId, userAgent);

		console.log('Timeline created:', {
			width: timeline.width,
			timeWindow: {
				from: timeWindow.from.ts.toISOString(),
				to: timeWindow.to.ts.toISOString()
			}
		});

		// Fetch weather data
		const weatherData = await weatherProvider.fetchWeatherDataForTimeWindow(timeWindow);

		console.log('Weather data fetched:', {
			totalPoints: weatherData.length,
			dataTypes: [...new Set(weatherData.map((d) => d.dataType))],
			temperatureRange: {
				min: Math.min(...weatherData.map((d) => d.temperature || 0)),
				max: Math.max(...weatherData.map((d) => d.temperature || 0))
			}
		});

		// Add x-coordinates to weather data
		const weatherDataWithX = weatherData.map((tick) => timeline.addXToTimeTick(tick));

		// Create ValueScale for temperature visualization
		const tempRange =
			weatherDataWithX.length > 0
				? {
						min: Math.min(...weatherDataWithX.map((d) => d.temperature || 0)),
						max: Math.max(...weatherDataWithX.map((d) => d.temperature || 0))
					}
				: { min: 0, max: 20 };

		const valueScale = new ValueScale(tempRange.min, tempRange.max, 50);

		// Generate temperature markers with x,y coordinates
		const temperatureMarkers = weatherDataWithX.map((tick) => ({
			...tick,
			y: valueScale.scale(tick.temperature || 0)
		}));

		// Try to fetch raw forecast and historical data separately for debugging
		let rawForecast = null;
		let rawHistorical = null;

		try {
			rawForecast = await weatherProvider.getWeatherForecast(timeWindow);
		} catch (e) {
			console.log('Failed to fetch forecast:', e instanceof Error ? e.message : String(e));
		}

		if (frostClientId) {
			try {
				rawHistorical = await weatherProvider.getHistoricalTemperature(timeWindow);
			} catch (e) {
				console.log('Failed to fetch historical data:', e instanceof Error ? e.message : String(e));
			}
		}

		return {
			success: true,
			config: {
				latitude,
				longitude,
				hasFrostClientId: !!frostClientId,
				userAgent,
				timeWindow: {
					from: timeWindow.from.ts.toISOString(),
					to: timeWindow.to.ts.toISOString()
				}
			},
			timeline: {
				width: timeline.width,
				totalHours: 96
			},
			weatherData: weatherDataWithX,
			temperatureMarkers,
			valueScale: {
				height: 50,
				rowMarkers: valueScale.getRowMarkers()
			},
			rawData: {
				forecast: rawForecast,
				historical: rawHistorical
			},
			stats: {
				totalPoints: weatherDataWithX.length,
				forecastPoints: weatherDataWithX.filter((d) => d.dataType === 'forecast').length,
				historicalPoints: weatherDataWithX.filter((d) => d.dataType === 'historical').length,
				temperatureRange:
					weatherDataWithX.length > 0
						? {
								min: Math.min(...weatherDataWithX.map((d) => d.temperature || 0)),
								max: Math.max(...weatherDataWithX.map((d) => d.temperature || 0))
							}
						: null
			}
		};
	} catch (error) {
		console.error('Error loading temperature data:', error);

		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			errorDetails: error instanceof Error ? error.stack : String(error),
			config: {
				latitude: parseFloat(env.LAT || '63.4305'),
				longitude: parseFloat(env.LON || '10.3951'),
				hasFrostClientId: !!env.FROST_CLIENT_ID,
				userAgent: env.USER_AGENT || 'Timeviz/1.0'
			}
		};
	}
};
