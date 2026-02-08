/**
 * GradientButton - Button with gradient background using expo-linear-gradient
 *
 * Provides consistent button styling with gradient backgrounds,
 * press feedback, and accessibility support.
 */

import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  colors,
  borderRadius,
  typography,
  spacing,
  animation,
  touchTargets,
} from '@/src/constants/theme';
import { useReduceMotion } from '@/src/hooks/useReduceMotion';

export type GradientButtonVariant = 'primary' | 'accent' | 'danger' | 'muted';
export type GradientButtonSize = 'sm' | 'md' | 'lg';

export interface GradientButtonProps {
  /** Button label */
  children: string;
  /** Press handler */
  onPress: () => void;
  /** Visual variant */
  variant?: GradientButtonVariant;
  /** Size preset */
  size?: GradientButtonSize;
  /** Disabled state */
  disabled?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Additional container styles */
  style?: StyleProp<ViewStyle>;
  /** Additional text styles */
  textStyle?: StyleProp<TextStyle>;
  /** Accessibility label (defaults to children) */
  accessibilityLabel?: string;
  /** Accessibility hint */
  accessibilityHint?: string;
  /** Test ID for testing */
  testID?: string;
}

// Gradient color stops for each variant
// RENDER FIX (Feb 8): Primary uses vibrant gradient for "pop"
const gradientColors: Record<GradientButtonVariant, [string, string]> = {
  primary: [colors.primaryVibrant, colors.primaryVibrantEnd], // THE FIX: vibrant green gradient
  accent: [colors.accent, colors.accentDark],
  danger: [colors.error, '#c41e3a'],
  muted: [colors.surfaceElevated, colors.surface],
};

// Size configurations
const sizeConfig: Record<
  GradientButtonSize,
  { height: number; paddingHorizontal: number; fontSize: number }
> = {
  sm: {
    height: touchTargets.dense,
    paddingHorizontal: spacing.md,
    fontSize: typography.caption.fontSize,
  },
  md: {
    height: touchTargets.minimum,
    paddingHorizontal: spacing.lg,
    fontSize: typography.body.fontSize,
  },
  lg: {
    height: touchTargets.comfortable,
    paddingHorizontal: spacing.xl,
    fontSize: typography.headline.fontSize,
  },
};

export function GradientButton({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: GradientButtonProps) {
  const reduceMotion = useReduceMotion();
  const config = sizeConfig[size];
  const gradientStops = gradientColors[variant];

  const getContainerStyle = useCallback(
    ({ pressed }: { pressed: boolean }): ViewStyle[] => {
      const baseStyle: ViewStyle = {
        height: config.height,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        opacity: disabled
          ? animation.opacity.disabled
          : pressed
          ? animation.opacity.pressed
          : animation.opacity.active,
        transform: [
          {
            scale:
              disabled || reduceMotion
                ? animation.scale.disabled
                : pressed
                ? animation.scale.pressed
                : animation.scale.disabled,
          },
        ],
      };

      if (fullWidth) {
        return [baseStyle, styles.fullWidth, style as ViewStyle];
      }
      return [baseStyle, styles.autoWidth, style as ViewStyle];
    },
    [config.height, disabled, fullWidth, reduceMotion, style]
  );

  const buttonTextStyle: TextStyle = {
    fontSize: config.fontSize,
    fontWeight: '600',
    color: variant === 'muted' ? colors.textSecondary : colors.white,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={getContainerStyle}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      testID={testID}
    >
      <LinearGradient
        colors={disabled ? [colors.border, colors.surfaceElevated] : gradientStops}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { paddingHorizontal: config.paddingHorizontal }]}
      >
        <Text style={[buttonTextStyle, textStyle]}>{children}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  autoWidth: {
    alignSelf: 'flex-start',
  },
});
