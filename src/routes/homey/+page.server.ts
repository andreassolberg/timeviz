import { createHomeyClient } from '$lib/data/homey/Homey.js';
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
		const [devices, variables, zones, insights] = await Promise.all([
			homey.getDevices(),
			homey.getLogicVariables(),
			homey.getZones(),
			homey.getInsights()
		]);

		console.log('Homey data fetched successfully:', {
			devices: devices.items.length,
			variables: variables.items.length,
			zones: zones.items.length,
			insights: Object.keys(insights || {}).length
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

		// Process insights data for display
		const insightsArray = insights ? Object.entries(insights).map(([id, data]) => ({
			id,
			...data
		})).slice(0, 10) : []; // Show first 10 insights as a test

		// Test historical data fetch for specific devices
		const endTime = new Date();
		const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
		
		// Temperature device
		let temperatureData = null;
		const tempDeviceLogId = 'homey:device:86d16c56-6190-4a77-9d7f-1d8a46355fc6:measure_temperature';
		
		try {
			temperatureData = await homey.getInsightLogs(tempDeviceLogId, {
				resolution: '1hour',
				start: startTime.toISOString(),
				end: endTime.toISOString()
			});
			
			console.log('Historical temperature data fetched:', {
				logId: tempDeviceLogId,
				dataPoints: temperatureData?.values?.length || 0,
				start: startTime.toISOString(),
				end: endTime.toISOString()
			});
		} catch (error) {
			console.error('Error fetching temperature data:', error.message);
			temperatureData = { error: error.message };
		}

		// Energy power device
		let powerData = null;
		const powerDeviceLogId = 'homey:device:0311f8e5-4211-4de5-ada2-03049f72a731:energy_power';
		
		try {
			powerData = await homey.getInsightLogs(powerDeviceLogId, {
				resolution: '1hour',
				start: startTime.toISOString(),
				end: endTime.toISOString()
			});
			
			console.log('Historical power data fetched:', {
				logId: powerDeviceLogId,
				dataPoints: powerData?.values?.length || 0,
				start: startTime.toISOString(),
				end: endTime.toISOString()
			});
		} catch (error) {
			console.error('Error fetching power data:', error.message);
			powerData = { error: error.message };
		}

		return {
			success: true,
			data: {
				zones: activeZones,
				variables: processedVariables,
				temperatureDevices,
				houseTemperature,
				insights: insightsArray,
				historicalData: {
					temperature: {
						deviceId: tempDeviceLogId,
						data: temperatureData
					},
					power: {
						deviceId: powerDeviceLogId,
						data: powerData
					}
				},
				stats: {
					totalDevices: devices.items.length,
					availableDevices: devices.items.filter(d => d.isAvailable()).length,
					totalVariables: variables.items.length,
					totalZones: zones.items.length,
					activeZones: activeZones.length,
					totalInsights: Object.keys(insights || {}).length
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
				insights: [],
				historicalData: null,
				stats: {
					totalDevices: 0,
					availableDevices: 0,
					totalVariables: 0,
					totalZones: 0,
					activeZones: 0,
					totalInsights: 0
				}
			}
		};
	}
};