import * as React from 'react';
import { ViewStyle, StyleProp, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing } from '@/src/constants/theme';

type GradientCardVariant = 'default' | 'result' | 'premium';

interface GradientCardProps {
  variant?: GradientCardVariant;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const variantConfig: Record<GradientCardVariant, {
  gradientColors: [string, string];
  borderColor: string;
}> = {
  default: {
    gradientColors: [colors.cardGradientStart, colors.cardGradientEnd],
    borderColor: colors.border,
  },
  result: {
    gradientColors: ['rgba(35,134,54,0.08)', 'rgba(35,134,54,0.03)'],
    borderColor: colors.primary,
  },
  premium: {
    gradientColors: ['rgba(201,162,39,0.08)', 'rgba(201,162,39,0.03)'],
    borderColor: colors.accent,
  },
};

export function GradientCard({ variant = 'default', style, children }: GradientCardProps) {
  const config = variantConfig[variant];

  return (
    <LinearGradient
      colors={config.gradientColors}
      style={[styles.card, { borderColor: config.borderColor }, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
});
