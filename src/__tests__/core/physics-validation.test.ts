/**
 * Physics Model Validation Tests
 * 
 * Compare YardageModelEnhanced against industry benchmarks:
 * - TrackMan normalization (77°F, sea level)
 * - Temperature: ~1.5-2.5 yards per 10°F (varies by club)
 * - Altitude: ~4.5 yards per 1,000 feet
 * - Wind: Headwind hurts more than tailwind helps
 * - Humidity: <1 yard effect from 10% to 90%
 */

import { YardageModelEnhanced, SkillLevel } from '../../core/models/yardagemodel';

describe('Physics Model Validation', () => {
  let model: YardageModelEnhanced;

  beforeEach(() => {
    model = new YardageModelEnhanced();
  });

  describe('Baseline (TrackMan standard: 77°F, sea level, 50% humidity)', () => {
    beforeEach(() => {
      // TrackMan standard: 77°F, sea level (1013.25 hPa), 50% humidity, no wind
      model.setConditions(77, 0, 0, 0, 1013.25, 50);
    });

    it('should return close to target yardage at standard conditions', () => {
      const result = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');
      // At standard conditions with no wind, should be very close to input
      expect(result.carryDistance).toBeCloseTo(300, 0);
      expect(result.lateralMovement).toBe(0);
    });
  });

  describe('Temperature Effects', () => {
    /**
     * TrackMan benchmark: ~1.5-2.5 yards per 10°F depending on club
     * - Driver (155 mph ball speed): ~2.5 yards per 10°F
     * - PW: ~1.5 yards per 10°F
     */

    it('should show ~2-3 yards driver distance change per 10°F', () => {
      // Test at 67°F (10°F below standard)
      model.setConditions(67, 0, 0, 0, 1013.25, 50);
      const cold = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');

      // Test at 87°F (10°F above standard)
      model.setConditions(87, 0, 0, 0, 1013.25, 50);
      const warm = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');

      const diffPer10F = (warm.carryDistance - cold.carryDistance) / 2;
      
      console.log(`Temperature effect (driver 300y): ${diffPer10F.toFixed(2)} yards per 10°F`);
      console.log(`  67°F: ${cold.carryDistance}y, 87°F: ${warm.carryDistance}y`);
      
      // TrackMan says ~2.5 yards per 10°F for driver
      // Allow range of 1.5-4 yards to account for model differences
      expect(diffPer10F).toBeGreaterThan(1.5);
      expect(diffPer10F).toBeLessThan(4);
    });

    it('should show smaller temperature effect for wedges than driver', () => {
      // Driver at different temps
      model.setConditions(57, 0, 0, 0, 1013.25, 50);
      const driverCold = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');
      model.setConditions(97, 0, 0, 0, 1013.25, 50);
      const driverWarm = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');
      const driverDiff = driverWarm.carryDistance - driverCold.carryDistance;

      // PW at different temps
      model.setConditions(57, 0, 0, 0, 1013.25, 50);
      const pwCold = model.calculateAdjustedYardage(145, SkillLevel.PROFESSIONAL, 'pitching-wedge');
      model.setConditions(97, 0, 0, 0, 1013.25, 50);
      const pwWarm = model.calculateAdjustedYardage(145, SkillLevel.PROFESSIONAL, 'pitching-wedge');
      const pwDiff = pwWarm.carryDistance - pwCold.carryDistance;

      console.log(`Temperature effect over 40°F range:`);
      console.log(`  Driver (300y): ${driverDiff.toFixed(1)} yards`);
      console.log(`  PW (145y): ${pwDiff.toFixed(1)} yards`);

      // Driver should have larger absolute effect than wedge
      expect(driverDiff).toBeGreaterThan(pwDiff);
    });
  });

  describe('Altitude Effects (via station pressure)', () => {
    /**
     * TrackMan benchmark: ~4.5 yards per 1,000 feet for driver
     * 
     * Station pressure drops ~12 hPa per 100m (~36 hPa per 1000 ft)
     * At 5,000 ft: ~850 hPa
     * At 7,000 ft: ~780 hPa (Mexico City)
     */

    it('should show ~4-6 yards increase per 1,000 feet altitude for driver', () => {
      // Sea level (1013.25 hPa)
      model.setConditions(77, 0, 0, 0, 1013.25, 50);
      const seaLevel = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');

      // 5,000 ft altitude (~850 hPa station pressure)
      model.setConditions(77, 5000, 0, 0, 850, 50);
      const altitude5k = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');

      const diffPer1000ft = (altitude5k.carryDistance - seaLevel.carryDistance) / 5;
      
      console.log(`Altitude effect (driver 300y):`);
      console.log(`  Sea level (1013 hPa): ${seaLevel.carryDistance}y`);
      console.log(`  5,000 ft (850 hPa): ${altitude5k.carryDistance}y`);
      console.log(`  Per 1,000 ft: ${diffPer1000ft.toFixed(2)} yards`);

      // TrackMan says ~4.5 yards per 1,000 feet
      // Allow range of 3-7 yards
      expect(diffPer1000ft).toBeGreaterThan(3);
      expect(diffPer1000ft).toBeLessThan(7);
    });

    it('should show Mexico City (~7,000 ft) adds ~30+ yards to driver', () => {
      // Sea level
      model.setConditions(90, 0, 0, 0, 1013.25, 50);
      const seaLevel = model.calculateAdjustedYardage(250, SkillLevel.PROFESSIONAL, 'driver');

      // Mexico City: 7,340 ft, ~780 hPa, often hot
      model.setConditions(90, 7340, 0, 0, 780, 50);
      const mexicoCity = model.calculateAdjustedYardage(250, SkillLevel.PROFESSIONAL, 'driver');

      const diff = mexicoCity.carryDistance - seaLevel.carryDistance;
      
      console.log(`Mexico City effect (driver 250y at 90°F):`);
      console.log(`  Sea level: ${seaLevel.carryDistance}y`);
      console.log(`  Mexico City: ${mexicoCity.carryDistance}y`);
      console.log(`  Difference: ${diff.toFixed(1)} yards`);

      // Should be roughly 4.5 * 7 = 31.5 yards more
      expect(diff).toBeGreaterThan(20);
      expect(diff).toBeLessThan(45);
    });
  });

  describe('Wind Effects', () => {
    /**
     * TrackMan benchmark (Tour player, 300y driver):
     * - 20 mph headwind: 300 → 259 yards (-41 yards)
     * - 20 mph tailwind: 300 → 333 yards (+33 yards)
     * 
     * Key insight: Headwind hurts more than tailwind helps
     */

    it('should show significant headwind effect on driver', () => {
      // Calm conditions
      model.setConditions(77, 0, 0, 0, 1013.25, 50);
      const calm = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');

      // 20 mph headwind (wind direction 0 = into the shot)
      model.setConditions(77, 0, 20, 0, 1013.25, 50);
      const headwind = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');

      const diff = calm.carryDistance - headwind.carryDistance;
      
      console.log(`Headwind effect (driver 300y, 20 mph):`);
      console.log(`  Calm: ${calm.carryDistance}y`);
      console.log(`  20 mph headwind: ${headwind.carryDistance}y`);
      console.log(`  Loss: ${diff.toFixed(1)} yards`);

      // TrackMan shows -41 yards for 20 mph headwind on 300y drive
      // Allow range of 25-55 yards loss
      expect(diff).toBeGreaterThan(25);
      expect(diff).toBeLessThan(55);
    });

    it('should show tailwind helps less than headwind hurts', () => {
      // Calm conditions
      model.setConditions(77, 0, 0, 0, 1013.25, 50);
      const calm = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');

      // 20 mph headwind (0°)
      model.setConditions(77, 0, 20, 0, 1013.25, 50);
      const headwind = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');

      // 20 mph tailwind (180°)
      model.setConditions(77, 0, 20, 180, 1013.25, 50);
      const tailwind = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');

      const headwindLoss = calm.carryDistance - headwind.carryDistance;
      const tailwindGain = tailwind.carryDistance - calm.carryDistance;

      console.log(`Wind asymmetry (driver 300y, 20 mph):`);
      console.log(`  Headwind loss: ${headwindLoss.toFixed(1)} yards`);
      console.log(`  Tailwind gain: ${tailwindGain.toFixed(1)} yards`);
      console.log(`  Ratio (headwind/tailwind): ${(headwindLoss / tailwindGain).toFixed(2)}`);

      // TrackMan shows headwind hurts more: 41 yards loss vs 33 yards gain
      // The ratio should be > 1
      expect(headwindLoss).toBeGreaterThan(tailwindGain);
    });

    it('should show crosswind lateral movement', () => {
      // 15 mph crosswind from right (90°)
      model.setConditions(77, 0, 15, 90, 1013.25, 50);
      const rightWind = model.calculateAdjustedYardage(185, SkillLevel.PROFESSIONAL, '7-iron');

      // 15 mph crosswind from left (270°)
      model.setConditions(77, 0, 15, 270, 1013.25, 50);
      const leftWind = model.calculateAdjustedYardage(185, SkillLevel.PROFESSIONAL, '7-iron');

      console.log(`Crosswind effect (7-iron 185y, 15 mph):`);
      console.log(`  Right wind (90°): lateral = ${rightWind.lateralMovement}y`);
      console.log(`  Left wind (270°): lateral = ${leftWind.lateralMovement}y`);

      // Should show movement in opposite directions
      expect(rightWind.lateralMovement).not.toBe(0);
      expect(leftWind.lateralMovement).not.toBe(0);
      // Signs should be opposite
      expect(Math.sign(rightWind.lateralMovement)).toBe(-Math.sign(leftWind.lateralMovement));
    });
  });

  describe('Humidity Effects', () => {
    /**
     * TrackMan benchmark: <1 yard difference from 10% to 90% humidity on 6-iron
     * 
     * Counter-intuitive: humid air is LESS dense (water vapor is lighter than N2/O2)
     * So ball goes slightly FARTHER in humid conditions
     */

    it('should show minimal humidity effect (<2 yards)', () => {
      // Low humidity (10%)
      model.setConditions(77, 0, 0, 0, 1013.25, 10);
      const dry = model.calculateAdjustedYardage(198, SkillLevel.PROFESSIONAL, '6-iron');

      // High humidity (90%)
      model.setConditions(77, 0, 0, 0, 1013.25, 90);
      const humid = model.calculateAdjustedYardage(198, SkillLevel.PROFESSIONAL, '6-iron');

      const diff = Math.abs(humid.carryDistance - dry.carryDistance);
      
      console.log(`Humidity effect (6-iron 198y):`);
      console.log(`  10% humidity: ${dry.carryDistance}y`);
      console.log(`  90% humidity: ${humid.carryDistance}y`);
      console.log(`  Difference: ${diff.toFixed(2)} yards`);

      // TrackMan says <1 yard, we'll allow up to 2
      expect(diff).toBeLessThan(2);
    });

    it('should show humid air = slightly longer (lower density)', () => {
      model.setConditions(85, 0, 0, 0, 1013.25, 20);
      const dry = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');

      model.setConditions(85, 0, 0, 0, 1013.25, 95);
      const humid = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');

      console.log(`Humidity direction check (driver 300y at 85°F):`);
      console.log(`  20% humidity: ${dry.carryDistance}y`);
      console.log(`  95% humidity: ${humid.carryDistance}y`);

      // Humid air is less dense, ball should go farther
      expect(humid.carryDistance).toBeGreaterThanOrEqual(dry.carryDistance);
    });
  });

  describe('Combined Real-World Scenarios', () => {
    it('should handle hot summer day at altitude', () => {
      // Denver in July: 5,280 ft, 95°F, low humidity
      // Station pressure ~840 hPa
      model.setConditions(95, 5280, 0, 0, 840, 25);
      const denver = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');

      // Cold winter day at sea level: 45°F
      model.setConditions(45, 0, 0, 0, 1013.25, 50);
      const winter = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');

      const diff = denver.carryDistance - winter.carryDistance;

      console.log(`Extreme comparison (driver 300y):`);
      console.log(`  Denver summer (95°F, 5280 ft): ${denver.carryDistance}y`);
      console.log(`  Winter sea level (45°F): ${winter.carryDistance}y`);
      console.log(`  Difference: ${diff.toFixed(1)} yards`);

      // Should be massive difference (altitude + temperature)
      // ~24 yards from altitude + ~12 yards from temp = ~36 yards
      expect(diff).toBeGreaterThan(25);
      expect(diff).toBeLessThan(50);
    });

    it('should handle Scotland links conditions', () => {
      // Scotland: sea level, 55°F, 85% humidity, 20 mph headwind
      model.setConditions(55, 0, 20, 0, 1013.25, 85);
      const scotland = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');

      // Standard conditions
      model.setConditions(77, 0, 0, 0, 1013.25, 50);
      const standard = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');

      console.log(`Scotland vs Standard (driver 300y):`);
      console.log(`  Scotland (55°F, 20mph head): ${scotland.carryDistance}y`);
      console.log(`  Standard (77°F, calm): ${standard.carryDistance}y`);
      console.log(`  Playing shorter by: ${(standard.carryDistance - scotland.carryDistance).toFixed(1)} yards`);

      // Cold + headwind should significantly reduce distance
      expect(scotland.carryDistance).toBeLessThan(standard.carryDistance - 40);
    });
  });
});
