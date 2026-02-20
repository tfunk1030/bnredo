import { EnvironmentalCalculator, EnvironmentalConditions } from '@/src/core/services/environmental-calculations';

// Standard conditions for baseline comparisons
const standardConditions: EnvironmentalConditions = {
  temperature: 70,
  humidity: 50,
  pressure: 1013.25,
  altitude: 0,
  windSpeed: 0,
  windDirection: 0,
  windGust: 0,
  density: 1.225,
};

describe('EnvironmentalCalculator', () => {
  describe('calculateAirDensity', () => {
    it('should delegate to core physics air-density module', () => {
      // Standard conditions at 70°F, 1013.25 hPa, 50% humidity
      const density = EnvironmentalCalculator.calculateAirDensity({
        temperature: 70,
        pressure: 1013.25,
        humidity: 50,
      });
      // Should be close to standard air density (1.225 kg/m³)
      expect(density).toBeGreaterThan(1.1);
      expect(density).toBeLessThan(1.3);
    });

    it('should return lower density for hot conditions', () => {
      const hot = EnvironmentalCalculator.calculateAirDensity({
        temperature: 100,
        pressure: 1013.25,
        humidity: 50,
      });
      const cold = EnvironmentalCalculator.calculateAirDensity({
        temperature: 40,
        pressure: 1013.25,
        humidity: 50,
      });
      expect(hot).toBeLessThan(cold);
    });

    it('should return lower density for lower pressure', () => {
      const lowP = EnvironmentalCalculator.calculateAirDensity({
        temperature: 70,
        pressure: 900,
        humidity: 50,
      });
      const highP = EnvironmentalCalculator.calculateAirDensity({
        temperature: 70,
        pressure: 1013.25,
        humidity: 50,
      });
      expect(lowP).toBeLessThan(highP);
    });
  });

  describe('calculateVaporPressure', () => {
    it('should return 0 at 0% humidity', () => {
      expect(EnvironmentalCalculator.calculateVaporPressure(70, 0)).toBe(0);
    });

    it('should return saturation pressure at 100% humidity', () => {
      const sat = EnvironmentalCalculator.calculateVaporPressure(70, 100);
      // At 70°F (21.1°C), saturation vapor pressure ~25 hPa
      expect(sat).toBeGreaterThan(20);
      expect(sat).toBeLessThan(30);
    });

    it('should scale linearly with humidity', () => {
      const half = EnvironmentalCalculator.calculateVaporPressure(70, 50);
      const full = EnvironmentalCalculator.calculateVaporPressure(70, 100);
      expect(half).toBeCloseTo(full / 2, 5);
    });

    it('should increase with temperature', () => {
      const cool = EnvironmentalCalculator.calculateVaporPressure(50, 50);
      const warm = EnvironmentalCalculator.calculateVaporPressure(90, 50);
      expect(warm).toBeGreaterThan(cool);
    });

    it('should handle freezing temperatures', () => {
      const vp = EnvironmentalCalculator.calculateVaporPressure(32, 50);
      expect(vp).toBeGreaterThan(0);
      expect(vp).toBeLessThan(10);
    });
  });

  describe('calculateWindEffect', () => {
    it('should return full headwind when wind is directly ahead (0° relative)', () => {
      const result = EnvironmentalCalculator.calculateWindEffect(10, 0, 0);
      expect(result.headwind).toBeCloseTo(10, 1);
      expect(result.crosswind).toBeCloseTo(0, 1);
    });

    it('should return full tailwind when wind is from behind (180° relative)', () => {
      const result = EnvironmentalCalculator.calculateWindEffect(10, 180, 0);
      expect(result.headwind).toBeCloseTo(-10, 1);
      expect(result.crosswind).toBeCloseTo(0, 1);
    });

    it('should return full crosswind at 90° relative', () => {
      const result = EnvironmentalCalculator.calculateWindEffect(10, 90, 0);
      expect(result.headwind).toBeCloseTo(0, 1);
      expect(result.crosswind).toBeCloseTo(10, 1);
    });

    it('should decompose correctly at 45°', () => {
      const result = EnvironmentalCalculator.calculateWindEffect(10, 45, 0);
      const expected = 10 * Math.cos(Math.PI / 4);
      expect(result.headwind).toBeCloseTo(expected, 1);
      expect(result.crosswind).toBeCloseTo(expected, 1);
    });

    it('should handle shot direction offset', () => {
      // Wind from 90° with shot going 90° → relative angle is 0° = full headwind
      const result = EnvironmentalCalculator.calculateWindEffect(10, 90, 90);
      expect(result.headwind).toBeCloseTo(10, 1);
      expect(result.crosswind).toBeCloseTo(0, 1);
    });

    it('should produce crosswind when wind is perpendicular to shot direction', () => {
      // Wind from 180° with shot going 90° → relative angle = 90° = full crosswind
      const result = EnvironmentalCalculator.calculateWindEffect(10, 180, 90);
      expect(result.headwind).toBeCloseTo(0, 1);
      expect(result.crosswind).toBeCloseTo(10, 1);
    });

    it('should return zero effects with zero wind speed', () => {
      const result = EnvironmentalCalculator.calculateWindEffect(0, 45, 0);
      expect(result.headwind).toBeCloseTo(0, 5);
      expect(result.crosswind).toBeCloseTo(0, 5);
    });
  });

  describe('calculateShotAdjustments', () => {
    it('should return zero adjustments in standard conditions with no wind', () => {
      const adjustments = EnvironmentalCalculator.calculateShotAdjustments(standardConditions, 0);
      // With density ratio of 1.0 and no wind, effects should be near zero
      expect(Math.abs(adjustments.distanceAdjustment)).toBeLessThan(5);
      expect(Math.abs(adjustments.launchAngleAdjustment)).toBeLessThan(1);
    });

    it('should show distance increase with lower density (higher altitude/temp)', () => {
      const thinAir: EnvironmentalConditions = {
        ...standardConditions,
        density: 1.0, // Lower than standard 1.225
      };
      const adjustments = EnvironmentalCalculator.calculateShotAdjustments(thinAir, 0);
      // Lower density → ball flies farther → positive distance adjustment (densityEffect = (1 - 0.816) * 100 ≈ 18.4%)
      expect(adjustments.distanceAdjustment).toBeGreaterThan(0);
    });

    it('should show distance decrease with headwind', () => {
      const headwind: EnvironmentalConditions = {
        ...standardConditions,
        windSpeed: 15,
        windDirection: 0, // Same as shot direction = headwind
      };
      const adjustments = EnvironmentalCalculator.calculateShotAdjustments(headwind, 0);
      // Headwind should reduce distance: windEffect = -headwind * 1.5 = -15 * 1.5 = -22.5
      // But density effect exists too, so just check wind component via comparison
      const noWind = EnvironmentalCalculator.calculateShotAdjustments(standardConditions, 0);
      expect(adjustments.distanceAdjustment).toBeLessThan(noWind.distanceAdjustment);
    });

    it('should produce lateral shift with crosswind', () => {
      const crosswind: EnvironmentalConditions = {
        ...standardConditions,
        windSpeed: 10,
        windDirection: 90,
      };
      const adjustments = EnvironmentalCalculator.calculateShotAdjustments(crosswind, 0);
      // trajectoryShift = crosswind * 2 = 10 * sin(90°) * 2 = 20
      expect(Math.abs(adjustments.trajectoryShift)).toBeGreaterThan(5);
    });

    it('should calculate density from conditions when density not provided', () => {
      const noDensity: EnvironmentalConditions = {
        ...standardConditions,
        density: undefined as unknown as number,
      };
      // Should not throw — falls back to calculateAirDensity
      const adjustments = EnvironmentalCalculator.calculateShotAdjustments(noDensity, 0);
      expect(adjustments).toBeDefined();
      expect(typeof adjustments.distanceAdjustment).toBe('number');
    });

    it('should compute spin adjustment inversely to density ratio', () => {
      const thinAir: EnvironmentalConditions = {
        ...standardConditions,
        density: 1.0,
      };
      const adjustments = EnvironmentalCalculator.calculateShotAdjustments(thinAir, 0);
      // spinAdjustment = (densityRatio - 1) * -50
      // densityRatio = 1.0 / 1.225 ≈ 0.816
      // spinAdjustment = (0.816 - 1) * -50 = 0.184 * 50 ≈ 9.2
      expect(adjustments.spinAdjustment).toBeGreaterThan(0);
    });
  });

  describe('calculateAltitudeEffect (deprecated)', () => {
    it('should return 2% per 1000 feet', () => {
      expect(EnvironmentalCalculator.calculateAltitudeEffect(0)).toBe(0);
      expect(EnvironmentalCalculator.calculateAltitudeEffect(1000)).toBe(2);
      expect(EnvironmentalCalculator.calculateAltitudeEffect(5000)).toBe(10);
      expect(EnvironmentalCalculator.calculateAltitudeEffect(9350)).toBeCloseTo(18.7, 1);
    });

    it('should handle negative altitude', () => {
      expect(EnvironmentalCalculator.calculateAltitudeEffect(-100)).toBeCloseTo(-0.2, 1);
    });
  });

  describe('getFlightTimeAdjustment', () => {
    it('should return 1.0 at standard density', () => {
      const adjustment = EnvironmentalCalculator.getFlightTimeAdjustment(standardConditions);
      expect(adjustment).toBeCloseTo(1.0, 1);
    });

    it('should return > 1.0 at lower density (ball in air longer)', () => {
      const thinAir: EnvironmentalConditions = {
        ...standardConditions,
        density: 1.0,
      };
      const adjustment = EnvironmentalCalculator.getFlightTimeAdjustment(thinAir);
      expect(adjustment).toBeGreaterThan(1.0);
    });

    it('should return < 1.0 at higher density', () => {
      const thickAir: EnvironmentalConditions = {
        ...standardConditions,
        density: 1.4,
      };
      const adjustment = EnvironmentalCalculator.getFlightTimeAdjustment(thickAir);
      expect(adjustment).toBeLessThan(1.0);
    });
  });

  describe('getRecommendedAdjustments', () => {
    it('should return empty array for standard calm conditions', () => {
      const recs = EnvironmentalCalculator.getRecommendedAdjustments(standardConditions);
      expect(recs).toEqual([]);
    });

    it('should recommend clubbing up for headwind > 5mph', () => {
      const conditions: EnvironmentalConditions = {
        ...standardConditions,
        windSpeed: 10,
        windDirection: 0, // headwind (same as default shot direction 0)
      };
      const recs = EnvironmentalCalculator.getRecommendedAdjustments(conditions);
      expect(recs.some(r => r.includes('Into wind'))).toBe(true);
    });

    it('should recommend clubbing down for tailwind > 5mph', () => {
      const conditions: EnvironmentalConditions = {
        ...standardConditions,
        windSpeed: 10,
        windDirection: 180,
      };
      const recs = EnvironmentalCalculator.getRecommendedAdjustments(conditions);
      expect(recs.some(r => r.includes('Downwind'))).toBe(true);
    });

    it('should warn about significant crosswind', () => {
      const conditions: EnvironmentalConditions = {
        ...standardConditions,
        windSpeed: 10,
        windDirection: 90,
      };
      const recs = EnvironmentalCalculator.getRecommendedAdjustments(conditions);
      expect(recs.some(r => r.includes('crosswind'))).toBe(true);
    });

    it('should warn about cold conditions', () => {
      const conditions: EnvironmentalConditions = {
        ...standardConditions,
        temperature: 40,
      };
      const recs = EnvironmentalCalculator.getRecommendedAdjustments(conditions);
      expect(recs.some(r => r.includes('Cold'))).toBe(true);
    });

    it('should note high humidity effect', () => {
      const conditions: EnvironmentalConditions = {
        ...standardConditions,
        humidity: 90,
      };
      const recs = EnvironmentalCalculator.getRecommendedAdjustments(conditions);
      expect(recs.some(r => r.includes('humidity'))).toBe(true);
    });

    it('should warn about high altitude', () => {
      const conditions: EnvironmentalConditions = {
        ...standardConditions,
        altitude: 5000,
      };
      const recs = EnvironmentalCalculator.getRecommendedAdjustments(conditions);
      expect(recs.some(r => r.includes('altitude'))).toBe(true);
    });

    it('should combine multiple recommendations', () => {
      const conditions: EnvironmentalConditions = {
        ...standardConditions,
        temperature: 40,
        windSpeed: 15,
        windDirection: 0,
        altitude: 5000,
        humidity: 90,
      };
      const recs = EnvironmentalCalculator.getRecommendedAdjustments(conditions);
      // Should have: headwind, cold, humidity, altitude
      expect(recs.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('getEnvironmentalSummary', () => {
    it('should return formatted string with adjustments', () => {
      const summary = EnvironmentalCalculator.getEnvironmentalSummary(standardConditions);
      expect(summary).toContain('Distance:');
      expect(summary).toContain('Ball flight:');
      expect(summary).toContain('Spin rate:');
    });

    it('should show "Increase" for thin air conditions', () => {
      const thinAir: EnvironmentalConditions = {
        ...standardConditions,
        density: 1.0,
      };
      const summary = EnvironmentalCalculator.getEnvironmentalSummary(thinAir);
      expect(summary).toContain('Increase');
    });

    it('should show lateral shift direction', () => {
      const crosswind: EnvironmentalConditions = {
        ...standardConditions,
        windSpeed: 10,
        windDirection: 90,
      };
      const summary = EnvironmentalCalculator.getEnvironmentalSummary(crosswind);
      // Should indicate left or right
      expect(summary).toMatch(/left|right/i);
    });
  });
});
