# AICaddyPro UI Codebase Report
Generated: 2026-01-28

## Summary

Golf shot calculator app built with Expo (SDK 54) and React Native. Uses a **design token system** (no NativeWind/Tailwind), manual StyleSheet patterns, and accessibility-first UI. Features three main screens (Shot Calculator, Wind Calculator, Settings) with a custom SVG compass component and reusable UI library.

---

## Project Structure

```
app/
  _layout.tsx                  # Root layout with context providers
  (tabs)/
    _layout.tsx                # Tab navigation (3 tabs)
    index.tsx                  # Shot Calculator screen
    wind.tsx                   # Wind Calculator screen (premium)
    settings.tsx               # Settings screen
  +not-found.tsx               # 404 handler

src/
  components/
    WeatherCard.tsx            # Weather conditions display
    CompassDisplay.tsx         # Custom SVG compass with dynamic wind arrow
    WindResultsModal.tsx       # Full-screen modal for wind calculations
    ui/
      AnimatedCollapsible.tsx  # Animated height collapse component
      GlassCard.tsx            # Frosted glass card (BlurView)
      GradientButton.tsx       # Button with gradient background
      Skeleton.tsx             # Loading skeleton
      WeatherCardSkeleton.tsx  # Loading state for WeatherCard
      index.ts                 # Barrel export

  constants/
    theme.ts                   # Design tokens (colors, spacing, typography, animation)

  contexts/
    UserPreferencesContext.tsx # User settings state
    ClubBagContext.tsx         # Golf club bag state
    WeatherContext.tsx         # Weather data state

  hooks/
    useReduceMotion.ts         # Detect prefers-reduced-motion
    useHapticSlider.ts         # Haptic feedback for sliders
    useCompassHeading.ts       # Compass sensor access
    useInterpolatedHeading.ts  # Smooth heading interpolation

  features/
    wind/
      utils/
        wind-colors.ts         # Dynamic wind arrow color logic
```

---

## Screen Components

### 1. Shot Calculator (`app/(tabs)/index.tsx`)

**Purpose:** Calculate adjusted yardage based on environmental conditions

**Key Features:**
- Target distance slider (50-350 yards) with haptic feedback every 5 yards
- Fine adjustment buttons (±1, ±5 yards)
- WeatherCard integration
- "Plays Like" result with club recommendation
- Collapsible breakdown showing air density + altitude effects
- Accessibility: All inputs have labels, slider has accessibilityValue with min/max/now

**State Management:**
- `targetYardage` - local state
- `weather` - from WeatherContext
- `getRecommendedClub` - from ClubBagContext

**Styling:** StyleSheet with design tokens (`colors.surface`, `spacing.lg`, `borderRadius.lg`)

**Touch Targets:** All buttons meet 48dp minimum via `touchTargets.minimum`

---

### 2. Wind Calculator (`app/(tabs)/wind.tsx`)

**Purpose:** Compass-based wind effect calculator (premium feature)

**Key Features:**
- Premium paywall screen (shows when `isPremium: false`)
- Custom SVG compass (`CompassDisplay`) with dynamic wind arrow colors
- Target distance slider (50-350 yards)
- "Lock Target" floating button (position adapts to hand preference)
- Full-screen `WindResultsModal` showing sustained vs. gust calculations
- Reduce motion support (skips animations if `prefers-reduced-motion`)

**State Management:**
- `isLocked`, `lockedHeading` - local state
- `heading` - from `useCompassHeading` hook
- `weather` - from WeatherContext
- `preferences` - from UserPreferencesContext

**Styling:**
- StyleSheet with theme tokens
- Platform-specific shadow (iOS vs Android elevation)
- Animated button press feedback using `react-native-reanimated`

**Accessibility:**
- Compass has `accessibilityRole="image"` with live region for heading updates
- Lock button disabled state announces "Weather data required"
- Touch targets: Lock button is 48x48dp minimum

**Animations:**
- Button scale on press: `0.92` → `1.0` (80ms + 120ms)
- Skipped if `reduceMotion` enabled

---

### 3. Settings (`app/(tabs)/settings.tsx`)

**Purpose:** User preferences and club bag management

**Key Features:**
- Premium toggle (dev mode for testing)
- Unit preferences (distance, temperature, wind speed)
- Hand preference (affects lock button placement in Wind screen)
- Collapsible club bag editor with enable/disable switches
- Editable club distances (1-400 yards)

**State Management:**
- `showClubBag`, `editingClub` - local state
- `preferences`, `updatePreferences` - UserPreferencesContext
- `clubs`, `updateClub` - ClubBagContext

**Styling:**
- Animated chevron rotation on collapse toggle using `react-native-reanimated`
- Radio button groups for options
- Inline text editing for club distances

**Accessibility:**
- Radio groups have `accessibilityRole="radiogroup"`
- Each option has `accessibilityState={{ checked }}`
- Switches announce "Double tap to enable/disable"

---

## Reusable Components

### WeatherCard (`src/components/WeatherCard.tsx`)

**Purpose:** Display current weather conditions

**UI Elements:**
- Location name with badges (Cached/Manual)
- Refresh button
- 4-column grid: Temperature, Humidity, Wind, Altitude
- Loading state: ActivityIndicator + "Loading weather..."
- Error state: "Unable to load weather" + Retry button

**Accessibility:**
- Grid has `accessibilityRole="summary"`
- Each metric has full label: "Temperature: 72 degrees Fahrenheit"
- Refresh button announces busy state when loading

**Styling:** GlassCard-style surface with border, icons from `lucide-react-native`

---

### CompassDisplay (`src/components/CompassDisplay.tsx`)

**Purpose:** SVG compass with dynamic wind visualization

**Visual Elements:**
- Outer ring (120px radius) with tick marks (72 ticks, every 5°)
- Cardinal points (N/E/S/W) with background circles
- Compass face **rotates with heading** (North always points up in real world)
- **Wind arrow** shows wind direction **relative to user heading**:
  - Color: Red (headwind), Green (tailwind), Yellow (crosswind)
  - Opacity: 0.5-1.0 based on wind strength
- **User heading arrow** (green, always points "up" on screen)
- Center circle shows wind speed (MPH)
- Legend: "Your Heading" (green dot), "Wind (effect)" (colored dot)
- Heading display below compass: "270°" + "Facing Direction" / "Target Locked"

**Props:**
```ts
heading: number          // User's compass heading
windDirection: number    // Wind direction (absolute)
windSpeed: number        // Wind speed in mph
isLocked?: boolean       // Whether target is locked
reduceMotion?: boolean   // Skip animations
```

**Accessibility:**
- Single accessible element with comprehensive label:
  "Compass showing 270 degrees heading. Wind 12 miles per hour, helping wind from behind. Target locked."
- Legend and heading text are `importantForAccessibility="no"` (duplicate info)

**Dynamic Wind Colors:** Uses `getWindColor()` utility:
- Relative angle calculation: `(windDirection - heading) % 360`
- Effect zones: Headwind (315-45°), Tailwind (135-225°), Crosswind (else)
- Colors from design system: `#DC2626` (red), `#16A34A` (green), `#F59E0B` (yellow)

---

### WindResultsModal (`src/components/WindResultsModal.tsx`)

**Purpose:** Full-screen modal showing wind-adjusted shot calculations

**UI Sections:**
1. **Header:** Title + Close button + Recalculate button
2. **Target Info:** Shows original target distance
3. **Sustained Wind Card:**
   - Wind speed badge
   - "Plays Like" yardage (large, green)
   - Aim adjustment: "Aim 3 yds RIGHT" with arrow icon
   - Recommended club
4. **Gust Card:** (same layout, yellow/warning colors)
5. **Effect Breakdown:**
   - Environmental effect
   - Wind (sustained) effect
   - Wind (gusts) effect

**Accessibility:**
- Each scenario card has comprehensive `accessibilityLabel`:
  "Sustained wind at 12 miles per hour. Plays like 145 yards. Aim 3 yards right. Recommended club: 7 Iron"

**Styling:** Cards use `borderColor: colors.primary` (green) and `colors.warning` (yellow)

---

### UI Library Components

#### AnimatedCollapsible
- Height animation with `react-native-reanimated`
- Respects `reduceMotion` (instant toggle if enabled)
- Easing: `Easing.out(Easing.cubic)`
- Duration: `animation.duration.normal` (300ms)

#### GlassCard
- iOS: BlurView with tint overlay
- Android/Reduce Motion: Solid `colors.surfaceElevated`
- Props: `intensity`, `tint`, `radius`, `padding`, `bordered`

#### GradientButton
- Uses `expo-linear-gradient`
- Variants: primary, accent, danger, muted
- Sizes: sm (44dp), md (48dp), lg (56dp)
- Press feedback: opacity + scale (respects reduce motion)

---

## Styling System

### Design Tokens (`src/constants/theme.ts`)

No NativeWind/Tailwind. Manual StyleSheet with token-based values.

#### Colors (Dark Theme)
```ts
background: '#0d1117'         // Base background
surface: '#161b22'            // Cards
surfaceElevated: '#21262d'    // Elevated surfaces
border: '#30363d'             // Borders

primary: '#238636'            // Green (success, actions)
primaryDark: '#1a7f37'
primaryLight: '#2ea043'

accent: '#c9a227'             // Gold (wind indicators, clubs)
accentDark: '#a68621'

text: '#f0f6fc'               // Primary text
textSecondary: '#8b949e'      // Secondary text
textMuted: '#6e7681'          // Muted text

success: '#238636'            // Green
warning: '#d29922'            // Yellow/gold
error: '#f85149'              // Red
```

#### Spacing
```ts
xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48
```

#### Typography
```ts
largeTitle: { fontSize: 48, fontWeight: '700', lineHeight: 56 }
title: { fontSize: 28, fontWeight: '600', lineHeight: 34 }
headline: { fontSize: 20, fontWeight: '600', lineHeight: 26 }
body: { fontSize: 16, fontWeight: '400', lineHeight: 22 }
caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 }
small: { fontSize: 11, fontWeight: '400', lineHeight: 14 }
```

#### Border Radius
```ts
sm: 6, md: 12, lg: 16, xl: 24, full: 9999
```

#### Touch Targets (WCAG 2.5.5)
```ts
minimum: 48       // Minimum touch target (dp)
comfortable: 56   // Comfortable size
dense: 44         // iOS HIG minimum
```

#### Hit Slop
```ts
small: { top: 12, right: 12, bottom: 12, left: 12 }
medium: { top: 16, right: 16, bottom: 16, left: 16 }
```

#### Animation
```ts
duration: {
  instant: 100, fast: 200, normal: 300, slow: 500, verySlow: 800
}

spring: {
  snappy: { damping: 20, stiffness: 300, mass: 1 }
  bouncy: { damping: 10, stiffness: 180, mass: 1 }
  gentle: { damping: 15, stiffness: 100, mass: 1 }
}

scale: { pressed: 0.97, disabled: 1, active: 1.02 }
opacity: { disabled: 0.5, pressed: 0.8, active: 1 }
```

#### Glass Effect (iOS 18+ BlurView)
```ts
blur: { light: 10, medium: 20, heavy: 40 }
backgroundOpacity: { subtle: 0.1, medium: 0.2, strong: 0.4 }
borderOpacity: 0.15
tint: {
  dark: 'rgba(0, 0, 0, 0.3)',
  light: 'rgba(255, 255, 255, 0.1)',
  accent: 'rgba(201, 162, 39, 0.15)'
}
```

---

## UI State Management

### Contexts

#### UserPreferencesContext
```ts
preferences: {
  isPremium: boolean
  distanceUnit: 'yards' | 'meters'
  temperatureUnit: 'fahrenheit' | 'celsius'
  windSpeedUnit: 'mph' | 'kmh'
  handPreference: 'right' | 'left'
}
```

#### ClubBagContext
```ts
clubs: Array<{
  key: string           // '7iron', 'driver', etc.
  name: string          // '7 Iron', 'Driver'
  isEnabled: boolean
  customDistance: number
}>
getRecommendedClub(yardage: number)
```

#### WeatherContext
```ts
weather: {
  temperature, humidity, pressure, altitude,
  windSpeed, windDirection, windGust,
  locationName, isManualOverride
}
isLoading, error, isOffline
refreshWeather()
```

### Custom Hooks

#### useReduceMotion
- Detects `AccessibilityInfo.isReduceMotionEnabled()`
- Listens for changes with `reduceMotionChanged` event
- Used by: AnimatedCollapsible, GlassCard, GradientButton, wind.tsx, CompassDisplay

#### useHapticSlider
- Triggers haptic feedback at intervals (default: every 5 units)
- Uses `Haptics.selectionAsync()` on iOS/Android
- Pattern: Track "bucket" changes to avoid over-firing
- Used by: Shot Calculator and Wind Calculator sliders

---

## Animation Libraries

| Library | Purpose | Usage |
|---------|---------|-------|
| react-native-reanimated (4.1.1) | Animations | `Animated.View`, `useAnimatedStyle`, `withTiming`, `withSpring` |
| expo-haptics | Touch feedback | `Haptics.impactAsync()`, `Haptics.selectionAsync()` |
| expo-linear-gradient | Gradients | GradientButton component |
| expo-blur | Glass effects | GlassCard component (iOS only) |
| react-native-svg | Vector graphics | CompassDisplay SVG compass |

---

## Design Patterns

### Pattern 1: Token-Based Styling
**All screens use design tokens:**
```ts
import { colors, spacing, borderRadius, typography } from '@/src/constants/theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  }
});
```

**Consistency:** ✅ Excellent - All files use theme tokens
**Issue:** None - Pattern is consistent

---

### Pattern 2: Accessibility-First
**All interactive elements have:**
- `accessibilityRole` (button, adjustable, radiogroup, etc.)
- `accessibilityLabel` with full context ("Temperature: 72 degrees Fahrenheit")
- `accessibilityHint` for non-obvious actions ("Double tap to...")
- `accessibilityState` for checked/expanded/disabled states
- Touch targets ≥48dp via `touchTargets.minimum`

**Consistency:** ✅ Excellent
**Issue:** None - Comprehensive accessibility markup

---

### Pattern 3: Reduce Motion Support
**All animations check `useReduceMotion()` or accept `reduceMotion` prop:**
```ts
const reduceMotion = useReduceMotion();

if (reduceMotion) {
  value.value = 0.97;  // Instant
} else {
  value.value = withSpring(0.97, springConfigs.snappy);
}
```

**Consistency:** ✅ Excellent
**Files using pattern:** wind.tsx, AnimatedCollapsible, GlassCard, GradientButton, CompassDisplay

---

### Pattern 4: Context Provider Hierarchy
**Root layout wraps app in nested providers:**
```tsx
<UserPreferencesProvider>
  <ClubBagProvider>
    <WeatherProvider>
      <Stack />
    </WeatherProvider>
  </ClubBagProvider>
</UserPreferencesProvider>
```

**Access pattern:** `const { preferences } = useUserPreferences()`

**Consistency:** ✅ Clean separation of concerns

---

### Pattern 5: Memoized Calculations
**Heavy calculations use `React.useMemo`:**
```ts
const calculations = React.useMemo(() => {
  // Environmental calculations
  return { adjustedYardage, ... };
}, [weather, targetYardage]);
```

**Consistency:** ✅ Good - Used in index.tsx, wind.tsx, WindResultsModal

---

### Pattern 6: Platform-Specific Styling
**iOS vs Android patterns:**
```ts
...Platform.select({
  ios: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  android: {
    elevation: 8,
  },
}),
```

**Also:** Tab bar height, font variants (tabular-nums vs monospace)

---

## Inconsistencies & Issues

### ❌ Issue 1: Tab Bar Accessibility
**Location:** `app/(tabs)/_layout.tsx`

**Problem:** Tab bar has `tabBarAccessibilityLabel: 'Main navigation'` but individual tabs don't have unique accessibility IDs for automation testing.

**Impact:** Low - Functional but harder to test

**Fix:** Add `testID` to each `Tabs.Screen`

---

### ❌ Issue 2: CompassDisplay Legend Redundancy
**Location:** `src/components/CompassDisplay.tsx`

**Problem:** Legend and heading display are hidden from screen readers (`importantForAccessibility="no-hide-descendants"`), but the parent `<View>` with comprehensive `accessibilityLabel` already contains this info. This is correct, but the `accessibilityRole="none"` would be clearer.

**Impact:** None - Works correctly

**Suggestion:** Use `accessibilityRole="none"` instead of `importantForAccessibility="no-hide-descendants"`

---

### ⚠️ Issue 3: Modal Animation Type
**Location:** `src/components/WindResultsModal.tsx`

**Problem:** Modal uses `animationType="slide"` but doesn't respect `reduceMotion`. Should be `animationType={reduceMotion ? 'none' : 'slide'}`.

**Impact:** Low - Modal animations might trigger motion sensitivity

**Fix:**
```ts
const reduceMotion = useReduceMotion();
<Modal animationType={reduceMotion ? 'none' : 'slide'} ... />
```

---

### ✅ Issue 4: Skeleton Components Unused
**Location:** `src/components/ui/Skeleton.tsx`, `WeatherCardSkeleton.tsx`

**Problem:** Skeleton components exist but WeatherCard uses `<ActivityIndicator>` + text instead.

**Impact:** None - Just unused code

**Options:** Remove skeletons OR update WeatherCard to use WeatherCardSkeleton

---

### ✅ Issue 5: Wind Arrow Color Constants
**Location:** `src/features/wind/utils/wind-colors.ts`

**Problem:** Wind colors are hardcoded (`#16A34A`, `#DC2626`, `#F59E0B`) instead of using theme tokens.

**Current:**
```ts
export const windColors = {
  tailwind: '#16A34A',   // Green
  headwind: '#DC2626',   // Red
  crosswind: '#F59E0B',  // Yellow
}
```

**Should be:**
```ts
import { colors } from '@/src/constants/theme';

export const windColors = {
  tailwind: colors.success,    // '#238636' (theme green)
  headwind: colors.error,      // '#f85149' (theme red)
  crosswind: colors.warning,   // '#d29922' (theme yellow)
}
```

**Impact:** Medium - Creates color inconsistency (Tailwind CSS colors vs theme colors)

---

## Key Files Reference

| File | Lines | Purpose | Dependencies |
|------|-------|---------|--------------|
| app/(tabs)/index.tsx | 413 | Shot Calculator screen | WeatherCard, useWeather, useClubBag |
| app/(tabs)/wind.tsx | 576 | Wind Calculator screen | CompassDisplay, WindResultsModal, useCompassHeading |
| app/(tabs)/settings.tsx | 488 | Settings screen | AnimatedCollapsible, useReduceMotion |
| src/components/CompassDisplay.tsx | 377 | SVG compass component | react-native-svg, wind-colors |
| src/components/WindResultsModal.tsx | 439 | Wind results modal | calculateWindEffect, EnvironmentalCalculator |
| src/components/WeatherCard.tsx | 218 | Weather display | useWeather, lucide-react-native |
| src/constants/theme.ts | 161 | Design token system | None (base definitions) |
| src/features/wind/utils/wind-colors.ts | 157 | Wind color utilities | theme.ts |

---

## Testing Infrastructure

**Binary Tests:**
- `src/features/wind/utils/__tests__/wind-colors.test.ts` - 41 tests for color logic

**Visual Tests:**
- `e2e/visual.spec.ts` - Playwright visual regression + a11y tree snapshots

**Test Commands:**
```bash
npm test wind-colors       # Binary tests
yarn test:visual           # Playwright visual regression
yarn test:visual:update    # Update baselines
```

---

## Recommendations

### P0 - Fix Before Release
1. ✅ Fix wind color constants to use theme tokens (consistency)
2. ✅ Add `reduceMotion` support to WindResultsModal animation

### P1 - Nice to Have
3. ✅ Add `testID` props to tab screens for automation
4. ✅ Remove unused Skeleton components OR use them
5. ⚠️ Consider using `accessibilityRole="none"` instead of `importantForAccessibility="no-hide-descendants"`

### P2 - Future Enhancements
6. Consider extracting wind calculation logic from WindResultsModal to a custom hook
7. Add Storybook for component isolation (WindArrow.stories.tsx exists but not integrated)

---

## Design System Strengths

✅ **Comprehensive token system** - All design values centralized
✅ **Accessibility-first** - Every component has proper a11y markup
✅ **Reduce motion support** - Respects user preferences
✅ **Touch target compliance** - Meets WCAG 2.5.5 (48dp minimum)
✅ **Consistent patterns** - StyleSheet + tokens everywhere
✅ **Platform-aware** - iOS vs Android specific styling
✅ **Memoization** - Heavy calculations optimized
✅ **Dark theme** - Single cohesive color palette

---

## Architecture Insights

**Navigation:** Expo Router file-based with tab groups
**State:** Context API (3 providers) + local state
**Styling:** Manual StyleSheet (no utility classes)
**Animations:** Reanimated v4 + Expo Haptics
**Icons:** Lucide React Native (tree-shakeable)
**Rendering:** React Native SVG for compass

**No global state library** (Redux/Zustand) - Contexts handle all shared state.

**No Tailwind/NativeWind** - Intentional choice for design token system.

---

## Summary of Findings

This is a **well-architected React Native app** with:
- Clean separation of concerns (screens/components/contexts/hooks)
- Comprehensive accessibility support
- Token-based design system (no utility classes)
- Reduce motion support throughout
- Platform-specific optimizations
- Minimal tech debt (5 minor issues, 2 P0)

**Main issue:** Wind colors use Tailwind CSS values instead of theme tokens (easy fix).

**Overall grade:** A- (excellent patterns, minor inconsistencies)
