import Timeline from '$lib/Timeline';
import WeatherData from '$lib/WeatherData';
import SolarData from '$lib/SolarData';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		// Read environment variables
		const latitude = parseFloat(env.LAT || '63.4305'); // Default: Trondheim
		const longitude = parseFloat(env.LON || '10.3951');
		const frostClientId = env.FROST_CLIENT_ID;
		const userAgent = env.USER_AGENT || 'Timeviz/1.0';

		// Create timeline
		const timeline = new Timeline(48, 48); // 48 hours back and forward

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
			solarHeight: 20 // Height for solar visualization area
		});
		const solarResult = await solarData.prepare();

		return {
			timeline: {
				width: timeline.width,
				hourTicks: timeline.getHourTicks(),
				dayLabelTicks: timeline.getDayLabelTicks(),
				nowX: timeline.getNowX(),
				hourWidth: timeline.getHourWidth(),
				dayNightMarkers: timeline.getDayNightMarkers(7, 23) // Dag fra 07:00 til 23:00 lokaltid
			},
			...result, // weatherData, temperatureMarkers, temperatureScale, precipitationMarkers, precipitationScale
			...solarResult, // solarMarkers, solarScale
			location: {
				latitude,
				longitude
			}
		};
	} catch (error) {
		console.error('Error loading weather data:', error);

		// Fallback - return only timeline data without weather data
		const timeline = new Timeline(48, 48);

		return {
			timeline: {
				width: timeline.width,
				hourTicks: timeline.getHourTicks(),
				dayLabelTicks: timeline.getDayLabelTicks(),
				nowX: timeline.getNowX(),
				hourWidth: timeline.getHourWidth()
			},
			weatherData: [],
			temperatureMarkers: [],
			temperatureScale: {
				height: 100,
				rowMarkers: [],
				min: 0,
				max: 20
			},
			precipitationMarkers: [],
			precipitationScale: {
				height: 60,
				rowMarkers: [],
				min: 0,
				max: 5
			},
			solarMarkers: [],
			solarScale: {
				height: 80,
				rowMarkers: [],
				min: 0,
				max: 90
			},
			location: {
				latitude: parseFloat(env.LAT || '63.4305'),
				longitude: parseFloat(env.LON || '10.3951')
			},
			error: 'Could not load weather data'
		};
	}
};
