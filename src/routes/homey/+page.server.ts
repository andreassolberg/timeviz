import { createHomeyClient } from '$lib/data/homey/HomeyAdapter';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		// Create Homey client with caching enabled
		const homey = createHomeyClient({
			cache: true,
			readFromCache: true
		});

		console.log('Fetching Homey data...');

		// Fetch all data in parallel
		const [devices, variables, zones] = await Promise.all([
			homey.getDevices(),
			homey.getLogicVariables(),
			homey.getZones()
		]);

		console.log('Homey data fetched successfully:', {
			devices: devices.items.length,
			variables: variables.items.length,
			zones: zones.items.length
		});

		// Process devices by zone
		const devicesByZone = zones.items.map(zone => ({
			zone: {
				id: zone.id,
				name: zone.name
			},
			devices: devices.filterByZone(zone.name).items.map(device => ({
				id: device.id,
				name: device.name,
				class: device.class,
				available: device.available,
				capabilities: device.capabilities,
				// Get common capability values
				temperature: device.getCapabilityValue('measure_temperature'),
				humidity: device.getCapabilityValue('measure_humidity'),
				power: device.getCapabilityValue('measure_power'),
				luminance: device.getCapabilityValue('measure_luminance'),
				battery: device.getCapabilityValue('measure_battery'),
				onoff: device.getCapabilityValue('onoff'),
				target_temperature: device.getCapabilityValue('target_temperature'),
				dim: device.getCapabilityValue('dim')
			}))
		}));

		// Filter out zones with no devices
		const activeZones = devicesByZone.filter(zone => zone.devices.length > 0);

		// Process variables
		const processedVariables = variables.items.map(variable => ({
			id: variable.id,
			name: variable.name,
			type: variable.type,
			value: variable.value
		}));

		// Separate temperature-related devices for timeline integration
		const temperatureDevices = devices.items
			.filter(device => device.hasCapability('measure_temperature') && device.isAvailable())
			.map(device => ({
				id: device.id,
				name: device.name,
				zoneName: device.zoneName,
				temperature: device.getCapabilityValue('measure_temperature'),
				humidity: device.getCapabilityValue('measure_humidity')
			}));

		// Get current house temperature from variables or average of sensors
		let houseTemperature = null;
		const houseTemp = variables.getByName('house_temperature') || variables.getByName('hus_temperatur');
		if (houseTemp) {
			houseTemperature = houseTemp.value;
		} else if (temperatureDevices.length > 0) {
			// Calculate average temperature from all sensors
			const validTemps = temperatureDevices
				.map(d => d.temperature)
				.filter((t): t is number => typeof t === 'number');
			if (validTemps.length > 0) {
				houseTemperature = validTemps.reduce((sum, temp) => sum + temp, 0) / validTemps.length;
			}
		}

		return {
			success: true,
			data: {
				zones: activeZones,
				variables: processedVariables,
				temperatureDevices,
				houseTemperature,
				stats: {
					totalDevices: devices.items.length,
					availableDevices: devices.items.filter(d => d.isAvailable()).length,
					totalVariables: variables.items.length,
					totalZones: zones.items.length,
					activeZones: activeZones.length
				}
			}
		};
	} catch (error) {
		console.error('Error loading Homey data:', error);
		
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred',
			data: {
				zones: [],
				variables: [],
				temperatureDevices: [],
				houseTemperature: null,
				stats: {
					totalDevices: 0,
					availableDevices: 0,
					totalVariables: 0,
					totalZones: 0,
					activeZones: 0
				}
			}
		};
	}
};