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
		<div class="header-nav">
			<a href="/" class="back-link">← Back to main page</a>
		</div>
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
				<div class="stat">
					<span class="stat-value">{data.data.stats.totalInsights}</span>
					<span class="stat-label">Insights</span>
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

		<!-- Historical Data Test -->
		{#if data.data.historicalData}
			<div class="historical-section">
				<h2>📈 Historical Device Data (Last 24h)</h2>
				
				<!-- Temperature Data -->
				{#if data.data.historicalData.temperature}
					<div class="historical-container temperature">
						<h3>🌡️ Temperature Data</h3>
						<div class="device-info">
							<strong>Device ID:</strong>
							<code>{data.data.historicalData.temperature.deviceId}</code>
						</div>
						
						{#if data.data.historicalData.temperature.data?.error}
							<div class="error-box">
								<strong>Error:</strong> {data.data.historicalData.temperature.data.error}
							</div>
						{:else if data.data.historicalData.temperature.data?.values}
							<div class="data-summary">
								<strong>Data Points:</strong> {data.data.historicalData.temperature.data.values.length}
							</div>
							
							{#if data.data.historicalData.temperature.data.values.length > 0}
								<div class="temperature-chart">
									<h4>Temperature Values (°C)</h4>
									<div class="chart-container">
										{#each data.data.historicalData.temperature.data.values as point, i}
											<div class="data-point">
												<div class="timestamp">{new Date(point.t).toLocaleString('no-NO')}</div>
												<div class="temperature-value">{point.v?.toFixed(1)}°C</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
							
							<div class="raw-data">
								<details>
									<summary>Raw Temperature Data</summary>
									<pre>{JSON.stringify(data.data.historicalData.temperature.data, null, 2)}</pre>
								</details>
							</div>
						{:else}
							<div class="no-data">
								No temperature data available for this device.
							</div>
						{/if}
					</div>
				{/if}

				<!-- Power Data -->
				{#if data.data.historicalData.power}
					<div class="historical-container power">
						<h3>⚡ Power Data</h3>
						<div class="device-info">
							<strong>Device ID:</strong>
							<code>{data.data.historicalData.power.deviceId}</code>
						</div>
						
						{#if data.data.historicalData.power.data?.error}
							<div class="error-box">
								<strong>Error:</strong> {data.data.historicalData.power.data.error}
							</div>
						{:else if data.data.historicalData.power.data?.values}
							<div class="data-summary">
								<strong>Data Points:</strong> {data.data.historicalData.power.data.values.length}
							</div>
							
							{#if data.data.historicalData.power.data.values.length > 0}
								<div class="power-chart">
									<h4>Power Values (kWh)</h4>
									<div class="chart-container">
										{#each data.data.historicalData.power.data.values as point, i}
											<div class="data-point">
												<div class="timestamp">{new Date(point.t).toLocaleString('no-NO')}</div>
												<div class="power-value">{point.v?.toFixed(3)} kWh</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
							
							<div class="raw-data">
								<details>
									<summary>Raw Power Data</summary>
									<pre>{JSON.stringify(data.data.historicalData.power.data, null, 2)}</pre>
								</details>
							</div>
						{:else}
							<div class="no-data">
								No power data available for this device.
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Insights Test -->
		{#if data.data.insights && data.data.insights.length > 0}
			<div class="insights-section">
				<h2>📊 Insights API Test</h2>
				<div class="insights-grid">
					{#each data.data.insights as insight}
						<div class="insight-card">
							<div class="insight-id">{insight.id}</div>
							{#if insight.title}
								<div class="insight-title">{insight.title}</div>
							{/if}
							{#if insight.type}
								<div class="insight-type">{insight.type}</div>
							{/if}
							{#if insight.units}
								<div class="insight-units">Units: {insight.units}</div>
							{/if}
							<div class="insight-raw">
								<details>
									<summary>Raw Data</summary>
									<pre>{JSON.stringify(insight, null, 2)}</pre>
								</details>
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

	.header-nav {
		text-align: left;
		margin-bottom: 1rem;
	}

	.back-link {
		color: #0066cc;
		text-decoration: none;
		font-size: 1rem;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.back-link:hover {
		text-decoration: underline;
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

	.historical-section {
		margin-bottom: 2rem;
	}

	.historical-section h2 {
		margin-bottom: 1.5rem;
		color: #1f2937;
	}

	.historical-container {
		border-radius: 12px;
		padding: 2rem;
		margin-bottom: 1.5rem;
	}

	.historical-container.temperature {
		background: #fef7ff;
		border: 2px solid #d946ef;
	}

	.historical-container.power {
		background: #fffbeb;
		border: 2px solid #f59e0b;
	}

	.historical-container h3 {
		margin: 0 0 1rem 0;
		color: #1f2937;
	}

	.device-info {
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.device-info code {
		background: #f3f4f6;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-family: monospace;
		word-break: break-all;
	}

	.error-box {
		background: #fee2e2;
		border: 1px solid #fca5a5;
		color: #991b1b;
		padding: 1rem;
		border-radius: 6px;
		margin: 1rem 0;
	}

	.data-summary {
		margin: 1rem 0;
		font-weight: bold;
		color: #7c2d12;
	}

	.temperature-chart h3 {
		margin: 1rem 0 0.5rem 0;
		color: #7c2d12;
	}

	.chart-container {
		max-height: 300px;
		overflow-y: auto;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		background: white;
	}

	.data-point {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid #f3f4f6;
	}

	.data-point:last-child {
		border-bottom: none;
	}

	.data-point:nth-child(even) {
		background: #f9fafb;
	}

	.timestamp {
		font-size: 0.875rem;
		color: #6b7280;
		font-family: monospace;
	}

	.temperature-value {
		font-weight: bold;
		color: #dc2626;
		font-size: 1rem;
	}

	.power-value {
		font-weight: bold;
		color: #d97706;
		font-size: 1rem;
	}

	.power-chart h4 {
		margin: 1rem 0 0.5rem 0;
		color: #92400e;
	}

	.raw-data {
		margin-top: 1.5rem;
	}

	.raw-data details {
		font-size: 0.875rem;
	}

	.raw-data summary {
		cursor: pointer;
		color: #7c2d12;
		margin-bottom: 0.5rem;
		font-weight: bold;
	}

	.raw-data pre {
		background: #1f2937;
		color: #f9fafb;
		padding: 1rem;
		border-radius: 6px;
		font-size: 0.75rem;
		overflow-x: auto;
		max-height: 300px;
		overflow-y: auto;
	}

	.no-data {
		color: #6b7280;
		font-style: italic;
		padding: 1rem;
		text-align: center;
	}

	.insights-section {
		margin-bottom: 2rem;
	}

	.insights-section h2 {
		margin-bottom: 1.5rem;
		color: #1f2937;
	}

	.insights-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
	}

	.insight-card {
		background: #f0f9ff;
		border: 1px solid #0ea5e9;
		border-radius: 8px;
		padding: 1rem;
	}

	.insight-id {
		font-family: monospace;
		font-size: 0.875rem;
		color: #0369a1;
		margin-bottom: 0.5rem;
		word-break: break-all;
	}

	.insight-title {
		font-weight: bold;
		color: #1e40af;
		margin-bottom: 0.25rem;
	}

	.insight-type {
		font-size: 0.875rem;
		color: #0369a1;
		text-transform: uppercase;
		margin-bottom: 0.25rem;
	}

	.insight-units {
		font-size: 0.875rem;
		color: #6b7280;
		margin-bottom: 0.5rem;
	}

	.insight-raw {
		margin-top: 0.5rem;
	}

	.insight-raw details {
		font-size: 0.875rem;
	}

	.insight-raw summary {
		cursor: pointer;
		color: #0369a1;
		margin-bottom: 0.5rem;
	}

	.insight-raw pre {
		background: #1f2937;
		color: #f9fafb;
		padding: 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		overflow-x: auto;
		max-height: 200px;
		overflow-y: auto;
	}
</style>