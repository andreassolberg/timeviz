<script lang="ts">
	import SVGViz from '$lib/components/SVGViz.svelte';
	import { line, curveMonotoneX } from 'd3-shape';
	import type { PageData } from './$types';

	export let data: PageData;

	// Destructure data from server
	const { timeline, weatherData, temperatureMarkers, valueScale, location, error } = data;
	const { hourTicks, dayLabelTicks, nowX } = timeline;

	// Generate SVG path using d3.line with smooth curves
	$: temperaturePath =
		temperatureMarkers && temperatureMarkers.length > 0
			? line<any>()
					.x((d) => d.x)
					.y((d) => d.y)
					.curve(curveMonotoneX)(temperatureMarkers) || ''
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
		<!-- Value scale grid lines - first -->
		{#if temperatureMarkers && valueScale}
			{#each valueScale.rowMarkers as marker}
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

		<!-- Day labels at the top -->
		{#each dayLabelTicks as dayTick}
			<text
				x={dayTick.x}
				y={20}
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
				y={tick.now ? 40 : 50}
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
				stroke={tick.now ? 'red' : '#eee'}
				stroke-width={1}
			/>
		{/each}

		<!-- Temperature path - last -->
		{#if temperatureMarkers && valueScale && temperaturePath}
			<path
				d={temperaturePath}
				fill="none"
				stroke="#dc2626"
				stroke-width={1}
				transform="translate(0, 80)"
			/>
		{/if}

		<!-- Row marker text labels - very last -->
		{#if temperatureMarkers && valueScale}
			{#each valueScale.rowMarkers as marker}
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
