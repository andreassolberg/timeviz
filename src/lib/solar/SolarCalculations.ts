/**
 * Solar position calculations for sun altitude visualization
 * Based on astronomical formulas for solar position
 */

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
	return degrees * Math.PI / 180;
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
	return radians * 180 / Math.PI;
}

/**
 * Get day of year (1-365/366) for a given date
 */
function getDayOfYear(date: Date): number {
	const start = new Date(date.getFullYear(), 0, 0);
	const diff = date.getTime() - start.getTime();
	return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calculate solar declination for a given date
 * δ = 23.45° × sin(360° × (284 + n) / 365)
 * @param date - The date to calculate declination for
 * @returns Solar declination in degrees
 */
export function getSolarDeclination(date: Date): number {
	const dayOfYear = getDayOfYear(date);
	const declination = 23.45 * Math.sin(toRadians(360 * (284 + dayOfYear) / 365));
	return declination;
}

/**
 * Calculate equation of time for orbital corrections
 * Simplified approximation
 * @param date - The date to calculate for
 * @returns Equation of time in minutes
 */
export function getEquationOfTime(date: Date): number {
	const dayOfYear = getDayOfYear(date);
	const b = toRadians(360 * (dayOfYear - 81) / 365);
	
	// Simplified equation of time calculation
	const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
	return eot; // in minutes
}

/**
 * Calculate solar altitude angle
 * sin(altitude) = sin(lat) × sin(declination) + cos(lat) × cos(declination) × cos(hourAngle)
 * @param latitude - Observer latitude in degrees
 * @param declination - Solar declination in degrees
 * @param hourAngle - Hour angle in degrees
 * @returns Solar altitude in degrees
 */
export function getSolarAltitude(latitude: number, declination: number, hourAngle: number): number {
	const latRad = toRadians(latitude);
	const decRad = toRadians(declination);
	const hourRad = toRadians(hourAngle);
	
	const altitudeRad = Math.asin(
		Math.sin(latRad) * Math.sin(decRad) + 
		Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourRad)
	);
	
	return toDegrees(altitudeRad);
}

/**
 * Calculate hour angle from solar time
 * Hour angle = 15° × (solar time - 12)
 * @param solarTime - Solar time in hours (0-24)
 * @returns Hour angle in degrees
 */
export function getHourAngle(solarTime: number): number {
	return 15 * (solarTime - 12);
}

/**
 * Convert local time to solar time
 * @param localTime - Local time as Date object
 * @param longitude - Observer longitude in degrees
 * @param timezoneOffset - Timezone offset in hours from UTC
 * @returns Solar time in hours
 */
export function getSolarTime(localTime: Date, longitude: number, timezoneOffset: number): number {
	const equationOfTime = getEquationOfTime(localTime);
	const longitudeCorrection = (longitude - 15 * timezoneOffset) / 15;
	
	const hours = localTime.getHours();
	const minutes = localTime.getMinutes();
	const localTimeInHours = hours + minutes / 60;
	
	// Apply corrections
	const solarTime = localTimeInHours + longitudeCorrection + equationOfTime / 60;
	
	return solarTime;
}

/**
 * Calculate sunrise and sunset times
 * @param date - The date to calculate for
 * @param latitude - Observer latitude in degrees
 * @param longitude - Observer longitude in degrees
 * @param timezoneOffset - Timezone offset in hours from UTC
 * @returns Object with sunrise and sunset times as Date objects
 */
export function getSunriseSunset(date: Date, latitude: number, longitude: number, timezoneOffset: number): {
	sunrise: Date | null;
	sunset: Date | null;
} {
	const declination = getSolarDeclination(date);
	const latRad = toRadians(latitude);
	const decRad = toRadians(declination);
	
	// Calculate hour angle at sunrise/sunset (when altitude = 0)
	const cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);
	
	// Check for polar day/night
	if (cosHourAngle > 1) {
		// Polar night - sun never rises
		return { sunrise: null, sunset: null };
	}
	if (cosHourAngle < -1) {
		// Polar day - sun never sets
		return { sunrise: null, sunset: null };
	}
	
	const hourAngle = toDegrees(Math.acos(cosHourAngle));
	
	// Calculate solar times
	const sunriseSolarTime = 12 - hourAngle / 15;
	const sunsetSolarTime = 12 + hourAngle / 15;
	
	// Convert to local time
	const equationOfTime = getEquationOfTime(date);
	const longitudeCorrection = (longitude - 15 * timezoneOffset) / 15;
	
	const sunriseLocal = sunriseSolarTime - longitudeCorrection - equationOfTime / 60;
	const sunsetLocal = sunsetSolarTime - longitudeCorrection - equationOfTime / 60;
	
	// Create Date objects
	const sunrise = new Date(date);
	sunrise.setHours(Math.floor(sunriseLocal), Math.round((sunriseLocal % 1) * 60), 0, 0);
	
	const sunset = new Date(date);
	sunset.setHours(Math.floor(sunsetLocal), Math.round((sunsetLocal % 1) * 60), 0, 0);
	
	return { sunrise, sunset };
}

/**
 * Calculate sun altitude for a specific time and location
 * @param time - The time to calculate altitude for
 * @param latitude - Observer latitude in degrees
 * @param longitude - Observer longitude in degrees
 * @param timezoneOffset - Timezone offset in hours from UTC
 * @returns Solar altitude in degrees
 */
export function getSunAltitudeAtTime(time: Date, latitude: number, longitude: number, timezoneOffset: number): number {
	const declination = getSolarDeclination(time);
	const solarTime = getSolarTime(time, longitude, timezoneOffset);
	const hourAngle = getHourAngle(solarTime);
	
	return getSolarAltitude(latitude, declination, hourAngle);
}