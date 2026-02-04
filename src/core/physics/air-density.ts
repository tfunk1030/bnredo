/**
 * Air Density Calculator
 * 
 * Pure physics-based calculation of air density from temperature, pressure, and humidity.
 * This is the SINGLE SOURCE OF TRUTH for environmental effects on ball flight.
 * 
 * Based on the ideal gas law with humidity correction.
 */

// Physical constants
const GAS_CONSTANT_DRY = 287.058;    // J/(kg·K) for dry air
const GAS_CONSTANT_VAPOR = 461.495;  // J/(kg·K) for water vapor

// Magnus formula constants (WMO recommended)
const MAGNUS_A = 6.1121;  // hPa
const MAGNUS_B = 17.502;
const MAGNUS_C = 240.97;  // °C

// Reference conditions (TrackMan standard)
export const REFERENCE_TEMP_F = 77;
export const REFERENCE_PRESSURE_HPA = 1013.25;
export const REFERENCE_HUMIDITY = 50;
export const REFERENCE_DENSITY = 1.177;  // kg/m³ at reference conditions

/**
 * Calculate saturation vapor pressure using Magnus formula
 * @param tempC Temperature in Celsius
 * @returns Saturation vapor pressure in hPa
 */
export function saturationVaporPressure(tempC: number): number {
  return MAGNUS_A * Math.exp((MAGNUS_B * tempC) / (tempC + MAGNUS_C));
}

/**
 * Calculate air density from environmental conditions
 * 
 * IMPORTANT: pressureHPa should be STATION PRESSURE (actual local pressure),
 * not MSL (sea-level adjusted) pressure. Station pressure naturally incorporates
 * altitude effects.
 * 
 * @param tempF Temperature in Fahrenheit
 * @param pressureHPa Pressure in hectopascals (millibars) - MUST be station pressure
 * @param humidity Relative humidity (0-100%)
 * @returns Air density in kg/m³
 */
export function calculateAirDensity(
  tempF: number,
  pressureHPa: number,
  humidity: number
): number {
  // Convert temperature
  const tempC = (tempF - 32) * 5 / 9;
  const tempK = tempC + 273.15;

  // Calculate vapor pressure
  const es = saturationVaporPressure(tempC);
  const e = (humidity / 100) * es;

  // Convert pressures to Pascals
  const vaporPressurePa = e * 100;
  const dryPressurePa = pressureHPa * 100 - vaporPressurePa;

  // Calculate density using ideal gas law
  const dryAirDensity = dryPressurePa / (GAS_CONSTANT_DRY * tempK);
  const vaporDensity = vaporPressurePa / (GAS_CONSTANT_VAPOR * tempK);

  return dryAirDensity + vaporDensity;
}

/**
 * Calculate the environmental factor for distance adjustment
 * 
 * This uses a simple linear model calibrated to match industry benchmarks:
 * - 1% decrease in density → ~0.5% increase in carry distance
 * 
 * @param density Current air density in kg/m³
 * @param sensitivityCoefficient Empirical coefficient (default 0.5)
 * @returns Multiplier for distance (>1 = ball goes farther)
 */
export function calculateEnvironmentalFactor(
  density: number,
  sensitivityCoefficient: number = 0.5
): number {
  const densityRatio = density / REFERENCE_DENSITY;
  return 1 + sensitivityCoefficient * (1 - densityRatio);
}

/**
 * Convenience function to calculate adjusted distance
 * 
 * @param baseDistance The target distance in yards
 * @param tempF Temperature in Fahrenheit
 * @param pressureHPa Station pressure in hPa
 * @param humidity Relative humidity (0-100%)
 * @returns Adjusted distance (what the yardage "plays like")
 */
export function calculateAdjustedDistance(
  baseDistance: number,
  tempF: number,
  pressureHPa: number,
  humidity: number
): number {
  const density = calculateAirDensity(tempF, pressureHPa, humidity);
  const factor = calculateEnvironmentalFactor(density);
  return baseDistance * factor;
}

/**
 * Get the density at reference conditions (for verification)
 */
export function getReferenceDensity(): number {
  return calculateAirDensity(
    REFERENCE_TEMP_F,
    REFERENCE_PRESSURE_HPA,
    REFERENCE_HUMIDITY
  );
}
