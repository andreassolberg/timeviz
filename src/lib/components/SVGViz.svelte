<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * SVGViz Component
	 *
	 * A flexible SVG container component that supports responsive sizing and margins.
	 *
	 * @prop width - The base width of the SVG viewBox (must be positive)
	 * @prop height - The base height of the SVG viewBox (must be positive)
	 * @prop full - Optional responsive mode: 'width' fills viewport width, 'height' fills viewport height
	 * @prop margin - Optional margin added to all sides of the viewBox (defaults to 0)
	 * @prop children - SVG content to render inside the container
	 */
	interface Props {
		width: number;
		height: number;
		full?: 'width' | 'height' | null;
		margin?: number;
		children: Snippet;
	}

	let { width, height, full = null, margin = 0, children }: Props = $props();

	// Validate inputs
	if (width <= 0 || height <= 0) {
		throw new Error('SVGViz: width and height must be positive numbers');
	}

	// Reactive SVG dimensions based on full parameter
	let svgWidth = $derived(full === 'width' ? '100vw' : full === 'height' ? 'auto' : width);

	let svgHeight = $derived(full === 'height' ? '100vh' : full === 'width' ? 'auto' : height);

	// Reactive viewBox calculations with safe margin handling
	let safeMargin = $derived(Math.max(0, margin)); // Ensure non-negative margin
	let viewBoxX = $derived(-safeMargin);
	let viewBoxY = $derived(-safeMargin);
	let viewBoxWidth = $derived(width + 2 * safeMargin);
	let viewBoxHeight = $derived(height + 2 * safeMargin);
	let viewBox = $derived(`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
</script>

<svg
	width={svgWidth}
	height={svgHeight}
	{viewBox}
	preserveAspectRatio="xMidYMid meet"
	style="display: block; max-width: 100%; overflow: visible;"
>
	{@render children()}
</svg>
