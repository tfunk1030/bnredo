/**
 * Material System — Render-Quality Design Tokens
 * 
 * Single source of truth for all visual materials.
 * Based on Taylor's detailed render-matching guide (Feb 8, 2026).
 * 
 * CRITICAL: Use these tokens everywhere. No one-off values.
 */

// ──────────────────────────────────────────────────────────────────────────
// RADII
// ──────────────────────────────────────────────────────────────────────────

export const radii = {
  card: 18,           // Main cards (weather, target distance, plays like)
  pill: 18,           // Pills and buttons (standardized)
  control: 14,        // Small controls (slider thumb, increment buttons)
} as const;

// ──────────────────────────────────────────────────────────────────────────
// STROKES (Border Colors)
// ──────────────────────────────────────────────────────────────────────────

export const strokes = {
  outer: 'rgba(255, 255, 255, 0.06)',   // Outer card border (edge lighting)
  inner: 'rgba(255, 255, 255, 0.035)',  // Inner separator strokes
} as const;

// ──────────────────────────────────────────────────────────────────────────
// SURFACE (Card Background)
// ──────────────────────────────────────────────────────────────────────────

export const surface = {
  base: 'rgba(18, 18, 20, 0.92)',         // Base card color (semi-transparent)
  topSheen: 'rgba(255, 255, 255, 0.07)',  // Top highlight (gradient start)
  bottomWeight: 'rgba(0, 0, 0, 0.10)',    // Bottom shadow (gradient end)
} as const;

// ──────────────────────────────────────────────────────────────────────────
// SHADOWS (iOS — Two-Layer System)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Ambient shadow: soft, large, defines the "lift"
 * Contact shadow: sharper, tighter, defines the "ground contact"
 * 
 * NEVER put overflow:'hidden' on shadow layers!
 */

export const shadows = {
  // Ambient shadow (soft, large spread)
  ambient: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },   // y: 18-24
    shadowOpacity: 0.40,                      // 0.35-0.45
    shadowRadius: 30,                         // 26-34
  },
  
  // Contact shadow (sharp, tight to surface)
  contact: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },    // y: 6-10
    shadowOpacity: 0.52,                      // 0.45-0.60
    shadowRadius: 12,                         // 10-14
  },
  
  // Control shadows (lighter, for buttons/slider)
  controlAmbient: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  
  controlContact: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
} as const;

// ──────────────────────────────────────────────────────────────────────────
// SPACING RHYTHM (8pt Grid)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Rule: Denser INSIDE surfaces, airier BETWEEN surfaces
 * 
 * Inside cards: 8/12/16
 * Between cards: 14-18
 */

export const spacing = {
  // Inside card spacing (tight)
  xs: 8,
  sm: 12,
  md: 16,
  
  // Between card spacing (airier)
  betweenCards: 16,
  
  // Legacy (keep for compatibility)
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

// ──────────────────────────────────────────────────────────────────────────
// BACKGROUND (Scene Depth)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Goal: UI feels like it sits in a space, not on pure black
 * 
 * Full-screen gradient + vignette overlay
 */

export const background = {
  // Subtle top-to-bottom gradient
  gradient: {
    colors: ['#0D0D0F', '#000000'] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  
  // Vignette overlay (bottom weight)
  vignette: {
    colors: [
      'rgba(0, 0, 0, 0)',      // Transparent center
      'rgba(0, 0, 0, 0.3)',    // Dark edges
    ] as const,
    start: { x: 0.5, y: 0.5 },
    end: { x: 0.5, y: 1 },
  },
} as const;

// ──────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY HIERARCHY (Render Weight)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Make the metric lead:
 * - Labels: dim more + slightly smaller
 * - Hero numbers: heavier weight + tighter tracking
 * - Units: smaller + muted + baseline aligned
 */

export const typography = {
  // Hero number (Plays Like: 152)
  hero: {
    fontSize: 56,
    fontWeight: '700' as const,
    letterSpacing: -2,
    lineHeight: 60,
    color: 'rgba(255, 255, 255, 0.98)',  // Slightly off-white
  },
  
  // Large number (Target Distance: 197)
  large: {
    fontSize: 36,
    fontWeight: '600' as const,
    letterSpacing: -1,
    lineHeight: 40,
    color: 'rgba(255, 255, 255, 0.95)',
  },
  
  // Medium number (66°F, 22%, 7 mph)
  medium: {
    fontSize: 20,
    fontWeight: '500' as const,
    letterSpacing: -0.3,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.90)',
  },
  
  // Labels (Temp, Humidity, WNW)
  label: {
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0.3,
    lineHeight: 14,
    color: 'rgba(255, 255, 255, 0.40)',  // Dimmer
  },
  
  // Units (yards, yds)
  unit: {
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.50)',  // Muted
  },
  
  // Section titles (Plays Like, Target Distance)
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
    color: 'rgba(255, 255, 255, 0.45)',
  },
} as const;

// ──────────────────────────────────────────────────────────────────────────
// CONTROLS (Micro-Depth)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Make slider + buttons feel tactile:
 * - Subtle gradient
 * - Faint stroke
 * - Pressed state inverts lighting
 */

export const controls = {
  // Normal state
  normal: {
    gradient: {
      colors: [
        'rgba(40, 40, 42, 0.85)',  // Top lighter
        'rgba(28, 28, 30, 0.95)',  // Bottom darker
      ] as const,
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    },
    stroke: 'rgba(255, 255, 255, 0.08)',
  },
  
  // Pressed state (inverted lighting)
  pressed: {
    gradient: {
      colors: [
        'rgba(28, 28, 30, 0.95)',  // Top darker
        'rgba(40, 40, 42, 0.85)',  // Bottom lighter
      ] as const,
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    },
    stroke: 'rgba(255, 255, 255, 0.04)',
  },
} as const;

// ──────────────────────────────────────────────────────────────────────────
// OPTIONAL POLISH (After Parity)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Hero glow (very subtle):
 * - Glow opacity: 0.10-0.18
 * - Shadow opacity: 0.25-0.40
 * - Radius: 14-18
 */

export const glow = {
  hero: {
    // Outer glow layer
    glow: {
      shadowColor: '#39FF14',  // Vibrant green
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.14,
      shadowRadius: 16,
    },
    // Inner shadow for depth
    shadow: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.32,
      shadowRadius: 6,
    },
  },
} as const;

// ──────────────────────────────────────────────────────────────────────────
// EXPORT TYPE FOR AUTOCOMPLETE
// ──────────────────────────────────────────────────────────────────────────

export type MaterialSystem = {
  radii: typeof radii;
  strokes: typeof strokes;
  surface: typeof surface;
  shadows: typeof shadows;
  spacing: typeof spacing;
  background: typeof background;
  typography: typeof typography;
  controls: typeof controls;
  glow: typeof glow;
};
