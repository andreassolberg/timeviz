<script>
	import SVGViz from '$lib/components/SVGViz.svelte';
	import Timeline from '$lib/Timeline';

	// Create timeline for 2 days past and 2 days future
	const timeline = new Timeline(48, 48);
	const hourTicks = timeline.getHourTicks();
	const dayLabelTicks = timeline.getDayLabelTicks();
</script>

<SVGViz width={timeline.width} height={400} full="width" margin={10}>
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
			y2={200}
			stroke={tick.now ? 'red' : '#eee'}
			stroke-width={1}
		/>
	{/each}
</SVGViz>
