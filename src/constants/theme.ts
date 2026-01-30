export const colors = {
  background: '#0d1117',
  surface: '#161b22',
  surfaceElevated: '#21262d',
  border: '#30363d',

  primary: '#238636',
  primaryDark: '#1a7f37',
  primaryLight: '#2ea043',

  accent: '#c9a227',
  accentDark: '#a68621',

  text: '#f0f6fc',
  textSecondary: '#8b949e',
  textMuted: '#6e7681',

  success: '#238636',
  warning: '#d29922',
  error: '#f85149',

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
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
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
  // Tint colors (applied over blur)
  tint: {
    dark: 'rgba(0, 0, 0, 0.3)',
    light: 'rgba(255, 255, 255, 0.1)',
    accent: 'rgba(201, 162, 39, 0.15)', // accent color with transparency
    primary: 'rgba(35, 134, 54, 0.12)', // primary green with transparency
    accentStrong: 'rgba(201, 162, 39, 0.2)', // stronger gold for premium active
  },
  // Card background tints (more subtle, for surface overlays)
  cardTint: {
    success: 'rgba(35, 134, 54, 0.06)', // subtle green for result cards
    premium: 'rgba(201, 162, 39, 0.08)', // subtle gold for premium sections
    premiumActive: 'rgba(201, 162, 39, 0.12)', // stronger gold when premium is active
  },
};
