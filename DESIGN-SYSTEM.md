# AICaddyPro Design System

Based on reference app design (Feb 7, 2026)
**Updated Feb 8, 2026** with render-vs-real color/style fixes

---

## 🎨 Color Differences: Render vs Reality

### The Problem (Why Renders Look "Off")
Renders look like **idealized concept art** — brighter, cleaner, more cinematic.  
Real app looks **practical and field-tested** — muted, flatter, more utilitarian.

Your brain flags this because it's sensitive to:
1. **Accent color saturation** (neon vs natural)
2. **Black levels** (soft gradient vs hard flat)
3. **Spacing** (breathing room vs density)

---

## Color Palette

### Background
```typescript
background: {
  // RENDER (concept art vibes):
  // - Smooth charcoal gradient (#1A1A1A → #000000)
  // - Soft cinematic feel
  
  // REAL APP (what we actually want):
  primary: '#0A0A0A',      // Near-black base (NOT pure #000 - needs card depth)
  
  // For premium feel, add subtle radial gradient:
  // radial-gradient(circle at top center, #1A1A1A 0%, #000000 100%)
  
  secondary: '#1C1E1F',    // Dark gray-green cards (needs gradient for depth)
  tertiary: '#2A2D2E',     // Elevated surfaces
}
```

### Cards (The Depth Problem)
```typescript
// RENDER: Cards have glassmorphism - translucent, blurred, edge-lit
// REAL APP: Solid opaque rectangles that blend in too much

card: {
  // Start with gradient instead of flat color:
  background: 'linear-gradient(180deg, #1C1F24 0%, #15181D 100%)',
  
  // Add subtle border for "edge lighting":
  borderWidth: 0.5,
  borderColor: 'rgba(255, 255, 255, 0.08)',  // Very subtle white stroke
  
  // Optional: slight blur/translucency for glassmorphism
  // (React Native: use @react-native-community/blur)
  backdropFilter: 'blur(10px)',
  backgroundColor: 'rgba(28, 31, 36, 0.85)',  // Translucent instead of opaque
}
```

### Text
```typescript
text: {
  primary: '#FFFFFF',      // White - main text (crank this to FULL white in renders)
  secondary: '#8E8E93',    // Gray - labels, metadata
  tertiary: '#636366',     // Darker gray - disabled
  
  // CRITICAL FIX:
  accent: '#4B9E50',       // ❌ TOO MUTED for "pop"
  // For render-quality vibrancy, use:
  accentVibrant: '#39FF14', // Electric lime (with 80% opacity or gradient)
}
```

### Accent Colors (THE BIGGEST CULPRIT)
```typescript
accent: {
  // RENDER GREEN (marketing green):
  // - Bright, saturated, neon-ish (#39FF14 or #00FF00 variants)
  // - Has subtle glow/gradient applied (especially "Lock Target" button)
  // - Pops aggressively against dark background
  
  // REAL APP GREEN (what you currently have):
  primary: '#4B9E50',      // Muted leafy green - LACKS luminance
  // ^ This is a standard "Success Green" - no gradient, flat fill
  
  // THE FIX for vibrant UI:
  primaryVibrant: '#39FF14',  // High-viz neon lime (reduce opacity to ~80% if too harsh)
  
  // For "Lock Target" button specifically:
  buttonGradient: 'linear-gradient(135deg, #39FF14 0%, #28CD41 100%)',
  // ^ Adds dimension via gradient
  
  success: '#34C759',      // Green - confirmation
  warning: '#FF9500',      // Orange - alerts
  error: '#FF3B30',        // Red - errors
}
```

**Key Decision Point:**
- Use `#4B9E50` (muted) for **real app practicality** (less eye-strain on course at night)
- Use `#39FF14` (vibrant) for **renders/marketing** (pops in screenshots)
- Or add gradient to muted green for best of both worlds

### UI Elements
```typescript
ui: {
  border: '#333636',       // Subtle borders (slight green tint)
  divider: '#3A3D3E',      // Section dividers
  overlay: 'rgba(0,0,0,0.6)', // Modals/overlays
}
```

## Typography

### Render vs Real Differences
**RENDER:** More spacing, bigger typography, breathing room → "design showcase"  
**REAL APP:** Tighter layout, smaller text, compact info → "instrument panel"

**Icon Weight:**
- **Render:** Smoother, heavier icons
- **Real App:** Thinner, sharper system-like icons (affects perceived "realness")

**Contrast Tuning:**
- **Render:** High-contrast, very legible, pleasing
- **Real App:** Intentionally lower-contrast on some text/icons to avoid visual noise on course at night

### Font Family
- **Primary:** System default (SF Pro on iOS, Roboto on Android)
- **Fallback:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto'`

### Font Sizes
```typescript
fontSize: {
  xs: 11,      // Tiny labels
  sm: 13,      // Secondary text, metadata
  base: 15,    // Body text
  lg: 17,      // Emphasized text
  xl: 20,      // Section headers
  '2xl': 24,   // Card titles
  '3xl': 32,   // Secondary numbers
  '4xl': 48,   // Primary yardage display
  '5xl': 72,   // Hero numbers
}
```

### Font Weights
```typescript
fontWeight: {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
}
```

### Text Styles
```typescript
// Hero yardage (148 yards)
heroNumber: {
  fontSize: 72,
  fontWeight: '700',
  color: '#7FFF00',
  letterSpacing: -2,
}

// Secondary yardage (197 yards)
secondaryNumber: {
  fontSize: 48,
  fontWeight: '700',
  color: '#FFFFFF',
  letterSpacing: -1,
}

// Small data values (66°F, 22%, 7 mph)
dataValue: {
  fontSize: 17,
  fontWeight: '600',
  color: '#FFFFFF',
}

// Data labels (Temp, Humidity, WNW)
dataLabel: {
  fontSize: 11,
  fontWeight: '400',
  color: '#8E8E93',
  textTransform: 'uppercase',
}

// Section titles (Plays Like, Target Distance)
sectionTitle: {
  fontSize: 13,
  fontWeight: '500',
  color: '#8E8E93',
}
```

## Spacing

```typescript
spacing: {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
}
```

## Border Radius

```typescript
borderRadius: {
  sm: 8,       // Small elements
  md: 12,      // Cards
  lg: 16,      // Modals
  xl: 20,      // Large cards
  full: 9999,  // Pills, circular buttons
}
```

## Shadows

```typescript
shadow: {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
}
```

## Component Patterns

### Card
```typescript
card: {
  backgroundColor: '#1C1C1E',
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
}
```

### Weather Data Row
```typescript
weatherRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingVertical: 8,
  borderBottomWidth: 1,
  borderBottomColor: '#38383A',
}
```

### Increment Buttons (-5, -1, +1, +5)
```typescript
incrementButton: {
  backgroundColor: '#2C2C2E',
  borderRadius: 8,
  paddingVertical: 8,
  paddingHorizontal: 16,
  minWidth: 48,
}
```

### Primary Action Button (Lock Target)
```typescript
primaryButton: {
  backgroundColor: '#7FFF00',
  borderRadius: 24,
  paddingVertical: 12,
  paddingHorizontal: 24,
  flexDirection: 'row',
  alignItems: 'center',
}
```

### Slider
```typescript
slider: {
  minimumTrackTintColor: '#7FFF00',
  maximumTrackTintColor: '#38383A',
  thumbTintColor: '#7FFF00',
}
```

### Tab Bar
```typescript
tabBar: {
  backgroundColor: '#000000',
  borderTopWidth: 1,
  borderTopColor: '#38383A',
  paddingBottom: 8,
}

tabBarIcon: {
  active: '#7FFF00',
  inactive: '#8E8E93',
}
```

## Layout Principles

1. **Generous whitespace** - Don't crowd elements
2. **Clear hierarchy** - Size, weight, color establish importance
3. **Consistent alignment** - Left-align text, center numbers
4. **Touch targets** - Minimum 44x44 points
5. **Dark-first** - Optimize contrast for dark backgrounds

## Animation

```typescript
animation: {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  easing: {
    default: 'ease-in-out',
    spring: { stiffness: 300, damping: 30 },
  },
}
```

## Accessibility

- **Contrast ratios:** WCAG AAA compliance on dark backgrounds
- **Minimum text:** 13pt for body text
- **Touch targets:** 44x44pt minimum
- **Focus indicators:** Lime green outline (#7FFF00)

## Implementation Notes

### Expo/React Native Setup
```bash
# Install dependencies
npm install @react-navigation/native @react-navigation/bottom-tabs
```

### Theme Context
```typescript
// src/contexts/ThemeContext.tsx
export const theme = {
  colors: { /* colors above */ },
  typography: { /* typography above */ },
  spacing: { /* spacing above */ },
  // ...etc
}
```

### Usage
```typescript
import { theme } from '@/contexts/ThemeContext';

<View style={{ backgroundColor: theme.colors.background.primary }}>
  <Text style={theme.typography.heroNumber}>148</Text>
</View>
```

---

## 🎯 Render-to-Reality Checklist

To make **real app** match **render quality**:

### Color Fixes
- [ ] **Darken/desaturate green 10-20%** OR use vibrant green with gradient
- [ ] **Add gradient to "Lock Target" button** (not flat fill)
- [ ] **Use card gradients** (#1C1F24 → #15181D) instead of flat colors
- [ ] **Add subtle border** to cards (0.5pt white @ 8% opacity for edge lighting)
- [ ] **Background radial gradient** (charcoal → black) for premium depth

### Depth Fixes
- [ ] **Card glassmorphism:** translucency + blur (React Native Blur component)
- [ ] **Increase true blacks** in background (but keep gradient)
- [ ] **Add subtle shadows** to cards for separation

### Typography/Layout Fixes
- [ ] **Slightly tighten spacing** (renders are too spacious)
- [ ] **Shrink typography 5-10%** for denser "instrument panel" feel
- [ ] **Use thinner icon strokes** (system-like, not heavy)
- [ ] **Lower contrast on non-critical text** (avoid visual noise)

### The Quick Win
If you only fix **one thing**: Add gradient to the green accent.
```typescript
// Instead of:
backgroundColor: '#4B9E50'

// Use:
background: 'linear-gradient(135deg, #39FF14 0%, #28CD41 100%)'
```
This alone shifts it from "flat tool" → "premium app."

---

**Last updated:** 2026-02-08
**Reference:** iPhone dark mode golf app design
**Render feedback:** Taylor's color analysis (Feb 8)
