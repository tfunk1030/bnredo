export const colors = {
  // Backgrounds - Near-black with subtle depth
  background: '#0A0A0A',       // Near-black base
  surface: '#1C1F24',          // Card top (gradient start)
  surfaceBottom: '#15181D',    // Card bottom (gradient end)
  surfaceElevated: '#2A2D2E',  // Elevated surfaces
  border: '#2A2D30',           // Subtle borders
  divider: '#333636',          // Section dividers

  // Primary green - ACTIONS ONLY (Lock Target, Plays Like, Recommended Club)
  primary: '#4B9E50',          // Natural golf green - actionable items
  primaryDark: '#3D8B42',      // Darker for pressed states
  primaryLight: '#5CB860',     // Lighter for hover/focus

  // Muted green - INFORMATIONAL (icons, indicators, wind arrows)
  greenMuted: '#3D7A41',       // Desaturated green for non-critical indicators
  greenSubtle: '#2D5E30',      // Very subtle green for backgrounds/tints

  // Legacy accent (kept for compatibility)
  accent: '#4B9E50',
  accentDark: '#3D8B42',

  // Text - improved contrast for outdoor legibility
  text: '#FFFFFF',             // White - primary content
  textSecondary: '#9A9AA0',    // Brighter gray - labels (improved contrast)
  textMuted: '#6E6E76',        // Medium gray - metadata
  textAccent: '#4B9E50',       // Golf green - highlighted values

  // Feedback colors
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',

  white: '#ffffff',
  black: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 120, // For floating button clearance
};

export const typography = {
  // ── NUMBER STYLES (SF Pro Display / optionally JetBrains Mono) ──
  // Hero yardage (148 yards) — the one bold thing on screen
  hero: {
    fontSize: 52,
    fontWeight: '700' as const,
    lineHeight: 60,
    letterSpacing: -1.5,
  },
  // Secondary distance (197 yds)
  largeNumber: {
    fontSize: 36,
    fontWeight: '600' as const,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  // Stat numbers (66°F, 22%, 7 mph, 1017)
  mediumNumber: {
    fontSize: 28,
    fontWeight: '500' as const,
    lineHeight: 34,
  },
  // Compact data values in rows
  dataValue: {
    fontSize: 17,
    fontWeight: '500' as const,
    lineHeight: 22,
  },

  // ── TEXT STYLES (SF Pro Text) ──
  // Section titles (Plays Like, Target Distance)
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
    letterSpacing: 0.5, // Slight letter spacing per render rec
  },
  // Data labels (Temp, Humidity, WNW)
  dataLabel: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  // Legacy (keep for compatibility)
  largeTitle: {
    fontSize: 48,
    fontWeight: '700' as const,
    lineHeight: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: '600' as const,
    lineHeight: 34,
  },
  headline: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  small: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 14,
  },
};

export const borderRadius = {
  sm: 8,       // Small elements (bumped +2)
  md: 14,      // Cards (bumped +2 for premium feel)
  lg: 18,      // Main cards (bumped +2)
  xl: 24,      // Pills, large buttons
  full: 9999,  // Circular
};

// Touch target sizes - oversized for golf gloves
export const touchTargets = {
  minimum: 52,      // Minimum (slightly oversized for gloves)
  comfortable: 60,  // Comfortable target size
  dense: 48,        // Dense UI minimum
};

// Common hit slop for small icons
export const hitSlop = {
  small: { top: 12, right: 12, bottom: 12, left: 12 },
  medium: { top: 16, right: 16, bottom: 16, left: 16 },
};

// Animation constants for consistent motion design
export const animation = {
  // Durations (ms)
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },
  // Spring configs for react-native-reanimated
  spring: {
    snappy: {
      damping: 20,
      stiffness: 300,
      mass: 1,
    },
    bouncy: {
      damping: 10,
      stiffness: 180,
      mass: 1,
    },
    gentle: {
      damping: 15,
      stiffness: 100,
      mass: 1,
    },
  },
  // Timing configs
  timing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    linear: 'linear',
  },
  // Scale values for press feedback
  scale: {
    pressed: 0.97,
    disabled: 1,
    active: 1.02,
  },
  // Opacity values
  opacity: {
    disabled: 0.5,
    pressed: 0.8,
    active: 1,
  },
};

// Glass/blur effect constants for iOS 18+ Liquid Glass
export const glass = {
  // Blur intensities for BlurView fallback
  blur: {
    light: 10,
    medium: 20,
    heavy: 40,
  },
  // Background opacity for glass surfaces
  backgroundOpacity: {
    subtle: 0.1,
    medium: 0.2,
    strong: 0.4,
  },
  // Border opacity for glass edges
  borderOpacity: 0.15,
  // Tint colors (applied over blur) - Muted golf green
  tint: {
    dark: 'rgba(0, 0, 0, 0.6)',
    light: 'rgba(255, 255, 255, 0.1)',
    accent: 'rgba(75, 158, 80, 0.15)',     // golf green with transparency
    primary: 'rgba(75, 158, 80, 0.12)',    // golf green primary
    accentStrong: 'rgba(75, 158, 80, 0.2)', // stronger green for active states
  },
  // Card background tints (more subtle, for surface overlays)
  cardTint: {
    success: 'rgba(52, 199, 89, 0.06)',    // subtle green for result cards
    premium: 'rgba(75, 158, 80, 0.08)',    // subtle green for premium sections
    premiumActive: 'rgba(75, 158, 80, 0.12)', // stronger green when premium is active
  },
};

// Card shadow for subtle depth (premium hardware feel)
export const cardShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
};

// Card gradient colors (top-to-bottom for depth)
export const cardGradient = {
  colors: [colors.surface, colors.surfaceBottom] as const,
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
};

// Component style presets
export const components = {
  // Standard card with depth
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg, // Increased from md for breathing room
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  weatherDataRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: spacing.sm,
  },
  incrementButton: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    minWidth: touchTargets.minimum,
    minHeight: touchTargets.minimum,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  // Primary button - green for ACTIONS only
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    minHeight: touchTargets.minimum,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  slider: {
    minimumTrackTintColor: colors.primary,
    maximumTrackTintColor: colors.border,
    thumbTintColor: colors.primary,
  },
};
