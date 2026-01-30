# Debug Report: Metric Unit Settings Not Applied to UI
Generated: 2026-01-29

## Symptom
User metric settings (celsius, km/h, meters) are saved correctly but the UI continues to display imperial units (fahrenheit, mph, yards).

## Erotetic Framework
- X = UI shows imperial units even after selecting metric
- Q = Questions to resolve:
  1. Are preferences being saved correctly?
  2. Are preferences being loaded on app start?
  3. Are UI components reading the preferences?
  4. Are UI components applying unit conversions?

## Hypotheses Tested

1. **Preferences not saving** - RULED OUT
   - Evidence: `UserPreferencesContext.tsx:70-77` saves to AsyncStorage correctly
   - `updatePreferences` merges and persists to `user_preferences` key

2. **Preferences not loading** - RULED OUT
   - Evidence: `UserPreferencesContext.tsx:57-68` loads from AsyncStorage on mount
   - Merges with defaults via spread operator

3. **UI components not reading preferences** - RULED OUT (partial)
   - `settings.tsx:29` imports `useUserPreferences` and reads values
   - Settings UI shows correct active state based on preference

4. **UI components not applying unit conversions** - CONFIRMED
   - All display components have hardcoded imperial units
   - No conversion logic exists in any UI component

## Investigation Trail

| Step | Action | Finding |
|------|--------|---------|
| 1 | Read UserPreferencesContext.tsx | Preferences interface includes `distanceUnit`, `temperatureUnit`, `windSpeedUnit` |
| 2 | Read settings.tsx | Settings correctly saves preferences via `updatePreferences` |
| 3 | Read WeatherCard.tsx | No import of useUserPreferences, hardcoded `°F`, `mph`, `ft` |
| 4 | Read CompassDisplay.tsx | No import of useUserPreferences, hardcoded `MPH` |
| 5 | Read index.tsx (Shot screen) | No import of useUserPreferences, hardcoded `yards` |
| 6 | Read wind.tsx | Imports useUserPreferences but only uses `isPremium` and `handPreference` |
| 7 | Read WindResultsModal.tsx | No import of useUserPreferences, hardcoded `yards`, `mph` |

## Evidence

### Finding 1: WeatherCard.tsx - All Units Hardcoded
- **Location:** `/home/tfunk1030/bnredo/src/components/WeatherCard.tsx:83-105`
- **Observation:** 
  ```tsx
  // Line 83: Hardcoded °F
  accessibilityLabel={`Temperature: ${weather.temperature} degrees Fahrenheit`}
  
  // Line 85: Hardcoded °F display
  <Text style={styles.gridValue}>{weather.temperature}°F</Text>
  
  // Line 93-99: Hardcoded mph
  accessibilityLabel={`Wind: ${weather.windSpeed} miles per hour...`}
  <Text style={styles.gridUnit}> mph</Text>
  
  // Line 101-104: Hardcoded ft
  accessibilityLabel={`Altitude: ${weather.altitude} feet`}
  <Text style={styles.gridLabel}>Alt (ft)</Text>
  ```
- **Relevance:** No `useUserPreferences` import, no unit conversion logic

### Finding 2: CompassDisplay.tsx - Hardcoded MPH
- **Location:** `/home/tfunk1030/bnredo/src/components/CompassDisplay.tsx:28,290-291`
- **Observation:**
  ```tsx
  // Line 28: Hardcoded in accessibility
  const accessibilityDescription = `...Wind ${Math.round(windSpeed)} miles per hour...`
  
  // Line 290-291: Hardcoded display
  <SvgText>MPH</SvgText>
  ```
- **Relevance:** No preference context consumption

### Finding 3: Shot Calculator (index.tsx) - Hardcoded Yards
- **Location:** `/home/tfunk1030/bnredo/app/(tabs)/index.tsx:85-87,168,176`
- **Observation:**
  ```tsx
  // Line 86-87: Hardcoded yards display
  <Text style={styles.yardageValue}>{targetYardage}</Text>
  <Text style={styles.yardageUnit}>yards</Text>
  
  // Line 168: Hardcoded in result
  <Text style={styles.playsLikeUnit}> yards</Text>
  
  // Line 176: Hardcoded club distance
  ({recommendedClub.customDistance} yard club)
  ```
- **Relevance:** No `useUserPreferences` import despite preferences existing

### Finding 4: WindResultsModal.tsx - Hardcoded Units Throughout
- **Location:** `/home/tfunk1030/bnredo/src/components/WindResultsModal.tsx:115,164,176,183,217`
- **Observation:**
  ```tsx
  // Line 115: Hardcoded aim direction
  return offset > 0 ? `Aim ${Math.abs(offset)} yds RIGHT` : `Aim ${Math.abs(offset)} yds LEFT`;
  
  // Line 164: Hardcoded target
  <Text style={styles.targetValue}>{targetYardage} yards</Text>
  
  // Line 176: Hardcoded mph
  <Text style={styles.windSpeed}>{weather?.windSpeed} mph</Text>
  ```
- **Relevance:** No preference consumption, all imperial

### Finding 5: wind.tsx - Partial Preference Use
- **Location:** `/home/tfunk1030/bnredo/app/(tabs)/wind.tsx:28,210,216-217,228`
- **Observation:**
  ```tsx
  // Line 28: Imports preferences
  const { preferences, updatePreferences } = useUserPreferences();
  
  // BUT only uses isPremium (line 83, 132) and handPreference (line 296)
  
  // Line 210: Hardcoded mph
  {weather.windSpeed} mph {getWindDirectionLabel(weather.windDirection)}
  
  // Line 228: Hardcoded yds
  <Text style={styles.distanceValue}>{targetYardage} yds</Text>
  ```
- **Relevance:** Has access to preferences but ignores unit settings

## Root Cause

**Unit preferences are stored but never applied.** The `UserPreferencesContext` correctly:
1. Defines types: `distanceUnit: 'yards' | 'meters'`, `temperatureUnit: 'fahrenheit' | 'celsius'`, `windSpeedUnit: 'mph' | 'kmh'`
2. Saves/loads from AsyncStorage
3. Provides via context hook

**However, zero UI components:**
1. Import `useUserPreferences` for unit display purposes
2. Implement conversion functions (e.g., yards to meters)
3. Dynamically render unit labels

**Confidence:** High

## Recommended Fix

### Files to modify:

1. **Create a unit conversion utility** (new file)
   - `/home/tfunk1030/bnredo/src/utils/unit-conversions.ts`
   - Functions: `yardsToMeters()`, `metersToYards()`, `fahrenheitToCelsius()`, `celsiusFahrenheit()`, `mphToKmh()`, `kmhToMph()`
   - Format helpers: `formatDistance(value, unit)`, `formatTemperature(value, unit)`, `formatWindSpeed(value, unit)`

2. **WeatherCard.tsx** (lines 83-105)
   - Import `useUserPreferences`
   - Apply `formatTemperature(weather.temperature, preferences.temperatureUnit)`
   - Apply `formatWindSpeed(weather.windSpeed, preferences.windSpeedUnit)`
   - Convert altitude based on distanceUnit (ft vs m)

3. **CompassDisplay.tsx** (lines 28, 290-291)
   - Accept `windSpeedUnit` prop or use context
   - Display "KM/H" vs "MPH" based on preference
   - Update accessibility label

4. **index.tsx (Shot Calculator)** (lines 85-87, 168, 176)
   - Import `useUserPreferences`
   - Convert and display target/result in user's preferred distance unit
   - Update slider range if using meters (46-320m vs 50-350 yds)

5. **WindResultsModal.tsx** (lines 115, 164, 176, 183, 217, 256-272)
   - Import `useUserPreferences`
   - Format all distance values with preference
   - Format wind speeds with preference

6. **wind.tsx** (lines 210, 216-217, 228)
   - Already imports preferences - use `preferences.windSpeedUnit` and `preferences.distanceUnit`

### Conversion formulas:
```typescript
const yardsToMeters = (yards: number) => Math.round(yards * 0.9144);
const metersToYards = (meters: number) => Math.round(meters / 0.9144);
const fahrenheitToCelsius = (f: number) => Math.round((f - 32) * 5/9);
const celsiusFahrenheit = (c: number) => Math.round(c * 9/5 + 32);
const mphToKmh = (mph: number) => Math.round(mph * 1.60934);
const kmhToMph = (kmh: number) => Math.round(kmh / 1.60934);
```

## Prevention

1. **Add unit formatting to design system** - Create standard `<UnitValue>` component that auto-formats based on user preferences
2. **Add ESLint rule** - Flag hardcoded unit strings like "mph", "yards", "°F"
3. **Unit tests** - Test that changing preferences updates displayed values
4. **Storybook stories** - Add metric variant stories for all components displaying units
