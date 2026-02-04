/**
 * Air Density Module Tests
 * 
 * Validates the physics calculations against known values and industry benchmarks.
 */

import {
  calculateAirDensity,
  calculateEnvironmentalFactor,
  calculateAdjustedDistance,
  getReferenceDensity,
  saturationVaporPressure,
  REFERENCE_DENSITY,
  REFERENCE_TEMP_F,
  REFERENCE_PRESSURE_HPA,
  REFERENCE_HUMIDITY,
} from '../../core/physics/air-density';

describe('Air Density Module', () => {
  describe('saturationVaporPressure', () => {
    it('should match known values from physics tables', () => {
      // Known values from meteorology
      expect(saturationVaporPressure(0)).toBeCloseTo(6.11, 1);   // 0°C
      expect(saturationVaporPressure(20)).toBeCloseTo(23.4, 0);  // 20°C
      expect(saturationVaporPressure(25)).toBeCloseTo(31.7, 0);  // 25°C
      expect(saturationVaporPressure(30)).toBeCloseTo(42.4, 0);  // 30°C
    });
  });

  describe('calculateAirDensity', () => {
    it('should return ISA standard density at ISA conditions', () => {
      // ISA standard: 59°F (15°C), 1013.25 hPa, 0% humidity
      const density = calculateAirDensity(59, 1013.25, 0);
      expect(density).toBeCloseTo(1.225, 2);  // ISA standard density
    });

    it('should return reference density at reference conditions', () => {
      const density = calculateAirDensity(
        REFERENCE_TEMP_F,
        REFERENCE_PRESSURE_HPA,
        REFERENCE_HUMIDITY
      );
      expect(density).toBeCloseTo(REFERENCE_DENSITY, 2);
    });

    it('should decrease with increasing temperature', () => {
      const cold = calculateAirDensity(50, 1013.25, 50);
      const warm = calculateAirDensity(95, 1013.25, 50);
      expect(cold).toBeGreaterThan(warm);
      
      console.log(`Density at 50°F: ${cold.toFixed(4)} kg/m³`);
      console.log(`Density at 95°F: ${warm.toFixed(4)} kg/m³`);
      console.log(`Change: ${((cold - warm) / cold * 100).toFixed(2)}%`);
    });

    it('should decrease with decreasing pressure (altitude)', () => {
      const seaLevel = calculateAirDensity(77, 1013.25, 50);
      const denver = calculateAirDensity(77, 843, 50);  // ~5000ft
      expect(seaLevel).toBeGreaterThan(denver);
      
      console.log(`Density at sea level: ${seaLevel.toFixed(4)} kg/m³`);
      console.log(`Density at Denver: ${denver.toFixed(4)} kg/m³`);
      console.log(`Change: ${((seaLevel - denver) / seaLevel * 100).toFixed(2)}%`);
    });

    it('should decrease slightly with increasing humidity', () => {
      // Counter-intuitive but true: humid air is LESS dense
      // Water vapor (M=18) is lighter than N2 (M=28) and O2 (M=32)
      const dry = calculateAirDensity(85, 1013.25, 10);
      const humid = calculateAirDensity(85, 1013.25, 90);
      expect(dry).toBeGreaterThan(humid);
      
      console.log(`Density at 10% humidity: ${dry.toFixed(4)} kg/m³`);
      console.log(`Density at 90% humidity: ${humid.toFixed(4)} kg/m³`);
      console.log(`Difference: ${Math.abs(dry - humid).toFixed(4)} kg/m³`);
    });

    it('should match real-world scenario densities', () => {
      const scenarios = [
        { name: 'Winter FL', temp: 55, pressure: 1020, humidity: 70, expected: 1.24 },
        { name: 'Summer TX', temp: 98, pressure: 1005, humidity: 45, expected: 1.12 },
        { name: 'Denver summer', temp: 85, pressure: 840, humidity: 25, expected: 0.98 },
        { name: 'Mexico City', temp: 75, pressure: 775, humidity: 50, expected: 0.91 },
      ];

      console.log('\n=== Real-World Density Scenarios ===\n');
      for (const s of scenarios) {
        const density = calculateAirDensity(s.temp, s.pressure, s.humidity);
        console.log(`${s.name}: ${density.toFixed(3)} kg/m³ (expected ~${s.expected})`);
        expect(density).toBeCloseTo(s.expected, 1);
      }
    });
  });

  describe('calculateEnvironmentalFactor', () => {
    it('should return 1.0 at reference density', () => {
      const factor = calculateEnvironmentalFactor(REFERENCE_DENSITY);
      expect(factor).toBeCloseTo(1.0, 4);
    });

    it('should return >1 for lower density (ball goes farther)', () => {
      const lowDensity = 0.98;  // e.g., Denver
      const factor = calculateEnvironmentalFactor(lowDensity);
      expect(factor).toBeGreaterThan(1.0);
      console.log(`Factor at density 0.98: ${factor.toFixed(4)}`);
    });

    it('should return <1 for higher density (ball goes shorter)', () => {
      const highDensity = 1.25;  // e.g., cold day
      const factor = calculateEnvironmentalFactor(highDensity);
      expect(factor).toBeLessThan(1.0);
      console.log(`Factor at density 1.25: ${factor.toFixed(4)}`);
    });
  });

  describe('calculateAdjustedDistance - TrackMan Benchmark Tests', () => {
    const baseDistance = 300;  // 300 yard drive

    it('should return base distance at reference conditions', () => {
      const adjusted = calculateAdjustedDistance(
        baseDistance,
        REFERENCE_TEMP_F,
        REFERENCE_PRESSURE_HPA,
        REFERENCE_HUMIDITY
      );
      expect(adjusted).toBeCloseTo(baseDistance, 0);
    });

    it('should show ~2-3y per 10°F temperature effect', () => {
      const cold = calculateAdjustedDistance(baseDistance, 50, 1013.25, 50);
      const warm = calculateAdjustedDistance(baseDistance, 90, 1013.25, 50);
      
      const diffPer10F = (warm - cold) / 4;  // 40°F range
      
      console.log(`\nTemperature effect (300y driver):`);
      console.log(`  50°F: ${cold.toFixed(1)}y`);
      console.log(`  90°F: ${warm.toFixed(1)}y`);
      console.log(`  Per 10°F: ${diffPer10F.toFixed(2)}y`);
      
      // TrackMan benchmark: 2-3 yards per 10°F
      expect(diffPer10F).toBeGreaterThan(1.5);
      expect(diffPer10F).toBeLessThan(4);
    });

    it('should show ~4-5y per 1000ft altitude effect', () => {
      // Approximate station pressures at different altitudes
      const seaLevel = calculateAdjustedDistance(baseDistance, 77, 1013.25, 50);
      const altitude5k = calculateAdjustedDistance(baseDistance, 77, 843, 50);
      
      const diffPer1000ft = (altitude5k - seaLevel) / 5;
      
      console.log(`\nAltitude effect (300y driver):`);
      console.log(`  Sea level: ${seaLevel.toFixed(1)}y`);
      console.log(`  5000ft: ${altitude5k.toFixed(1)}y`);
      console.log(`  Per 1000ft: ${diffPer1000ft.toFixed(2)}y`);
      
      // TrackMan benchmark: ~4.5 yards per 1000ft
      expect(diffPer1000ft).toBeGreaterThan(3);
      expect(diffPer1000ft).toBeLessThan(6);
    });

    it('should show <2y humidity effect from 10% to 90%', () => {
      const dry = calculateAdjustedDistance(baseDistance, 85, 1013.25, 10);
      const humid = calculateAdjustedDistance(baseDistance, 85, 1013.25, 90);
      
      const diff = Math.abs(humid - dry);
      
      console.log(`\nHumidity effect (300y driver at 85°F):`);
      console.log(`  10% humidity: ${dry.toFixed(1)}y`);
      console.log(`  90% humidity: ${humid.toFixed(1)}y`);
      console.log(`  Difference: ${diff.toFixed(2)}y`);
      
      // TrackMan benchmark: <1 yard for 6-iron, <2 for driver
      expect(diff).toBeLessThan(2);
    });

    it('should handle extreme combined conditions correctly', () => {
      // Denver hot summer vs cold winter sea level
      const denverHot = calculateAdjustedDistance(baseDistance, 95, 840, 25);
      const winterCold = calculateAdjustedDistance(baseDistance, 45, 1020, 60);
      
      const diff = denverHot - winterCold;
      
      console.log(`\nExtreme comparison (300y driver):`);
      console.log(`  Denver summer (95°F, 5280ft): ${denverHot.toFixed(1)}y`);
      console.log(`  Winter sea level (45°F): ${winterCold.toFixed(1)}y`);
      console.log(`  Difference: ${diff.toFixed(1)}y`);
      
      // Combined effect should be 30-50 yards
      expect(diff).toBeGreaterThan(25);
      expect(diff).toBeLessThan(55);
    });
  });

  describe('getReferenceDensity verification', () => {
    it('should match the constant REFERENCE_DENSITY', () => {
      const calculated = getReferenceDensity();
      console.log(`\nReference density verification:`);
      console.log(`  Calculated: ${calculated.toFixed(4)} kg/m³`);
      console.log(`  Constant: ${REFERENCE_DENSITY} kg/m³`);
      expect(calculated).toBeCloseTo(REFERENCE_DENSITY, 2);
    });
  });
});
