import Timeline from '$lib/Timeline';
import TemperatureData from '$lib/TemperatureData';
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

		// Create temperature data handler
		const temperatureData = new TemperatureData(
			timeline,
			latitude,
			longitude,
			frostClientId,
			userAgent,
			100 // height
		);

		// Fetch and prepare temperature data
		const { weatherData, temperatureMarkers, valueScale } = await temperatureData.prepare();

		return {
			timeline: {
				width: timeline.width,
				hourTicks: timeline.getHourTicks(),
				dayLabelTicks: timeline.getDayLabelTicks(),
				nowX: timeline.getNowX()
			},
			weatherData,
			temperatureMarkers,
			valueScale,
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
				nowX: timeline.getNowX()
			},
			weatherData: [],
			temperatureMarkers: [],
			valueScale: {
				height: 100,
				rowMarkers: []
			},
			location: {
				latitude: parseFloat(env.LAT || '63.4305'),
				longitude: parseFloat(env.LON || '10.3951')
			},
			error: 'Could not load weather data'
		};
	}
};
