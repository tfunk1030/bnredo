# Quick Fix: Remove Double-Counting of Altitude Effects
Generated: 2026-01-29

## Change Made
- File: `/home/tfunk1030/bnredo/app/(tabs)/index.tsx`
- Lines: 48-59, 200-223, 387-395
- Change: Removed separate altitude effect calculation to prevent double-counting

## Problem
The shot calculator was applying altitude effects twice:
1. Through air density calculation (station pressure already accounts for altitude)
2. Through separate `calculateAltitudeEffect()` (+2% per 1000 ft)

This resulted in incorrect distance adjustments at elevated locations.

## Solution
1. Removed `altitudeEffect` calculation (line 49)
2. Updated `totalAdjustmentPercent` to only use `adjustments.distanceAdjustment` (line 51)
3. Removed `altitudeEffect` from return object (line 57)
4. Simplified breakdown display to show single "Environmental Effect" with explanatory subtext
5. Added new `breakdownSubtext` style for the clarification text

## Verification
- Syntax check: PASS (TypeScript typecheck succeeded)
- Pattern followed: React Native functional component with useMemo optimization

## Files Modified
1. `/home/tfunk1030/bnredo/app/(tabs)/index.tsx` - Removed double-counting logic and updated breakdown UI

## Notes
The air density calculation in `EnvironmentalCalculator.calculateAirDensity()` uses station pressure, which already reflects the altitude's effect on atmospheric pressure. The separate altitude adjustment was redundant and led to over-compensation for elevation changes.

## Code Changes

### Calculation Logic (Lines 48-59)
Before:
```typescript
const adjustments = EnvironmentalCalculator.calculateShotAdjustments(conditions);
const altitudeEffect = EnvironmentalCalculator.calculateAltitudeEffect(weather.altitude);

const totalAdjustmentPercent = adjustments.distanceAdjustment + altitudeEffect;
```

After:
```typescript
const adjustments = EnvironmentalCalculator.calculateShotAdjustments(conditions);

// Altitude effect is already included in air density (station pressure reflects elevation)
const totalAdjustmentPercent = adjustments.distanceAdjustment;
```

### Breakdown Display (Lines 200-223)
Replaced separate "Air Density Effect" and "Altitude Effect" rows with single "Environmental Effect" row that includes clarifying subtext.
