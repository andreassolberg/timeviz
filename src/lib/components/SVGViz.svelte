<script lang="ts">
	interface Props {
		width: number | string;
		height: number | string;
		full?: 'width' | 'height' | null;
		margin?: number;
	}

	let { width, height, full = null, margin = 0 }: Props = $props();

	let svgWidth = width;
	let svgHeight = height;

	if (full === 'width') {
		svgWidth = '100vw';
		svgHeight = 'auto';
	} else if (full === 'height') {
		svgWidth = 'auto';
		svgHeight = '100vh';
	}

	const numWidth = Number(width);
	const numHeight = Number(height);
	const viewBoxX = -margin;
	const viewBoxY = -margin;
	const viewBoxWidth = numWidth + 2 * margin;
	const viewBoxHeight = numHeight + 2 * margin;
</script>

<svg
	width={svgWidth}
	height={svgHeight}
	viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
	preserveAspectRatio="xMidYMid meet"
	style="display: block; max-width: 100%; overflow: visible;"
>
	<slot />
</svg>
