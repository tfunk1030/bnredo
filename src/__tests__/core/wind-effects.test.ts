/**
 * Wind Effects Module Tests
 * 
 * Validates against industry benchmarks from TrackMan and research data.
 */

import {
  calculateWindGradient,
  estimateFlightTime,
  calculateHeadTailEffect,
  calculateCrosswindEffect,
  calculateWindEffects,
  getPlaysLikeDistance,
  WindConditions,
  FlightParams,
} from '../../core/physics/wind-effects';

// Standard flight parameters for testing
const DRIVER_FLIGHT: FlightParams = {
  ballSpeed: 171,
  launchAngle: 10.4,
  spinRate: 2545,
  maxHeight: 35,
  carryDistance: 282,
};

const SEVEN_IRON_FLIGHT: FlightParams = {
  ballSpeed: 123,
  launchAngle: 16.1,
  spinRate: 7124,
  maxHeight: 33,
  carryDistance: 176,
};

const SIX_IRON_FLIGHT: FlightParams = {
  ballSpeed: 127,
  launchAngle: 14.5,
  spinRate: 6200,
  maxHeight: 34,
  carryDistance: 185,
};

describe('Wind Effects Module', () => {
  describe('calculateWindGradient', () => {
    it('should return 1.0 at reference height or below', () => {
      expect(calculateWindGradient(10)).toBeCloseTo(1.0, 2);
      expect(calculateWindGradient(11)).toBeCloseTo(1.0, 2);
    });

    it('should increase with height', () => {
      const low = calculateWindGradient(20);
      const high = calculateWindGradient(40);
      expect(high).toBeGreaterThan(low);
    });

    it('should return ~1.12 at typical driver apex (35y)', () => {
      const gradient = calculateWindGradient(35);
      console.log(`Wind gradient at 35y apex: ${gradient.toFixed(3)}`);
      expect(gradient).toBeGreaterThan(1.05);
      expect(gradient).toBeLessThan(1.2);
    });
  });

  describe('estimateFlightTime', () => {
    it('should return ~6 seconds for a driver', () => {
      const time = estimateFlightTime(171, 10.4, 282);
      console.log(`Driver flight time: ${time.toFixed(2)} seconds`);
      expect(time).toBeGreaterThan(4.5);
      expect(time).toBeLessThan(7.5);
    });

    it('should return ~5 seconds for a 7-iron', () => {
      const time = estimateFlightTime(123, 16.1, 176);
      console.log(`7-iron flight time: ${time.toFixed(2)} seconds`);
      expect(time).toBeGreaterThan(4.0);
      expect(time).toBeLessThan(7.0);
    });
  });

  describe('calculateHeadTailEffect', () => {
    it('should return 0 for no wind', () => {
      const effect = calculateHeadTailEffect(0, 171, 6, 2545, 282);
      expect(effect).toBe(0);
    });

    it('should return positive (plays longer) for headwind', () => {
      const effect = calculateHeadTailEffect(10, 123, 5, 7124, 176);
      console.log(`10 mph headwind effect on 7-iron: +${effect.toFixed(1)} yards`);
      expect(effect).toBeGreaterThan(0);
    });

    it('should return negative (plays shorter) for tailwind', () => {
      const effect = calculateHeadTailEffect(-10, 123, 5, 7124, 176);
      console.log(`10 mph tailwind effect on 7-iron: ${effect.toFixed(1)} yards`);
      expect(effect).toBeLessThan(0);
    });

    it('headwind should hurt more than tailwind helps', () => {
      const headwind = calculateHeadTailEffect(20, 171, 6, 2545, 282);
      const tailwind = calculateHeadTailEffect(-20, 171, 6, 2545, 282);
      
      console.log(`\n20 mph wind effect on driver:`);
      console.log(`  Headwind: +${headwind.toFixed(1)} yards (plays longer)`);
      console.log(`  Tailwind: ${tailwind.toFixed(1)} yards (plays shorter)`);
      console.log(`  Ratio: ${(headwind / Math.abs(tailwind)).toFixed(2)}:1`);
      
      // Industry benchmark: ~2:1 ratio
      expect(headwind / Math.abs(tailwind)).toBeGreaterThan(1.5);
    });

    it('should match TrackMan rule of thumb: ~1 yard/mph for headwind (7-iron)', () => {
      const effect10 = calculateHeadTailEffect(10, 123, 5, 7124, 176);
      const yardsPerMph = effect10 / 10;
      
      console.log(`7-iron yards per mph headwind: ${yardsPerMph.toFixed(2)}`);
      
      // TrackMan rule: ~1 yard per mph
      expect(yardsPerMph).toBeGreaterThan(0.7);
      expect(yardsPerMph).toBeLessThan(1.5);
    });
  });

  describe('calculateCrosswindEffect', () => {
    it('should return 0 for no wind', () => {
      const effect = calculateCrosswindEffect(0, 5, 123, 176);
      expect(effect).toBe(0);
    });

    it('should match ~27 yards lateral for 20 mph crosswind', () => {
      // Industry benchmark from TrackMan: 20 mph crosswind ≈ 27 yards (81 feet)
      const lateral = calculateCrosswindEffect(20, 5.5, 123, 176);
      
      console.log(`20 mph crosswind lateral effect: ${lateral.toFixed(1)} yards`);
      
      // Should be close to 27 yards
      expect(lateral).toBeGreaterThan(20);
      expect(lateral).toBeLessThan(35);
    });

    it('should scale roughly linearly with wind speed', () => {
      const lateral10 = calculateCrosswindEffect(10, 5.5, 123, 176);
      const lateral20 = calculateCrosswindEffect(20, 5.5, 123, 176);
      
      console.log(`Crosswind lateral: 10mph=${lateral10.toFixed(1)}y, 20mph=${lateral20.toFixed(1)}y`);
      
      expect(lateral20 / lateral10).toBeCloseTo(2, 0.3);
    });
  });

  describe('calculateWindEffects - Full Integration', () => {
    it('should return no effects for calm conditions', () => {
      const calm: WindConditions = { speed: 0, direction: 0 };
      const effects = calculateWindEffects(calm, SEVEN_IRON_FLIGHT);
      
      expect(effects.distanceEffect).toBe(0);
      expect(effects.lateralEffect).toBe(0);
      expect(effects.heightEffect).toBe(1.0);
    });

    it('should handle pure headwind (180°)', () => {
      const headwind: WindConditions = { speed: 15, direction: 180 };
      const effects = calculateWindEffects(headwind, SEVEN_IRON_FLIGHT);
      
      console.log(`\n15 mph headwind (7-iron):`);
      console.log(`  Distance effect: +${effects.distanceEffect.toFixed(1)} yards`);
      console.log(`  Lateral effect: ${effects.lateralEffect.toFixed(1)} yards`);
      console.log(`  Height multiplier: ${effects.heightEffect.toFixed(2)}`);
      
      expect(effects.distanceEffect).toBeGreaterThan(10);  // Should play longer
      expect(Math.abs(effects.lateralEffect)).toBeLessThan(1);  // No lateral
      expect(effects.heightEffect).toBeGreaterThan(1.0);  // Ball goes higher
    });

    it('should handle pure tailwind (0°)', () => {
      const tailwind: WindConditions = { speed: 15, direction: 0 };
      const effects = calculateWindEffects(tailwind, DRIVER_FLIGHT);
      
      console.log(`\n15 mph tailwind (driver):`);
      console.log(`  Distance effect: ${effects.distanceEffect.toFixed(1)} yards`);
      console.log(`  Height multiplier: ${effects.heightEffect.toFixed(2)}`);
      
      expect(effects.distanceEffect).toBeLessThan(0);  // Should play shorter
      expect(effects.heightEffect).toBeLessThan(1.0);  // Ball apex is lower
    });

    it('should handle pure crosswind (90°)', () => {
      const crosswind: WindConditions = { speed: 15, direction: 90 };
      const effects = calculateWindEffects(crosswind, SEVEN_IRON_FLIGHT);
      
      console.log(`\n15 mph crosswind from right (7-iron):`);
      console.log(`  Distance effect: ${effects.distanceEffect.toFixed(1)} yards`);
      console.log(`  Lateral effect: ${effects.lateralEffect.toFixed(1)} yards`);
      
      expect(Math.abs(effects.distanceEffect)).toBeLessThan(5);  // Minimal distance effect
      expect(Math.abs(effects.lateralEffect)).toBeGreaterThan(10);  // Significant lateral
    });

    it('should handle quartering wind', () => {
      // 45° = between tailwind and crosswind from left
      const quartering: WindConditions = { speed: 20, direction: 45 };
      const effects = calculateWindEffects(quartering, DRIVER_FLIGHT);
      
      console.log(`\n20 mph quartering tailwind (driver):`);
      console.log(`  Distance effect: ${effects.distanceEffect.toFixed(1)} yards`);
      console.log(`  Lateral effect: ${effects.lateralEffect.toFixed(1)} yards`);
      
      // Should have both distance and lateral effects
      expect(effects.distanceEffect).not.toBe(0);
      expect(effects.lateralEffect).not.toBe(0);
    });
  });

  describe('getPlaysLikeDistance', () => {
    it('should add distance for headwind', () => {
      const headwind: WindConditions = { speed: 15, direction: 180 };
      const playsLike = getPlaysLikeDistance(150, headwind, SEVEN_IRON_FLIGHT);
      
      console.log(`\n150 yard shot into 15 mph headwind plays like: ${playsLike.toFixed(0)} yards`);
      
      expect(playsLike).toBeGreaterThan(150);
    });

    it('should subtract distance for tailwind', () => {
      const tailwind: WindConditions = { speed: 15, direction: 0 };
      const playsLike = getPlaysLikeDistance(200, tailwind, DRIVER_FLIGHT);
      
      console.log(`200 yard shot with 15 mph tailwind plays like: ${playsLike.toFixed(0)} yards`);
      
      expect(playsLike).toBeLessThan(200);
    });
  });

  describe('Benchmark Tests - TrackMan/Industry Data', () => {
    it('should match Golf Digest data: 10 mph headwind = +17y for 7-iron', () => {
      // Golf Digest/TrackMan: 166y 7-iron with 10mph headwind = 17y shorter carry
      // This means it "plays like" 166+17 = 183 yards
      const headwind: WindConditions = { speed: 10, direction: 180 };
      const effects = calculateWindEffects(headwind, SEVEN_IRON_FLIGHT);
      
      console.log(`\nBenchmark: 10 mph headwind on 7-iron`);
      console.log(`  Model: +${effects.distanceEffect.toFixed(1)} yards`);
      console.log(`  TrackMan benchmark: +17 yards`);
      
      // Should be within reasonable range
      expect(effects.distanceEffect).toBeGreaterThan(10);
      expect(effects.distanceEffect).toBeLessThan(25);
    });

    it('should match Golf Digest data: 10 mph tailwind = -13y for 7-iron', () => {
      // Golf Digest/TrackMan: 166y 7-iron with 10mph tailwind = 13y longer carry
      // This means it "plays like" 166-13 = 153 yards
      const tailwind: WindConditions = { speed: 10, direction: 0 };
      const effects = calculateWindEffects(tailwind, SEVEN_IRON_FLIGHT);
      
      console.log(`\nBenchmark: 10 mph tailwind on 7-iron`);
      console.log(`  Model: ${effects.distanceEffect.toFixed(1)} yards`);
      console.log(`  TrackMan benchmark: -13 yards`);
      
      expect(effects.distanceEffect).toBeLessThan(-5);
      expect(effects.distanceEffect).toBeGreaterThan(-20);
    });

    it('should match Henrikson/Ping data: 30 mph headwind vs tailwind asymmetry', () => {
      // Henrikson data: 30 mph headwind = -55y, tailwind = +25y
      // Ratio approximately 2.2:1
      const headwind: WindConditions = { speed: 30, direction: 180 };
      const tailwind: WindConditions = { speed: 30, direction: 0 };
      
      const headEffect = calculateWindEffects(headwind, DRIVER_FLIGHT);
      const tailEffect = calculateWindEffects(tailwind, DRIVER_FLIGHT);
      
      const ratio = headEffect.distanceEffect / Math.abs(tailEffect.distanceEffect);
      
      console.log(`\nBenchmark: 30 mph wind on driver`);
      console.log(`  Headwind effect: +${headEffect.distanceEffect.toFixed(1)} yards`);
      console.log(`  Tailwind effect: ${tailEffect.distanceEffect.toFixed(1)} yards`);
      console.log(`  Asymmetry ratio: ${ratio.toFixed(2)}:1`);
      console.log(`  Ping benchmark: ~2.2:1`);
      
      // Should show clear asymmetry (Ping data: ~2.2:1, can vary 1.5-3.5)
      expect(ratio).toBeGreaterThan(1.5);
      expect(ratio).toBeLessThan(3.5);
    });
  });
});
