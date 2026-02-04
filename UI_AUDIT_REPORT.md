# UI Audit Report
## BN Golf App - February 4, 2026

**Branch:** `ui-audit-feb4`  
**Status:** Audit only (no changes to main)

---

## Summary

| Category | Issues Found |
|----------|-------------|
| 🔴 Missing/Incomplete | 3 |
| 🟡 Unused Code | 4 |
| 🟢 Suggestions | 5 |

---

## 🔴 Missing / Incomplete UI

### 1. Premium Upgrade Button → No Payment Flow
**Location:** `app/(tabs)/wind.tsx:213`

```tsx
const handleUpgrade = () => {
  updatePreferences({ isPremium: true }); // Just toggles locally!
};
```

**Issue:** The "Unlock Premium" button only toggles a local flag. No actual payment integration.

**Fix needed:**
- Integrate RevenueCat or Stripe
- Add paywall modal with pricing
- Handle subscription restore

---

### 2. No Onboarding / First-Run Experience
**Location:** Missing entirely

**Issue:** New users land directly on the shot calculator with no explanation.

**Recommended:**
- Welcome screen explaining the app
- Club distance calibration wizard
- Location permission request with explanation
- Optional account creation prompt

---

### 3. No "Forgot Password" Flow
**Location:** `app/(tabs)/settings.tsx` - Auth form

**Issue:** Sign in form has no password reset option.

**Fix:** Add `<TouchableOpacity>` below password field:
```tsx
<TouchableOpacity onPress={handleForgotPassword}>
  <Text>Forgot Password?</Text>
</TouchableOpacity>
```

And implement:
```tsx
const handleForgotPassword = async () => {
  await supabase.auth.resetPasswordForEmail(email);
  // Show confirmation
};
```

---

## 🟡 Unused Code (Dead Weight)

### 1. `GlassCard` Component
**Location:** `src/components/ui/GlassCard.tsx`

Exported but never imported anywhere in the app.

**Action:** Remove or use it (nice glassmorphism component, could enhance the weather card)

---

### 2. `GradientButton` Component
**Location:** `src/components/ui/GradientButton.tsx`

Exported but never used.

**Action:** Could replace plain TouchableOpacity buttons for CTAs. Otherwise remove.

---

### 3. `WeatherCardSkeleton` Component
**Location:** `src/components/ui/WeatherCardSkeleton.tsx`

Built but not used. `WeatherCard.tsx` uses `ActivityIndicator` instead.

**Recommendation:** Replace the loading state in WeatherCard:
```tsx
// Current (basic)
if (isLoading) {
  return <ActivityIndicator />;
}

// Better UX
if (isLoading) {
  return <WeatherCardSkeleton />;
}
```

---

### 4. `useInterpolatedHeading` Hook
**Location:** `src/hooks/useInterpolatedHeading.ts`

Never imported anywhere.

**Action:** Remove if not needed, or integrate into compass for smoother animation.

---

## 🟢 UI/UX Suggestions

### 1. Weather Card Loading State
Use the existing `WeatherCardSkeleton` for a polished loading experience instead of a spinner.

### 2. App Name Mismatch
**Location:** `app/(tabs)/settings.tsx:480`
```tsx
<Text style={styles.footerText}>AICaddy Pro v1.0.0</Text>
```
Is "AICaddy Pro" the final name? Might want to update or make it configurable.

### 3. Premium Badge Visibility
When premium is active, the wind tab shows `<Wind>` icon, but there's no visual "PRO" badge anywhere to reinforce the value.

**Suggestion:** Add a small crown icon or "PRO" label in the tab bar or header.

### 4. Club Bag Default State
The club bag section starts collapsed. For new users, consider:
- Starting expanded on first launch
- Adding a "Set up your clubs" CTA if using defaults

### 5. Error States Could Be Richer
The weather error state is minimal:
```tsx
<Text style={styles.errorText}>Unable to load weather</Text>
```

**Suggestion:** Add specific error messaging:
- "Location permission required"
- "No internet connection"
- "Weather service temporarily unavailable"

---

## File-by-File Status

| File | Status | Notes |
|------|--------|-------|
| `app/(tabs)/index.tsx` | ✅ Clean | Shot calculator works well |
| `app/(tabs)/wind.tsx` | ⚠️ Incomplete | Upgrade button is placeholder |
| `app/(tabs)/settings.tsx` | ⚠️ Incomplete | Missing forgot password |
| `app/+not-found.tsx` | ✅ Clean | Good 404 page |
| `app/_layout.tsx` | ✅ Clean | Provider stack correct |
| `src/components/WeatherCard.tsx` | ⚠️ | Should use skeleton |
| `src/components/ui/GlassCard.tsx` | ❌ Unused | Remove or integrate |
| `src/components/ui/GradientButton.tsx` | ❌ Unused | Remove or integrate |
| `src/components/ui/WeatherCardSkeleton.tsx` | ❌ Unused | Should be used |
| `src/hooks/useInterpolatedHeading.ts` | ❌ Unused | Remove or integrate |

---

## Recommended Priority

1. **High:** Payment integration (blocking monetization)
2. **High:** Forgot password flow (blocking user recovery)
3. **Medium:** Use skeleton loaders (UX polish)
4. **Medium:** Onboarding flow (conversion optimization)
5. **Low:** Remove dead code (cleanup)

---

## Next Steps

1. Create issues/tasks for each finding
2. Implement payment flow (RevenueCat recommended for mobile)
3. Add forgot password
4. Clean up unused components
5. Consider onboarding for v1.1

---

*Audit performed by Claw*
