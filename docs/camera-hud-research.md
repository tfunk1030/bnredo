# AICaddyPro — Camera HUD / AR Wind Screen Research & Plan

*Date: February 20, 2026*
*Source: Coach feedback + reference app analysis*

---

## Coach Feedback Summary

1. ✅ "Good design" — current dark green aesthetic approved
2. 🔴 **Remove facing direction degrees** from Wind screen compass
3. 💡 **Experiment with live camera view** — compass/wind data overlaid on camera
4. 💡 **HUD fighter-pilot aesthetic** — crosshairs at target
5. 📸 Reference app provided (see analysis below)

---

## Reference App Analysis

The screenshot shows a golf wind app with:
- **Full-screen live camera feed** as the background
- **Compass ring overlay** centered on screen with degree markings (0–360), rotates with device heading
- **Wind direction arrow** (white triangle) inside the compass ring, pointing in wind direction
- **"Wind direction (auto-calibrated)"** label below compass
- **Bottom bar** with 4 data pills: Head/Tail wind (3.1 mph), Crosswind (29.8 mph →), Temp (63°F), Sea Level (545 ft)
- **"Tournament Prep"** mode label top-left
- **Settings gear** icon top-right
- **"Update" timestamp** (18:28) in center bar
- Monochrome/desaturated camera filter (reduces visual noise, makes overlays readable)

**What works well in this design:**
- Camera gives spatial context — you SEE the target while reading wind data
- Bottom data bar is dense but scannable (head/tail + cross is exactly what a golfer needs)
- Compass ring is large and readable against desaturated background
- Minimal chrome — everything is about the data

**What we'd do differently:**
- Our green gradient aesthetic (fighter-pilot HUD vibe, not gray/desaturated)
- Crosshair at center (the reference app just has a compass — we'd add a targeting reticle)
- Wind-adjusted yardage as the hero number (our core differentiator, not just raw wind)
- "Plays Like" distance overlaid on the camera view

---

## Proposed Implementation: "HUD Mode"

### Concept

A toggle on the Wind screen that switches from the current card-based layout to a full-screen camera view with HUD overlay. Think F-16 heads-up display meets golf: crosshairs on target, wind vector arrows, and adjusted yardage all floating over the live camera feed.

### Visual Design (Fighter Pilot HUD)

```
┌──────────────────────────────────────┐
│  [LIVE CAMERA FEED - FULL SCREEN]    │
│                                       │
│         ┌─── Compass Ring ───┐       │
│         │                     │       │
│         │    ╋ (crosshair)    │       │
│         │    ↗ wind arrow     │       │
│         │                     │       │
│         └─────────────────────┘       │
│                                       │
│     ┌─── PLAYS LIKE: 162 YDS ───┐    │
│     └────────────────────────────┘    │
│                                       │
│  ┌────┐ ┌────┐ ┌────┐ ┌────────┐    │
│  │HEAD│ │CROSS│ │GUST│ │ALTITUDE│    │
│  │2.1 │ │12.4→│ │18  │ │  545ft │    │
│  └────┘ └────┘ └────┘ └────────┘    │
│                                       │
│         [ LOCK TARGET ]               │
└──────────────────────────────────────┘
```

### Key Elements

1. **Crosshair reticle** — centered on screen, thin green lines (#4CAF50), fighter-pilot style with corner brackets or a full targeting reticle. Stays fixed; user points phone at target.

2. **Compass ring** — semi-transparent, overlaid around crosshair. Shows cardinal directions. Rotates with device heading. Wind arrow rendered inside.

3. **Wind vector arrow** — shows wind direction relative to target (headwind, crosswind, quartering). Color-coded: green (helping), red (hurting), yellow (cross).

4. **"Plays Like" hero number** — large text overlay (72px+) showing adjusted yardage. This is the killer feature — the reference app doesn't have this. You see the flag AND the adjusted distance simultaneously.

5. **Bottom data strip** — Head/Tail component, Crosswind component, Gusts, Altitude/Temp. Same data as current wind screen but in a compact overlay bar.

6. **Lock Target button** — bottom center, same as current functionality. When locked, crosshair turns solid and calculations freeze.

7. **Monochrome/green tint filter** — camera feed slightly desaturated with a green tint to match brand aesthetic and improve overlay contrast. Not required — test with and without.

### Mode Toggle

- **Default (current):** Card-based wind screen with compass widget. For quick glances and data review. Works without camera permission.
- **HUD Mode:** Full-screen camera with overlay. For on-course targeting. Requires camera + compass permissions.

Toggle via a small icon button (e.g., camera icon) in the top-right of the wind screen. First use triggers camera permission prompt.

---

## Technical Architecture

### Dependencies Required

| Package | Purpose | Expo Compatible | Size Impact |
|---|---|---|---|
| `expo-camera` | Live camera preview | ✅ Built-in | ~0 (already in Expo) |
| `expo-sensors` | Magnetometer/compass | ✅ Already using | 0 |
| `react-native-svg` | HUD overlays, compass ring | ✅ Already installed | 0 |
| `expo-haptics` | Lock-target feedback | ✅ Already installed | 0 |

**No new native dependencies required.** This is critical — everything we need is already in the Expo SDK or already installed. No new pod installs, no config plugins, no ejecting.

### Component Structure

```
WindScreen (wind.tsx)
├── CardMode (current layout)
│   └── CompassDisplay
│   └── WindInfoBar
│   └── TargetDistance
│   └── ResultsCard
└── HUDMode (new)
    ├── CameraView (expo-camera)
    ├── HUDOverlay (absolutely positioned View)
    │   ├── CrosshairReticle (SVG)
    │   ├── CompassRing (SVG, rotates with heading)
    │   ├── WindVectorArrow (SVG)
    │   ├── PlaysLikeDisplay (Text overlay)
    │   └── DataStrip (bottom bar)
    └── LockTargetButton
```

### Data Flow

```
Compass Heading (expo-sensors) ──┐
                                  ├──> Wind Calculator ──> HUD Overlay
Weather Data (API) ──────────────┘
                                       │
Target Yardage (user input/slider) ────┘
```

Same calculation engine as current wind screen — just different rendering. No new physics or data sources.

### Camera Integration Pattern

```tsx
// Simplified pattern — NOT actual implementation code
<View style={{ flex: 1 }}>
  <CameraView style={StyleSheet.absoluteFill} facing="back" />
  <View style={[StyleSheet.absoluteFill, styles.hudOverlay]}>
    {/* All HUD elements rendered as overlays */}
    <CrosshairReticle />
    <CompassRing heading={heading} windDirection={windDir} />
    <PlaysLikeDisplay yards={adjustedYards} />
    <DataStrip headTail={ht} cross={cross} gust={gust} />
  </View>
</View>
```

The camera is just a background — all interactivity happens in the overlay layer. No frame processing, no AR kit, no complex native bridges.

---

## Risks, Concerns & Mitigations

### 🔴 HIGH RISK

**1. Battery drain**
- Camera preview consumes significant power (GPU rendering each frame)
- On a 4+ hour round, this could drain 30-50% battery if left on continuously
- **Mitigation:** HUD mode as an OPT-IN toggle, not the default. Auto-timeout after 60 seconds of inactivity. Show battery indicator in HUD. Coach users to use it for targeting only (15-30 sec per shot), not leave it running.

**2. USGA / Rules of Golf legality**
- USGA Rule 4.3a: DMDs may measure distance only. **Apps that measure wind speed/direction are explicitly prohibited in tournament play.**
- This applies to the CURRENT app too, not just the camera feature
- **Mitigation:** This app is a **practice/prep tool**, not a tournament-legal device. Add a clear disclaimer: "Not for use during competition rounds under Rules of Golf." The reference app handles this the same way — it exists, it's on the App Store, and it markets as "Tournament Prep" (pre-round planning).
- **Note:** The camera feature itself doesn't add new rule violations. The compass + wind data is already there. Camera just changes the presentation.

**3. Performance on older devices**
- Camera preview + compass sensor + SVG overlay rendering simultaneously
- Could cause frame drops on iPhone 11 and earlier
- **Mitigation:** Test on oldest supported device (iPhone 12 per current deployment target). Use `react-native-reanimated` for overlay animations instead of React state updates. Keep SVG complexity low. Offer a "low power" mode that reduces camera resolution.

### 🟡 MEDIUM RISK

**4. Camera permission rejection**
- Some users won't grant camera access
- **Mitigation:** Graceful fallback to card mode. Permission request explains clearly: "Camera is used for wind targeting overlay — no photos or data are saved." Make HUD mode a bonus, not a requirement.

**5. Outdoor visibility**
- Phone screens are hard to read in direct sunlight
- Semi-transparent overlays could become invisible in bright conditions
- **Mitigation:** High-contrast HUD elements (thick strokes, solid backgrounds on text, green-on-dark). Option for solid (opaque) background on data strip. Test in outdoor conditions extensively before ship.

**6. App Store Review**
- Apple can be picky about camera apps. They want clear utility, not gimmicks.
- **Mitigation:** Camera usage is clearly justified (targeting/aiming tool for golf). Not collecting/storing any camera data. Privacy-friendly — no photos, no video, no uploads.

### 🟢 LOW RISK

**7. Compass accuracy degradation**
- Already an issue with current app. Camera doesn't make it worse.
- **Mitigation:** Same calibration prompts as current app.

**8. Device heating**
- Camera + GPU can cause thermal throttling
- **Mitigation:** Auto-timeout. Not running constantly.

**9. Motion sickness / UX disorientation**
- Moving overlays on moving camera can be disorienting
- **Mitigation:** Keep overlays anchored to screen (not world). Crosshair stays centered. Compass rotates smoothly with dampening. Wind arrow relative to screen, not world.

---

## What This DOESN'T Require (Scope Boundaries)

- ❌ **ARKit / ARCore** — we don't need world tracking, plane detection, or 3D anchoring. This is a 2D overlay on a camera feed, not true AR.
- ❌ **Image recognition** — we're not detecting the flag or green. The user points the phone manually.
- ❌ **Video recording** — camera is view-only, no capture.
- ❌ **New native modules** — everything is Expo SDK + existing deps.
- ❌ **GPS-based distance** — we already have target yardage input. Camera doesn't change that.

---

## Why This Could Be a Differentiator

1. **The reference app stops at raw wind data.** It shows head/tail and crosswind but doesn't tell you what club to hit or how far the shot actually plays. AICaddyPro already has the physics engine to answer "what does 165 yards play like in this wind?" — overlaying that answer on a live view of the target is the next step.

2. **The HUD aesthetic is unique in golf.** Every other golf app looks like a scorecard or a map. A fighter-pilot targeting display is memorable, shareable, and reinforces the "precision tool" brand.

3. **It's a premium feature gate.** HUD Mode is a perfect paywall item when RevenueCat goes in. Free users get the card-based wind screen. Premium unlocks the HUD camera view.

4. **It validates the app in 5 seconds.** When Taylor shows this to other players or sponsors, the reaction to a live camera HUD is immediate and visceral. "Point at the flag and it tells you the adjusted yardage" is a one-sentence pitch.

---

## Coach's Other Feedback: Remove Facing Direction Degrees

**Current:** `CompassDisplay.tsx` line 326 shows `{Math.round(heading)}°` with a label "Facing direction" or "Target locked"

**Recommendation:** Remove the numeric degree readout. The compass ring already communicates direction visually. The raw number (e.g., "247°") means nothing to most golfers — they think in terms of "toward the flag" not "247 degrees."

**Implementation:** Delete the `headingContainer` View containing the degree text from `CompassDisplay.tsx`. Simple removal, no layout changes needed — the compass ring remains.

**In HUD mode:** Degrees would definitely not appear. The crosshair IS the direction indicator.

---

## Implementation Phases

### Phase 1: Quick Win (< 1 hour)
- Remove facing direction degrees from CompassDisplay
- This is the coach's immediate feedback — ship it now

### Phase 2: Prototype (1-2 days)
- Add camera view behind current compass on Wind screen (toggle button)
- Basic crosshair overlay (simple SVG cross)
- No new calculations — reuse existing wind data
- Test on device for performance + outdoor visibility
- Validate the concept before investing in polish

### Phase 3: Full HUD (3-5 days)
- Fighter-pilot crosshair reticle (detailed SVG)
- Compass ring overlay (adapted from current CompassDisplay)
- Wind vector arrow
- "Plays Like" hero number overlay
- Bottom data strip (head/tail, cross, gust, altitude)
- Lock target with haptic feedback
- Auto-timeout (60s)
- Battery-aware (show warning if <20%)

### Phase 4: Polish & Gate (2-3 days)
- Green tint / monochrome camera filter
- Smooth animations (reanimated)
- Permission flow UX
- Premium gate integration (when RevenueCat is ready)
- App Store screenshots with HUD mode

---

## Open Questions

1. **Should HUD mode be landscape-only?** Holding phone sideways is more natural for "aiming at a target" and gives wider FOV. But it's a major layout change.

2. **Should the crosshair track to a fixed compass heading after lock?** i.e., if you lock at 247°, should the crosshair shift if you move the phone, showing you where 247° actually is? This is true AR behavior but much more complex.

3. **Night/low-light mode?** Camera feed in dark conditions is useless. Auto-fallback to card mode?

4. **Should we show the wind-adjusted distance on the shot screen too, or only in HUD?** Currently Plays Like is on the shot screen. Duplicating in HUD creates two sources of truth.

5. **What about the wind data pills from the reference app?** The "Head/Tail" and "Cross" split is very golfer-friendly. Should we adopt this format in both HUD and card mode?

---

*Next step: Decide on Phase 1 (remove degrees — immediate) and whether to proceed with Phase 2 prototype.*
