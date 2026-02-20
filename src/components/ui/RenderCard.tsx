/**
 * RenderCard — Render-Quality Card Component
 * 
 * Implements the correct shadow layering pattern:
 * 1. Wrapper A: ambient shadow (soft, large)
 * 2. Wrapper B: contact shadow (sharp, tight)
 * 3. Inner surface: gradient fill + strokes + overflow hidden
 * 
 * CRITICAL RULES:
 * - Never put overflow:'hidden' on shadow layers!
 * - Use containerStyle for positioning (margin, flex, etc.)
 * - Use surfaceStyle for inner card styling (alignment, extra padding, etc.)
 * - Do NOT pass overflow:'hidden' via containerStyle — it breaks shadows.
 * 
 * Based on Taylor's render-matching guide (Feb 8, 2026).
 */

import React from 'react';
import { View, Platform, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radii, strokes, shadows } from '@/src/constants/material-system';
import { cardGradient } from '@/src/constants/theme';

export interface RenderCardProps {
  children: React.ReactNode;
  /**
   * Style for the outer container (positioning: margin, flex, width, etc.)
   * WARNING: Do not pass overflow:'hidden' here — it clips shadows.
   */
  containerStyle?: StyleProp<ViewStyle>;
  /** Style for the inner card surface (alignment, extra padding, etc.) */
  surfaceStyle?: StyleProp<ViewStyle>;
  /**
   * @deprecated Use containerStyle instead. Applied to outer wrapper for backwards compat.
   */
  style?: StyleProp<ViewStyle>;
  /** Padding inside the card */
  padding?: number;
  /** Disable shadows (for nested cards) */
  noShadow?: boolean;
  /** Test ID */
  testID?: string;
}

export function RenderCard({
  children,
  containerStyle,
  surfaceStyle,
  style,
  padding = 16,
  noShadow = false,
  testID,
}: RenderCardProps) {
  // iOS CRITICAL: backgroundColor is required for React Native to set
  // CALayer.shadowPath (which makes the shadow visible). Using a near-
  // invisible alpha is more robust than 'transparent' across RN versions.
  const shadowBg = Platform.select({
    ios: 'rgba(0, 0, 0, 0.01)',
    default: undefined,
  });

  // Wrapper A: Ambient shadow (soft, large spread)
  const ambientShadowStyle: ViewStyle = noShadow
    ? {}
    : {
        ...shadows.ambient,
        backgroundColor: shadowBg,
        borderRadius: radii.card,
      };

  // Wrapper B: Contact shadow (sharp, tight to surface)
  const contactShadowStyle: ViewStyle = noShadow
    ? {}
    : {
        ...shadows.contact,
        backgroundColor: shadowBg,
        borderRadius: radii.card,
      };

  // Surface layer: gradient + strokes + clipping
  const innerSurfaceStyle: ViewStyle = {
    borderRadius: radii.card,
    borderWidth: 0.5,
    borderColor: strokes.outer,
    padding,
    overflow: 'hidden', // ONLY clip on the surface layer
  };

  // Support both new containerStyle and deprecated style prop
  const outerStyle = containerStyle ?? style;

  return (
    <View style={[ambientShadowStyle, outerStyle]} testID={testID}>
      <View style={contactShadowStyle}>
        <LinearGradient
          colors={cardGradient.colors}
          start={cardGradient.start}
          end={cardGradient.end}
          style={[innerSurfaceStyle, surfaceStyle]}
        >
          {children}
        </LinearGradient>
      </View>
    </View>
  );
}
