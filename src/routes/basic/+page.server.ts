import Timeline from '$lib/Timeline';
import WeatherData from '$lib/WeatherData';
import SolarData from '$lib/SolarData';
import EnergyData from '$lib/EnergyData';
import { PriceZone } from '$lib/data/EnergyPricesProvider';
import { loadConfig } from '$lib/config/ConfigLoader';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		// Load application configuration
		const config = loadConfig();

		// Read environment variables
		const latitude = parseFloat(env.LAT || '63.4305'); // Default: Trondheim
		const longitude = parseFloat(env.LON || '10.3951');
		const frostClientId = env.FROST_CLIENT_ID;
		const userAgent = env.USER_AGENT || 'Timeviz/1.0';
		const energyArea = (env.ENERGY_AREA || 'NO3') as PriceZone;

		console.log('Environment check:', {
			hasFrostClientId: !!frostClientId,
			frostClientIdLength: frostClientId?.length || 0,
			usingFixedTime: !!config.data.timeline.fixedNow
		});

		// Create timeline with config values
		const timeline = new Timeline(
			config.data.timeline.hoursPast,
			config.data.timeline.hoursFuture,
			config.visualization.timeline?.dayWidth,
			config.data.timeline.fixedNow
		);

		// Create unified weather data handler
		const weatherData = new WeatherData(timeline, {
			latitude,
			longitude,
			frostClientId,
			userAgent,
			temperatureHeight: 100,
			precipitationHeight: 60
		});

		// Fetch and prepare all weather data in single operation
		const result = await weatherData.prepare();

		// Create and prepare solar data
		const solarData = new SolarData(timeline, {
			latitude,
			longitude,
			solarHeight: config.visualization.sections?.solar?.height || 80 // Use config height
		});
		const solarResult = await solarData.prepare();

		// Create and prepare energy data
		const energyData = new EnergyData(timeline, {
			zone: energyArea,
			userAgent,
			energyHeight: config.visualization.layout.energyHeight
		});
		const energyResult = await energyData.prepare();

		// Debug logging
		console.log('Energy result:', {
			markersCount: energyResult.energyMarkers.length,
			scaleInfo: energyResult.energyScale,
			firstMarker: energyResult.energyMarkers[0],
			zone: energyArea
		});

		return {
			timeline: {
				width: timeline.width,
				hourTicks: timeline.getHourTicks(),
				dayLabelTicks: timeline.getDayLabelTicks(),
				nowX: timeline.getNowX(),
				hourWidth: timeline.getHourWidth(),
				dayNightMarkers: timeline.getDayNightMarkers(7, 23), // Dag fra 07:00 til 23:00 lokaltid
				isFixedTime: timeline.isFixedTime,
				now: timeline.now
			},
			...result, // weatherData, temperatureMarkers, temperatureScale, precipitationMarkers, precipitationScale
			...solarResult, // solarMarkers, solarScale
			...energyResult, // energyMarkers, energyScale
			config: config, // Pass full config to client
			location: {
				latitude,
				longitude
			}
		};
	} catch (error) {
		console.error('Error loading weather data:', error);

		// Fallback - return only timeline data without weather data
		const fallbackConfig = loadConfig();
		const timeline = new Timeline(48, 48, 240, fallbackConfig.data.timeline.fixedNow);

		return {
			timeline: {
				width: timeline.width,
				hourTicks: timeline.getHourTicks(),
				dayLabelTicks: timeline.getDayLabelTicks(),
				nowX: timeline.getNowX(),
				hourWidth: timeline.getHourWidth(),
				dayNightMarkers: [],
				isFixedTime: timeline.isFixedTime,
				now: timeline.now
			},
			weatherData: [],
			temperatureMarkers: [],
			temperatureScale: {
				height: 100,
				rowMarkers: [],
				min: 0,
				max: 20
			},
			extremeTemperatureMarkers: [],
			weatherSymbolMarkers: [],
			precipitationMarkers: [],
			precipitationScale: {
				height: 60,
				rowMarkers: [],
				min: 0,
				max: 5
			},
			extremePrecipitationMarkers: [],
			solarMarkers: [],
			solarScale: {
				height: 80,
				rowMarkers: [],
				min: 0,
				max: 90
			},
			energyMarkers: [],
			energyScale: {
				height: 80,
				rowMarkers: [],
				min: 0,
				max: 2
			},
			extremeEnergyMarkers: [],
			location: {
				latitude: parseFloat(env.LAT || '63.4305'),
				longitude: parseFloat(env.LON || '10.3951')
			},
			config: {
				data: {
					timeline: { hoursPast: 48, hoursFuture: 48 }
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
					sections: {
						main: { height: 100, from: null },
						temperature: { height: 100, from: null },
						solar: { height: 80, from: null },
						energy: { height: 80, from: null },
						header: { height: 40, from: null }
					}
				}
			},
			error: 'Could not load weather data'
		};
	}
};
