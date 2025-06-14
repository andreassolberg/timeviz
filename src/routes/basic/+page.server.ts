import { YrDataProvider } from '$lib/data/YrDataProvider';
import Timeline from '$lib/Timeline';
import ValueScale from '$lib/ValueScale';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		// Les miljøvariabler
		const latitude = parseFloat(env.LAT || '63.4305'); // Default: Trondheim
		const longitude = parseFloat(env.LON || '10.3951');
		const frostClientId = env.FROST_CLIENT_ID;
		const userAgent = env.USER_AGENT || 'Timeviz/1.0';

		// Opprett timeline og YrDataProvider
		const timeline = new Timeline(48, 48); // 48 timer tilbake og fremover
		const timeWindow = timeline.getTimeWindow();

		const weatherProvider = new YrDataProvider(latitude, longitude, frostClientId, userAgent);

		// Hent værdata
		const weatherData = await weatherProvider.fetchWeatherDataForTimeWindow(timeWindow);

		// Debug: Log weather data to console
		console.log('=== WEATHER DATA DEBUG ===');
		console.log('Time window:', {
			from: timeWindow.from.ts,
			to: timeWindow.to.ts
		});
		console.log('Weather data points:', weatherData.length);
		console.log('First 5 weather points:', weatherData.slice(0, 5));
		console.log('Weather data structure:', JSON.stringify(weatherData[0], null, 2));
		console.log('==========================');

		// Legg til x-koordinater til værdataene
		const weatherDataWithX = weatherData.map((tick) => timeline.addXToTimeTick(tick));

		console.log('Weather data with X coordinates (first 3):', weatherDataWithX.slice(0, 3));

		// Create ValueScale for temperature visualization
		const tempRange = weatherDataWithX.length > 0 ? {
			min: Math.min(...weatherDataWithX.map(d => d.temperature || 0)),
			max: Math.max(...weatherDataWithX.map(d => d.temperature || 0))
		} : { min: 0, max: 20 };

		const valueScale = new ValueScale(tempRange.min, tempRange.max, 100);

		// Generate temperature markers with x,y coordinates
		const temperatureMarkers = weatherDataWithX.map(tick => ({
			...tick,
			y: valueScale.scale(tick.temperature || 0)
		}));

		return {
			timeline: {
				width: timeline.width,
				hourTicks: timeline.getHourTicks(),
				dayLabelTicks: timeline.getDayLabelTicks(),
				nowX: timeline.getNowX()
			},
			weatherData: weatherDataWithX,
			temperatureMarkers,
			valueScale: {
				height: 100,
				rowMarkers: valueScale.getRowMarkers()
			},
			location: {
				latitude,
				longitude
			}
		};
	} catch (error) {
		console.error('Error loading weather data:', error);

		// Fallback - returner kun timeline data uten værdata
		const timeline = new Timeline(48, 48);

		return {
			timeline: {
				width: timeline.width,
				hourTicks: timeline.getHourTicks(),
				dayLabelTicks: timeline.getDayLabelTicks()
			},
			weatherData: [],
			location: {
				latitude: parseFloat(env.LAT || '63.4305'),
				longitude: parseFloat(env.LON || '10.3951')
			},
			error: 'Could not load weather data'
		};
	}
};
