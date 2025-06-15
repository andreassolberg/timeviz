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
	precipitationAmount?: number; // mm denne timen
	precipitationAmountMax?: number; // maks mm denne timen
	precipitationAmountMin?: number; // min mm denne timen
}

interface FrostObservation {
	time: string;
	temperature: number;
	station: string;
	precipitationAmount?: number; // mm denne timen
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
				uv: entry.data.instant.details.ultraviolet_index_clear_sky
					? Math.round(entry.data.instant.details.ultraviolet_index_clear_sky)
					: undefined,
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

				// Spesialhåndtering: Fjern intervall-data fra siste tidspunkt
				// fordi de representerer data utenfor tidsvinduet
				timeseries = timeseries.map((entry: WeatherObservation) => {
					const entryTime = new Date(entry.time);
					const isLastTimePoint = entryTime.getTime() === timeWindow.to.ts.getTime();

					if (isLastTimePoint) {
						// Behold instant-verdier, fjern intervall-verdier
						return {
							...entry,
							// Fjern intervall-verdier som gjelder utenfor tidsvinduet
							weatherSymbol: undefined,
							precipitationAmount: undefined,
							precipitationAmountMax: undefined,
							precipitationAmountMin: undefined
						};
					}

					return entry;
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

		// Frost API URL for observasjoner - prøver først nærmeste stasjon, deretter fallback
		// SN68860 = Trondheim-Værnes, bra for Trondheim-området
		// Kan også prøve uten source-parameter for å få data fra alle stasjoner i området
		// VIKTIG: Bruker PT1H (ISO 8601 format) ikke P1H for precipitation element
		const url = `https://frost.met.no/observations/v0.jsonld?sources=SN68860&referencetime=${startISO}/${endISO}&elements=air_temperature,sum(precipitation_amount PT1H),ultraviolet_index_clear_sky`;
		
		console.log('Frost API URL:', url);
		console.log('Time range:', { startISO, endISO });

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

			console.log('Frost API response:', {
				totalObservations: data.data?.length || 0,
				firstObservation: data.data?.[0],
				hasData: !!data.data
			});

			if (!data.data || data.data.length === 0) {
				console.warn('No historical data returned from Frost API');
				return [];
			}

			// Behandle data og filtrer basert på timeWindow hvis oppgitt
			let temperatures = data.data.map((observation: FrostApiEntry) => {
				// Frost API kan returnere flere observasjoner per tidspunkt
				const tempObs = observation.observations.find((obs) => obs.elementId === 'air_temperature');
				const precipObs = observation.observations.find(
					(obs) => obs.elementId === 'sum(precipitation_amount PT1H)'
				);
				const uvObs = observation.observations.find(
					(obs) => obs.elementId === 'ultraviolet_index_clear_sky'
				);

				const result = {
					time: observation.referenceTime,
					temperature: tempObs?.value,
					precipitationAmount: precipObs?.value,
					uvIndex: uvObs?.value,
					uv: uvObs?.value ? Math.round(uvObs.value) : undefined,
					station: observation.sourceId
				};

				// Log first few observations for debugging
				if (temperatures.length < 3) {
					console.log('Sample historical observation:', result);
				}

				return result;
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
	 * Optimalisert for å kun kalle riktige API-er basert på tidsvinduets plassering
	 */
	async fetchWeatherDataForTimeWindow(timeWindow: TimeWindow): Promise<TimeTick[]> {
		const ticks: TimeTick[] = [];
		const now = new Date();

		// Analyser tidsvinduets plassering i forhold til nå
		const isCompletelyHistorical = timeWindow.to.ts < now;
		const isCompletelyFuture = timeWindow.from.ts > now;
		const spansCurrentTime = timeWindow.from.ts <= now && timeWindow.to.ts >= now;

		console.log('Time window analysis:', {
			from: timeWindow.from.ts,
			to: timeWindow.to.ts,
			now: now,
			isCompletelyHistorical,
			isCompletelyFuture,
			spansCurrentTime
		});

		try {
			// Hent prognoser KUN hvis tidsvinduet inkluderer fremtidige tidspunkt
			if (isCompletelyFuture || spansCurrentTime) {
				console.log('Fetching forecast data from Locationforecast API...');
				const forecasts = await this.getWeatherForecast(timeWindow);
				const forecastTicks = this.convertForecastsToTimeTicks(forecasts, timeWindow);
				ticks.push(...forecastTicks);
				console.log('Added forecast ticks:', forecastTicks.length);
			} else {
				console.log('Skipping forecast data - time window is completely historical');
			}

			// Hent historiske data KUN hvis Frost klient ID er tilgjengelig OG tidsvinduet inkluderer historiske tidspunkt
			if (this.frostClientId && (isCompletelyHistorical || spansCurrentTime)) {
				console.log('Fetching historical data from Frost API...');
				const historical = await this.getHistoricalTemperature(timeWindow);
				const historicalTicks = this.convertHistoricalToTimeTicks(historical, timeWindow);
				ticks.push(...historicalTicks);
				console.log('Added historical ticks:', historicalTicks.length);
			} else if (!this.frostClientId && isCompletelyHistorical) {
				console.warn('Cannot fetch historical data: Frost client ID is not configured');
			} else {
				console.log('Skipping historical data - time window is completely in the future');
			}

			// Sorter etter tid
			ticks.sort((a, b) => a.ts.getTime() - b.ts.getTime());

			console.log('Total weather data points fetched:', ticks.length);
			const precipitationCount = ticks.filter(t => t.precipitation !== undefined).length;
			console.log('Points with precipitation data:', precipitationCount);

			return ticks;
		} catch (error) {
			console.error('Failed to fetch weather data:', error);
			throw error;
		}
	}

	/**
	 * Konverterer prognosedata til TimeTick format
	 *
	 * VIKTIG TIDSVINDU-SEMANTIKK:
	 * - Instant-verdier (temperatur, UV): inkluder hvis tid >= from && tid <= to
	 * - Intervall-verdier (nedbør, værsymbol): inkluder hvis tid >= from && tid < to
	 *   (fordi de representerer NESTE time som kan gå utenfor tidsvinduet)
	 */
	private convertForecastsToTimeTicks(
		forecasts: WeatherObservation[],
		timeWindow: TimeWindow
	): TimeTick[] {
		return forecasts
			.filter((forecast) => {
				const time = new Date(forecast.time);
				// Inkluder kun tidspunkt som er innenfor vinduet
				// For instant-verdier: <= to (inkluder siste tidspunkt)
				// For intervall-verdier blir dette håndtert senere når vi filtrerer bort
				// precipitationAmount og weatherSymbol for siste tidspunkt
				return time >= timeWindow.from.ts && time <= timeWindow.to.ts;
			})
			.map((forecast) => {
				const time = new Date(forecast.time);
				const isLastTimePoint = time.getTime() === timeWindow.to.ts.getTime();

				return {
					ts: time,
					tstr: this.formatTime(time),
					// Instant-verdier: alltid inkluder
					temperature: forecast.temperature,
					humidity: forecast.humidity,
					windSpeed: forecast.windSpeed,
					uvIndex: forecast.uvIndex,
					uv: forecast.uv,
					// Intervall-verdier: ekskluder på siste tidspunkt (går utenfor vindu)
					weatherSymbol: isLastTimePoint ? undefined : forecast.weatherSymbol,
					precipitation: isLastTimePoint ? undefined : forecast.precipitationAmount,
					precipitationMax: isLastTimePoint ? undefined : forecast.precipitationAmountMax,
					precipitationMin: isLastTimePoint ? undefined : forecast.precipitationAmountMin,
					dataType: 'forecast' as const
				};
			});
	}

	/**
	 * Konverterer historiske data til TimeTick format
	 *
	 * HISTORISKE DATA-SEMANTIKK:
	 * - Temperatur: instant-verdi på tidspunktet (korrekt: <= to)
	 * - Nedbør: sum(precipitation_amount P1H) = den FOREGÅENDE timen (korrekt: <= to)
	 *   (Dette er annerledes enn prognoser som bruker NESTE time)
	 */
	private convertHistoricalToTimeTicks(
		historical: FrostObservation[],
		timeWindow: TimeWindow
	): TimeTick[] {
		const filteredHistorical = historical.filter((obs) => {
			const time = new Date(obs.time);
			// For historiske data er alle verdier knyttet til tidspunktet eller foregående periode
			// så normal filtering er korrekt
			return time >= timeWindow.from.ts && time <= timeWindow.to.ts;
		});

		console.log('Converting historical data to TimeTicks:', {
			totalHistorical: historical.length,
			afterFiltering: filteredHistorical.length,
			withPrecipitation: filteredHistorical.filter(obs => obs.precipitationAmount !== undefined).length
		});

		const ticks = filteredHistorical.map((obs) => {
			const tick = {
				ts: new Date(obs.time),
				tstr: this.formatTime(new Date(obs.time)),
				temperature: obs.temperature,
				precipitation: obs.precipitationAmount, // Foregående time - korrekt å inkludere
				uvIndex: obs.uvIndex,
				uv: obs.uv,
				station: obs.station,
				dataType: 'historical' as const
			};

			// Log first few ticks with precipitation for debugging
			if (tick.precipitation !== undefined && tick.precipitation > 0) {
				console.log('Historical tick with precipitation:', {
					time: tick.tstr,
					temp: tick.temperature,
					precip: tick.precipitation
				});
			}

			return tick;
		});

		return ticks;
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
