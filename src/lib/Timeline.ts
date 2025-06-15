import { scaleTime } from 'd3-scale';
import type { TimeTick, TimeWindow } from './types/time';

class Timeline {
	now: Date;
	nowAdjusted: Date;
	from: Date;
	to: Date;
	daywidth: number;
	width: number;
	scale: (date: Date) => number;
	isFixedTime: boolean;

	constructor(hoursPast: number, hoursFuture: number, daywidth: number = 240, fixedNow?: string) {
		// Calculate current time - use fixedNow if provided, otherwise use actual current time
		if (fixedNow) {
			const parsedDate = new Date(fixedNow);
			if (isNaN(parsedDate.getTime())) {
				throw new Error(`Invalid fixedNow timestamp: ${fixedNow}`);
			}
			this.now = parsedDate;
			this.isFixedTime = true;
			console.log(`Timeline: Using fixed timestamp: ${this.now.toISOString()}`);
		} else {
			this.now = new Date();
			this.isFixedTime = false;
		}

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
		const baseScale = scaleTime().domain([this.from, this.to]).range([0, this.width]);

		// Wrap scale to clamp values outside domain
		this.scale = (date: Date) => {
			if (date <= this.from) return 0;
			if (date >= this.to) return this.width;
			return baseScale(date);
		};
	}

	getHourTicks(hours: number[] = [7, 12, 17, 23]): TimeTick[] {
		const ticks: TimeTick[] = [];

		// Helper function to format time as HH or HH:mm
		const formatTime = (date: Date, includeMinutes: boolean = false): string => {
			const hours = date.getHours().toString().padStart(2, '0');
			if (includeMinutes) {
				const minutes = date.getMinutes().toString().padStart(2, '0');
				return `${hours}:${minutes}`;
			}
			return `${hours}`;
		};

		// Start from the beginning of the timeline
		const startDate = new Date(this.from);
		startDate.setHours(0, 0, 0, 0);

		// Process each day in the timeline
		const currentDay = new Date(startDate);
		const twoHoursMs = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

		while (currentDay <= this.to) {
			// For each day, create ticks for each specified hour
			for (const hour of hours) {
				const tickTime = new Date(currentDay);
				tickTime.setHours(hour, 0, 0, 0);

				// Calculate time difference from now
				const timeDiffFromNow = Math.abs(tickTime.getTime() - this.now.getTime());

				// Only add tick if it's within the timeline window and not within 2 hours of now
				if (tickTime >= this.from && tickTime <= this.to && timeDiffFromNow >= twoHoursMs) {
					ticks.push({
						ts: new Date(tickTime),
						tstr: formatTime(tickTime),
						x: this.scale(tickTime),
						now: false
					});
				}
			}

			// Move to next day
			currentDay.setDate(currentDay.getDate() + 1);
		}

		// Add special tick for "now"
		ticks.push({
			ts: new Date(this.now),
			tstr: formatTime(this.now, true),
			x: this.scale(this.now),
			now: true
		});

		// Sort ticks by timestamp
		// ticks.sort((a, b) => a.ts.getTime() - b.ts.getTime());

		return ticks;
	}

	/**
	 * Get the time window represented by this timeline
	 */
	getTimeWindow(): TimeWindow {
		return {
			from: {
				ts: new Date(this.from),
				tstr: this.formatDateTime(this.from)
			},
			to: {
				ts: new Date(this.to),
				tstr: this.formatDateTime(this.to)
			}
		};
	}

	/**
	 * Format a date as a readable date-time string
	 */
	private formatDateTime(date: Date): string {
		return date.toLocaleString('no-NO', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	/**
	 * Get day label ticks for all 13:00 (1 PM) slots within the time window
	 * Returns TimeTick array with pretty formatted day labels
	 */
	getDayLabelTicks(): TimeTick[] {
		const ticks: TimeTick[] = [];

		// Start from the first 1 PM at or after 'from'
		const current = new Date(this.from);
		current.setHours(13, 0, 0, 0);

		// If we're before the window start, move to next day
		if (current < this.from) {
			current.setDate(current.getDate() + 1);
		}

		// Helper function to determine text alignment and adjusted timestamp based on position
		const getAlignmentAndTimestamp = (
			tickDate: Date
		): { align: 'start' | 'middle' | 'end'; adjustedTs: Date } => {
			const hoursFromStart = (tickDate.getTime() - this.from.getTime()) / (1000 * 60 * 60);
			const hoursFromEnd = (this.to.getTime() - tickDate.getTime()) / (1000 * 60 * 60);

			if (hoursFromStart < 5) {
				return { align: 'start', adjustedTs: new Date(this.from) };
			}
			if (hoursFromEnd < 5) {
				return { align: 'end', adjustedTs: new Date(this.to) };
			}
			return { align: 'middle', adjustedTs: new Date(tickDate) };
		};

		// Format function for day labels
		const formatDayLabel = (date: Date): string => {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			const yesterday = new Date(today);
			yesterday.setDate(yesterday.getDate() - 1);

			const tickDate = new Date(date);
			tickDate.setHours(0, 0, 0, 0);

			// Check for relative days
			if (tickDate.getTime() === today.getTime()) {
				return 'I dag';
			} else if (tickDate.getTime() === tomorrow.getTime()) {
				return 'I morgen';
			} else if (tickDate.getTime() === yesterday.getTime()) {
				return 'I går';
			}

			// Otherwise use weekday and date
			return date.toLocaleDateString('no-NO', {
				weekday: 'short',
				month: 'short',
				day: 'numeric'
			});
		};

		// Add tick for each 1 PM within the window
		while (current <= this.to) {
			const tickDate = new Date(current);
			const { align, adjustedTs } = getAlignmentAndTimestamp(tickDate);

			ticks.push({
				ts: adjustedTs,
				tstr: '13:00',
				x: this.scale(adjustedTs),
				label: formatDayLabel(current),
				align: align
			});
			current.setDate(current.getDate() + 1);
		}

		return ticks;
	}

	/**
	 * Add x coordinate to a TimeTick based on its timestamp
	 * Returns a new TimeTick object with x property set
	 */
	addXToTimeTick(tick: TimeTick): TimeTick {
		return {
			...tick,
			x: this.scale(tick.ts)
		};
	}

	/**
	 * Add x coordinates to a TimeWindow's from and to ticks
	 * Returns a new TimeWindow object with x properties set on both ticks
	 */
	addXToTimeWindow(window: TimeWindow): TimeWindow {
		return {
			...window,
			from: this.addXToTimeTick(window.from),
			to: this.addXToTimeTick(window.to)
		};
	}

	/**
	 * Get the X coordinate for the current time ("now")
	 * @returns The x-coordinate for the current timestamp
	 */
	getNowX(): number {
		return this.scale(this.now);
	}

	/**
	 * Get the width of one hour in pixels
	 * @returns The width in pixels that represents one hour on the timeline
	 */
	getHourWidth(): number {
		// Calculate width by getting x-coordinates for two consecutive hours
		const now = new Date();
		const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

		return this.scale(oneHourLater) - this.scale(now);
	}

	/**
	 * Get day and night markers for the timeline
	 * @param dayStartHour - Hour when day starts (e.g., 7)
	 * @param nightStartHour - Hour when night starts (e.g., 23)
	 * @returns Array of TimeWindow objects with day property
	 */
	getDayNightMarkers(dayStartHour: number = 7, nightStartHour: number = 23): TimeWindow[] {
		const markers: TimeWindow[] = [];

		// Start from the beginning of the timeline
		const current = new Date(this.from);
		current.setMinutes(0, 0, 0);

		// Process the entire timeline
		while (current < this.to) {
			const currentHour = current.getHours();

			// Determine if we're starting in day or night
			const isDay = currentHour >= dayStartHour && currentHour < nightStartHour;

			// Find the end of this period
			const periodEnd = new Date(current);
			if (isDay) {
				// Day period - ends at nightStartHour
				periodEnd.setHours(nightStartHour, 0, 0, 0);
				// If nightStartHour has already passed today, it's tomorrow
				if (periodEnd <= current) {
					periodEnd.setDate(periodEnd.getDate() + 1);
				}
			} else {
				// Night period - ends at dayStartHour
				periodEnd.setHours(dayStartHour, 0, 0, 0);
				// If we're past midnight and before dayStartHour, it's today
				// Otherwise it's tomorrow
				if (currentHour >= nightStartHour || periodEnd <= current) {
					periodEnd.setDate(periodEnd.getDate() + 1);
				}
			}

			// Cap the period end at timeline end
			const actualEnd = periodEnd > this.to ? new Date(this.to) : periodEnd;

			// Create the time window
			const window: TimeWindow = {
				from: {
					ts: new Date(current),
					tstr: this.formatDateTime(current),
					x: this.scale(current)
				},
				to: {
					ts: new Date(actualEnd),
					tstr: this.formatDateTime(actualEnd),
					x: this.scale(actualEnd)
				},
				day: isDay
			};

			markers.push(window);

			// Move to the next period
			current.setTime(periodEnd.getTime());
		}

		return markers;
	}
}

export default Timeline;
