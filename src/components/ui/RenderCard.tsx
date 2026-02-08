/**
 * RenderCard — Render-Quality Card Component
 * 
 * Implements the correct shadow layering pattern:
 * 1. Wrapper A: ambient shadow (soft, large)
 * 2. Wrapper B: contact shadow (sharp, tight)
 * 3. Inner surface: gradient fill + strokes + overflow hidden
 * 
 * CRITICAL RULE: Never put overflow:'hidden' on shadow layers!
 * 
 * Based on Taylor's render-matching guide (Feb 8, 2026).
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radii, strokes, surface, shadows } from '@/src/constants/material-system';

export interface RenderCardProps {
  children: React.ReactNode;
  /** Additional style for the card surface (inner layer) */
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
  style,
  padding = 16,
  noShadow = false,
  testID,
}: RenderCardProps) {
  // Wrapper A: Ambient shadow (soft, large spread)
  const ambientShadowStyle: ViewStyle = noShadow
    ? {}
    : {
        ...shadows.ambient,
        // Don't clip shadows!
        overflow: undefined,
      };

  // Wrapper B: Contact shadow (sharp, tight to surface)
  const contactShadowStyle: ViewStyle = noShadow
    ? {}
    : {
        ...shadows.contact,
        borderRadius: radii.card,
        // Don't clip shadows!
        overflow: undefined,
      };

  // Surface layer: gradient + strokes + clipping
  const surfaceStyle: ViewStyle = {
    borderRadius: radii.card,
    borderWidth: 0.5,
    borderColor: strokes.outer,
    padding,
    overflow: 'hidden', // ONLY clip on the surface layer
  };

  return (
    <View style={[ambientShadowStyle, style]} testID={testID}>
      <View style={contactShadowStyle}>
        <LinearGradient
          colors={[surface.topSheen, surface.base, surface.bottomWeight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={surfaceStyle}
        >
          {children}
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // No styles needed — everything is inline for clarity
});
