# Research Report: Professional Golf Altitude Effects Calculation Methods
Generated: 2026-01-29

## Summary

Professional golf systems (TrackMan, Foresight, Titleist) primarily use **air density calculations** derived from pressure, temperature, and humidity rather than simple altitude lookup tables. The commonly cited "2% per 1000 feet" rule is a rough empirical approximation, while the more accurate Titleist formula of **1.16% per 1000 feet (~0.00116 multiplier)** is derived from air density physics. The recommended approach is to use **station pressure** (actual barometric pressure at your location) for direct air density calculation, which inherently accounts for altitude effects.

## Questions Answered

### Q1: Do professional systems use pressure-based density OR altitude lookup tables OR both?

**Answer:** Professional systems primarily use **pressure-based air density calculations**, with altitude lookup tables serving as simplified fallbacks or sanity checks.

- **TrackMan**: Uses a baseline aerodynamic model with launch data and calculates ball flight based on altitude and temperature settings. The default normalization is 77F and sea level (0 feet). The system measures actual trajectory in real time, then projects what would happen under calm conditions at the specified altitude/temperature.

- **Foresight GCQuad**: Has a built-in barometer that measures actual environmental conditions (barometric pressure, temperature, altitude) and adjusts carry distance calculations accordingly. Users can toggle between using the device's barometer or manually entering altitude/conditions.

- **Titleist Engineering**: Uses the formula `distance_gain = elevation_feet * 0.00116` which is derived from air density physics, not a lookup table.

**Source:** [TrackMan Normalization Feature](https://www.trackman.com/blog/golf/normalization-feature-explained)
**Confidence:** High

---

### Q2: What is the "rule of thumb" for altitude effects?

**Answer:** There are **two common rules of thumb**, with the second being more accurate:

| Rule | Percentage | Per 1000 ft | Source |
|------|------------|-------------|--------|
| Simple rule | 2% | 2.0% | General golf folklore |
| Titleist formula | 1.16% | 1.16% | Titleist R&D engineering study |

**Practical examples:**
- Denver (5,280 ft): ~6% longer distance (using Titleist formula)
- Mexico City (7,835 ft): ~9.1% longer distance
- PGA yardage books for LIV Golf Mexico City reference 15% increase at ~7,900 ft

**Real-world validation:**
- Justin Thomas hit a 449-yard drive at Club de Golf Chapultepec (7,835 ft) - longest on Tour that season
- Phil Mickelson's caddie Jim Mackay tracked every shot Phil ever hit in Denver to calculate adjustments empirically

**Source:** [Titleist Altitude and Ball Flight](https://www.titleist.com/learning-lab/performance/altitude-and-golf-ball-flight)
**Confidence:** High

---

### Q3: Is the 2% per 1000ft rule derived from air density changes or is it empirical?

**Answer:** The 2% rule appears to be a **rounded empirical approximation**, while the more precise 1.16% figure from Titleist is **derived from aerodynamic physics**.

**The physics basis:**
- Air density decreases approximately exponentially with altitude
- Below 10 km, air density decreases on average by ~1.5% per 100 meters of altitude (including temperature effects)
- At Denver (1 mile), air density is approximately 82% of sea-level conditions
- The drag force equation is: `R = 0.5 * Cd * rho * A * V^2` where rho is air density
- Less dense air = less drag = longer ball flight

**Why 1.16% not 2%:**
- The 2% rule likely includes a safety margin or accounts for additional factors (temperature, reduced lift, etc.)
- The Titleist 1.16% (0.00116 multiplier) is more precisely derived from pure air density changes affecting drag
- Actual altitude effects are non-linear due to the exponential nature of atmospheric pressure decline

**Source:** [Physics of Golf Ball Altitude Effects](http://golf.okrasa.eu/language/en/golf-ball/influence-of-weather-and-altitude-on-ball-flight/)
**Confidence:** Medium (derivation methodology not fully documented in public sources)

---

### Q4: How does TrackMan separate density effects from altitude effects?

**Answer:** TrackMan does **not truly separate them** - altitude is used as a proxy for reduced air density, which is the actual physical mechanism.

**TrackMan's approach:**
1. User sets altitude and temperature in TPS (TrackMan Performance Studio)
2. System calculates expected air density from these inputs
3. Normalization feature computes what ball flight would be under calm conditions at that altitude/temperature
4. Three forces are modeled: gravity, lift, and drag (all density-dependent)

**Key insight:** "Thinner air exerts less drag force on the ball, so it moves more easily through the air and doesn't slow down as quickly as it flies."

**What's NOT captured by altitude alone:**
- Temperature variations (warmer = less dense = longer flight)
- Humidity (counterintuitively, humid air is less dense than dry air)
- Barometric pressure variations (high/low pressure systems)
- Reduced lift at altitude (ball flies flatter trajectory)
- Reduced Magnus effect (curves less at altitude)

**Source:** [TrackMan Blog - How Altitude Affects Ball Flight](https://blog.trackmangolf.com/how-altitude-affects-the-distance-your-ball-flies/)
**Confidence:** High

---

### Q5: Recommended approach - station pressure (includes altitude) or MSL pressure + altitude adjustment?

**Answer:** **Use station pressure for air density calculations** - this is the recommended approach for accuracy.

**Why station pressure:**
- Station pressure is the actual barometric pressure at your location
- It inherently accounts for altitude (no separate altitude adjustment needed)
- It captures real-time atmospheric variations (pressure systems, weather fronts)
- Professional golf launch monitors (GCQuad) use built-in barometers measuring station pressure

**Station pressure vs. sea-level pressure:**
- Weather reports typically show sea-level pressure (adjusted for altitude)
- Sea-level pressure = station pressure + altitude correction
- Station pressure at 4,500 ft is approximately 25.64 inHg vs. 30.14 inHg at sea level

**The calculation workflow:**
1. Get station pressure (from weather sensor or calculate from reported barometric pressure minus altitude)
2. Get temperature and humidity
3. Calculate actual air density using ideal gas law with moisture correction
4. Calculate density ratio vs. standard sea-level density (1.225 kg/m^3)
5. Apply density-based distance adjustment

**Formula for moist air density:**
```
rho = (Pd / (Rd * T)) + (Pv / (Rv * T))

Where:
- Pd = partial pressure of dry air (station pressure - vapor pressure)
- Pv = partial pressure of water vapor
- Rd = gas constant for dry air (287.05 J/(kg*K))
- Rv = gas constant for water vapor (461.495 J/(kg*K))
- T = temperature in Kelvin
```

**Source:** [Kestrel Instruments - Barometric vs Station Pressure](https://kestrelinstruments.com/blog/barometric-pressure-vs-station-pressure-whats-the-difference)
**Confidence:** High

---

## Detailed Findings

### Finding 1: PGA Tour Real-World Altitude Adjustments

**Source:** [PGA Tour - Altitude Adjustment Colorado](https://www.pgatour.com/article/news/latest/2024/08/21/altitude-adjustment-colorado-castle-pines-golf-club-elevation-challenge-bmw-championship)

**Key Points:**
- Castle Pines (BMW Championship) is 6,368 feet - players experience 7.4% more distance
- Club de Golf Chapultepec (Mexico City) at 7,835 feet is the highest course ever played on PGA Tour
- Players multiply distance by a fixed percentage (10-15%) then subtract from actual yardage
- Phil Mickelson kept historical records of every shot in Denver for empirical adjustments

**Code Reference from Current Codebase:**
```typescript
// From /home/tfunk1030/bnredo/src/core/models/yardagemodel.ts
// ALTITUDE_EFFECTS lookup table (lines 205-215)
private static readonly ALTITUDE_EFFECTS: Readonly<Record<number, number>> = {
  0: 1.000,
  1000: 1.021,  // 2.1% at 1000ft
  2000: 1.043,  // 4.3% at 2000ft
  3000: 1.065,  // 6.5% at 3000ft
  4000: 1.088,  // 8.8% at 4000ft
  5000: 1.112,  // 11.2% at 5000ft
  6000: 1.137,  // 13.7% at 6000ft
  7000: 1.163,  // 16.3% at 7000ft
  8000: 1.190   // 19.0% at 8000ft
};
```

**Note:** The current codebase uses ~2.1% per 1000 ft, which is slightly higher than the Titleist 1.16% figure. This may be intentional to include secondary effects (trajectory changes, reduced lift, etc.).

---

### Finding 2: Temperature vs. Altitude Priority

**Source:** [TrackMan Blog - Weather Effects](https://blog.trackmangolf.com/learn-weather-affect-ball-flight/)

**Key Points:**
- **Temperature has the greatest effect** on distance among weather factors
- Going from 40F to 100F increases a 6-iron by almost 8 yards (driver by 9 yards)
- That's approximately 1 yard per 10F temperature change
- **Humidity has minimal effect** - 10% to 90% humidity accounts for less than 1 yard on a 6-iron
- **Pressure alone has minimal effect** - less than 1 yard difference

**Magnitude comparison:**
| Factor | Effect on Distance |
|--------|-------------------|
| Temperature (40F to 100F) | +8-9 yards (driver) |
| Altitude (sea level to 5000ft) | +15 yards (driver at 250yd) |
| Humidity (10% to 90%) | <1 yard |
| Pressure variations | <1 yard |

---

### Finding 3: Air Density Formula Implementation

**Source:** [Physics Forum - Golf Ball Weather Effects](https://www.physicsforums.com/threads/how-weather-conditions-affect-a-golf-shot.1010258/)

**Current implementation analysis:**
The codebase at `/home/tfunk1030/bnredo/src/core/models/yardagemodel.ts` (lines 253-264) uses the correct formula:

```typescript
private calculateAirDensity(tempF: number, pressureMb: number, humidity: number): number {
  const tempC = (tempF - 32) * 5/9;
  const pressurePa = pressureMb * 100;

  // Magnus equation for saturation vapor pressure
  const svp = MAGNUS_A * Math.exp((MAGNUS_B * tempC) / (tempC + MAGNUS_C));
  const vaporPressure = (humidity / 100) * svp;

  // Sum of dry air density and water vapor density
  return (pressurePa - vaporPressure * 100) / (GAS_CONSTANT_DRY * (tempC + 273.15)) +
         vaporPressure * 100 / (GAS_CONSTANT_VAPOR * (tempC + 273.15));
}
```

**This is correct** - it calculates air density from pressure (expected to be station pressure), temperature, and humidity using the standard moist air density formula.

---

## Comparison Matrix

| Approach | Pros | Cons | Use Case |
|----------|------|------|----------|
| **Station Pressure + Air Density** | Most accurate; captures real-time weather; no separate altitude adjustment | Requires accurate barometer or station pressure data | Professional applications, launch monitors |
| **Altitude Lookup Table** | Simple; easy mental math; no sensor needed | Less accurate; misses pressure variations; fixed increments | Quick estimates, casual play |
| **MSL Pressure + Altitude Adjustment** | Uses readily available weather data | Requires conversion; potential for errors | When only MSL pressure available |
| **Hybrid (current codebase)** | Uses both density calculation AND has altitude lookup | Redundant; may double-count altitude | Fallback/validation approach |

---

## Recommendations

### For This Codebase

1. **Continue using air density calculation** - The current implementation at line 253-264 is correct and matches professional approaches.

2. **Clarify pressure input type** - Document whether `setConditions()` expects station pressure or MSL pressure. For accuracy, it should be station pressure.

3. **Review ALTITUDE_EFFECTS table usage** - The lookup table (lines 205-215) appears unused in the current `calculateEnvironmentalFactor()` method. Consider whether to:
   - Remove it (if air density calculation is sufficient)
   - Use it as a fallback when pressure data is unavailable
   - Use it for validation/sanity checking

4. **Consider the 1.16% vs 2.1% discrepancy** - The current table uses ~2.1% per 1000ft. This is higher than Titleist's 1.16% figure. Options:
   - Reduce to match Titleist (more conservative)
   - Keep at 2.1% if it includes secondary effects (trajectory flattening, reduced lift)
   - Document the reasoning for the chosen value

### Implementation Notes

- **Station pressure from weather APIs:** Open-Meteo (currently used per CLAUDE.md) provides `surface_pressure` which is station pressure - this is the correct value to use.

- **Avoid double-counting:** If using air density from station pressure, do NOT also apply a separate altitude adjustment. The altitude effect is already captured in the lower station pressure.

- **Temperature adjustment priority:** Given temperature has the largest effect, ensure temperature is accurately captured and the temperature-to-density relationship is properly modeled.

---

## Sources

1. [TrackMan Normalization Feature Explained](https://www.trackman.com/blog/golf/normalization-feature-explained) - Official TrackMan documentation on how normalization works
2. [TrackMan Blog - How Altitude Affects Ball Flight](https://blog.trackmangolf.com/how-altitude-affects-the-distance-your-ball-flies/) - Detailed altitude effects explanation
3. [Titleist Learning Lab - Altitude and Ball Flight](https://www.titleist.com/learning-lab/performance/altitude-and-golf-ball-flight) - Titleist R&D formula (0.00116 multiplier)
4. [Titleist Team Blog - Golf Ball Aerodynamics and Altitude](https://www.titleist.com/teamtitleist/b/tourblog/posts/the-effect-of-altitude-golf-ball-aerodynamics) - Technical aerodynamics discussion
5. [PGA Tour - Altitude Adjustment Colorado BMW Championship](https://www.pgatour.com/article/news/latest/2024/08/21/altitude-adjustment-colorado-castle-pines-golf-club-elevation-challenge-bmw-championship) - Real-world pro tournament adjustments
6. [PGA Tour - WGC Mexico Championship Altitude](https://www.pgatour.com/article/news/long-form/2017/02/28/elevated-expectations-wgc-mexico-championship-altitude) - Mexico City course at 7,835 ft
7. [Kestrel Instruments - Barometric vs Station Pressure](https://kestrelinstruments.com/blog/barometric-pressure-vs-station-pressure-whats-the-difference) - Pressure measurement explanation
8. [Golf Ball Weather Effects Calculator](http://golf.okrasa.eu/language/en/golf-ball/influence-of-weather-and-altitude-on-ball-flight/) - Interactive calculator with physics explanation
9. [Golf Digest - Pro Adjustments at Mexico Championship](https://www.golfdigest.com/story/heres-what-tour-pros-are-doing-at-the-wgc-mexico-championship-to-adjust-to-playing-at-altitude) - How pros adjust at altitude
10. [Engineering Toolbox - Air Density vs Altitude](https://www.engineeringtoolbox.com/air-altitude-density-volume-d_195.html) - Engineering reference for density calculations

---

## Open Questions

- **Why does the codebase use ~2.1% per 1000ft when Titleist uses 1.16%?** Is the higher value intentional to account for secondary effects, or should it be adjusted?

- **Is the ALTITUDE_EFFECTS lookup table still needed?** It appears unused in the current environmental factor calculation which relies on air density directly.

- **What pressure value does the weather service provide?** Need to verify if Open-Meteo's `surface_pressure` is being used correctly as station pressure.
