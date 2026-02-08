/**
 * BackgroundGradient - Radial gradient background for premium depth
 * 
 * RENDER FIX (Feb 8, 2026): Replaces flat black with subtle radial gradient
 * for cinematic atmosphere. This is the difference between "flat tool" and
 * "premium app."
 * 
 * Usage: Wrap your screen content with this component
 */

import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { backgroundGradient } from '@/src/constants/theme';

export interface BackgroundGradientProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function BackgroundGradient({ children, style }: BackgroundGradientProps) {
  return (
    <LinearGradient
      colors={backgroundGradient.colors}
      start={backgroundGradient.start}
      end={backgroundGradient.end}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
