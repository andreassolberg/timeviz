<script lang="ts">
	import SVGViz from '$lib/components/SVGViz.svelte';
	import { line, curveMonotoneX } from 'd3-shape';
	import { scaleLinear } from 'd3-scale';
	import { getIconFilename } from '$lib/weatherSymbolMapping';
	import { SectionStack } from '$lib/layout';
	import { formatEnergyPrice } from '$lib/EnergyData';
	import type { PageData } from './$types';

	export let data: PageData;

	// UV Index color scale using d3.scaleLinear for continuous colors
	const uvColorScale = scaleLinear<string>()
		.domain([0, 2, 5, 7, 10, 12]) // Smooth transitions between UV levels
		.range(['#059669', '#10b981', '#d97706', '#dc2626', '#b91c1c', '#7c3aed']) // green → light green → orange → red → dark red → purple
		.clamp(true);

	// Destructure data from server
	const {
		timeline,
		weatherData,
		temperatureMarkers,
		temperatureScale,
		extremeTemperatureMarkers,
		precipitationMarkers,
		precipitationScale,
		extremePrecipitationMarkers,
		weatherSymbolMarkers,
		solarMarkers,
		solarScale,
		energyMarkers,
		energyScale,
		extremeEnergyMarkers,
		config,
		location,
		error
	} = data;
	const { hourTicks, dayLabelTicks, nowX, hourWidth, dayNightMarkers } = timeline;

	// Global error state - any error prevents rendering
	let applicationError: string | null = null;

	// Application state - only available if no errors
	let sectionStack: SectionStack;
	let sectionPositions: any;
	let totalHeight: number;
	let iconWidth: number;
	let temperaturePath: string;
	let solarPath: string;

	try {
		// Validate server data
		if (error) {
			throw new Error(`Weather data error: ${error}`);
		}

		if (!timeline || !hourTicks || !dayLabelTicks) {
			throw new Error('Missing required timeline data');
		}

		if (!config?.visualization?.sections) {
			throw new Error('Missing required config.visualization.sections');
		}

		if (!config?.visualization?.fontSize) {
			throw new Error('Missing required config.visualization.fontSize');
		}

		if (!config?.visualization?.colors) {
			throw new Error('Missing required config.visualization.colors');
		}

		// Initialize SectionStack
		sectionStack = new SectionStack(config.visualization.sections);
		sectionPositions = sectionStack.getAll();
		totalHeight = sectionStack.getTotalHeight();

		// Calculate weather icon width as 95% of hour width
		iconWidth = hourWidth * 0.95;

		// Generate SVG path using d3.line with smooth curves
		temperaturePath =
			temperatureMarkers && temperatureMarkers.length > 0
				? line<any>()
						.x((d) => d.x)
						.y((d) => d.y)
						.curve(curveMonotoneX)(temperatureMarkers) || ''
				: '';

		// Generate solar altitude path as filled area
		solarPath =
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

		console.log('Application initialized successfully');
		console.log('Section positions:', sectionPositions);
		console.log('Weather symbol data:', {
			weatherSymbolMarkers: weatherSymbolMarkers?.length || 0,
			firstSymbolMarker: weatherSymbolMarkers?.[0],
			lastSymbolMarker: weatherSymbolMarkers?.[weatherSymbolMarkers?.length - 1],
			sampleMarkers: weatherSymbolMarkers?.slice(0, 3)
		});
		console.log('Timeline window check:', {
			timelineFromTo: `${timeline.hourTicks?.[0]?.tstr} → ${timeline.hourTicks?.[timeline.hourTicks?.length - 1]?.tstr}`,
			lastTemperatureHasSymbol:
				temperatureMarkers?.[temperatureMarkers?.length - 1]?.weatherSymbol !== undefined,
			lastTemperatureHasPrecipitation:
				temperatureMarkers?.[temperatureMarkers?.length - 1]?.precipitation !== undefined
		});
		console.log('Energy data:', {
			energyMarkers: energyMarkers?.length || 0,
			energyScale,
			firstEnergyMarker: energyMarkers?.[0],
			sampleMarkers: energyMarkers?.slice(0, 3)
		});
	} catch (appError) {
		console.error('Application initialization error:', appError);
		applicationError = appError instanceof Error ? appError.message : 'Unknown application error';
	}
</script>

<div class="weather-timeline">
	{#if applicationError}
		<div class="error-message application-error">
			<p>🚨 Application Error</p>
			<p>{applicationError}</p>
			<p>Please check the configuration and data, then reload the page.</p>
		</div>
	{:else}
		<SVGViz width={timeline.width} height={totalHeight} full="width" margin={10}>
			<!-- ===== BACKGROUND LAYER ===== -->
			<g id="background-global">
				<!-- Day/Night background rectangles spanning main content area -->
				{#if dayNightMarkers && dayNightMarkers.length > 0}
					{#each dayNightMarkers as marker}
						{#if marker.from.x !== undefined && marker.to.x !== undefined}
							<rect
								x={marker.from.x}
								y={sectionPositions.main.y}
								width={marker.to.x - marker.from.x}
								height={sectionPositions.main.height}
								fill={marker.day ? 'rgba(255, 255, 0, 0.03)' : 'rgba(0, 0, 0, 0.1)'}
								opacity="0.3"
							/>
						{/if}
					{/each}
				{/if}
			</g>

			<g id="background-temperature" transform="translate(0, {sectionPositions.temperature.y})">
				<!-- Temperature scale grid lines -->
				{#if temperatureMarkers && temperatureScale}
					{#each temperatureScale.rowMarkers as marker}
						<line
							x1={0}
							y1={marker.y}
							x2={timeline.width}
							y2={marker.y}
							stroke="#e5e7eb"
							stroke-width="1"
						/>
					{/each}
				{/if}
			</g>

			<!-- ===== CONTENT LAYER ===== -->
			<g id="header-background" transform="translate(0, {sectionPositions.header.y})">
				<!-- Horizontal separator line at main section start -->
				<line
					x1={0}
					y1={sectionPositions.main.y}
					x2={timeline.width}
					y2={sectionPositions.main.y}
					stroke="#555"
					stroke-width={0.5}
				/>

				<!-- Hour tick lines extending through main section -->
				{#each hourTicks as tick}
					<line
						x1={tick.x}
						y1={sectionPositions.main.y}
						x2={tick.x}
						y2={sectionPositions.main.y + sectionPositions.main.height}
						stroke={tick.now ? (timeline.isFixedTime ? '#f59e0b' : '#000') : '#eee'}
						stroke-width={1}
					/>
				{/each}
			</g>

			<g id="solar" transform="translate(0, {sectionPositions.solar.y})">
				<!-- Solar altitude path -->
				{#if solarMarkers && solarScale && solarPath}
					<path
						d={solarPath}
						fill="#FCE0B1"
						stroke="#895906"
						opacity={1}
						stroke-width={0.5}
						stroke-opacity={0.4}
					/>
				{/if}
			</g>

			<g id="header-foreground" transform="translate(0, {sectionPositions.header.y})">
				<!-- Day labels positioned relative to main section start (on top of solar) -->
				{#each dayLabelTicks as dayTick}
					<text
						x={dayTick.x}
						y={sectionPositions.main.y - 30}
						font-family="sans-serif"
						font-size={10}
						text-anchor={dayTick.align}
						fill="#000"
						dominant-baseline="central">{dayTick.label}</text
					>
				{/each}

				<!-- Hour tick labels positioned relative to main section start (on top of solar) -->
				{#each hourTicks as tick}
					<text
						x={tick.x}
						y={sectionPositions.main.y - 5}
						font-family="sans-serif"
						font-size={6}
						text-anchor="middle"
						fill="#333"
						stroke="white"
						stroke-width="2"
						stroke-opacity={0.4}
						paint-order="stroke fill"
						alignment-baseline="middle"
						dominant-baseline="central">{tick.tstr}</text
					>
				{/each}
			</g>

			<g id="temperature" transform="translate(0, {sectionPositions.temperature.y})">
				<!-- Temperature path -->
				{#if temperatureMarkers && temperatureScale && temperaturePath}
					<path d={temperaturePath} fill="none" stroke="#dc2626" stroke-width={1} />
				{/if}
			</g>

			<g id="precipitation" transform="translate(0, {sectionPositions.main.y})">
				<!-- Precipitation bars -->
				{#if precipitationMarkers && precipitationMarkers.length > 0}
					{#each precipitationMarkers as marker}
						{#if marker.precipitation && marker.precipitation > 0 && marker.x !== undefined && marker.y !== undefined}
							<rect
								x={marker.x}
								y={0}
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

				<!-- Extreme precipitation marker (maximum) -->
				{#if extremePrecipitationMarkers && extremePrecipitationMarkers.length > 0}
					{#each extremePrecipitationMarkers as marker}
						{#if marker.x !== undefined && marker.y !== undefined && marker.precipitation !== undefined}
							<text
								x={marker.x + hourWidth / 2}
								y={marker.y + 10}
								font-family="sans-serif"
								font-size={config.visualization.fontSize.scaleLabels}
								font-weight="bold"
								fill="#1976d2"
								stroke="white"
								stroke-width="2"
								paint-order="stroke"
								text-anchor="middle"
								dominant-baseline="central"
							>
								{marker.precipitation.toFixed(1)}mm
							</text>
						{/if}
					{/each}
				{/if}
			</g>

			<g id="energy" transform="translate(0, {sectionPositions.energy.y})">
				<!-- Energy price bars -->
				{#if energyMarkers && energyMarkers.length > 0}
					{#each energyMarkers as marker, i}
						{#if marker.nokPerKwh !== undefined && marker.nokPerKwh > 0 && marker.x !== undefined && marker.y !== undefined}
							<rect
								x={marker.x}
								y={sectionPositions.energy.height - marker.y}
								width={hourWidth}
								height={marker.y}
								fill="rgba(255, 165, 0, 0.7)"
								opacity="0.8"
							>
								<title>{marker.tstr}: {marker.nokPerKwh?.toFixed(4)} NOK/kWh (index: {i})</title>
							</rect>
						{:else}
							<!-- Debug rectangle for missing data -->
							{#if marker.x !== undefined}
								<rect
									x={marker.x}
									y={sectionPositions.energy.height - 10}
									width={hourWidth}
									height={10}
									fill="red"
									opacity="0.3"
								>
									<title
										>Missing data: {JSON.stringify({
											nokPerKwh: marker.nokPerKwh,
											x: marker.x,
											y: marker.y,
											index: i
										})}</title
									>
								</rect>
							{/if}
						{/if}
					{/each}
				{:else}
					<!-- Debug message when no energy markers -->
					<text x="50" y="30" fill="red" font-size="12">
						No energy markers found (count: {energyMarkers?.length || 0})
					</text>
				{/if}

				<!-- Energy price grid lines -->
				{#if energyScale && energyScale.rowMarkers.length > 0}
					{#each energyScale.rowMarkers as marker}
						<line
							x1={0}
							y1={sectionPositions.energy.height - marker.y}
							x2={timeline.width}
							y2={sectionPositions.energy.height - marker.y}
							stroke="#ffa500"
							stroke-width="1"
							stroke-dasharray="2,2"
							opacity="0.5"
						/>
						<text
							x={timeline.width - 70}
							y={sectionPositions.energy.height - marker.y}
							font-family="sans-serif"
							font-size="8"
							fill="#ff8c00"
							dominant-baseline="central"
							text-anchor="start"
						>
							{marker.value.toFixed(3)} NOK/kWh
						</text>
					{/each}
				{/if}

				<!-- Energy price extreme markers -->
				{#if extremeEnergyMarkers && extremeEnergyMarkers.length > 0}
					{#each extremeEnergyMarkers as marker}
						{#if marker.x !== undefined && marker.y !== undefined && marker.nokPerKwh !== undefined}
							{#if marker.priceMax}
								<!-- Price maximum marker (expensive - red, above bar) -->
								<text
									x={marker.x + hourWidth / 2}
									y={sectionPositions.energy.height - marker.y - 8}
									font-family="sans-serif"
									font-size={config.visualization.fontSize.energyExtremes}
									font-weight="bold"
									fill={config.visualization.colors.energyPriceMax}
									stroke="white"
									stroke-width="2"
									paint-order="stroke"
									text-anchor="middle"
									dominant-baseline="central"
								>
									{formatEnergyPrice(marker.nokPerKwh)}
								</text>
							{/if}
							{#if marker.priceMin}
								<!-- Price minimum marker (cheap - green, below bar) -->
								<text
									x={marker.x + hourWidth / 2}
									y={sectionPositions.energy.height - marker.y + 8}
									font-family="sans-serif"
									font-size={config.visualization.fontSize.energyExtremes}
									font-weight="bold"
									fill={config.visualization.colors.energyPriceMin}
									stroke="white"
									stroke-width="2"
									paint-order="stroke"
									text-anchor="middle"
									dominant-baseline="central"
								>
									{formatEnergyPrice(marker.nokPerKwh)}
								</text>
							{/if}
						{/if}
					{/each}
				{/if}
			</g>

			<!-- ===== FOREGROUND LAYER ===== -->
			<g id="foreground-temperature" transform="translate(0, {sectionPositions.temperature.y})">
				<!-- Temperature marker points with UV and weather symbol data -->
				{#if temperatureMarkers && temperatureScale}
					{#each temperatureMarkers as marker}
						{#if marker.x !== undefined && marker.y !== undefined}
							<!-- UV Index text -->
							{#if marker.uv !== undefined && marker.uv !== null && marker.uv >= 3}
								<text
									x={marker.x}
									y={marker.y + 7}
									font-family="sans-serif"
									font-size={config.visualization.fontSize.uvIndex}
									font-weight="bold"
									fill={uvColorScale(marker.uv)}
									stroke="white"
									stroke-width="2"
									paint-order="stroke fill"
									text-anchor="middle"
									dominant-baseline="central"
								>
									{marker.uv}
								</text>
							{/if}
						{/if}
					{/each}
				{/if}

				<!-- Weather Symbol icons with corrected positioning -->
				<!-- Symbols represent the NEXT hour and are positioned accordingly -->
				{#if weatherSymbolMarkers && weatherSymbolMarkers.length > 0}
					{#each weatherSymbolMarkers as marker}
						{#if marker.weatherSymbol && marker.x !== undefined && marker.y !== undefined}
							{@const iconFilename = getIconFilename(marker.weatherSymbol)}
							<image
								href="/node_modules/@yr/weather-symbols/dist/svg/{iconFilename}.svg"
								x={marker.x - iconWidth / 2}
								y={marker.y - 12}
								width={iconWidth}
								height={iconWidth}
							>
								<title
									>{marker.weatherSymbol} → {iconFilename} (represents hour starting at {marker.tstr})</title
								>
							</image>
						{/if}
					{/each}
				{/if}

				<!-- Extreme temperature labels (separate from temperature markers) -->
				{#if extremeTemperatureMarkers && extremeTemperatureMarkers.length > 0}
					{#each extremeTemperatureMarkers as marker}
						{#if marker.x !== undefined && marker.y !== undefined}
							<text
								x={marker.x}
								y={marker.y + (marker.max ? -16 : 16)}
								font-family="sans-serif"
								font-size={config.visualization.fontSize.temperatureExtremes}
								font-weight="bold"
								fill={marker.max
									? config.visualization.colors.temperatureMax
									: config.visualization.colors.temperatureMin}
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

				<!-- Temperature scale text labels -->
				{#if temperatureMarkers && temperatureScale}
					{#each temperatureScale.rowMarkers as marker}
						<text
							x={10}
							y={marker.y}
							font-family="sans-serif"
							font-size={8}
							fill="#666"
							stroke="white"
							stroke-width="3"
							paint-order="stroke fill"
							dominant-baseline="central"
							text-anchor="start"
						>
							{marker.value}°C
						</text>
					{/each}
				{/if}
			</g>

			<g id="background-precipitation" transform="translate(0, {sectionPositions.main.y})">
				<!-- Precipitation grid lines and labels -->
				{#if precipitationScale && precipitationScale.rowMarkers.length > 0}
					{#each precipitationScale.rowMarkers as marker}
						<line
							x1={0}
							y1={marker.y}
							x2={timeline.width}
							y2={marker.y}
							stroke="#e3f2fd"
							stroke-width="1"
							stroke-dasharray="2,2"
						/>
						<text
							x={timeline.width - 50}
							y={marker.y}
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
			</g>
		</SVGViz>
		
		<!-- Fixed time indicator -->
		{#if timeline.isFixedTime}
			<div class="fixed-time-indicator">
				<p>📌 Using fixed timestamp: <strong>{new Date(timeline.now).toLocaleString('no-NO')}</strong></p>
				<p class="fixed-time-hint">Timeline is locked to this specific point in time for historical analysis.</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	.error-message {
		border-radius: 8px;
		padding: 1.5rem;
		margin: 2rem auto;
		max-width: 600px;
		text-align: center;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.application-error {
		background-color: #fee2e2;
		border: 2px solid #fca5a5;
		color: #991b1b;
	}

	.error-message p:first-child {
		font-size: 1.25rem;
		font-weight: bold;
		margin-bottom: 0.5rem;
	}

	.error-message p:last-child {
		font-style: italic;
		margin-top: 1rem;
		opacity: 0.8;
	}

	.fixed-time-indicator {
		background-color: #fef3c7;
		border: 2px solid #f59e0b;
		border-radius: 8px;
		padding: 1rem;
		margin: 1rem auto;
		max-width: 600px;
		text-align: center;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.fixed-time-indicator p {
		margin: 0.25rem 0;
	}

	.fixed-time-indicator strong {
		color: #d97706;
	}

	.fixed-time-hint {
		font-size: 0.875rem;
		color: #92400e;
		opacity: 0.9;
	}
</style>
