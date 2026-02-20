/**
 * Physics Module Index
 * 
 * Golf ball flight physics calculations.
 * All modules are validated against TrackMan and research data.
 * 
 * Usage:
 * ```typescript
 * import { 
 *   calculateAirDensity, 
 *   calculateEnvironmentalFactor,
 *   calculateWindEffects,
 *   getSpinDecaySummary 
 * } from '@/src/core/physics';
 * ```
 */

// Air Density (environmental effects)
export {
  calculateAirDensity,
  calculateEnvironmentalFactor,
  calculateAdjustedDistance,
  getReferenceDensity,
  saturationVaporPressure,
  REFERENCE_DENSITY,
  REFERENCE_TEMP_F,
  REFERENCE_PRESSURE_HPA,
  REFERENCE_HUMIDITY,
} from './air-density';

// Wind Effects
export {
  calculateWindGradient,
  estimateFlightTime,
  calculateHeadTailEffect,
  calculateCrosswindEffect,
  calculateWindEffects,
  getPlaysLikeDistance,
} from './wind-effects';
export type {
  WindConditions,
  FlightParams,
  WindEffects,
} from './wind-effects';

// Spin Decay
export {
  calculateSpinAtTime,
  spinRetentionFraction,
  calculateAverageSpin,
  calculateLandingSpin,
  spinDecayDistanceEffect,
  getSpinDecaySummary,
} from './spin-decay';
export type { SpinDecaySummary } from './spin-decay';
