# AICaddyPro Design System

Based on reference app design (Feb 7, 2026)

## Color Palette

### Background
```typescript
background: {
  primary: '#000000',      // Pure black base
  secondary: '#1C1C1E',    // Dark charcoal cards
  tertiary: '#2C2C2E',     // Elevated surfaces
}
```

### Text
```typescript
text: {
  primary: '#FFFFFF',      // White - main text
  secondary: '#8E8E93',    // Gray - labels, metadata
  tertiary: '#636366',     // Darker gray - disabled
  accent: '#7FFF00',       // Lime green - highlighted values
}
```

### Accent Colors
```typescript
accent: {
  primary: '#7FFF00',      // Lime green - primary actions
  success: '#34C759',      // Green - confirmation
  warning: '#FF9500',      // Orange - alerts
  error: '#FF3B30',        // Red - errors
}
```

### UI Elements
```typescript
ui: {
  border: '#38383A',       // Subtle borders
  divider: '#48484A',      // Section dividers
  overlay: 'rgba(0,0,0,0.6)', // Modals/overlays
}
```

## Typography

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

**Last updated:** 2026-02-07
**Reference:** iPhone dark mode golf app design
