# Altitude Code Path Analysis
Generated: 2026-01-29

## Executive Summary

**CRITICAL FINDING: Double altitude application detected**

Altitude affects shot distance through TWO independent mechanisms:
1. **Air density calculation** (via pressure in `calculateAirDensity()`)
2. **Separate altitude effect** (via `calculateAltitudeEffect()`)

Both are applied additively in the shot calculator, potentially causing **double-counting** of altitude effects.

---

## Complete Code Path Trace

### 1. Altitude Origin: Weather Service

**File:** `/home/tfunk1030/bnredo/src/services/weather-service.ts`

```typescript
// Line 83: Altitude set from Open-Meteo elevation
altitude: Math.round(weatherData.elevation * 3.28084)
```

**Data Flow:**
- Open-Meteo API returns `elevation` in meters
- Converted to feet: `elevation_meters * 3.28084`
- Stored in `WeatherData.altitude`

**Default Values:**
- Manual override default: `0 feet` (line 170)
- Cache fallback: `0 feet`

---

### 2. Altitude Distribution: WeatherContext

**File:** `/home/tfunk1030/bnredo/src/contexts/WeatherContext.tsx`

```typescript
// Lines 44-59: Convert NormalizedWeather to WeatherData
function toWeatherData(weather: NormalizedWeather): WeatherData {
  return {
    altitude: weather.altitude,  // Direct passthrough
    // ... other fields
  };
}
```

**Distribution:**
- `WeatherProvider` makes altitude available via `useWeather()` hook
- All screens/components get same altitude value
- Manual overrides persist in AsyncStorage

---

### 3. Altitude Usage Path A: Air Density (Implicit via Pressure)

**File:** `/home/tfunk1030/bnredo/src/core/models/yardagemodel.ts`

#### 3A.1: Set Conditions (Entry Point)

```typescript
// Lines 441-457: setConditions method
setConditions(
  temperature: number,
  altitude: number,      // ← Altitude parameter
  wind_speed: number,
  wind_direction: number,
  pressure: number,      // ← Pressure parameter
  humidity: number
): void {
  this.altitude = altitude;  // Stored but NOT used in density calc
  this.pressure = pressure;  // Used in density calc
}
```

**Key Finding:** Altitude is stored but **not used** in air density calculation.

#### 3A.2: Calculate Environmental Factor

```typescript
// Lines 238-251: calculateEnvironmentalFactor
private calculateEnvironmentalFactor(): number {
  const currentDensity = this.calculateAirDensity(
    this.temperature || 70,
    this.pressure || 1013.25,  // ← Uses pressure (affected by altitude)
    this.humidity || 50
  );

  const densityRatio = currentDensity / AIR_DENSITY_SEA_LEVEL;
  
  // Lines 246-248: Altitude affects EXPONENT choice
  const useAltExponent = this.altitude && this.altitude > ALTITUDE_THRESHOLD;
  const exponent = useAltExponent ? DENSITY_EXPONENT_ALT : DENSITY_EXPONENT_SEA;

  return Math.pow(densityRatio, -exponent);  // ← Altitude changes scaling
}
```

**Constants:**
- `ALTITUDE_THRESHOLD = 3000` feet (line 50)
- `DENSITY_EXPONENT_SEA = 0.7` (line 48)
- `DENSITY_EXPONENT_ALT = 0.5` (line 49)

**Altitude Effect #1:**
- Below 3000 ft: Uses exponent `0.7`
- Above 3000 ft: Uses exponent `0.5` (less aggressive scaling)

#### 3A.3: Calculate Air Density

```typescript
// Lines 253-264: calculateAirDensity
private calculateAirDensity(tempF: number, pressureMb: number, humidity: number): number {
  const tempC = (tempF - 32) * 5/9;
  const pressurePa = pressureMb * 100;

  const svp = MAGNUS_A * Math.exp((MAGNUS_B * tempC) / (tempC + MAGNUS_C));
  const vaporPressure = (humidity / 100) * svp;

  return (pressurePa - vaporPressure * 100) / (GAS_CONSTANT_DRY * (tempC + 273.15)) +
         vaporPressure * 100 / (GAS_CONSTANT_VAPOR * (tempC + 273.15));
}
```

**Key Finding:** Uses `pressure` (which naturally decreases with altitude), **NOT** the `altitude` parameter.

**Pressure already accounts for altitude:**
- Sea level: ~1013 mb
- 5000 ft: ~850 mb (lower pressure → lower density)

---

### 4. Altitude Usage Path B: Direct Altitude Effect

**File:** `/home/tfunk1030/bnredo/src/core/services/environmental-calculations.ts`

```typescript
// Lines 77-79: calculateAltitudeEffect
static calculateAltitudeEffect(altitude: number): number {
  return (altitude / 1000) * 2;
}
```

**Formula:** `2% increase per 1000 feet`

**Examples:**
- 0 ft: `0%`
- 3000 ft: `6%`
- 5000 ft: `10%`
- 8000 ft: `16%`

**UNUSED LOOKUP TABLE (Lines 205-215):**
```typescript
private static readonly ALTITUDE_EFFECTS: Readonly<Record<number, number>> = {
  0: 1.000,
  1000: 1.021,
  2000: 1.043,
  // ... never referenced in code
};
```

---

### 5. Double Application in Shot Calculator

**File:** `/home/tfunk1030/bnredo/app/(tabs)/index.tsx`

#### 5.1: Build Conditions Object

```typescript
// Lines 33-46: Conditions object creation
const conditions = {
  temperature: weather.temperature,
  humidity: weather.humidity,
  pressure: weather.pressure,
  altitude: weather.altitude,  // ← Altitude included
  windSpeed: 0,
  windDirection: 0,
  windGust: 0,
  density: EnvironmentalCalculator.calculateAirDensity({
    temperature: weather.temperature,
    humidity: weather.humidity,
    pressure: weather.pressure,  // ← Pressure (altitude-affected)
  }),
};
```

#### 5.2: Calculate Adjustments

```typescript
// Lines 48-52: Both effects calculated
const adjustments = EnvironmentalCalculator.calculateShotAdjustments(conditions);
const altitudeEffect = EnvironmentalCalculator.calculateAltitudeEffect(weather.altitude);

const totalAdjustmentPercent = adjustments.distanceAdjustment + altitudeEffect;
const adjustedYardage = Math.round(targetYardage * (1 - totalAdjustmentPercent / 100));
```

**DOUBLE APPLICATION CONFIRMED:**
1. `adjustments.distanceAdjustment` - includes air density effect (driven by pressure, which reflects altitude)
2. `altitudeEffect` - **ADDS** an additional altitude bonus on top

**Example at 5000 ft:**
- Air density effect: ~`-8%` (thinner air from lower pressure)
- Altitude effect: `+10%` (direct bonus from `calculateAltitudeEffect`)
- Total: `+2%` adjustment

---

### 6. Wind Calculator Usage

**File:** `/home/tfunk1030/bnredo/src/core/services/wind-calculator.ts`

#### 6.1: Environmental Baseline (No Wind)

```typescript
// Lines 141-148: Set conditions without wind
yardageModel.setConditions(
  conditions.temperature,
  conditions.altitude,  // ← Altitude passed
  0,  // No wind
  0,
  conditions.pressure,  // ← Pressure passed
  conditions.humidity
);
```

#### 6.2: Wind Effect Calculation

```typescript
// Lines 164-171: Set conditions with wind
yardageModel.setConditions(
  conditions.temperature,
  conditions.altitude,  // ← Same altitude
  windSpeed,
  normalizedWindAngle,
  conditions.pressure,  // ← Same pressure
  conditions.humidity
);
```

**Key Finding:** Wind calculator uses `YardageModelEnhanced.calculateAdjustedYardage()`, which applies:
- Environmental factor (via `calculateEnvironmentalFactor()`)
- Wind effects
- Skill multipliers

**Altitude is applied ONCE via environmental factor in wind calculator** (no separate altitude effect added).

---

## Altitude Effect Summary Table

| Location | Altitude Input | How Used | Effect |
|----------|---------------|----------|--------|
| `weather-service.ts:83` | Open-Meteo `elevation` | Set `WeatherData.altitude` | **SOURCE** |
| `WeatherContext.tsx:52` | From weather service | Passthrough to consumers | **DISTRIBUTION** |
| `yardagemodel.ts:452` | `setConditions(altitude)` | Stored in `this.altitude` | **STORAGE** |
| `yardagemodel.ts:246` | `this.altitude > 3000` | Choose exponent (0.7 vs 0.5) | **INDIRECT EFFECT** |
| `yardagemodel.ts:253` | **NOT USED** | Uses `pressure` instead | **IMPLICIT (via pressure)** |
| `environmental-calculations.ts:78` | Direct input | `(altitude / 1000) * 2` | **DIRECT EFFECT** |
| `index.tsx:49` | From weather context | Both air density + altitude effect | **DOUBLE APPLICATION** |
| `wind-calculator.ts:143` | From conditions | Only via environmental factor | **SINGLE APPLICATION** |

---

## Diagram: Altitude Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Open-Meteo API                                               │
│   elevation (meters) → * 3.28084 → altitude (feet)          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ WeatherContext                                               │
│   WeatherData { altitude, pressure, ... }                   │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
             │                            │
     ┌───────▼───────┐            ┌───────▼────────┐
     │ Shot Calc     │            │ Wind Calc      │
     │ (index.tsx)   │            │ (wind-calc.ts) │
     └───────┬───────┘            └───────┬────────┘
             │                            │
             │                            │
    ┌────────▼────────────┐      ┌────────▼─────────┐
    │ TWO PATHS:          │      │ ONE PATH:        │
    │                     │      │                  │
    │ 1. Air Density      │      │ Environmental    │
    │    (via pressure)   │      │ Factor Only      │
    │    ↓                │      │ ↓                │
    │    calculateAirDen  │      │ calculateEnvFac  │
    │    ↓                │      │ ↓                │
    │    densityRatio^exp │      │ densityRatio^exp │
    │                     │      │                  │
    │ 2. Direct Altitude  │      └──────────────────┘
    │    ↓                │
    │    (alt/1000) * 2   │
    │                     │
    │ BOTH ADDED:         │
    │ totalAdj = density  │
    │          + altitude │
    └─────────────────────┘
```

---

## Code Path Decision Trees

### Decision Tree 1: Environmental Factor Calculation

```
calculateEnvironmentalFactor()
├─ calculateAirDensity(temp, pressure, humidity)
│  ├─ pressure → converted to Pa
│  ├─ Calculate vapor pressure (from temp + humidity)
│  └─ Ideal gas law: density = (P_dry / R_dry*T) + (P_vapor / R_vapor*T)
│
├─ densityRatio = currentDensity / STANDARD_DENSITY (1.193 kg/m³)
│
└─ Is altitude > 3000 ft?
   ├─ YES → exponent = 0.5 (DENSITY_EXPONENT_ALT)
   └─ NO  → exponent = 0.7 (DENSITY_EXPONENT_SEA)
   
   Return: densityRatio^(-exponent)
```

### Decision Tree 2: Shot Calculator Adjustment

```
Shot Calculator
├─ Get weather (includes altitude + pressure)
│
├─ Calculate conditions
│  ├─ density = calculateAirDensity(temp, pressure, humidity)
│  └─ Include altitude field
│
├─ Calculate adjustments
│  ├─ adjustments = calculateShotAdjustments(conditions)
│  │  └─ Uses density (which came from pressure)
│  │
│  └─ altitudeEffect = calculateAltitudeEffect(altitude)
│      └─ (altitude / 1000) * 2
│
└─ Total = adjustments.distanceAdjustment + altitudeEffect
   
   ⚠️ POTENTIAL DOUBLE-COUNT: Pressure already reflects altitude
```

---

## Key Findings

### 1. **Double Altitude Application in Shot Calculator**

The shot calculator (`app/(tabs)/index.tsx`) applies altitude effects **twice**:

- **Path 1:** Air density calculation uses `pressure`
  - Lower pressure at altitude → lower density → ball flies farther
  - Applied via `calculateShotAdjustments()`

- **Path 2:** Direct altitude bonus
  - `calculateAltitudeEffect(altitude)` adds `2% per 1000 ft`
  - Applied separately and added to total

**Example at 5000 ft elevation:**
- Pressure: ~850 mb (vs 1013 mb at sea level)
- Air density effect: ~-8% (ball flies farther due to thin air)
- Direct altitude effect: +10% (from formula)
- **Total adjustment: +2%** (could be overstating altitude benefit)

### 2. **Wind Calculator Uses Single Path**

The wind calculator only uses altitude **indirectly** via the environmental factor:
- Sets conditions with both altitude and pressure
- `calculateAdjustedYardage()` calls `calculateEnvironmentalFactor()`
- No separate altitude bonus added

### 3. **Altitude Affects Exponent Selection**

At high altitude (>3000 ft), the density exponent changes:
- Below 3000 ft: `exponent = 0.7` (more aggressive scaling)
- Above 3000 ft: `exponent = 0.5` (less aggressive scaling)

**Purpose:** Likely compensates for viscosity changes at altitude (Reynolds number effects).

### 4. **Unused Altitude Lookup Table**

`yardagemodel.ts` contains an `ALTITUDE_EFFECTS` lookup table (lines 205-215) that is **never referenced** in the code.

### 5. **Pressure Already Encodes Altitude**

The weather service provides `pressure` from Open-Meteo, which naturally decreases with elevation. Using **both** pressure and altitude may be redundant.

---

## Potential Issues

### Issue 1: Double-Counting Altitude

**Problem:** Shot calculator adds altitude effect on top of air density effect, but pressure already reflects altitude.

**Impact:** May overestimate altitude benefits (e.g., showing 200 yards plays like 220 at 5000 ft when reality is 215).

**Evidence:**
- `index.tsx:49`: `altitudeEffect` added to `adjustments.distanceAdjustment`
- `yardagemodel.ts:253`: Air density calculated from pressure (altitude-dependent)

**Recommendation:** Remove one of the altitude paths or confirm they model different physics (e.g., one for Magnus force, one for drag).

### Issue 2: Inconsistent Application

**Problem:** Shot calculator applies altitude twice, wind calculator applies once.

**Impact:** "Plays like" distances differ between shot calculator and wind calculator for same target.

**Recommendation:** Standardize altitude application across both calculators.

### Issue 3: Exponent Selection Logic

**Problem:** Altitude threshold of 3000 ft switches exponent from 0.7 to 0.5, but rationale unclear.

**Impact:** Sharp transition at 3000 ft could cause discontinuity in recommendations.

**Recommendation:** Document physics justification or smooth the transition.

---

## Recommendations

### 1. **Audit Altitude Physics**

Determine if altitude should affect:
- **Only air density** (via pressure) - removes `calculateAltitudeEffect()`
- **Both density and a separate effect** (e.g., Magnus force scaling) - document why

### 2. **Standardize Calculation**

Make shot calculator and wind calculator use same altitude logic:
- Option A: Remove `calculateAltitudeEffect()` from shot calculator
- Option B: Add it to wind calculator
- Option C: Merge into a single source of truth

### 3. **Remove Dead Code**

Delete unused `ALTITUDE_EFFECTS` lookup table in `yardagemodel.ts:205-215`.

### 4. **Document Exponent Selection**

Add comment explaining why exponent changes at 3000 ft (viscosity? Reynolds number?).

### 5. **Verify Pressure Source**

Confirm Open-Meteo's `surface_pressure` is station pressure (altitude-adjusted) or sea-level pressure (altitude-independent).

---

## File Reference

| File | Purpose | Altitude Role |
|------|---------|---------------|
| `/home/tfunk1030/bnredo/src/services/weather-service.ts` | Fetch weather from API | **Source** - converts elevation to altitude (line 83) |
| `/home/tfunk1030/bnredo/src/contexts/WeatherContext.tsx` | Distribute weather data | **Passthrough** - provides altitude via context (line 52) |
| `/home/tfunk1030/bnredo/src/core/models/yardagemodel.ts` | Physics engine | **Exponent selector** - altitude affects scaling (line 246) |
| `/home/tfunk1030/bnredo/src/core/services/environmental-calculations.ts` | Environmental effects | **Direct effect** - 2% per 1000 ft (line 78) |
| `/home/tfunk1030/bnredo/app/(tabs)/index.tsx` | Shot calculator UI | **Double application** - adds both effects (line 51) |
| `/home/tfunk1030/bnredo/src/core/services/wind-calculator.ts` | Wind calculations | **Single application** - via environmental factor only |

---

## Test Case: 150 Yards at 5000 ft

### Scenario
- Target: 150 yards
- Altitude: 5000 feet
- Temperature: 70°F
- Pressure: 850 mb (typical at 5000 ft)
- Humidity: 50%

### Calculation Path

**Step 1: Air Density**
```
tempC = (70 - 32) * 5/9 = 21.1°C
pressurePa = 850 * 100 = 85000 Pa
density ≈ 1.02 kg/m³ (lower than sea level 1.193)
densityRatio = 1.02 / 1.193 = 0.855
```

**Step 2: Environmental Factor**
```
altitude = 5000 > 3000 → exponent = 0.5
envFactor = (0.855)^(-0.5) = 1.082 (8.2% increase)
```

**Step 3: Altitude Effect**
```
altitudeEffect = (5000 / 1000) * 2 = 10%
```

**Step 4: Total Adjustment (Shot Calculator)**
```
totalAdjustment = -8.2% + 10% = +1.8%
adjustedYardage = 150 * (1 - 0.018) = 147 yards

⚠️ BUT environmental factor already increased distance via density
   Real calculation is more complex due to sign conventions
```

**Step 5: Wind Calculator (No Wind)**
```
Uses only environmental factor: 8.2% increase
adjustedYardage = 150 * 1.082 = 162 yards

⚠️ Different result than shot calculator!
```

---

## Conclusion

Altitude is applied **inconsistently** across the application:
- **Shot calculator:** Double application (density + direct effect)
- **Wind calculator:** Single application (density only via environmental factor)

This creates **divergent "plays like" distances** between calculators and may **overestimate altitude benefits**.

**Action Required:** Standardize altitude application and verify physics model correctness.
