/**
 * SceneBackground — Background with Gradient + Vignette
 * 
 * Goal: UI should feel like it sits in a space, not on pure black.
 * 
 * Layers:
 * 1. Subtle top-to-bottom gradient (#0D0D0F → #000000)
 * 2. Vignette overlay (transparent center → dark edges)
 * 
 * Based on Taylor's render-matching guide (Feb 8, 2026).
 */

import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { background } from '@/src/constants/material-system';

export interface SceneBackgroundProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SceneBackground({ children, style }: SceneBackgroundProps) {
  return (
    <LinearGradient
      colors={background.gradient.colors}
      start={background.gradient.start}
      end={background.gradient.end}
      style={[styles.container, style]}
    >
      {/* Vignette overlay */}
      <LinearGradient
        colors={background.vignette.colors}
        start={background.vignette.start}
        end={background.vignette.end}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
