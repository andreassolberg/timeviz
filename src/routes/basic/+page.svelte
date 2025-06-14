<script>
	import SVGViz from '$lib/components/SVGViz.svelte';
	import Timeline from '$lib/Timeline';

	// Create timeline for 2 days past and 2 days future
	const timeline = new Timeline(48, 48);
	const hourTicks = timeline.getHourTicks();
</script>

<SVGViz width={timeline.width} height={400} full="width" margin={10}>
	<!-- Hour tick lines -->
	{#each hourTicks as tick}
		<text
			x={tick.x}
			y={30}
			font-size={6}
			text-anchor="middle"
			fill="#333"
			alignment-baseline="middle"
			dominant-baseline="central">{tick.tstr}</text
		>
		<line
			x1={tick.x}
			y1={100}
			x2={tick.x}
			y2={200}
			stroke={tick.now ? 'red' : '#eee'}
			stroke-width={tick.now ? '2' : '1'}
		/>
	{/each}
</SVGViz>
