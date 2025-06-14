<script lang="ts">
	import SVGViz from '$lib/components/SVGViz.svelte';
	import { line, curveMonotoneX } from 'd3-shape';
	import type { PageData } from './$types';

	export let data: PageData;

	// Destructure data from server
	const {
		timeline,
		weatherData,
		temperatureMarkers,
		temperatureScale,
		extremeTemperatureMarkers,
		precipitationMarkers,
		precipitationScale,
		solarMarkers,
		solarScale,
		config,
		location,
		error
	} = data;
	const { hourTicks, dayLabelTicks, nowX, hourWidth, dayNightMarkers } = timeline;

	// Generate SVG path using d3.line with smooth curves
	$: temperaturePath =
		temperatureMarkers && temperatureMarkers.length > 0
			? line<any>()
					.x((d) => d.x)
					.y((d) => d.y)
					.curve(curveMonotoneX)(temperatureMarkers) || ''
			: '';

	// Generate solar altitude path as filled area
	$: solarPath =
		solarMarkers && solarMarkers.length > 0 && solarScale
			? (() => {
					// Create the top curve
					const topPath =
						line<any>()
							.x((d) => d.x)
							.y((d) => d.y)
							.curve(curveMonotoneX)(solarMarkers) || '';

					if (!topPath) return '';

					// Add baseline to close the area (at scale height since we flip Y)
					const firstPoint = solarMarkers[0];
					const lastPoint = solarMarkers[solarMarkers.length - 1];
					const baseline = solarScale.height;

					return `${topPath} L ${lastPoint.x} ${baseline} L ${firstPoint.x} ${baseline} Z`;
				})()
			: '';
</script>

<div class="weather-timeline">
	{#if error}
		<div class="error-message">
			<p>⚠️ {error}</p>
			<p>Showing timeline without weather data.</p>
		</div>
	{/if}

	<SVGViz width={timeline.width} height={400} full="width" margin={10}>
		<!-- Day/Night background rectangles - first -->
		{#if dayNightMarkers && dayNightMarkers.length > 0}
			{#each dayNightMarkers as marker}
				<rect
					x={marker.from.x}
					y={70}
					width={marker.to.x - marker.from.x}
					height={310}
					fill={marker.day ? 'rgba(255, 255, 0, 0.03)' : 'rgba(0, 0, 0, 0.1)'}
					opacity="0.3"
				/>
			{/each}
		{/if}

		<!-- Temperature scale grid lines -->
		{#if temperatureMarkers && temperatureScale}
			{#each temperatureScale.rowMarkers as marker}
				<line
					x1={0}
					y1={marker.y + 80}
					x2={timeline.width}
					y2={marker.y + 80}
					stroke="#e5e7eb"
					stroke-width="1"
				/>
			{/each}
		{/if}

		<!-- Solar altitude path -->
		{#if solarMarkers && solarScale && solarPath}
			<path
				d={solarPath}
				fill="#f59e0b"
				stroke="#f59e0b"
				opacity={0.3}
				stroke-width={0}
				transform="translate(0, 50) "
			/>
		{/if}

		<!-- Day labels at the top -->
		{#each dayLabelTicks as dayTick}
			<text
				x={dayTick.x}
				y={30}
				font-family="sans-serif"
				font-size={12}
				text-anchor={dayTick.align}
				fill="#000"
				dominant-baseline="central">{dayTick.label}</text
			>
		{/each}

		<!-- Hour tick lines -->
		{#each hourTicks as tick}
			<text
				x={tick.x}
				y={65}
				font-family="sans-serif"
				font-size={6}
				text-anchor="middle"
				fill="#333"
				alignment-baseline="middle"
				dominant-baseline="central">{tick.tstr}</text
			>
			<line
				x1={tick.x}
				y1={70}
				x2={tick.x}
				y2={380}
				stroke={tick.now ? '#000' : '#eee'}
				stroke-width={1}
			/>
		{/each}

		<!-- Temperature path - last -->
		{#if temperatureMarkers && temperatureScale && temperaturePath}
			<path
				d={temperaturePath}
				fill="none"
				stroke="#dc2626"
				stroke-width={1}
				transform="translate(0, 80)"
			/>
		{/if}

		<!-- Precipitation bars for each hour -->
		{#if precipitationMarkers && precipitationMarkers.length > 0}
			{#each precipitationMarkers as marker}
				{#if marker.precipitation && marker.precipitation > 0 && marker.x !== undefined && marker.y !== undefined}
					<rect
						x={marker.x}
						y={200 - marker.y}
						width={hourWidth}
						height={marker.y}
						fill="rgba(54, 162, 235, 0.7)"
						opacity="0.8"
					>
						<title>{marker.tstr}: {marker.precipitation}mm</title>
					</rect>
				{/if}
			{/each}
		{/if}

		<!-- Precipitation grid lines and labels -->
		{#if precipitationScale && precipitationScale.rowMarkers.length > 0}
			{#each precipitationScale.rowMarkers as marker}
				<line
					x1={0}
					y1={200 - marker.y}
					x2={timeline.width}
					y2={200 - marker.y}
					stroke="#e3f2fd"
					stroke-width="1"
					stroke-dasharray="2,2"
				/>
				<text
					x={timeline.width - 50}
					y={200 - marker.y}
					font-family="sans-serif"
					font-size="8"
					fill="#1976d2"
					dominant-baseline="central"
					text-anchor="start"
				>
					{marker.value}mm
				</text>
			{/each}
		{/if}

		<!-- Extreme temperature labels -->
		{#if extremeTemperatureMarkers && extremeTemperatureMarkers.length > 0}
			{#each extremeTemperatureMarkers as marker}
				{#if marker.x !== undefined && marker.y !== undefined}
					<text
						x={marker.x}
						y={marker.y + 80 + (marker.max ? -5 : 5)}
						font-family="sans-serif"
						font-size={config?.fontSize?.temperatureExtremes || 8}
						font-weight="bold"
						fill={marker.max
							? config?.colors?.temperatureMax || '#dc2626'
							: config?.colors?.temperatureMin || '#2563eb'}
						stroke="white"
						stroke-width="2"
						paint-order="stroke fill"
						dominant-baseline="central"
						text-anchor="middle"
					>
						{marker.temperature?.toFixed(1)}°
					</text>
				{/if}
			{/each}
		{/if}

		<!-- Temperature scale text labels - very last -->
		{#if temperatureMarkers && temperatureScale}
			{#each temperatureScale.rowMarkers as marker}
				<text
					x={nowX}
					y={marker.y + 80}
					font-family="sans-serif"
					font-size={8}
					fill="#666"
					stroke="white"
					stroke-width="3"
					paint-order="stroke fill"
					dominant-baseline="central"
					text-anchor="middle"
				>
					{marker.value}°C
				</text>
			{/each}
		{/if}
	</SVGViz>
</div>

<style>
	.error-message {
		background-color: #fef3cd;
		border: 1px solid #ffeaa7;
		border-radius: 4px;
		padding: 0.75rem;
		margin-bottom: 1rem;
		color: #856404;
	}
</style>
