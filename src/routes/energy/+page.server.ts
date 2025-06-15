import Timeline from '$lib/Timeline';
import EnergyData from '$lib/EnergyData';
import { PriceZone } from '$lib/data/EnergyPricesProvider';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		// Load configuration
		const config = loadConfig();
		
		// Read environment variables
		const userAgent = env.USER_AGENT || 'Timeviz/1.0';
		const energyArea = (env.ENERGY_AREA || 'NO3') as PriceZone;

		// Create timeline with config values
		const timeline = new Timeline(
			config.data.timeline.hoursPast,
			config.data.timeline.hoursFuture,
			config.visualization.timeline?.dayWidth
		);

		// Create and prepare energy data
		const energyData = new EnergyData(timeline, {
			zone: energyArea,
			userAgent,
			energyHeight: 80
		});
		
		const energyResult = await energyData.prepare();

		// Debug logging
		energyData.logDebugInfo(energyResult);

		return {
			timeline: {
				width: timeline.width,
				from: timeline.getTimeWindow().from,
				to: timeline.getTimeWindow().to
			},
			energyMarkers: energyResult.energyMarkers,
			energyScale: energyResult.energyScale,
			zone: energyArea,
			success: true
		};
		
	} catch (error) {
		console.error('Error loading energy data:', error);
		
		return {
			timeline: {
				width: 0,
				from: { ts: new Date(), tstr: '' },
				to: { ts: new Date(), tstr: '' }
			},
			energyMarkers: [],
			energyScale: {
				height: 80,
				rowMarkers: [],
				min: 0,
				max: 2
			},
			zone: 'NO3',
			success: false,
			error: `Failed to load energy data: ${error}`
		};
	}
};