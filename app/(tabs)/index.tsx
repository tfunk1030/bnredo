import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Minus, Plus, ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography, touchTargets } from '@/src/constants/theme';
import { AnimatedNumber } from '@/src/components/ui/AnimatedNumber';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { WeatherCard } from '@/src/components/WeatherCard';
import { useWeather } from '@/src/contexts/WeatherContext';
import { useClubBag } from '@/src/contexts/ClubBagContext';
import { useUserPreferences } from '@/src/contexts/UserPreferencesContext';
import { EnvironmentalCalculator } from '@/src/core/services/environmental-calculations';
import { useHapticSlider } from '@/src/hooks/useHapticSlider';
import { formatDistance } from '@/src/utils/unit-conversions';

export default function ShotScreen() {
  const insets = useSafeAreaInsets();
  const { weather } = useWeather();
  const { getRecommendedClub } = useClubBag();
  const { preferences } = useUserPreferences();

  const [targetYardage, setTargetYardage] = React.useState(150);
  const [showBreakdown, setShowBreakdown] = React.useState(false);

  // Haptic feedback for slider every 5 yards
  const { onValueChange: onSliderHaptic, reset: resetSliderHaptic } = useHapticSlider({ interval: 5 });

  const calculations = React.useMemo(() => {
    if (!weather) return null;

    const conditions = {
      temperature: weather.temperature,
      humidity: weather.humidity,
      pressure: weather.pressure,
      altitude: weather.altitude,
      windSpeed: 0,
      windDirection: 0,
      windGust: 0,
      density: EnvironmentalCalculator.calculateAirDensity({
        temperature: weather.temperature,
        humidity: weather.humidity,
        pressure: weather.pressure,
      }),
    };

    const adjustments = EnvironmentalCalculator.calculateShotAdjustments(conditions);

    // Altitude effect is already included in air density (station pressure reflects elevation)
    const totalAdjustmentPercent = adjustments.distanceAdjustment;
    const adjustedYardage = Math.round(targetYardage * (1 - totalAdjustmentPercent / 100));

    return {
      adjustedYardage,
      adjustments,
      totalAdjustmentPercent,
    };
  }, [weather, targetYardage]);

  const recommendedClub = React.useMemo(() => {
    if (!calculations) return null;
    return getRecommendedClub(calculations.adjustedYardage);
  }, [calculations, getRecommendedClub]);

  // Format distances based on user preferences
  const targetFormat = formatDistance(targetYardage, preferences.distanceUnit);
  const adjustedFormat = calculations ? formatDistance(calculations.adjustedYardage, preferences.distanceUnit) : null;
  const clubDistanceFormat = recommendedClub ? formatDistance(recommendedClub.customDistance, preferences.distanceUnit) : null;

  const handleIncrement = (amount: number) => {
    setTargetYardage(prev => Math.min(350, Math.max(50, prev + amount)));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['rgba(35, 134, 54, 0.08)', 'transparent']}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <WeatherCard />

        <GradientCard variant="default" style={styles.yardageSection}>
          <Text style={styles.sectionLabel}>Target Distance</Text>

          <View style={styles.yardageDisplay}>
            <Text style={styles.yardageValue}>{targetFormat.value}</Text>
            <Text style={styles.yardageUnit}>{targetFormat.label}</Text>
          </View>

          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={50}
              maximumValue={350}
              step={1}
              value={targetYardage}
              onValueChange={(value) => {
                onSliderHaptic(value);
                setTargetYardage(value);
              }}
              onSlidingComplete={resetSliderHaptic}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.cardGradientStart}
              thumbTintColor={colors.primary}
              accessibilityLabel={`Target distance: ${targetFormat.value} ${targetFormat.label}`}
              accessibilityRole="adjustable"
              accessibilityValue={{
                min: 50,
                max: 350,
                now: targetYardage,
                text: `${targetFormat.value} ${targetFormat.label}`,
              }}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>50</Text>
              <Text style={styles.sliderLabel}>350</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => handleIncrement(-5)}
              accessibilityRole="button"
              accessibilityLabel="Decrease distance by 5 yards"
              accessibilityHint="Double tap to subtract 5 yards from target distance"
            >
              <Minus color={colors.white} size={20} />
              <Text style={styles.adjustButtonText}>5</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => handleIncrement(-1)}
              accessibilityRole="button"
              accessibilityLabel="Decrease distance by 1 yard"
              accessibilityHint="Double tap to subtract 1 yard from target distance"
            >
              <Minus color={colors.white} size={20} />
              <Text style={styles.adjustButtonText}>1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => handleIncrement(1)}
              accessibilityRole="button"
              accessibilityLabel="Increase distance by 1 yard"
              accessibilityHint="Double tap to add 1 yard to target distance"
            >
              <Plus color={colors.white} size={20} />
              <Text style={styles.adjustButtonText}>1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => handleIncrement(5)}
              accessibilityRole="button"
              accessibilityLabel="Increase distance by 5 yards"
              accessibilityHint="Double tap to add 5 yards to target distance"
            >
              <Plus color={colors.white} size={20} />
              <Text style={styles.adjustButtonText}>5</Text>
            </TouchableOpacity>
          </View>
        </GradientCard>

        {calculations && (
          <GradientCard variant="result" style={styles.resultSection}>
            <Text style={styles.playsLikeLabel}>Plays Like</Text>
            <AnimatedNumber
              value={adjustedFormat?.value ?? ''}
              style={styles.playsLikeValue}
              suffix={<Text style={styles.playsLikeUnit}> {adjustedFormat?.label}</Text>}
            />

            {recommendedClub && (
              <View style={styles.clubRecommendation}>
                <Text style={styles.clubLabel}>Recommended Club</Text>
                <Text style={styles.clubName}>{recommendedClub.name}</Text>
                <Text style={styles.clubDistance}>
                  ({clubDistanceFormat?.value} {clubDistanceFormat?.shortLabel} club)
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.breakdownToggle}
              onPress={() => setShowBreakdown(!showBreakdown)}
              accessibilityRole="button"
              accessibilityLabel={`${showBreakdown ? 'Hide' : 'Show'} calculation breakdown`}
              accessibilityState={{ expanded: showBreakdown }}
              accessibilityHint="Double tap to toggle breakdown details"
            >
              <Text style={styles.breakdownToggleText}>
                {showBreakdown ? 'Hide' : 'Show'} Breakdown
              </Text>
              {showBreakdown ? (
                <ChevronUp color={colors.textSecondary} size={16} />
              ) : (
                <ChevronDown color={colors.textSecondary} size={16} />
              )}
            </TouchableOpacity>

            {showBreakdown && (
              <View style={styles.breakdown}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Environmental Effect</Text>
                  <Text style={styles.breakdownSubtext}>
                    (includes air density and altitude)
                  </Text>
                  <Text style={styles.breakdownValue}>
                    {calculations.totalAdjustmentPercent > 0 ? '+' : ''}
                    {calculations.totalAdjustmentPercent.toFixed(1)}%
                  </Text>
                </View>
              </View>
            )}
          </GradientCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  yardageSection: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  yardageDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  yardageValue: {
    ...typography.largeTitle,
    color: colors.text,
  },
  yardageUnit: {
    color: colors.textSecondary,
    fontSize: 18,
    marginLeft: spacing.xs,
  },
  sliderContainer: {
    marginBottom: spacing.md,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  sliderLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  adjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: 4,
    minWidth: 72,
    minHeight: touchTargets.comfortable,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  adjustButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  resultSection: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.xl,
  },
  playsLikeLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  playsLikeValue: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  playsLikeUnit: {
    fontSize: 20,
    fontWeight: '400',
  },
  clubRecommendation: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clubLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  clubName: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '700',
  },
  clubDistance: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  breakdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  breakdownToggleText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  breakdown: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  breakdownLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  breakdownSubtext: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  breakdownValue: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '400',
  },
  breakdownTotal: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  breakdownTotalLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  breakdownTotalValue: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
