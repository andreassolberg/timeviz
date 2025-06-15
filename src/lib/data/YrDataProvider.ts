import type { TimeTick, TimeWindow } from '../types/time';

// ================================================================
// TYPES FOR YR/FROST API DATA
// ================================================================

interface WeatherObservation {
	time: string;
	temperature: number;
	humidity?: number;
	windSpeed?: number;
	uvIndex?: number;
	uv?: number;
	weatherSymbol?: string;
	// TIMEBASERT NEDBØR:
	precipitationAmount?: number;     // mm denne timen
	precipitationAmountMax?: number;  // maks mm denne timen  
	precipitationAmountMin?: number;  // min mm denne timen
}

interface FrostObservation {
	time: string;
	temperature: number;
	station: string;
	precipitationAmount?: number;     // mm denne timen
	uvIndex?: number;
	uv?: number;
}

interface LocationforecastEntry {
	time: string;
	data: {
		instant: {
			details: {
				air_temperature: number;
				relative_humidity: number;
				wind_speed: number;
				ultraviolet_index_clear_sky?: number;
			};
		};
		next_1_hours?: {
			summary?: {
				symbol_code?: string;
			};
			details: {
				precipitation_amount?: number;
				precipitation_amount_max?: number;
				precipitation_amount_min?: number;
			};
		};
	};
}

interface FrostApiEntry {
	referenceTime: string;
	sourceId: string;
	observations: Array<{
		elementId: string;
		value: number;
	}>;
}

/**
 * Data provider for fetching weather data from Yr and Frost APIs
 * Handles both forecast data (free) and historical observations (requires Frost client ID)
 */
export class YrDataProvider {
	private latitude: number;
	private longitude: number;
	private frostClientId?: string;
	private userAgent: string;

	constructor(
		latitude: number,
		longitude: number,
		frostClientId?: string,
		userAgent: string = 'Timeviz/1.0 (github.com/yourproject/timeviz)'
	) {
		this.latitude = latitude;
		this.longitude = longitude;
		this.frostClientId = frostClientId;
		this.userAgent = userAgent;
	}

	// ================================================================
	// LOCATIONFORECAST API - PROGNOSER (GRATIS, INGEN REGISTRERING)
	// ================================================================

	/**
	 * Henter væprognose fra MET Norway Locationforecast API
	 * Gir prognoser for de neste 9 dagene, inkludert temperatur per time
	 * @param timeWindow - Optional time window to filter data, if not provided returns all data
	 */
	async getWeatherForecast(timeWindow?: TimeWindow): Promise<WeatherObservation[]> {
		const url = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${this.latitude}&lon=${this.longitude}`;

		try {
			const response = await fetch(url, {
				headers: {
					'User-Agent': this.userAgent
				}
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			// Ekstraherer alle værdata inkludert nedbør (opptil 9 dager)
			let timeseries = data.properties.timeseries.map((entry: LocationforecastEntry) => ({
				time: entry.time,
				temperature: entry.data.instant.details.air_temperature,
				humidity: entry.data.instant.details.relative_humidity,
				windSpeed: entry.data.instant.details.wind_speed,
				uvIndex: entry.data.instant.details.ultraviolet_index_clear_sky,
				uv: entry.data.instant.details.ultraviolet_index_clear_sky ? Math.round(entry.data.instant.details.ultraviolet_index_clear_sky) : undefined,
				weatherSymbol: entry.data.next_1_hours?.summary?.symbol_code,
				// TIMEBASERT NEDBØR FRA next_1_hours:
				precipitationAmount: entry.data.next_1_hours?.details?.precipitation_amount,
				precipitationAmountMax: entry.data.next_1_hours?.details?.precipitation_amount_max,
				precipitationAmountMin: entry.data.next_1_hours?.details?.precipitation_amount_min
			}));


			// Filter basert på tidsvindu hvis oppgitt
			if (timeWindow) {
				timeseries = timeseries.filter((entry: WeatherObservation) => {
					const entryTime = new Date(entry.time);
					return entryTime >= timeWindow.from.ts && entryTime <= timeWindow.to.ts;
				});
			}

			return timeseries;
		} catch (error) {
			console.error('Feil ved henting av værprognose:', error);
			throw error;
		}
	}

	// ================================================================
	// FROST API - HISTORISKE OBSERVASJONER (KREVER REGISTRERING)
	// ================================================================

	/**
	 * Henter historiske temperaturobservasjoner fra Frost API
	 * Krever registrering på frost.met.no for å få klient-ID
	 * @param timeWindow - Optional time window to filter data, if not provided uses last 24 hours
	 */
	async getHistoricalTemperature(timeWindow?: TimeWindow): Promise<FrostObservation[]> {
		if (!this.frostClientId) {
			throw new Error('Frost client ID is required for historical data');
		}

		// Beregn tidsperiode basert på timeWindow eller fallback til siste 24 timer
		let startTime: Date;
		let endTime: Date;

		if (timeWindow) {
			// Bruk timeWindow, men begrens til historiske data (frem til nå)
			startTime = new Date(timeWindow.from.ts);
			endTime = new Date(Math.min(timeWindow.to.ts.getTime(), Date.now()));
		} else {
			// Fallback: siste 24 timer
			endTime = new Date();
			startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
		}

		const startISO = startTime.toISOString();
		const endISO = endTime.toISOString();

		// Frost API URL for observasjoner - bruker nærmeste stasjon
		const url = `https://frost.met.no/observations/v0.jsonld?sources=SN68860&referencetime=${startISO}/${endISO}&elements=air_temperature,sum(precipitation_amount P1H),ultraviolet_index_clear_sky`;

		try {
			const response = await fetch(url, {
				headers: {
					Authorization: `Basic ${btoa(this.frostClientId + ':')}`
				}
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			// Behandle data og filtrer basert på timeWindow hvis oppgitt
			let temperatures = data.data.map((observation: FrostApiEntry) => {
				// Frost API kan returnere flere observasjoner per tidspunkt
				const tempObs = observation.observations.find(obs => obs.elementId === 'air_temperature');
				const precipObs = observation.observations.find(obs => obs.elementId === 'sum(precipitation_amount P1H)');
				const uvObs = observation.observations.find(obs => obs.elementId === 'ultraviolet_index_clear_sky');
				
				return {
					time: observation.referenceTime,
					temperature: tempObs?.value,
					precipitationAmount: precipObs?.value,
					uvIndex: uvObs?.value,
					uv: uvObs?.value ? Math.round(uvObs.value) : undefined,
					station: observation.sourceId
				};
			});

			// Ekstra filtrering hvis timeWindow er oppgitt (for å være sikker)
			if (timeWindow) {
				temperatures = temperatures.filter((obs: FrostObservation) => {
					const obsTime = new Date(obs.time);
					return obsTime >= timeWindow.from.ts && obsTime <= timeWindow.to.ts;
				});
			}

			return temperatures;
		} catch (error) {
			console.error('Feil ved henting av historiske data:', error);
			throw error;
		}
	}

	// ================================================================
	// TIMELINE INTEGRATION METHODS
	// ================================================================

	/**
	 * Henter værdata for et gitt tidsvindu og konverterer til TimeTick format
	 */
	async fetchWeatherDataForTimeWindow(timeWindow: TimeWindow): Promise<TimeTick[]> {
		const ticks: TimeTick[] = [];

		try {
			// Hent prognoser - sender med timeWindow for optimal filtrering
			const forecasts = await this.getWeatherForecast(timeWindow);
			const forecastTicks = this.convertForecastsToTimeTicks(forecasts, timeWindow);
			ticks.push(...forecastTicks);

			// Hent historiske data hvis Frost klient ID er tilgjengelig
			if (this.frostClientId) {
				const historical = await this.getHistoricalTemperature(timeWindow);
				const historicalTicks = this.convertHistoricalToTimeTicks(historical, timeWindow);
				ticks.push(...historicalTicks);
			}

			// Sorter etter tid
			ticks.sort((a, b) => a.ts.getTime() - b.ts.getTime());

			return ticks;
		} catch (error) {
			console.error('Failed to fetch weather data:', error);
			throw error;
		}
	}

	/**
	 * Konverterer prognosedata til TimeTick format
	 */
	private convertForecastsToTimeTicks(
		forecasts: WeatherObservation[],
		timeWindow: TimeWindow
	): TimeTick[] {
		return forecasts
			.filter((forecast) => {
				const time = new Date(forecast.time);
				return time >= timeWindow.from.ts && time <= timeWindow.to.ts;
			})
			.map((forecast) => ({
				ts: new Date(forecast.time),
				tstr: this.formatTime(new Date(forecast.time)),
				temperature: forecast.temperature,
				humidity: forecast.humidity,
				windSpeed: forecast.windSpeed,
				uvIndex: forecast.uvIndex,
				uv: forecast.uv,
				weatherSymbol: forecast.weatherSymbol,
				precipitation: forecast.precipitationAmount,
				precipitationMax: forecast.precipitationAmountMax,
				precipitationMin: forecast.precipitationAmountMin,
				dataType: 'forecast'
			}));
	}

	/**
	 * Konverterer historiske data til TimeTick format
	 */
	private convertHistoricalToTimeTicks(
		historical: FrostObservation[],
		timeWindow: TimeWindow
	): TimeTick[] {
		return historical
			.filter((obs) => {
				const time = new Date(obs.time);
				return time >= timeWindow.from.ts && time <= timeWindow.to.ts;
			})
			.map((obs) => ({
				ts: new Date(obs.time),
				tstr: this.formatTime(new Date(obs.time)),
				temperature: obs.temperature,
				precipitation: obs.precipitationAmount,
				uvIndex: obs.uvIndex,
				uv: obs.uv,
				station: obs.station,
				dataType: 'historical'
			}));
	}

	/**
	 * Format timestamp for display
	 */
	private formatTime(date: Date): string {
		return date.toLocaleTimeString('no-NO', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}
}
