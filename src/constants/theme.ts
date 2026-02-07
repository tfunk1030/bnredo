export const colors = {
  // Backgrounds - Pure black aesthetic
  background: '#000000',        // Pure black base
  surface: '#1C1C1E',          // Dark charcoal cards
  surfaceElevated: '#2C2C2E',  // Elevated surfaces
  border: '#38383A',           // Subtle borders
  divider: '#48484A',          // Section dividers

  // Primary - Lime green accent
  primary: '#7FFF00',          // Bright lime green
  primaryDark: '#6FE000',      // Darker lime
  primaryLight: '#8FFF20',     // Lighter lime

  // Legacy accent (kept for compatibility)
  accent: '#7FFF00',           // Matches primary
  accentDark: '#6FE000',

  // Text
  text: '#FFFFFF',             // White - main text
  textSecondary: '#8E8E93',    // Gray - labels, metadata
  textMuted: '#636366',        // Darker gray - disabled
  textAccent: '#7FFF00',       // Lime green - highlighted values

  // Feedback colors
  success: '#34C759',          // Green
  warning: '#FF9500',          // Orange
  error: '#FF3B30',            // Red

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
  // Hero yardage display (148 yards)
  hero: {
    fontSize: 72,
    fontWeight: '700' as const,
    lineHeight: 80,
    letterSpacing: -2,
  },
  // Large numbers (197 yards)
  largeNumber: {
    fontSize: 48,
    fontWeight: '700' as const,
    lineHeight: 56,
    letterSpacing: -1,
  },
  // Medium numbers (66°F, 22%)
  mediumNumber: {
    fontSize: 32,
    fontWeight: '600' as const,
    lineHeight: 38,
  },
  // Small data values
  dataValue: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  // Section titles (Plays Like, Target Distance)
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
    textTransform: 'uppercase' as const,
  },
  // Data labels (Temp, Humidity, WNW)
  dataLabel: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
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
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Touch target sizes for accessibility (WCAG 2.5.5)
export const touchTargets = {
  minimum: 48,      // Minimum touch target size (dp)
  comfortable: 56,  // Comfortable touch target size (dp)
  dense: 44,        // Dense UI minimum (iOS HIG)
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
  // Tint colors (applied over blur) - Updated for lime green
  tint: {
    dark: 'rgba(0, 0, 0, 0.6)',
    light: 'rgba(255, 255, 255, 0.1)',
    accent: 'rgba(127, 255, 0, 0.15)',    // lime green with transparency
    primary: 'rgba(127, 255, 0, 0.12)',   // lime green primary
    accentStrong: 'rgba(127, 255, 0, 0.2)', // stronger lime for active states
  },
  // Card background tints (more subtle, for surface overlays)
  cardTint: {
    success: 'rgba(52, 199, 89, 0.06)',   // subtle green for result cards
    premium: 'rgba(127, 255, 0, 0.08)',   // subtle lime for premium sections
    premiumActive: 'rgba(127, 255, 0, 0.12)', // stronger lime when premium is active
  },
};

// Component style presets (matching reference design)
export const components = {
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  weatherDataRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  incrementButton: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 48,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryButtonText: {
    color: colors.black,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  slider: {
    minimumTrackTintColor: colors.primary,
    maximumTrackTintColor: colors.border,
    thumbTintColor: colors.primary,
  },
};
