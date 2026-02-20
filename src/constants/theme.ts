export const colors = {
  // ── RENDER-TO-REALITY FIXES (Feb 8, 2026) ──
  // Background - radial gradient for premium depth (not flat black)
  background: '#0A0A0A',       // Near-black base (subtle depth vs cards)
  backgroundRadialStart: '#1A1A1A', // Charcoal (top/center of radial gradient)
  backgroundRadialEnd: '#000000',   // True black (edges)
  
  // Card surfaces - gradient for depth (not flat)
  surface: '#1C1F24',          // Card gradient top (lighter)
  surfaceBottom: '#15181D',    // Card gradient bottom (darker)
  surfaceElevated: '#222222',  // Elevated surfaces (buttons)

  // Green-tinted card surfaces (new primary card gradient)
  surfaceGreen: '#0f1a0f',     // Green card gradient top
  surfaceGreenBottom: '#0c120c', // Green card gradient bottom
  border: '#2A2D30',           // Subtle borders (visible but calm)
  divider: '#2A2A2A',          // Section dividers

  // ── GREEN ACCENT (THE BIGGEST CULPRIT) ──
  // PRIMARY: Vibrant neon lime with gradient (for renders/marketing)
  primaryVibrant: '#39FF14',    // Electric lime (use with gradient)
  primaryVibrantEnd: '#28CD41', // Gradient end point
  
  // MUTED: Natural golf green (for on-course night use)
  primary: '#4B9E50',          // Muted leafy green (less eye strain)
  primaryDark: '#3D8B42',      // Darker for pressed states
  primaryLight: '#5AAF5E',     // Lighter for hover/focus

  // Muted green - INFORMATIONAL (icons, indicators, wind arrows)
  greenMuted: '#3D7A41',       // Desaturated green for non-critical indicators
  greenSubtle: '#2D5E30',      // Very subtle green for backgrounds/tints

  // Legacy accent (kept for compatibility)
  accent: '#4B9E50',
  accentDark: '#3D8B42',

  // Text - matched to reference
  text: '#EAEAEA',             // Near-white (not pure white)
  textSecondary: '#8A8F8A',    // Medium gray - section labels
  textMuted: '#6B6F6B',        // Dimmer gray - metadata/sublabels
  textAccent: '#4CAF50',       // Golf green - highlighted values

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
  // ── NUMBER STYLES (SF Pro Display) ──
  // RENDER FIX: Shrunk 5-10% for denser "instrument panel" feel
  
  // Hero yardage (148 yards) — the one bold thing on screen
  hero: {
    fontSize: 40,    // Was 42 → -5%
    fontWeight: '700' as const,
    lineHeight: 46,  // Was 48
    letterSpacing: -1,
  },
  // Secondary distance (197 yds) / target distance
  largeNumber: {
    fontSize: 30,    // Was 32 → -6%
    fontWeight: '600' as const,
    lineHeight: 36,  // Was 38
    letterSpacing: -0.5,
  },
  // Stat numbers (66°F, 22%, 7 mph, 1017)
  mediumNumber: {
    fontSize: 20,    // Was 22 → -9%
    fontWeight: '500' as const,
    lineHeight: 26,  // Was 28
  },
  // Compact data values in rows
  dataValue: {
    fontSize: 15,    // Was 16 → -6%
    fontWeight: '500' as const,
    lineHeight: 19,  // Was 20
  },

  // ── TEXT STYLES (SF Pro Text) ──
  // Section titles (Plays Like, Target Distance)
  sectionTitle: {
    fontSize: 12,    // Was 13 → -8%
    fontWeight: '500' as const,
    lineHeight: 17,  // Was 18
    letterSpacing: 0.5,
  },
  // Data labels (Temp, Humidity, WNW)
  dataLabel: {
    fontSize: 11,    // Was 12 → -8%
    fontWeight: '400' as const,
    lineHeight: 16,  // Was 18
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
  sm: 6,       // Small elements (buttons)
  md: 10,      // Sub-cards
  lg: 12,      // Main cards (compact, not bubbly)
  xl: 20,      // Pills, large buttons
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

// Glass/blur effect constants (RENDER FIX: glassmorphism depth)
export const glass = {
  // Blur intensities for BlurView
  blur: {
    light: 10,
    medium: 20,
    heavy: 40,
  },
  // Background opacity for glass surfaces (RENDER FIX: translucency)
  backgroundOpacity: {
    subtle: 0.85,   // Cards should be translucent, not opaque
    medium: 0.75,   // More translucent for premium feel
    strong: 0.65,   // Heavy translucency
  },
  // Border opacity for glass edges (RENDER FIX: edge lighting)
  borderOpacity: 0.08,  // Very subtle white stroke (was 0.15, too strong)
  // Tint colors (applied over blur) - neutral, no green tint on surfaces
  tint: {
    dark: 'rgba(0, 0, 0, 0.6)',
    light: 'rgba(255, 255, 255, 0.08)',
    accent: 'rgba(76, 175, 80, 0.12)',
    primary: 'rgba(76, 175, 80, 0.10)',
    accentStrong: 'rgba(76, 175, 80, 0.18)',
  },
  // Card background tints (very subtle)
  cardTint: {
    success: 'rgba(52, 199, 89, 0.04)',
    premium: 'rgba(76, 175, 80, 0.06)',
    premiumActive: 'rgba(76, 175, 80, 0.10)',
  },
};

// Card shadow - premium depth (RENDER FIX: separation from background)
export const cardShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },  // Slightly more lift
  shadowOpacity: 0.3,                      // Stronger shadow
  shadowRadius: 8,                         // Softer edges
  elevation: 5,                            // Android depth
};

// ── RENDER-TO-REALITY GRADIENTS ──

// Background radial gradient (for premium depth vs flat black)
export const backgroundGradient = {
  // Use this for screen backgrounds
  colors: [colors.backgroundRadialStart, colors.backgroundRadialEnd] as const,
  // Radial from top center
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
};

// Card gradient (top-to-bottom for depth) — green-tinted for premium feel
export const cardGradient = {
  colors: [colors.surfaceGreen, colors.surfaceGreenBottom] as const,
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
};

// Primary button gradient (vibrant green with dimension)
export const primaryButtonGradient = {
  // THE FIX: Adds "pop" and shifts from "flat tool" → "premium app"
  colors: [colors.primaryVibrant, colors.primaryVibrantEnd] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 }, // Diagonal gradient (135deg)
};

// Component style presets
export const components = {
  // Standard card - compact
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
