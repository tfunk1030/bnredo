/**
 * GlassCard - Frosted glass card component using expo-blur
 *
 * Provides a consistent glass/blur effect across the app with
 * accessibility support for reduced motion preferences.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
  ViewProps,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, borderRadius, glass, spacing } from '@/src/constants/theme';
import { useReduceMotion } from '@/src/hooks/useReduceMotion';

export interface GlassCardProps {
  children: React.ReactNode;
  /** Blur intensity: 'light' | 'medium' | 'heavy' */
  intensity?: keyof typeof glass.blur;
  /** Tint overlay: 'dark' | 'light' | 'accent' */
  tint?: keyof typeof glass.tint;
  /** Border radius preset */
  radius?: keyof typeof borderRadius;
  /** Additional container styles */
  style?: StyleProp<ViewStyle>;
  /** Padding preset */
  padding?: keyof typeof spacing | number;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Accessibility role */
  accessibilityRole?: ViewProps['accessibilityRole'];
  /** Accessibility live region */
  accessibilityLiveRegion?: ViewProps['accessibilityLiveRegion'];
  /** Accessibility state */
  accessibilityState?: ViewProps['accessibilityState'];
  /** Whether to show border */
  bordered?: boolean;
  /** Test ID for testing */
  testID?: string;
}

export function GlassCard({
  children,
  intensity = 'medium',
  tint = 'dark',
  radius = 'lg',
  style,
  padding = 'md',
  accessibilityLabel,
  accessibilityRole,
  accessibilityLiveRegion,
  accessibilityState,
  bordered = true,
  testID,
}: GlassCardProps) {
  const reduceMotion = useReduceMotion();

  const blurIntensity = glass.blur[intensity];
  const tintColor = glass.tint[tint];
  const borderRadiusValue = borderRadius[radius];
  const paddingValue = typeof padding === 'number' ? padding : spacing[padding];

  // On Android or when reduce motion is enabled, use solid background instead of blur
  const useBlur = Platform.OS === 'ios' && !reduceMotion;

  const containerStyle: ViewStyle = {
    borderRadius: borderRadiusValue,
    overflow: 'hidden',
    ...(bordered && {
      borderWidth: 1,
      borderColor: `rgba(255, 255, 255, ${glass.borderOpacity})`,
    }),
  };

  const contentStyle: ViewStyle = {
    padding: paddingValue,
  };

  if (useBlur) {
    return (
    <View
      style={[containerStyle, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityLiveRegion={accessibilityLiveRegion}
      accessibilityState={accessibilityState}
      testID={testID}
    >
        <BlurView
          intensity={blurIntensity}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.tintOverlay, { backgroundColor: tintColor }]} />
        <View style={contentStyle}>{children}</View>
      </View>
    );
  }

  // Fallback for Android or reduced motion: solid surface color
  return (
    <View
      style={[
        containerStyle,
        styles.fallbackBackground,
        contentStyle,
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityLiveRegion={accessibilityLiveRegion}
      accessibilityState={accessibilityState}
      testID={testID}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tintOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  fallbackBackground: {
    backgroundColor: colors.surfaceElevated,
  },
});
