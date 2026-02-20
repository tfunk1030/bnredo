/**
 * Debug: Trace air density calculations
 */

import { YardageModelEnhanced, SkillLevel } from '../../core/models/yardagemodel';

describe('Air Density Debug', () => {
  let model: YardageModelEnhanced;

  beforeEach(() => {
    model = new YardageModelEnhanced();
  });

  it('should trace air density at various conditions', () => {
    // We need to expose the air density calculation
    // For now, let's reverse-engineer from the environmental factor
    
    const testCases = [
      { temp: 77, pressure: 1013.25, humidity: 50, alt: 0, label: 'Standard (77°F, sea level)' },
      { temp: 59, pressure: 1013.25, humidity: 50, alt: 0, label: 'ISA Standard (59°F, sea level)' },
      { temp: 50, pressure: 1013.25, humidity: 50, alt: 0, label: 'Cold (50°F, sea level)' },
      { temp: 95, pressure: 1013.25, humidity: 50, alt: 0, label: 'Hot (95°F, sea level)' },
      { temp: 77, pressure: 850, humidity: 50, alt: 5000, label: '5000ft altitude' },
      { temp: 77, pressure: 780, humidity: 50, alt: 7000, label: '7000ft (Mexico City)' },
    ];

    console.log('\n=== Air Density Analysis ===\n');
    console.log('Reference: ISA sea level density = 1.225 kg/m³ at 59°F (15°C)');
    console.log('Model reference: 1.193 kg/m³ (AIR_DENSITY_SEA_LEVEL constant)\n');

    for (const tc of testCases) {
      model.setConditions(tc.temp, tc.alt, 0, 0, tc.pressure, tc.humidity);
      const result = model.calculateAdjustedYardage(300, SkillLevel.PROFESSIONAL, 'driver');
      
      // Environmental factor = result / input (approximately, ignoring skill level)
      const envFactor = result.carryDistance / 300;
      
      console.log(`${tc.label}:`);
      console.log(`  Input: 300y → Output: ${result.carryDistance}y`);
      console.log(`  Env factor: ${envFactor.toFixed(4)} (${((envFactor - 1) * 100).toFixed(2)}%)`);
      console.log('');
    }
  });

  it('should calculate expected air density values', () => {
    // Manual air density calculation for verification
    // ρ = (P_dry / R_dry * T) + (P_vapor / R_vapor * T)
    
    const R_dry = 287.058;  // J/(kg·K)
    const R_vapor = 461.495;  // J/(kg·K)
    const MAGNUS_A = 6.1121;
    const MAGNUS_B = 17.502;
    const MAGNUS_C = 240.97;

    function calcDensity(tempF: number, pressureMb: number, humidity: number): number {
      const tempC = (tempF - 32) * 5/9;
      const tempK = tempC + 273.15;
      const pressurePa = pressureMb * 100;

      // Saturation vapor pressure (Magnus formula)
      const svp = MAGNUS_A * Math.exp((MAGNUS_B * tempC) / (tempC + MAGNUS_C));
      const vaporPressure = (humidity / 100) * svp;
      const vaporPressurePa = vaporPressure * 100;

      // Air density
      const dryPressurePa = pressurePa - vaporPressurePa;
      return (dryPressurePa / (R_dry * tempK)) + (vaporPressurePa / (R_vapor * tempK));
    }

    console.log('\n=== Manual Air Density Calculations ===\n');
    
    const cases = [
      { temp: 59, pressure: 1013.25, humidity: 0, label: 'ISA Standard (59°F, dry)' },
      { temp: 77, pressure: 1013.25, humidity: 50, label: 'TrackMan ref (77°F, 50% RH)' },
      { temp: 50, pressure: 1013.25, humidity: 50, label: 'Cold (50°F)' },
      { temp: 95, pressure: 1013.25, humidity: 50, label: 'Hot (95°F)' },
      { temp: 77, pressure: 850, humidity: 50, label: '5000ft (850 hPa)' },
    ];

    const refDensity = 1.225; // ISA standard
    
    for (const c of cases) {
      const density = calcDensity(c.temp, c.pressure, c.humidity);
      const ratio = density / refDensity;
      console.log(`${c.label}:`);
      console.log(`  Density: ${density.toFixed(4)} kg/m³`);
      console.log(`  Ratio to ISA: ${ratio.toFixed(4)} (${((1 - ratio) * 100).toFixed(2)}% less dense = farther)`);
      console.log('');
    }

    // What should the distance effect be?
    console.log('=== Expected Distance Effects ===\n');
    console.log('If drag ∝ density, and drag reduces distance:');
    console.log('Lower density → less drag → ball goes farther\n');
    
    const standard = calcDensity(77, 1013.25, 50);
    const cold = calcDensity(50, 1013.25, 50);
    const hot = calcDensity(95, 1013.25, 50);
    
    // Simple approximation: 1% density change ≈ 0.5% distance change (drag is half the story)
    const coldRatio = cold / standard;
    const hotRatio = hot / standard;
    
    console.log(`Cold (50°F) vs Standard (77°F):`);
    console.log(`  Density ratio: ${coldRatio.toFixed(4)}`);
    console.log(`  If linear: ${((1 - coldRatio) * 300 * 0.5).toFixed(1)}y shorter`);
    
    console.log(`\nHot (95°F) vs Standard (77°F):`);
    console.log(`  Density ratio: ${hotRatio.toFixed(4)}`);
    console.log(`  If linear: ${((1 - hotRatio) * 300 * 0.5).toFixed(1)}y longer`);
  });
});
