/**
 * Before/After Comparison: Current vs Proposed Physics Model
 * 
 * This test shows what the output would look like with the proposed fix.
 */

import { YardageModelEnhanced, SkillLevel } from '../../core/models/yardagemodel';

// Proposed new calculation (for comparison)
function proposedEnvironmentalFactor(
  tempF: number, 
  pressureMb: number, 
  humidity: number
): number {
  // Air density calculation (same as current)
  const MAGNUS_A = 6.1121;
  const MAGNUS_B = 17.502;
  const MAGNUS_C = 240.97;
  const R_DRY = 287.058;
  const R_VAPOR = 461.495;

  const tempC = (tempF - 32) * 5/9;
  const tempK = tempC + 273.15;
  const pressurePa = pressureMb * 100;

  const svp = MAGNUS_A * Math.exp((MAGNUS_B * tempC) / (tempC + MAGNUS_C));
  const vaporPressure = (humidity / 100) * svp;
  const vaporPressurePa = vaporPressure * 100;
  const dryPressurePa = pressurePa - vaporPressurePa;

  const density = (dryPressurePa / (R_DRY * tempK)) + (vaporPressurePa / (R_VAPOR * tempK));

  // NEW: Reference density at TrackMan standard (77°F, 1013.25 hPa, 50% RH)
  const REFERENCE_DENSITY = 1.177;  // Calculated, not arbitrary
  
  // NEW: Linear model with calibrated coefficient
  const COEFFICIENT = 0.5;  // 1% less dense → 0.5% more distance
  
  const densityRatio = density / REFERENCE_DENSITY;
  return 1 + COEFFICIENT * (1 - densityRatio);
}

describe('Before/After Comparison', () => {
  let model: YardageModelEnhanced;

  beforeEach(() => {
    model = new YardageModelEnhanced();
    model.setBallModel('tour_premium');
  });

  it('should compare temperature effects', () => {
    const temps = [50, 59, 67, 77, 87, 95, 105];
    const targetYardage = 300;

    console.log('\n=== TEMPERATURE EFFECTS (300y driver, sea level) ===\n');
    console.log('Temp°F | Current | Proposed | TrackMan Est | Current Δ | Proposed Δ');
    console.log('-------|---------|----------|--------------|-----------|------------');

    const results: { temp: number; current: number; proposed: number; trackman: number }[] = [];

    for (const temp of temps) {
      // Current model
      model.setConditions(temp, 0, 0, 0, 1013.25, 50);
      const current = model.calculateAdjustedYardage(targetYardage, SkillLevel.PROFESSIONAL, 'driver');

      // Proposed model
      const proposedFactor = proposedEnvironmentalFactor(temp, 1013.25, 50);
      const proposed = targetYardage * proposedFactor;

      // TrackMan estimate (2.5 yards per 10°F from 77°F baseline)
      const trackman = 300 + ((temp - 77) / 10) * 2.5;

      results.push({ temp, current: current.carryDistance, proposed, trackman });

      const currentDelta = current.carryDistance - 300;
      const proposedDelta = proposed - 300;

      console.log(
        `${temp.toString().padStart(5)}°F | ${current.carryDistance.toFixed(1).padStart(7)}y | ` +
        `${proposed.toFixed(1).padStart(8)}y | ${trackman.toFixed(1).padStart(12)}y | ` +
        `${(currentDelta >= 0 ? '+' : '') + currentDelta.toFixed(1).padStart(8)}y | ` +
        `${(proposedDelta >= 0 ? '+' : '') + proposedDelta.toFixed(1).padStart(9)}y`
      );
    }

    // Calculate yards per 10°F
    const currentPer10F = (results[5].current - results[1].current) / 3.6; // 95-59 = 36°F
    const proposedPer10F = (results[5].proposed - results[1].proposed) / 3.6;

    console.log('\n--- Sensitivity ---');
    console.log(`Current:  ${currentPer10F.toFixed(2)} yards per 10°F`);
    console.log(`Proposed: ${proposedPer10F.toFixed(2)} yards per 10°F`);
    console.log(`TrackMan: 2.50 yards per 10°F`);
  });

  it('should compare altitude effects', () => {
    const altitudes = [
      { alt: 0, pressure: 1013.25, label: 'Sea level' },
      { alt: 1000, pressure: 977, label: '1,000 ft' },
      { alt: 2000, pressure: 942, label: '2,000 ft' },
      { alt: 3000, pressure: 908, label: '3,000 ft' },
      { alt: 4000, pressure: 875, label: '4,000 ft' },
      { alt: 5000, pressure: 843, label: '5,000 ft (Denver)' },
      { alt: 7000, pressure: 780, label: '7,000 ft (Mexico City)' },
    ];
    const targetYardage = 300;

    console.log('\n=== ALTITUDE EFFECTS (300y driver, 77°F, 50% humidity) ===\n');
    console.log('Altitude        | Pressure | Current | Proposed | TrackMan Est | Current Δ | Proposed Δ');
    console.log('----------------|----------|---------|----------|--------------|-----------|------------');

    const results: { alt: number; current: number; proposed: number; trackman: number }[] = [];

    for (const { alt, pressure, label } of altitudes) {
      // Current model
      model.setConditions(77, alt, 0, 0, pressure, 50);
      const current = model.calculateAdjustedYardage(targetYardage, SkillLevel.PROFESSIONAL, 'driver');

      // Proposed model
      const proposedFactor = proposedEnvironmentalFactor(77, pressure, 50);
      const proposed = targetYardage * proposedFactor;

      // TrackMan estimate (4.5 yards per 1000ft)
      const trackman = 300 + (alt / 1000) * 4.5;

      results.push({ alt, current: current.carryDistance, proposed, trackman });

      const currentDelta = current.carryDistance - 300;
      const proposedDelta = proposed - 300;

      console.log(
        `${label.padEnd(15)} | ${pressure.toString().padStart(7)} hPa | ` +
        `${current.carryDistance.toFixed(1).padStart(7)}y | ${proposed.toFixed(1).padStart(8)}y | ` +
        `${trackman.toFixed(1).padStart(12)}y | ` +
        `${(currentDelta >= 0 ? '+' : '') + currentDelta.toFixed(1).padStart(8)}y | ` +
        `${(proposedDelta >= 0 ? '+' : '') + proposedDelta.toFixed(1).padStart(9)}y`
      );
    }

    // Calculate yards per 1000ft
    const currentPer1000ft = (results[4].current - results[0].current) / 5;
    const proposedPer1000ft = (results[4].proposed - results[0].proposed) / 5;

    console.log('\n--- Sensitivity ---');
    console.log(`Current:  ${currentPer1000ft.toFixed(2)} yards per 1000ft`);
    console.log(`Proposed: ${proposedPer1000ft.toFixed(2)} yards per 1000ft`);
    console.log(`TrackMan: 4.50 yards per 1000ft`);
  });

  it('should compare real-world scenarios', () => {
    const scenarios = [
      { name: 'Standard (TrackMan ref)', temp: 77, alt: 0, pressure: 1013.25, humidity: 50 },
      { name: 'Winter morning FL', temp: 55, alt: 0, pressure: 1020, humidity: 70 },
      { name: 'Summer afternoon TX', temp: 98, alt: 500, pressure: 1005, humidity: 45 },
      { name: 'Denver summer', temp: 85, alt: 5280, pressure: 840, humidity: 25 },
      { name: 'Scotland links', temp: 52, alt: 0, pressure: 1008, humidity: 85 },
      { name: 'Phoenix desert', temp: 105, alt: 1100, pressure: 970, humidity: 15 },
      { name: 'Mexico City', temp: 75, alt: 7340, pressure: 775, humidity: 50 },
    ];

    console.log('\n=== REAL-WORLD SCENARIOS (300y driver) ===\n');
    console.log('Scenario              | Current | Proposed | Difference');
    console.log('----------------------|---------|----------|------------');

    for (const s of scenarios) {
      // Current model
      model.setConditions(s.temp, s.alt, 0, 0, s.pressure, s.humidity);
      const current = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');

      // Proposed model
      const proposedFactor = proposedEnvironmentalFactor(s.temp, s.pressure, s.humidity);
      const proposed = 300 * proposedFactor;

      const diff = proposed - current.carryDistance;

      console.log(
        `${s.name.padEnd(21)} | ${current.carryDistance.toFixed(1).padStart(7)}y | ` +
        `${proposed.toFixed(1).padStart(8)}y | ${(diff >= 0 ? '+' : '') + diff.toFixed(1).padStart(9)}y`
      );
    }
  });

  it('should compare wind effects (no change expected)', () => {
    // Wind calculations should remain unchanged - they use the environmental factor correctly
    const windSpeeds = [0, 10, 20];
    const windAngles = [0, 90, 180]; // headwind, crosswind, tailwind

    console.log('\n=== WIND EFFECTS (unchanged, for reference) ===\n');
    console.log('Wind calculations are separate from environmental - no changes proposed');
    console.log('');

    for (const speed of windSpeeds) {
      for (const angle of windAngles) {
        model.setConditions(77, 0, speed, angle, 1013.25, 50);
        const result = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');
        const direction = angle === 0 ? 'head' : angle === 180 ? 'tail' : 'cross';
        console.log(`${speed}mph ${direction.padEnd(5)}: carry=${result.carryDistance}y, lateral=${result.lateralMovement}y`);
      }
    }
  });
});
