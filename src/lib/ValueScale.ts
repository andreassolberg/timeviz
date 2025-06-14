import { scaleLinear, type ScaleLinear } from 'd3-scale';

/**
 * ValueScale class - A simple wrapper around d3 linear scale for mapping values to y-coordinates
 *
 * @example
 * const tempScale = new ValueScale(-10, 30, 200); // -10°C to 30°C mapped to height of 200px
 * const yPos = tempScale.scale(20); // Get y position for 20°C
 */
export class ValueScale {
	private linearScale: ScaleLinear<number, number>;

	/**
	 * Creates a new ValueScale instance
	 *
	 * @param minValue - Minimum input value (e.g., -10 for temperature)
	 * @param maxValue - Maximum input value (e.g., 30 for temperature)
	 * @param height - Height of the scale area in pixels
	 */
	constructor(minValue: number, maxValue: number, height: number) {
		// Create d3 linear scale
		// Y coordinates: 0 is at top, height is at bottom
		// maxValue -> 0 (top)
		// minValue -> height (bottom)
		this.linearScale = scaleLinear().domain([minValue, maxValue]).range([height, 0]).clamp(true); // Clamp values outside domain
	}

	/**
	 * Scale a value to its corresponding y-coordinate
	 *
	 * @param value - The input value to scale
	 * @returns The y-coordinate for the given value (0 = top, height = bottom)
	 */
	scale(value: number): number {
		return parseFloat(this.linearScale(value).toFixed(2));
	}

	/**
	 * Get row markers for grid lines or axis labels
	 * Calculates optimal step size by choosing the one with fewest lines but at least 1
	 *
	 * @returns Array of objects with y-coordinate and value for each marker
	 */
	getRowMarkers(): Array<{ y: number; value: number }> {
		const domain = this.linearScale.domain();
		const minValue = domain[0];
		const maxValue = domain[1];

		// Calculate number of lines for each step size
		const stepSizes = [10, 5, 1];
		const lineCounts = stepSizes.map(step => {
			const firstValue = Math.ceil(minValue / step) * step;
			const lastValue = Math.floor(maxValue / step) * step;
			return Math.max(0, Math.floor((lastValue - firstValue) / step) + 1);
		});

		// Choose step size with fewest lines but at least 1
		let chosenStep = 1;
		for (let i = 0; i < stepSizes.length; i++) {
			if (lineCounts[i] >= 1) {
				chosenStep = stepSizes[i];
				break;
			}
		}

		const markers: Array<{ y: number; value: number }> = [];

		// Find the first marker value (round up to nearest step)
		const firstValue = Math.ceil(minValue / chosenStep) * chosenStep;

		// Generate markers from first value to max value
		for (let value = firstValue; value <= maxValue; value += chosenStep) {
			markers.push({
				y: this.scale(value),
				value: value
			});
		}

		return markers;
	}
}

export default ValueScale;
