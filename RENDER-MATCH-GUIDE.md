# Render-Match Implementation Guide

**Goal:** Match the design render exactly — no more "looks close but off"

Based on Taylor's detailed guide (Feb 8, 2026)

---

## 🎯 Shipping Order (Fastest Path to Parity)

1. ✅ **Background gradient/vignette** → `SceneBackground`
2. ✅ **RenderCard system everywhere** → All major surfaces
3. ✅ **Spacing rhythm pass** → 8/12/16 inside, 16 between
4. ✅ **Typography hierarchy** → Material System tokens
5. ⏳ **Controls micro-depth** → Gradient buttons (partial)
6. ⏳ **Optional glow/motion** → After parity

---

## 📦 What Was Created

### 1. Material System (`src/constants/material-system.ts`)

Single source of truth for all visual materials:

**Radii:**
- `card: 18` — Main cards
- `pill: 18` — Buttons/pills
- `control: 14` — Small controls

**Strokes:**
- `outer: rgba(255,255,255,0.06)` — Card borders
- `inner: rgba(255,255,255,0.035)` — Separators

**Surface:**
- `base: rgba(18,18,20,0.92)` — Card background
- `topSheen: rgba(255,255,255,0.07)` — Top gradient
- `bottomWeight: rgba(0,0,0,0.10)` — Bottom gradient

**Shadows (Two-Layer System):**
- `ambient` — Soft, large spread (y:20, opacity:0.40, radius:30)
- `contact` — Sharp, tight (y:8, opacity:0.52, radius:12)

**Spacing Rhythm:**
- Inside cards: `8/12/16`
- Between cards: `16`

**Typography Hierarchy:**
- Hero: 56pt, weight 700, tracking -2
- Large: 36pt, weight 600, tracking -1
- Labels: 11pt, dimmed to 40% opacity
- Units: 14pt, muted to 50% opacity

**Controls:**
- Normal: Gradient `rgba(40,40,42,0.85) → rgba(28,28,30,0.95)`
- Pressed: Inverted gradient (top darker, bottom lighter)

---

### 2. RenderCard Component (`src/components/ui/RenderCard.tsx`)

**Correct shadow layering pattern:**

```tsx
<View style={ambientShadow}>      {/* Wrapper A: ambient shadow */}
  <View style={contactShadow}>    {/* Wrapper B: contact shadow */}
    <LinearGradient style={surface}>  {/* Inner: gradient + clip */}
      {children}
    </LinearGradient>
  </View>
</View>
```

**CRITICAL RULE:** Never put `overflow:'hidden'` on shadow layers!

---

### 3. SceneBackground Component (`src/components/ui/SceneBackground.tsx`)

**Goal:** UI feels like it sits in a space, not on pure black

**Layers:**
1. Subtle gradient: `#0D0D0F → #000000`
2. Vignette overlay: transparent center → dark edges

---

## 🏗️ Applied to Shot Screen

**File:** `app/(tabs)/index.tsx` (replaced with render-matched version)

**Changes:**

1. **Background:** `<SceneBackground>` instead of flat black
2. **Cards:** `<RenderCard>` for Target Distance + Plays Like
3. **Spacing:** 16px between cards, 8/12/16 inside
4. **Typography:** Material System tokens (hero, large, label, unit)
5. **Controls:** Gradient increment buttons with stroke

**Backup:** Original saved as `app/(tabs)/index-old-backup.tsx`

---

## 📐 Design Rules

### Lock the Comparison Setup (Don't Chase Ghosts)

- Pick ONE "golden" render screen
- Pick ONE real screen (same data)
- Freeze: same font scale, same values, no animations
- After each change: screenshot + compare side-by-side

### Spacing Rhythm

**Rule:** Denser INSIDE surfaces, airier BETWEEN surfaces

```
Inside cards:  8/12/16
Between cards: 16
```

### Typography Hierarchy (Make the Metric Lead)

- **Labels:** Dim more + slightly smaller (11pt @ 40%)
- **Hero numbers:** Heavier weight + tighter tracking (56pt, -2)
- **Units:** Smaller + muted + baseline aligned (14pt @ 50%)

---

## 🎨 RenderCard Pattern

**Apply to:**
- ✅ Target Distance card
- ✅ Plays Like card
- ⏳ Weather card (needs update)
- ⏳ Wind info bar (needs update)

**Usage:**

```tsx
<RenderCard style={styles.cardSpacing} padding={16}>
  {/* Card content */}
</RenderCard>
```

**Shadow tuning:**
- Too flat → increase opacity or y-offset
- Too floaty → reduce y-offset or radius

---

## 🎛️ Controls Micro-Depth

**Increment buttons now have:**
- ✅ Gradient fill (top lighter, bottom darker)
- ✅ Faint stroke (`rgba(255,255,255,0.08)`)
- ⏳ Pressed state inversion (not yet implemented)
- ⏳ Slider thumb gradient (not yet implemented)

**Pattern:**

```tsx
<Pressable style={({ pressed }) => [...]}>
  <LinearGradient colors={controls.normal.gradient.colors}>
    {/* Button content */}
  </LinearGradient>
</Pressable>
```

---

## ⏳ TODO (After Parity)

### Optional Polish

1. **Hero glow** (very subtle)
   - Glow opacity: 0.10-0.18
   - Shadow opacity: 0.25-0.40
   - Radius: 14-18

2. **Micro motion**
   - Gentle press feedback on cards/buttons
   - Smooth number transitions

### Other Screens

- **Wind compass:** Apply same background, card material, radii
- **Weather card:** Convert to RenderCard pattern
- **Settings/preferences:** Apply Material System

---

## 🧪 Testing Checklist

Compare side-by-side with render:

### Background
- [ ] Subtle top-to-bottom gradient visible
- [ ] Vignette darkens edges
- [ ] Feels like "space" not "flat black"

### Cards
- [ ] Soft ambient shadow (large spread)
- [ ] Sharp contact shadow (tight to surface)
- [ ] Cards "float" above background
- [ ] Gradient visible (top lighter, bottom darker)
- [ ] Outer stroke subtle but present

### Spacing
- [ ] Cards feel denser inside
- [ ] More breathing room between cards
- [ ] No dead space under sections

### Typography
- [ ] Hero number pops (56pt, heavy, tight tracking)
- [ ] Labels dimmed (40% opacity)
- [ ] Units muted and smaller
- [ ] Overall hierarchy clear

### Controls
- [ ] Increment buttons have gradient
- [ ] Faint stroke visible
- [ ] Slider track matches design
- [ ] Buttons feel tactile

---

## 🚢 Deployment

**Current status:** Render-matched Shot screen ready

**To test:**
1. `npm run typecheck` — ✅ Should pass
2. Build new preview (EAS or local)
3. Compare screenshot to golden render
4. Tune shadows/spacing if needed

**Files to watch:**
- `src/constants/material-system.ts` — All design tokens
- `src/components/ui/RenderCard.tsx` — Shadow layering
- `src/components/ui/SceneBackground.tsx` — Background depth
- `app/(tabs)/index.tsx` — Render-matched screen

---

## 🎯 Success Criteria

**Visual pass if:**
- [ ] Background has atmospheric depth
- [ ] Cards have proper shadow separation
- [ ] Spacing rhythm matches render
- [ ] Typography hierarchy is clear
- [ ] Controls feel tactile (not flat)

**Shipping confidence:**
- ✅ Material System locked in
- ✅ RenderCard pattern proven
- ✅ SceneBackground working
- ✅ Shot screen updated
- ⏳ Other screens need conversion

---

## 📚 Key Learnings

### Why Two Shadow Layers?

iOS renders shadows more realistically with two layers:
- **Ambient:** Defines the "lift" (how far from background)
- **Contact:** Defines where it "touches down"

### Why No Overflow on Shadows?

Clipping shadows kills the depth. Only clip content, never shadows.

### Why Gradient on Cards?

Flat fills look dead. Subtle top-to-bottom gradient mimics real-world lighting.

### Why Vignette on Background?

Pure black backgrounds make UI elements feel like they're floating in void. Vignette creates a "stage" for the UI.

---

**Implementation by:** Claw  
**Date:** Feb 8, 2026  
**Based on:** Taylor's detailed render-matching guide
