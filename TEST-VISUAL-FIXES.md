# Visual Fix Testing Guide

**Goal:** Verify all 6 render-to-reality fixes are working correctly

---

## 🚀 Run the App

```bash
npm run ios
# or
npm run android
```

---

## ✅ Visual Checklist

### 1. Background Gradient
**What to look for:**
- [ ] Background is NOT flat black
- [ ] Subtle radial gradient visible (lighter in center, darker at edges)
- [ ] Gradient is soft and cinematic (not obvious/harsh)

**Where:** Main screen background

**Expected:**
```
Center: #1A1A1A (charcoal)
Edges: #000000 (true black)
```

---

### 2. Green Accent Gradient
**What to look for:**
- [ ] "Lock Target" button has vibrant neon-ish green
- [ ] Green has subtle gradient (not flat fill)
- [ ] Gradient goes from bright (#39FF14) to natural (#28CD41)
- [ ] Button "pops" against dark background

**Where:** Lock Target button, Plays Like value

**Expected:**
```
Not this: [████████] ← flat
This:     [████████] ← gradient with dimension
```

---

### 3. Card Depth & Glassmorphism
**What to look for:**
- [ ] Cards have subtle top-to-bottom gradient
- [ ] Cards "float" above background (shadow visible)
- [ ] Card borders are very subtle (0.5pt, barely visible)
- [ ] Cards feel premium, not flat rectangles

**Where:** Target Distance card, Plays Like card, Weather card

**Expected:**
```
Top:    Lighter (#1C1F24)
  ↓
Bottom: Darker (#15181D)
```

---

### 4. Typography Density
**What to look for:**
- [ ] Numbers feel slightly smaller/tighter (but still readable)
- [ ] More "instrument panel" than "design showcase"
- [ ] Hero number (Plays Like) ~40pt
- [ ] All text still easily readable

**Where:** All number displays

**Expected:**
```
Before: 42pt hero (spacious)
After:  40pt hero (compact)
```

---

### 5. Shadows
**What to look for:**
- [ ] Cards have subtle shadow below them
- [ ] Shadow creates separation from background
- [ ] Shadow is soft (8pt radius), not harsh

**Where:** All cards

**Expected:**
```
4pt offset, 30% opacity, 8pt radius blur
```

---

### 6. Edge Lighting
**What to look for:**
- [ ] Cards have very subtle white border (barely visible)
- [ ] Border creates "edge lighting" effect
- [ ] Not harsh/obvious, just a soft glow

**Where:** Card edges

**Expected:**
```
0.5pt border @ 8% white opacity
```

---

## 🎯 Quick Visual Test

Stand back and look at the app from ~2 feet away:

### Does it feel like:
- ✅ **Premium product** with depth and polish
- ✅ **Floating cards** on atmospheric background
- ✅ **Vibrant green** that draws the eye
- ✅ **Compact/dense** but still readable

### Or does it feel like:
- ❌ **Flat tool** with no depth
- ❌ **Opaque rectangles** on flat black
- ❌ **Muted colors** that blend in
- ❌ **Too spacious** or design-showcase-y

---

## 🐛 Common Issues

### "Background still looks flat black"
- Check `BackgroundGradient` is wrapping screen
- Verify `backgroundGradient.colors` has two values
- Try adjusting screen brightness (subtle gradient)

### "Green doesn't pop"
- Verify `GradientButton` variant="primary"
- Check theme has `primaryVibrant` colors
- Confirm gradient direction (135° diagonal)

### "Cards look opaque/solid"
- Check `LinearGradient` wrapping cards
- Verify `cardGradient.colors` applied
- Confirm `borderWidth: 0.5` (not 1)

### "Typography looks the same size"
- Hard to notice 5-10% reduction without side-by-side
- Compare to old screenshots if available
- Focus on overall "density" feel, not individual sizes

---

## 📸 Screenshot Comparison

Take screenshots and compare:

### Before (if you have old screenshots):
- Flat black background
- Muted green buttons
- Opaque solid cards
- Spacious typography

### After (current):
- Radial gradient background
- Vibrant green gradient buttons
- Translucent cards with depth
- Compact typography

---

## 🎨 Theme Toggle Test (Optional)

Want to see the difference? Temporarily revert to muted green:

```tsx
// In src/components/ui/GradientButton.tsx
const gradientColors = {
  primary: [colors.primaryLight, colors.primaryDark], // muted
}
```

Then switch back:
```tsx
  primary: [colors.primaryVibrant, colors.primaryVibrantEnd], // vibrant
```

You'll immediately see the difference!

---

## ✨ Success Criteria

**Visual pass if:**
- [ ] Background has subtle depth (not flat)
- [ ] Green buttons pop with gradient
- [ ] Cards float with premium shadows
- [ ] Overall vibe is "polished product" not "flat tool"

**Ready to ship if:**
- [ ] All 6 fixes visible
- [ ] No performance issues (60fps smooth)
- [ ] TypeScript passes (`npm run typecheck`)
- [ ] Build succeeds

---

## 🚢 Next Steps

Once visual test passes:
1. Test on real device (not just simulator)
2. Test in sunlight (on-course conditions)
3. Test at night (low light readability)
4. Get feedback from actual golfers

---

_Testing guide by Claw (Feb 8, 2026)_
