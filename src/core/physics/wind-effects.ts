/**
 * Wind Effects Calculator
 * 
 * Physics-based wind effect calculation for golf shots.
 * 
 * Key principles:
 * 1. Drag and lift are proportional to airspeed² (square law)
 * 2. Headwind increases apparent airspeed → more drag AND lift (ballooning)
 * 3. Tailwind decreases apparent airspeed → less drag AND lift (ball drops)
 * 4. Headwind hurts ~2× more than tailwind helps (non-linear)
 * 
 * Sources:
 * - TrackMan normalization documentation
 * - Tutelman ball flight physics
 * - Ping/Henrikson wind effect data
 */

export interface WindConditions {
  speed: number;      // Wind speed in mph
  direction: number;  // Degrees (0=from behind/tailwind, 180=headwind, 90/270=crosswind)
}

export interface FlightParams {
  ballSpeed: number;    // mph
  launchAngle: number;  // degrees
  spinRate: number;     // rpm
  maxHeight: number;    // yards (apex height)
  carryDistance: number; // yards (base carry in calm conditions)
}

export interface WindEffects {
  distanceEffect: number;    // Positive = plays shorter (add yards to club)
  lateralEffect: number;     // Positive = ball moves right
  heightEffect: number;      // Multiplier for max height
  landingAngleEffect: number; // Change in landing angle (degrees)
}

// Wind gradient - wind is stronger at height
const WIND_GRADIENT_FACTOR = 0.12;  // ~12% stronger at apex vs ground
const REFERENCE_HEIGHT_FT = 33;      // Weather station reference height

/**
 * Calculate wind gradient factor based on shot apex height
 * Wind speed increases logarithmically with altitude
 */
export function calculateWindGradient(apexHeightYards: number): number {
  const apexHeightFt = apexHeightYards * 3;
  
  // Simplified logarithmic wind profile
  // At reference height (33ft), gradient = 1.0
  // At typical driver apex (105ft), gradient ≈ 1.12
  if (apexHeightFt <= REFERENCE_HEIGHT_FT) {
    return 1.0;
  }
  
  return 1.0 + WIND_GRADIENT_FACTOR * Math.log10(apexHeightFt / REFERENCE_HEIGHT_FT);
}

/**
 * Calculate flight time approximation for wind exposure
 * 
 * This is calibrated to match real-world PGA Tour flight times:
 * - Driver: ~6 seconds hang time
 * - 7-iron: ~5 seconds hang time
 * - Wedge: ~4 seconds hang time
 * 
 * Actual flight time is longer than ideal projectile motion predicts
 * because lift keeps the ball airborne longer.
 */
export function estimateFlightTime(
  ballSpeedMph: number,
  launchAngleDeg: number,
  carryYards: number
): number {
  // Empirical formula calibrated to TrackMan data
  // Flight time scales primarily with carry distance and apex height
  
  // Estimate max height from launch conditions
  // This is approximate - higher launch = higher apex = longer flight
  const launchHeightFactor = Math.sin(launchAngleDeg * Math.PI / 180);
  
  // Base time from distance (roughly linear relationship)
  // A 300y drive takes about 6 seconds, 150y shot about 5 seconds
  const distanceBasedTime = 3.5 + (carryYards / 150);
  
  // Adjustment for launch angle (higher launch = longer flight)
  const launchAdjustment = 1 + (launchAngleDeg - 12) * 0.02;
  
  return distanceBasedTime * Math.max(0.8, launchAdjustment);
}

/**
 * Calculate the asymmetric headwind/tailwind effect
 * 
 * Based on square law physics:
 * - Headwind: apparent_speed = ball_speed + wind → drag ∝ (v+w)²
 * - Tailwind: apparent_speed = ball_speed - wind → drag ∝ (v-w)²
 * 
 * The key insight: (v+w)² - v² > v² - (v-w)² for same w
 * This is why headwind hurts more than tailwind helps.
 * 
 * Additionally, lift effects compound the asymmetry:
 * - Headwind = more lift = ballooning = shorter
 * - Tailwind = less lift = ball drops earlier = shorter than expected
 */
export function calculateHeadTailEffect(
  windComponentMph: number,  // Positive = headwind, negative = tailwind
  ballSpeedMph: number,
  flightTimeSec: number,
  spinRate: number,
  carryYards: number
): number {
  // No wind = no effect
  if (Math.abs(windComponentMph) < 0.1) {
    return 0;
  }
  
  const isHeadwind = windComponentMph > 0;
  const absWind = Math.abs(windComponentMph);
  
  // Base effect: roughly 1 yard per mph for headwind (industry rule of thumb)
  // This is then modified by physics factors
  
  // Square law factor
  // At low wind speeds, effect is roughly linear
  // At high wind speeds, effect increases faster than linear
  const speedRatio = absWind / ballSpeedMph;
  const squareLawMultiplier = 1 + speedRatio * 0.5;  // Increases effect at high wind
  
  // Spin effect: higher spin = more affected by wind (more lift interaction)
  const normalizedSpin = spinRate / 5000;  // Normalize around typical iron spin
  const spinMultiplier = 0.9 + (normalizedSpin * 0.2);  // ±10% based on spin
  
  // Base yards per mph
  let yardsPerMph: number;
  if (isHeadwind) {
    // Headwind: ~1.0 yards per mph for a 7-iron, scaling with distance
    yardsPerMph = 0.85 + (carryYards / 500);  // ~1.0 for 175y, ~1.5 for 300y
  } else {
    // Tailwind helps less - roughly 0.65× as effective at low wind speeds
    // At high speeds (>30mph), tailwind actually starts hurting (ball drops)
    // TrackMan data: 10mph tailwind = -13y for 7-iron, so ~0.75× the headwind effect
    const tailwindEfficiency = Math.max(0.35, 0.75 - absWind * 0.01);
    yardsPerMph = (0.85 + carryYards / 500) * tailwindEfficiency;
  }
  
  // Calculate raw effect
  const rawEffect = absWind * yardsPerMph * squareLawMultiplier * spinMultiplier;
  
  // Headwind = positive effect (plays longer, need more club)
  // Tailwind = negative effect (plays shorter, need less club)
  return isHeadwind ? rawEffect : -rawEffect;
}

/**
 * Calculate crosswind lateral movement
 * 
 * Crosswind pushes the ball sideways. The effect scales with:
 * - Flight time (longer in air = more time to push)
 * - Wind speed
 * - Ball speed (slower balls are more affected)
 */
export function calculateCrosswindEffect(
  crosswindComponentMph: number,  // Positive = wind from left (pushes right)
  flightTimeSec: number,
  ballSpeedMph: number,
  carryYards: number
): number {
  if (Math.abs(crosswindComponentMph) < 0.1) {
    return 0;
  }
  
  // Base effect: approximately 1.35 yards per mph crosswind for mid-iron
  // This is calibrated to TrackMan data: 20mph crosswind ≈ 27 yards lateral
  const baseYardsPerMph = 1.35;
  
  // Adjust for flight time (longer flights = more drift)
  const flightTimeNormalized = flightTimeSec / 6.0;  // 6 sec typical driver flight
  
  // Adjust for ball speed (slower balls drift more)
  const speedFactor = Math.sqrt(140 / ballSpeedMph);  // Normalized to 7-iron speed
  
  // Calculate lateral movement in yards
  const lateralYards = crosswindComponentMph * baseYardsPerMph * 
                       flightTimeNormalized * speedFactor;
  
  return lateralYards;
}

/**
 * Calculate complete wind effects on a golf shot
 * 
 * @param wind Wind conditions (speed and direction)
 * @param flight Flight parameters for the shot
 * @returns Wind effects including distance and lateral adjustments
 */
export function calculateWindEffects(
  wind: WindConditions,
  flight: FlightParams
): WindEffects {
  // No wind = no effects
  if (wind.speed < 0.5) {
    return {
      distanceEffect: 0,
      lateralEffect: 0,
      heightEffect: 1.0,
      landingAngleEffect: 0,
    };
  }
  
  // Calculate wind components
  // Direction: 0° = tailwind (from behind), 180° = headwind, 90° = from right
  const windRad = wind.direction * Math.PI / 180;
  
  // Headwind component (positive = into wind)
  const headwindComponent = wind.speed * Math.cos(windRad + Math.PI);
  
  // Crosswind component (positive = from left, pushes right)
  const crosswindComponent = wind.speed * Math.sin(windRad);
  
  // Apply wind gradient
  const gradient = calculateWindGradient(flight.maxHeight);
  const effectiveHeadwind = headwindComponent * gradient;
  const effectiveCrosswind = crosswindComponent * gradient;
  
  // Estimate flight time
  const flightTime = estimateFlightTime(
    flight.ballSpeed,
    flight.launchAngle,
    flight.carryDistance
  );
  
  // Calculate headwind/tailwind distance effect
  const distanceEffect = calculateHeadTailEffect(
    effectiveHeadwind,
    flight.ballSpeed,
    flightTime,
    flight.spinRate,
    flight.carryDistance
  );
  
  // Calculate crosswind lateral effect
  const lateralEffect = calculateCrosswindEffect(
    effectiveCrosswind,
    flightTime,
    flight.ballSpeed,
    flight.carryDistance
  );
  
  // Height effect: headwind increases apex, tailwind decreases
  // Based on TrackMan data: significant height changes with wind
  const heightEffect = 1.0 + (effectiveHeadwind / flight.ballSpeed) * 0.3;
  
  // Landing angle: headwind steepens, tailwind flattens
  const landingAngleEffect = effectiveHeadwind * 0.15;  // degrees per mph
  
  return {
    distanceEffect,
    lateralEffect,
    heightEffect: Math.max(0.7, Math.min(1.5, heightEffect)),
    landingAngleEffect,
  };
}

/**
 * Convenience function to get "plays like" distance
 * 
 * @param targetDistance The actual distance to the target
 * @param wind Wind conditions
 * @param flight Flight parameters
 * @returns What distance the shot "plays like" (for club selection)
 */
export function getPlaysLikeDistance(
  targetDistance: number,
  wind: WindConditions,
  flight: FlightParams
): number {
  const effects = calculateWindEffects(wind, flight);
  // If distanceEffect is positive (headwind), shot plays longer
  return targetDistance + effects.distanceEffect;
}
