/**
 * Spin Decay Calculator
 * 
 * Models how golf ball spin rate decreases during flight.
 * 
 * Key findings from research (Tutelman, TrackMan):
 * - Spin decays exponentially: ~3.3-4% per second
 * - After 6 seconds (typical driver), spin is ~78-82% of initial
 * - Decay rate is independent of initial spin (percentage-based)
 * 
 * The spin decay affects lift throughout the flight, which in turn
 * affects trajectory shape and carry distance.
 */

// Time constant for spin decay (seconds)
// Decay = e^(-t/T) where T ≈ 30 seconds gives ~3.3% loss per second
const TIME_CONSTANT = 30;

// Decay rate per second (alternative representation)
const DECAY_RATE_PER_SECOND = 0.033;  // 3.3%

/**
 * Calculate spin rate at a given time in flight
 * 
 * Uses exponential decay: spin(t) = spin(0) × e^(-t/T)
 * 
 * @param initialSpin Initial spin rate in RPM
 * @param timeSeconds Time elapsed in seconds
 * @returns Current spin rate in RPM
 */
export function calculateSpinAtTime(
  initialSpin: number,
  timeSeconds: number
): number {
  if (timeSeconds <= 0) {
    return initialSpin;
  }
  
  return initialSpin * Math.exp(-timeSeconds / TIME_CONSTANT);
}

/**
 * Calculate the spin remaining as a fraction of initial
 * 
 * @param timeSeconds Flight time in seconds
 * @returns Fraction of spin remaining (0-1)
 */
export function spinRetentionFraction(timeSeconds: number): number {
  return Math.exp(-timeSeconds / TIME_CONSTANT);
}

/**
 * Calculate average spin during flight
 * 
 * Since spin decays during flight, the average spin is less than
 * the initial spin. This affects average lift during the flight.
 * 
 * For exponential decay: average = initial × (1 - e^(-t/T)) × T / t
 * 
 * @param initialSpin Initial spin rate in RPM
 * @param flightTime Total flight time in seconds
 * @returns Average spin rate during flight in RPM
 */
export function calculateAverageSpin(
  initialSpin: number,
  flightTime: number
): number {
  if (flightTime <= 0) {
    return initialSpin;
  }
  
  // Integral of e^(-t/T) from 0 to flightTime, divided by flightTime
  const retention = spinRetentionFraction(flightTime);
  const averageFactor = TIME_CONSTANT * (1 - retention) / flightTime;
  
  return initialSpin * averageFactor;
}

/**
 * Calculate spin at landing
 * 
 * @param initialSpin Initial spin rate in RPM
 * @param flightTime Total flight time in seconds
 * @returns Spin rate at landing in RPM
 */
export function calculateLandingSpin(
  initialSpin: number,
  flightTime: number
): number {
  return calculateSpinAtTime(initialSpin, flightTime);
}

/**
 * Estimate how spin decay affects distance
 * 
 * Lower average spin during flight = less average lift = slightly shorter carry
 * However, the effect is relatively small because:
 * 1. Most lift benefit occurs early in flight when spin is highest
 * 2. Late flight lift can actually hurt distance (holds ball up too long)
 * 
 * This returns a multiplier to apply to carry distance.
 * 
 * @param initialSpin Initial spin rate in RPM
 * @param flightTime Total flight time in seconds
 * @param optimalSpin The optimal spin for max carry (club-dependent)
 * @returns Distance multiplier (typically 0.98-1.02)
 */
export function spinDecayDistanceEffect(
  initialSpin: number,
  flightTime: number,
  optimalSpin: number = 2500  // Optimal driver spin
): number {
  const landingSpin = calculateLandingSpin(initialSpin, flightTime);
  const avgSpin = calculateAverageSpin(initialSpin, flightTime);
  
  // If initial spin is near optimal, decay helps (reduces excess late lift)
  // If initial spin is below optimal, decay hurts (reduces needed lift)
  const spinRatio = avgSpin / optimalSpin;
  
  // Effect is subtle - typically within ±2%
  if (spinRatio > 1.2) {
    // High spin: decay helps (reduces ballooning)
    return 1 + (spinRatio - 1.2) * 0.02;
  } else if (spinRatio < 0.8) {
    // Low spin: decay hurts (ball drops)
    return 1 - (0.8 - spinRatio) * 0.03;
  }
  
  return 1.0;
}

/**
 * Get spin decay summary for a shot
 */
export interface SpinDecaySummary {
  initialSpin: number;
  landingSpin: number;
  averageSpin: number;
  retentionPercent: number;
  distanceEffect: number;
}

export function getSpinDecaySummary(
  initialSpin: number,
  flightTime: number,
  optimalSpin?: number
): SpinDecaySummary {
  const landingSpin = calculateLandingSpin(initialSpin, flightTime);
  const averageSpin = calculateAverageSpin(initialSpin, flightTime);
  const retention = spinRetentionFraction(flightTime);
  const distEffect = spinDecayDistanceEffect(initialSpin, flightTime, optimalSpin);
  
  return {
    initialSpin,
    landingSpin: Math.round(landingSpin),
    averageSpin: Math.round(averageSpin),
    retentionPercent: Math.round(retention * 100),
    distanceEffect: distEffect,
  };
}
