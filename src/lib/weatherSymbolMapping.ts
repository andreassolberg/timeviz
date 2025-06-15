/**
 * Mapping between MET Norway API symbol codes and Yr weather icon filenames
 * Based on documentation from https://nrkno.github.io/yr-weather-symbols/
 * and MET Norway API documentation
 */

export const symbolCodes: Record<string, string> = {
  // Clear sky
  clearsky_day: '01d',
  clearsky_night: '01n',
  clearsky_polartwilight: '01m',

  // Fair
  fair_day: '02d',
  fair_night: '02n',
  fair_polartwilight: '02m',

  // Partly cloudy
  partlycloudy_day: '03d',
  partlycloudy_night: '03n',
  partlycloudy_polartwilight: '03m',

  // Cloudy
  cloudy: '04',

  // Rain showers
  rainshowers_day: '05d',
  rainshowers_night: '05n',
  rainshowers_polartwilight: '05m',

  // Rain showers and thunder
  rainshowersandthunder_day: '06d',
  rainshowersandthunder_night: '06n',
  rainshowersandthunder_polartwilight: '06m',

  // Sleet showers
  sleetshowers_day: '07d',
  sleetshowers_night: '07n',
  sleetshowers_polartwilight: '07m',

  // Snow showers
  snowshowers_day: '08d',
  snowshowers_night: '08n',
  snowshowers_polartwilight: '08m',

  // Rain
  rain: '09',

  // Heavy rain
  heavyrain: '10',

  // Heavy rain and thunder
  heavyrainandthunder: '11',

  // Sleet
  sleet: '12',

  // Snow
  snow: '13',

  // Snow and thunder
  snowandthunder: '14',

  // Fog
  fog: '15',

  // Sleet showers and thunder
  sleetshowersandthunder_day: '20d',
  sleetshowersandthunder_night: '20n',
  sleetshowersandthunder_polartwilight: '20m',

  // Snow showers and thunder
  snowshowersandthunder_day: '21d',
  snowshowersandthunder_night: '21n',
  snowshowersandthunder_polartwilight: '21m',

  // Rain and thunder
  rainandthunder: '22',

  // Sleet and thunder
  sleetandthunder: '23',

  // Light rain showers and thunder
  lightrainshowersandthunder_day: '24d',
  lightrainshowersandthunder_night: '24n',
  lightrainshowersandthunder_polartwilight: '24m',

  // Heavy rain showers and thunder
  heavyrainshowersandthunder_day: '25d',
  heavyrainshowersandthunder_night: '25n',
  heavyrainshowersandthunder_polartwilight: '25m',

  // Light sleet showers and thunder
  lightsleetshowersandthunder_day: '26d',
  lightsleetshowersandthunder_night: '26n',
  lightsleetshowersandthunder_polartwilight: '26m',

  // Heavy sleet showers and thunder
  heavysleetshowersandthunder_day: '27d',
  heavysleetshowersandthunder_night: '27n',
  heavysleetshowersandthunder_polartwilight: '27m',

  // Light snow showers and thunder
  lightsnowshowersandthunder_day: '28d',
  lightsnowshowersandthunder_night: '28n',
  lightsnowshowersandthunder_polartwilight: '28m',

  // Heavy snow showers and thunder
  heavysnowshowersandthunder_day: '29d',
  heavysnowshowersandthunder_night: '29n',
  heavysnowshowersandthunder_polartwilight: '29m',

  // Light rain and thunder
  lightrainandthunder: '30',

  // Light sleet and thunder
  lightsleetandthunder: '31',

  // Heavy sleet and thunder
  heavysleetandthunder: '32',

  // Light snow and thunder
  lightsnowandthunder: '33',

  // Heavy snow and thunder
  heavysnowandthunder: '34',

  // Light rain showers
  lightrainshowers_day: '40d',
  lightrainshowers_night: '40n',
  lightrainshowers_polartwilight: '40m',

  // Heavy rain showers
  heavyrainshowers_day: '41d',
  heavyrainshowers_night: '41n',
  heavyrainshowers_polartwilight: '41m',

  // Light sleet showers
  lightsleetshowers_day: '42d',
  lightsleetshowers_night: '42n',
  lightsleetshowers_polartwilight: '42m',

  // Heavy sleet showers
  heavysleetshowers_day: '43d',
  heavysleetshowers_night: '43n',
  heavysleetshowers_polartwilight: '43m',

  // Light snow showers
  lightsnowshowers_day: '44d',
  lightsnowshowers_night: '44n',
  lightsnowshowers_polartwilight: '44m',

  // Heavy snow showers
  heavysnowshowers_day: '45d',
  heavysnowshowers_night: '45n',
  heavysnowshowers_polartwilight: '45m',

  // Light rain
  lightrain: '46',

  // Light sleet
  lightsleet: '47',

  // Heavy sleet
  heavysleet: '48',

  // Light snow
  lightsnow: '49',

  // Heavy snow
  heavysnow: '50'
};

/**
 * Get the icon filename for a given symbol code
 * @param symbolCode - The symbol code from MET API (e.g., "clearsky_day" or "01d")
 * @returns The corresponding icon filename (e.g., "01d")
 */
export function getIconFilename(symbolCode: string): string {
  // If it's already a numeric code, return as-is
  if (/^\d{2}[dnm]?$/.test(symbolCode)) {
    return symbolCode;
  }

  // Otherwise, map from descriptive code to numeric code
  return symbolCodes[symbolCode] || symbolCode;
}