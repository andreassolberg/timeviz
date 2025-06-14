<script lang="ts">
	interface Props {
		width: number | string;
		height: number | string;
		full?: 'width' | 'height' | null;
	}

	let { width, height, full = null }: Props = $props();

	let svgWidth = width;
	let svgHeight = height;
	
	if (full === 'width') {
		svgWidth = '100vw';
		svgHeight = 'auto';
	} else if (full === 'height') {
		svgWidth = 'auto';
		svgHeight = '100vh';
	}
</script>

<svg 
	width={svgWidth} 
	height={svgHeight} 
	viewBox={`0 0 ${width} ${height}`}
	preserveAspectRatio="xMidYMid meet"
>
	<slot />
</svg>