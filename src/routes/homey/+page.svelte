<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	// Function to get icon for device class
	function getDeviceIcon(deviceClass: string): string {
		const icons: Record<string, string> = {
			sensor: '🌡️',
			light: '💡',
			socket: '🔌',
			thermostat: '🌡️',
			lock: '🔒',
			doorbell: '🔔',
			fan: '🌀',
			speaker: '🔊',
			tv: '📺',
			camera: '📷',
			button: '🔘',
			other: '📱'
		};
		return icons[deviceClass] || icons.other;
	}

	// Function to format capability values
	function formatValue(value: any, capability?: string): string {
		if (value === null || value === undefined) return '-';
		
		if (typeof value === 'boolean') {
			return value ? 'På' : 'Av';
		}
		
		if (typeof value === 'number') {
			if (capability === 'measure_temperature' || capability === 'target_temperature') {
				return `${value.toFixed(1)}°C`;
			}
			if (capability === 'measure_humidity') {
				return `${value.toFixed(0)}%`;
			}
			if (capability === 'measure_power') {
				return `${value.toFixed(1)}W`;
			}
			if (capability === 'measure_battery') {
				return `${value.toFixed(0)}%`;
			}
			if (capability === 'measure_luminance') {
				return `${value.toFixed(0)} lux`;
			}
			if (capability === 'dim') {
				return `${Math.round(value * 100)}%`;
			}
			return value.toString();
		}
		
		return String(value);
	}

	// Function to get status color
	function getStatusColor(available: boolean): string {
		return available ? '#10b981' : '#ef4444';
	}
</script>

<svelte:head>
	<title>Homey Smart Home - Timeviz</title>
	<meta name="description" content="Smart home dashboard showing Homey devices and sensors" />
</svelte:head>

<div class="homey-dashboard">
	<header class="dashboard-header">
		<h1>🏠 Homey Smart Home Dashboard</h1>
		{#if data.success}
			<div class="stats">
				<div class="stat">
					<span class="stat-value">{data.data.stats.availableDevices}</span>
					<span class="stat-label">Tilgjengelige enheter</span>
				</div>
				<div class="stat">
					<span class="stat-value">{data.data.stats.totalDevices}</span>
					<span class="stat-label">Totale enheter</span>
				</div>
				<div class="stat">
					<span class="stat-value">{data.data.stats.activeZones}</span>
					<span class="stat-label">Aktive rom</span>
				</div>
				<div class="stat">
					<span class="stat-value">{data.data.stats.totalVariables}</span>
					<span class="stat-label">Variabler</span>
				</div>
			</div>
		{/if}
	</header>

	{#if !data.success}
		<div class="error-message">
			<h2>❌ Feil ved henting av Homey-data</h2>
			<p>{data.error}</p>
			<p>Sjekk at HOMEY_TOKEN og HOMEY_ID er satt i miljøvariabler.</p>
		</div>
	{:else}
		<!-- House Temperature Summary -->
		{#if data.data.houseTemperature !== null}
			<div class="house-summary">
				<h2>🌡️ Hustemperatur</h2>
				<div class="temperature-display">
					{formatValue(data.data.houseTemperature, 'measure_temperature')}
				</div>
				{#if data.data.temperatureDevices.length > 0}
					<div class="temperature-sensors">
						<h3>Temperatursensorer</h3>
						<div class="sensor-grid">
							{#each data.data.temperatureDevices as device}
								<div class="sensor-card">
									<div class="sensor-name">{device.name}</div>
									<div class="sensor-zone">{device.zoneName}</div>
									<div class="sensor-values">
										<span class="temperature">{formatValue(device.temperature, 'measure_temperature')}</span>
										{#if device.humidity !== null && device.humidity !== undefined}
											<span class="humidity">{formatValue(device.humidity, 'measure_humidity')}</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Devices by Zone -->
		<div class="zones-section">
			<h2>📍 Enheter per rom</h2>
			<div class="zones-grid">
				{#each data.data.zones as zone}
					<div class="zone-card">
						<h3 class="zone-name">{zone.zone.name}</h3>
						<div class="devices-list">
							{#each zone.devices as device}
								<div class="device-card" class:unavailable={!device.available}>
									<div class="device-header">
										<span class="device-icon">{getDeviceIcon(device.class)}</span>
										<span class="device-name">{device.name}</span>
										<span 
											class="device-status" 
											style="color: {getStatusColor(device.available)}"
										>
											●
										</span>
									</div>
									<div class="device-capabilities">
										{#if device.temperature !== null && device.temperature !== undefined}
											<div class="capability">
												<span class="cap-label">Temperatur:</span>
												<span class="cap-value">{formatValue(device.temperature, 'measure_temperature')}</span>
											</div>
										{/if}
										{#if device.humidity !== null && device.humidity !== undefined}
											<div class="capability">
												<span class="cap-label">Fuktighet:</span>
												<span class="cap-value">{formatValue(device.humidity, 'measure_humidity')}</span>
											</div>
										{/if}
										{#if device.power !== null && device.power !== undefined}
											<div class="capability">
												<span class="cap-label">Effekt:</span>
												<span class="cap-value">{formatValue(device.power, 'measure_power')}</span>
											</div>
										{/if}
										{#if device.luminance !== null && device.luminance !== undefined}
											<div class="capability">
												<span class="cap-label">Lys:</span>
												<span class="cap-value">{formatValue(device.luminance, 'measure_luminance')}</span>
											</div>
										{/if}
										{#if device.battery !== null && device.battery !== undefined}
											<div class="capability">
												<span class="cap-label">Batteri:</span>
												<span class="cap-value">{formatValue(device.battery, 'measure_battery')}</span>
											</div>
										{/if}
										{#if device.onoff !== null && device.onoff !== undefined}
											<div class="capability">
												<span class="cap-label">Status:</span>
												<span class="cap-value">{formatValue(device.onoff, 'onoff')}</span>
											</div>
										{/if}
										{#if device.dim !== null && device.dim !== undefined}
											<div class="capability">
												<span class="cap-label">Dimming:</span>
												<span class="cap-value">{formatValue(device.dim, 'dim')}</span>
											</div>
										{/if}
										{#if device.target_temperature !== null && device.target_temperature !== undefined}
											<div class="capability">
												<span class="cap-label">Måltemp:</span>
												<span class="cap-value">{formatValue(device.target_temperature, 'target_temperature')}</span>
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Logic Variables -->
		{#if data.data.variables.length > 0}
			<div class="variables-section">
				<h2>⚙️ Logikkvariabler</h2>
				<div class="variables-grid">
					{#each data.data.variables as variable}
						<div class="variable-card">
							<div class="variable-name">{variable.name}</div>
							<div class="variable-type">{variable.type}</div>
							<div class="variable-value">
								{formatValue(variable.value)}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.homey-dashboard {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.dashboard-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.dashboard-header h1 {
		margin: 0 0 1rem 0;
		color: #1f2937;
		font-size: 2rem;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		max-width: 600px;
		margin: 0 auto;
	}

	.stat {
		background: #f3f4f6;
		padding: 1rem;
		border-radius: 8px;
		text-align: center;
	}

	.stat-value {
		display: block;
		font-size: 2rem;
		font-weight: bold;
		color: #059669;
	}

	.stat-label {
		display: block;
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: 0.25rem;
	}

	.error-message {
		background: #fee2e2;
		border: 2px solid #fca5a5;
		border-radius: 8px;
		padding: 2rem;
		text-align: center;
		color: #991b1b;
	}

	.house-summary {
		background: #f0f9ff;
		border: 2px solid #38bdf8;
		border-radius: 12px;
		padding: 2rem;
		margin-bottom: 2rem;
		text-align: center;
	}

	.temperature-display {
		font-size: 3rem;
		font-weight: bold;
		color: #0369a1;
		margin: 1rem 0;
	}

	.temperature-sensors h3 {
		margin: 1.5rem 0 1rem 0;
		color: #1f2937;
	}

	.sensor-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.sensor-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
		text-align: left;
	}

	.sensor-name {
		font-weight: bold;
		color: #1f2937;
	}

	.sensor-zone {
		font-size: 0.875rem;
		color: #6b7280;
		margin-bottom: 0.5rem;
	}

	.sensor-values {
		display: flex;
		gap: 1rem;
	}

	.temperature {
		color: #dc2626;
		font-weight: bold;
	}

	.humidity {
		color: #2563eb;
		font-weight: bold;
	}

	.zones-section {
		margin-bottom: 2rem;
	}

	.zones-section h2 {
		margin-bottom: 1.5rem;
		color: #1f2937;
	}

	.zones-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.zone-card {
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.zone-name {
		margin: 0 0 1rem 0;
		color: #1f2937;
		font-size: 1.25rem;
		border-bottom: 2px solid #f3f4f6;
		padding-bottom: 0.5rem;
	}

	.devices-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.device-card {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
		transition: all 0.2s;
	}

	.device-card:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.device-card.unavailable {
		opacity: 0.6;
		background: #f3f4f6;
	}

	.device-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.device-icon {
		font-size: 1.25rem;
	}

	.device-name {
		font-weight: bold;
		color: #1f2937;
		flex: 1;
	}

	.device-status {
		font-size: 1.2rem;
	}

	.device-capabilities {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 0.5rem;
	}

	.capability {
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
	}

	.cap-label {
		color: #6b7280;
	}

	.cap-value {
		font-weight: bold;
		color: #1f2937;
	}

	.variables-section {
		margin-bottom: 2rem;
	}

	.variables-section h2 {
		margin-bottom: 1.5rem;
		color: #1f2937;
	}

	.variables-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.variable-card {
		background: #fef3c7;
		border: 1px solid #f59e0b;
		border-radius: 8px;
		padding: 1rem;
	}

	.variable-name {
		font-weight: bold;
		color: #92400e;
		margin-bottom: 0.25rem;
	}

	.variable-type {
		font-size: 0.75rem;
		color: #d97706;
		text-transform: uppercase;
		margin-bottom: 0.5rem;
	}

	.variable-value {
		font-weight: bold;
		color: #451a03;
		font-size: 1.1rem;
	}
</style>