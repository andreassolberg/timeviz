import { scaleTime } from 'd3-scale';

class Timeline {
	now: Date;
	nowAdjusted: Date;
	from: Date;
	to: Date;
	daywidth: number;
	width: number;
	scale: (date: Date) => number;

	constructor(hoursPast: number, hoursFuture: number, daywidth: number = 200) {
		// Calculate current time
		this.now = new Date();

		// Adjust to nearest hour
		this.nowAdjusted = new Date(this.now);
		this.nowAdjusted.setMinutes(0, 0, 0);
		if (this.now.getMinutes() >= 30) {
			this.nowAdjusted.setHours(this.nowAdjusted.getHours() + 1);
		}

		// Calculate from (hours in the past)
		this.from = new Date(this.nowAdjusted);
		this.from.setHours(this.from.getHours() - hoursPast);

		// Calculate to (hours in the future)
		this.to = new Date(this.nowAdjusted);
		this.to.setHours(this.to.getHours() + hoursFuture);

		// Store daywidth
		this.daywidth = daywidth;

		// Calculate full width in units
		const totalHours = hoursPast + hoursFuture;
		const totalDays = totalHours / 24;
		this.width = totalDays * this.daywidth;

		// Create d3 scale with clamping
		const baseScale = scaleTime()
			.domain([this.from, this.to])
			.range([0, this.width]);

		// Wrap scale to clamp values outside domain
		this.scale = (date: Date) => {
			if (date <= this.from) return 0;
			if (date >= this.to) return this.width;
			return baseScale(date);
		};
	}

	getHourTicks() {
		const ticks: Array<{
			ts: Date;
			tstr: string;
			x: number;
			now: boolean;
		}> = [];

		// Helper function to format time as HH:mm
		const formatTime = (date: Date): string => {
			const hours = date.getHours().toString().padStart(2, '0');
			const minutes = date.getMinutes().toString().padStart(2, '0');
			return `${hours}:${minutes}`;
		};

		// Start from the beginning of the hour at 'from'
		const current = new Date(this.from);
		current.setMinutes(0, 0, 0);

		// Add tick for each hour
		while (current <= this.to) {
			ticks.push({
				ts: new Date(current),
				tstr: formatTime(current),
				x: this.scale(current),
				now: false
			});
			current.setHours(current.getHours() + 1);
		}

		// Add special tick for "now"
		ticks.push({
			ts: new Date(this.now),
			tstr: formatTime(this.now),
			x: this.scale(this.now),
			now: true
		});

		// Sort ticks by timestamp
		ticks.sort((a, b) => a.ts.getTime() - b.ts.getTime());

		return ticks;
	}
}

export default Timeline;
