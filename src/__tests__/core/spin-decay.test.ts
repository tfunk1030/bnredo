/**
 * Spin Decay Module Tests
 * 
 * Validates against Tutelman and TrackMan research data.
 */

import {
  calculateSpinAtTime,
  spinRetentionFraction,
  calculateAverageSpin,
  calculateLandingSpin,
  spinDecayDistanceEffect,
  getSpinDecaySummary,
} from '../../core/physics/spin-decay';

describe('Spin Decay Module', () => {
  describe('calculateSpinAtTime', () => {
    it('should return initial spin at t=0', () => {
      expect(calculateSpinAtTime(3000, 0)).toBe(3000);
    });

    it('should return initial spin for negative time', () => {
      expect(calculateSpinAtTime(3000, -1)).toBe(3000);
    });

    it('should decay by ~3.3% per second', () => {
      const initial = 3000;
      const afterOneSec = calculateSpinAtTime(initial, 1);
      const decayPercent = (initial - afterOneSec) / initial * 100;
      
      console.log(`Spin decay after 1 second: ${decayPercent.toFixed(2)}%`);
      
      // Should be 3.3% ± 0.5%
      expect(decayPercent).toBeGreaterThan(2.8);
      expect(decayPercent).toBeLessThan(3.8);
    });

    it('should decay to ~80% after 6 seconds (PGA Tour hang time)', () => {
      const initial = 2545;  // PGA Tour driver spin
      const after6Sec = calculateSpinAtTime(initial, 6);
      const retentionPercent = after6Sec / initial * 100;
      
      console.log(`Spin retention after 6 seconds: ${retentionPercent.toFixed(1)}%`);
      console.log(`Initial: ${initial} RPM → Final: ${Math.round(after6Sec)} RPM`);
      
      // Tutelman research: 78-82% retention after 6 seconds
      expect(retentionPercent).toBeGreaterThan(75);
      expect(retentionPercent).toBeLessThan(85);
    });
  });

  describe('spinRetentionFraction', () => {
    it('should return 1.0 at t=0', () => {
      expect(spinRetentionFraction(0)).toBe(1);
    });

    it('should approach 0 at very long times', () => {
      expect(spinRetentionFraction(100)).toBeLessThan(0.1);
    });

    it('should return ~0.37 at time constant (30 sec)', () => {
      // e^(-1) ≈ 0.368
      const fraction = spinRetentionFraction(30);
      expect(fraction).toBeCloseTo(0.368, 2);
    });
  });

  describe('calculateAverageSpin', () => {
    it('should return initial spin for zero flight time', () => {
      expect(calculateAverageSpin(3000, 0)).toBe(3000);
    });

    it('should return less than initial spin for positive flight time', () => {
      const avg = calculateAverageSpin(3000, 6);
      expect(avg).toBeLessThan(3000);
    });

    it('should return more than landing spin', () => {
      const avg = calculateAverageSpin(3000, 6);
      const landing = calculateLandingSpin(3000, 6);
      expect(avg).toBeGreaterThan(landing);
    });

    it('should be between landing and initial spin', () => {
      const initial = 3000;
      const avg = calculateAverageSpin(initial, 6);
      const landing = calculateLandingSpin(initial, 6);
      
      console.log(`Average spin during 6s flight: ${Math.round(avg)} RPM`);
      console.log(`(Initial: ${initial}, Landing: ${Math.round(landing)})`);
      
      expect(avg).toBeLessThan(initial);
      expect(avg).toBeGreaterThan(landing);
    });
  });

  describe('spinDecayDistanceEffect', () => {
    it('should return ~1.0 for normal conditions', () => {
      const effect = spinDecayDistanceEffect(2545, 6, 2500);
      expect(effect).toBeCloseTo(1.0, 1);
    });

    it('should return >1.0 for very high spin (decay helps)', () => {
      const effect = spinDecayDistanceEffect(4000, 6, 2500);
      console.log(`Distance effect for high spin (4000 RPM): ${effect.toFixed(3)}`);
      expect(effect).toBeGreaterThanOrEqual(1.0);
    });

    it('should return <1.0 for very low spin (decay hurts)', () => {
      const effect = spinDecayDistanceEffect(1500, 6, 2500);
      console.log(`Distance effect for low spin (1500 RPM): ${effect.toFixed(3)}`);
      expect(effect).toBeLessThanOrEqual(1.0);
    });
  });

  describe('getSpinDecaySummary', () => {
    it('should return comprehensive summary', () => {
      const summary = getSpinDecaySummary(2545, 6);
      
      console.log('\n=== Spin Decay Summary (Driver, 6s flight) ===');
      console.log(`  Initial spin: ${summary.initialSpin} RPM`);
      console.log(`  Landing spin: ${summary.landingSpin} RPM`);
      console.log(`  Average spin: ${summary.averageSpin} RPM`);
      console.log(`  Retention: ${summary.retentionPercent}%`);
      console.log(`  Distance effect: ${summary.distanceEffect.toFixed(3)}`);
      
      expect(summary.initialSpin).toBe(2545);
      expect(summary.landingSpin).toBeLessThan(summary.initialSpin);
      expect(summary.retentionPercent).toBeGreaterThan(75);
      expect(summary.retentionPercent).toBeLessThan(85);
    });

    it('should show different results for iron vs driver', () => {
      const driver = getSpinDecaySummary(2545, 6);   // Lower spin, longer flight
      const iron = getSpinDecaySummary(7124, 5);     // Higher spin, shorter flight
      
      console.log('\n=== Driver vs 7-Iron Spin Decay ===');
      console.log(`Driver: ${driver.initialSpin} → ${driver.landingSpin} RPM (${driver.retentionPercent}%)`);
      console.log(`7-Iron: ${iron.initialSpin} → ${iron.landingSpin} RPM (${iron.retentionPercent}%)`);
      
      // Iron retains more because shorter flight
      expect(iron.retentionPercent).toBeGreaterThan(driver.retentionPercent);
    });
  });

  describe('Benchmark Tests - Industry Data', () => {
    it('should match Tutelman: 3.3% decay per second', () => {
      const initial = 3000;
      const decayRates: number[] = [];
      
      for (let t = 1; t <= 5; t++) {
        const spinBefore = calculateSpinAtTime(initial, t - 1);
        const spinAfter = calculateSpinAtTime(initial, t);
        const decayPercent = (spinBefore - spinAfter) / spinBefore * 100;
        decayRates.push(decayPercent);
      }
      
      console.log('\nDecay rates per second:', decayRates.map(r => r.toFixed(2) + '%'));
      
      // All decay rates should be approximately 3.3%
      decayRates.forEach(rate => {
        expect(rate).toBeCloseTo(3.3, 0.5);
      });
    });

    it('should match TrackMan: ~4% decay per second (upper bound)', () => {
      // TrackMan mentions "typically 4% for each second"
      // Our model uses 3.3%, so we're slightly conservative
      const retention = spinRetentionFraction(1);
      const decayPercent = (1 - retention) * 100;
      
      console.log(`Model decay per second: ${decayPercent.toFixed(2)}%`);
      console.log('TrackMan reports: ~4%');
      
      // Should be in the 3-4% range
      expect(decayPercent).toBeGreaterThan(3);
      expect(decayPercent).toBeLessThan(4.5);
    });
  });
});
