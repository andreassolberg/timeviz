<script lang="ts">
	import SVGViz from '$lib/components/SVGViz.svelte';
	import { line, curveMonotoneX } from 'd3-shape';
	import type { PageData } from './$types';

	export let data: PageData;

	// Generate SVG path using d3.line with smooth curves
	$: temperaturePath =
		data.success && data.temperatureMarkers
			? line<any>()
					.x((d) => d.x)
					.y((d) => d.y)
					.curve(curveMonotoneX)(data.temperatureMarkers) || ''
			: '';
</script>

<svelte:head>
	<title>Temperature Data Debug - Timeviz</title>
</svelte:head>

<div class="temperature-debug">
	<h1>Temperature Data Debug</h1>

	{#if data.success}
		<div class="success">
			<h2>✅ Data loaded successfully</h2>

			<!-- Temperature Visualization -->
			{#if data.temperatureMarkers && data.temperatureMarkers.length > 0}
				<section>
					<h3>Temperature Visualization</h3>
					<SVGViz width={data.timeline.width} height={100} full="width" margin={10}>
						<!-- Value scale grid lines -->
						{#each data.valueScale.rowMarkers as marker}
							<line
								x1={0}
								y1={marker.y + 25}
								x2={data.timeline.width}
								y2={marker.y + 25}
								stroke="#e5e7eb"
								stroke-width="1"
							/>
							<text
								x={10}
								y={marker.y + 25}
								font-family="sans-serif"
								font-size="10"
								fill="#666"
								dominant-baseline="central"
							>
								{marker.value}°C
							</text>
						{/each}

						<!-- Temperature path -->
						{#if temperaturePath}
							<path
								d={temperaturePath}
								fill="none"
								stroke="#dc2626"
								stroke-width="2"
								transform="translate(0, 25)"
							/>
						{/if}

						<!-- Temperature markers -->
						{#each data.temperatureMarkers as marker}
							<circle
								cx={marker.x}
								cy={marker.y + 25}
								r="2"
								fill={marker.dataType === 'historical' ? '#3b82f6' : '#f59e0b'}
							>
								<title>{marker.tstr}: {marker.temperature}°C</title>
							</circle>
						{/each}
					</SVGViz>
				</section>
			{/if}

			<section>
				<h3>Configuration</h3>
				<pre>{JSON.stringify(data.config, null, 2)}</pre>
			</section>

			<section>
				<h3>Statistics</h3>
				<pre>{JSON.stringify(data.stats, null, 2)}</pre>
			</section>

			<section>
				<h3>Timeline Info</h3>
				<pre>{JSON.stringify(data.timeline, null, 2)}</pre>
			</section>

			<section>
				<h3>Weather Data (processed)</h3>
				<p>Showing first 10 data points:</p>
				<pre>{JSON.stringify(data.weatherData.slice(0, 10), null, 2)}</pre>

				{#if data.weatherData.length > 10}
					<details>
						<summary>Show all {data.weatherData.length} data points</summary>
						<pre>{JSON.stringify(data.weatherData, null, 2)}</pre>
					</details>
				{/if}
			</section>

			{#if data.rawData.forecast}
				<section>
					<h3>Raw Forecast Data</h3>
					<p>Showing first 5 forecast points:</p>
					<pre>{JSON.stringify(data.rawData.forecast.slice(0, 5), null, 2)}</pre>

					{#if data.rawData.forecast.length > 5}
						<details>
							<summary>Show all {data.rawData.forecast.length} forecast points</summary>
							<pre>{JSON.stringify(data.rawData.forecast, null, 2)}</pre>
						</details>
					{/if}
				</section>
			{/if}

			{#if data.rawData.historical}
				<section>
					<h3>Raw Historical Data</h3>
					<p>Showing first 5 historical points:</p>
					<pre>{JSON.stringify(data.rawData.historical.slice(0, 5), null, 2)}</pre>

					{#if data.rawData.historical.length > 5}
						<details>
							<summary>Show all {data.rawData.historical.length} historical points</summary>
							<pre>{JSON.stringify(data.rawData.historical, null, 2)}</pre>
						</details>
					{/if}
				</section>
			{:else if data.config.hasFrostClientId}
				<section>
					<h3>Historical Data</h3>
					<p>❌ No historical data available (check Frost API configuration)</p>
				</section>
			{:else}
				<section>
					<h3>Historical Data</h3>
					<p>ℹ️ Historical data not available (no Frost client ID configured)</p>
				</section>
			{/if}
		</div>
	{:else}
		<div class="error">
			<h2>❌ Error loading data</h2>

			<section>
				<h3>Error Message</h3>
				<pre>{data.error}</pre>
			</section>

			<section>
				<h3>Configuration</h3>
				<pre>{JSON.stringify(data.config, null, 2)}</pre>
			</section>

			{#if data.errorDetails}
				<section>
					<h3>Error Details</h3>
					<pre>{data.errorDetails}</pre>
				</section>
			{/if}
		</div>
	{/if}

	<div class="navigation">
		<a href="/">← Back to Home</a>
		<a href="/basic">View Basic Timeline</a>
	</div>
</div>

<style>
	.temperature-debug {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, sans-serif;
	}

	h1 {
		color: #1a1a1a;
		margin-bottom: 2rem;
	}

	h2 {
		color: #2563eb;
		margin-bottom: 1.5rem;
	}

	h3 {
		color: #374151;
		margin-bottom: 1rem;
		border-bottom: 2px solid #e5e7eb;
		padding-bottom: 0.5rem;
	}

	section {
		margin-bottom: 2rem;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1.5rem;
		background: #f9fafb;
	}

	pre {
		background: #1f2937;
		color: #f3f4f6;
		padding: 1rem;
		border-radius: 6px;
		overflow-x: auto;
		font-size: 0.875rem;
		line-height: 1.5;
		margin: 0;
	}

	.success h2 {
		color: #059669;
	}

	.error h2 {
		color: #dc2626;
	}

	.error section {
		background: #fef2f2;
		border-color: #fecaca;
	}

	details {
		margin-top: 1rem;
	}

	summary {
		cursor: pointer;
		padding: 0.5rem;
		background: #e5e7eb;
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	summary:hover {
		background: #d1d5db;
	}

	.navigation {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 2px solid #e5e7eb;
	}

	.navigation a {
		display: inline-block;
		margin-right: 1rem;
		padding: 0.5rem 1rem;
		background: #2563eb;
		color: white;
		text-decoration: none;
		border-radius: 4px;
		transition: background 0.2s;
	}

	.navigation a:hover {
		background: #1d4ed8;
	}
</style>
