/**
 * Wind color utilities for dynamic wind arrow coloring
 *
 * Wind effect zones (relative to player heading):
 * - Headwind (315-45°): Red - wind hurting (from front)
 * - Tailwind (135-225°): Green - wind helping (from behind)
 * - Crosswind (45-135° or 225-315°): Yellow - caution
 */

export type WindEffect = 'tailwind' | 'headwind' | 'crosswind';

export interface WindColorResult {
  color: string;
  effect: WindEffect;
  opacity: number;
}

// Design system colors for wind effects
export const windColors = {
  tailwind: '#16A34A',   // Green - helping
  headwind: '#DC2626',   // Red - hurting
  crosswind: '#F59E0B',  // Yellow - caution
} as const;

/**
 * Normalize angle to 0-360 range
 */
export function normalizeAngle(angle: number): number {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

/**
 * Calculate relative wind angle (wind direction relative to player heading)
 *
 * @param windDirection - Absolute wind direction (0-360, where wind is coming FROM)
 * @param playerHeading - Player's facing direction (0-360)
 * @returns Relative angle 0-360 (0 = headwind from front, 180 = tailwind from behind)
 */
export function getRelativeWindAngle(windDirection: number, playerHeading: number): number {
  // Wind direction is where wind comes FROM
  // Relative angle: 0 = headwind (from front), 180 = tailwind (from behind)
  const relative = normalizeAngle(windDirection - playerHeading);
  return relative;
}

/**
 * Determine wind effect category based on relative wind angle
 *
 * @param relativeAngle - Wind angle relative to player heading (0-360)
 * @returns Wind effect category
 */
export function getWindEffect(relativeAngle: number): WindEffect {
  const angle = normalizeAngle(relativeAngle);

  // Headwind: 315-360 or 0-45 (wind coming from the direction player faces)
  if (angle >= 315 || angle < 45) {
    return 'headwind';
  }

  // Tailwind: 135-225 (wind coming from behind player)
  if (angle >= 135 && angle < 225) {
    return 'tailwind';
  }

  // Crosswind: 45-135 or 225-315 (wind from sides)
  return 'crosswind';
}

/**
 * Get color for wind effect
 *
 * @param effect - Wind effect category
 * @returns Hex color string
 */
export function getWindEffectColor(effect: WindEffect): string {
  return windColors[effect];
}

/**
 * Calculate opacity based on wind strength
 * Range: 0.5 (light wind) to 1.0 (strong wind)
 *
 * @param windSpeed - Wind speed in mph
 * @param maxSpeed - Speed at which opacity reaches 1.0 (default: 25 mph)
 * @returns Opacity value 0.5-1.0
 */
export function getWindStrengthOpacity(windSpeed: number, maxSpeed: number = 25): number {
  const minOpacity = 0.5;
  const maxOpacity = 1.0;

  // Clamp wind speed to valid range
  const clampedSpeed = Math.max(0, Math.min(windSpeed, maxSpeed));

  // Linear interpolation from minOpacity to maxOpacity
  const ratio = clampedSpeed / maxSpeed;
  return minOpacity + (maxOpacity - minOpacity) * ratio;
}

/**
 * Get complete wind color result for rendering
 *
 * @param windDirection - Absolute wind direction (0-360)
 * @param playerHeading - Player's facing direction (0-360)
 * @param windSpeed - Wind speed in mph
 * @returns Object with color, effect category, and opacity
 */
export function getWindColor(
  windDirection: number,
  playerHeading: number,
  windSpeed: number
): WindColorResult {
  const relativeAngle = getRelativeWindAngle(windDirection, playerHeading);
  const effect = getWindEffect(relativeAngle);
  const color = getWindEffectColor(effect);
  const opacity = getWindStrengthOpacity(windSpeed);

  return { color, effect, opacity };
}

/**
 * Get user-friendly description of wind effect
 *
 * @param effect - Wind effect category
 * @returns Descriptive string for accessibility
 */
export function getWindEffectDescription(effect: WindEffect): string {
  switch (effect) {
    case 'tailwind':
      return 'helping wind from behind';
    case 'headwind':
      return 'opposing wind from front';
    case 'crosswind':
      return 'crosswind from side';
  }
}

/**
 * Get accessibility label for wind conditions
 *
 * @param windDirection - Absolute wind direction (0-360)
 * @param playerHeading - Player's facing direction (0-360)
 * @param windSpeed - Wind speed in mph
 * @returns Accessibility-friendly description
 */
export function getWindAccessibilityLabel(
  windDirection: number,
  playerHeading: number,
  windSpeed: number
): string {
  const { effect } = getWindColor(windDirection, playerHeading, windSpeed);
  const description = getWindEffectDescription(effect);
  return `Wind ${Math.round(windSpeed)} miles per hour, ${description}`;
}
