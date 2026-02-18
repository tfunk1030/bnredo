/**
 * Wind Color Utilities Tests
 *
 * Tests for pure functions in wind-colors.ts:
 * normalizeAngle, getRelativeWindAngle, getWindEffect,
 * getWindEffectColor, getWindStrengthOpacity, getWindColor,
 * getWindEffectDescription, getWindAccessibilityLabel
 */

import {
  normalizeAngle,
  getRelativeWindAngle,
  getWindEffect,
  getWindEffectColor,
  getWindStrengthOpacity,
  getWindColor,
  getWindEffectDescription,
  getWindAccessibilityLabel,
  windColors,
} from '../../features/wind/utils/wind-colors';

// ─── normalizeAngle ───────────────────────────────────────────────────────────

describe('normalizeAngle', () => {
  it('leaves 0 unchanged', () => {
    expect(normalizeAngle(0)).toBe(0);
  });

  it('leaves values in 0-360 range unchanged', () => {
    expect(normalizeAngle(180)).toBe(180);
    expect(normalizeAngle(359)).toBe(359);
  });

  it('wraps values > 360 into 0-360 range', () => {
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(450)).toBe(90);
    expect(normalizeAngle(720)).toBe(0);
  });

  it('wraps negative values into 0-360 range', () => {
    expect(normalizeAngle(-45)).toBe(315);
    expect(normalizeAngle(-180)).toBe(180);
    // -360 % 360 === -0 in JS; treat as equivalent to 0
    expect(normalizeAngle(-360)).toBeCloseTo(0);
  });

  it('handles large positive values', () => {
    expect(normalizeAngle(1080)).toBe(0);
    expect(normalizeAngle(1170)).toBe(90);
  });
});

// ─── getRelativeWindAngle ─────────────────────────────────────────────────────

describe('getRelativeWindAngle', () => {
  it('returns 0 when wind direction equals player heading (pure headwind)', () => {
    expect(getRelativeWindAngle(0, 0)).toBe(0);
    expect(getRelativeWindAngle(90, 90)).toBe(0);
    expect(getRelativeWindAngle(270, 270)).toBe(0);
  });

  it('returns 180 when wind comes from exactly behind (pure tailwind)', () => {
    // Player facing North (0), wind from South (180) = tailwind
    expect(getRelativeWindAngle(180, 0)).toBe(180);
    // Player facing East (90), wind from West (270) = tailwind
    expect(getRelativeWindAngle(270, 90)).toBe(180);
  });

  it('returns 90 for right crosswind', () => {
    // Player facing North (0), wind from East (90) = right crosswind
    expect(getRelativeWindAngle(90, 0)).toBe(90);
  });

  it('returns 270 for left crosswind', () => {
    // Player facing North (0), wind from West (270) = left crosswind
    expect(getRelativeWindAngle(270, 0)).toBe(270);
  });

  it('handles wrap-around correctly', () => {
    // Player facing 10, wind from 350 → relative = 340 (just left of headwind)
    expect(getRelativeWindAngle(350, 10)).toBe(340);
  });
});

// ─── getWindEffect ────────────────────────────────────────────────────────────

describe('getWindEffect', () => {
  it('classifies 0° as headwind (directly from front)', () => {
    expect(getWindEffect(0)).toBe('headwind');
  });

  it('classifies 44° as headwind (within headwind zone)', () => {
    expect(getWindEffect(44)).toBe('headwind');
  });

  it('classifies 315° as headwind (within headwind zone)', () => {
    expect(getWindEffect(315)).toBe('headwind');
  });

  it('classifies 180° as tailwind (directly from behind)', () => {
    expect(getWindEffect(180)).toBe('tailwind');
  });

  it('classifies 135° as tailwind (start of tailwind zone)', () => {
    expect(getWindEffect(135)).toBe('tailwind');
  });

  it('classifies 224° as tailwind (end of tailwind zone)', () => {
    expect(getWindEffect(224)).toBe('tailwind');
  });

  it('classifies 45° as crosswind (right side boundary)', () => {
    expect(getWindEffect(45)).toBe('crosswind');
  });

  it('classifies 90° as crosswind (pure right crosswind)', () => {
    expect(getWindEffect(90)).toBe('crosswind');
  });

  it('classifies 225° as crosswind (left side boundary)', () => {
    expect(getWindEffect(225)).toBe('crosswind');
  });

  it('classifies 270° as crosswind (pure left crosswind)', () => {
    expect(getWindEffect(270)).toBe('crosswind');
  });

  it('classifies 314° as crosswind (just before headwind zone)', () => {
    expect(getWindEffect(314)).toBe('crosswind');
  });
});

// ─── getWindEffectColor ───────────────────────────────────────────────────────

describe('getWindEffectColor', () => {
  it('returns green for tailwind', () => {
    expect(getWindEffectColor('tailwind')).toBe(windColors.tailwind);
    expect(getWindEffectColor('tailwind')).toBe('#16A34A');
  });

  it('returns red for headwind', () => {
    expect(getWindEffectColor('headwind')).toBe(windColors.headwind);
    expect(getWindEffectColor('headwind')).toBe('#DC2626');
  });

  it('returns yellow for crosswind', () => {
    expect(getWindEffectColor('crosswind')).toBe(windColors.crosswind);
    expect(getWindEffectColor('crosswind')).toBe('#F59E0B');
  });
});

// ─── getWindStrengthOpacity ───────────────────────────────────────────────────

describe('getWindStrengthOpacity', () => {
  it('returns min opacity (0.5) at 0 mph', () => {
    expect(getWindStrengthOpacity(0)).toBe(0.5);
  });

  it('returns max opacity (1.0) at maxSpeed (25 mph default)', () => {
    expect(getWindStrengthOpacity(25)).toBe(1.0);
  });

  it('returns 0.75 at half of maxSpeed', () => {
    expect(getWindStrengthOpacity(12.5)).toBeCloseTo(0.75, 5);
  });

  it('clamps negative wind speed to 0 (returns min opacity)', () => {
    expect(getWindStrengthOpacity(-10)).toBe(0.5);
  });

  it('clamps wind speed above maxSpeed to maxSpeed (returns max opacity)', () => {
    expect(getWindStrengthOpacity(50)).toBe(1.0);
  });

  it('respects custom maxSpeed', () => {
    // At maxSpeed=10, wind of 5 → 0.75
    expect(getWindStrengthOpacity(5, 10)).toBeCloseTo(0.75, 5);
    // At maxSpeed=10, wind of 10 → 1.0
    expect(getWindStrengthOpacity(10, 10)).toBe(1.0);
  });
});

// ─── getWindColor (integration) ───────────────────────────────────────────────

describe('getWindColor', () => {
  it('returns headwind result for wind from directly in front', () => {
    // Player facing North (0), wind from North (0)
    const result = getWindColor(0, 0, 10);
    expect(result.effect).toBe('headwind');
    expect(result.color).toBe('#DC2626');
    expect(result.opacity).toBeGreaterThan(0.5);
    expect(result.opacity).toBeLessThanOrEqual(1.0);
  });

  it('returns tailwind result for wind from behind', () => {
    // Player facing North (0), wind from South (180)
    const result = getWindColor(180, 0, 15);
    expect(result.effect).toBe('tailwind');
    expect(result.color).toBe('#16A34A');
  });

  it('returns crosswind result for wind from the side', () => {
    // Player facing North (0), wind from East (90)
    const result = getWindColor(90, 0, 8);
    expect(result.effect).toBe('crosswind');
    expect(result.color).toBe('#F59E0B');
  });

  it('correctly computes opacity for light vs strong wind', () => {
    const light = getWindColor(0, 0, 5);
    const strong = getWindColor(0, 0, 25);
    expect(light.opacity).toBeLessThan(strong.opacity);
    expect(strong.opacity).toBe(1.0);
  });
});

// ─── getWindEffectDescription ─────────────────────────────────────────────────

describe('getWindEffectDescription', () => {
  it('describes tailwind correctly', () => {
    expect(getWindEffectDescription('tailwind')).toBe('helping wind from behind');
  });

  it('describes headwind correctly', () => {
    expect(getWindEffectDescription('headwind')).toBe('opposing wind from front');
  });

  it('describes crosswind correctly', () => {
    expect(getWindEffectDescription('crosswind')).toBe('crosswind from side');
  });
});

// ─── getWindAccessibilityLabel ────────────────────────────────────────────────

describe('getWindAccessibilityLabel', () => {
  it('generates correct label for headwind scenario', () => {
    // Player facing North (0), wind from North (0), 12 mph
    const label = getWindAccessibilityLabel(0, 0, 12);
    expect(label).toBe('Wind 12 miles per hour, opposing wind from front');
  });

  it('generates correct label for tailwind scenario', () => {
    // Player facing North (0), wind from South (180), 8 mph
    const label = getWindAccessibilityLabel(180, 0, 8);
    expect(label).toBe('Wind 8 miles per hour, helping wind from behind');
  });

  it('generates correct label for crosswind scenario', () => {
    // Player facing East (90), wind from North (0) → relative 270 → crosswind
    const label = getWindAccessibilityLabel(0, 90, 15);
    expect(label).toBe('Wind 15 miles per hour, crosswind from side');
  });

  it('rounds wind speed in label', () => {
    const label = getWindAccessibilityLabel(0, 0, 7.6);
    expect(label).toContain('Wind 8 miles per hour');
  });
});
