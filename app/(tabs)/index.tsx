import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { ChevronLeft, ChevronDown, ChevronUp, Target } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography, touchTargets, cardShadow } from '@/src/constants/theme';
import { WeatherCard } from '@/src/components/WeatherCard';
import { useWeather } from '@/src/contexts/WeatherContext';
import { useClubBag } from '@/src/contexts/ClubBagContext';
import { useUserPreferences } from '@/src/contexts/UserPreferencesContext';
import { YardageModelEnhanced, SkillLevel } from '@/src/core/models/yardagemodel';
import { useHapticSlider } from '@/src/hooks/useHapticSlider';
import { formatDistance } from '@/src/utils/unit-conversions';

export default function ShotScreen() {
  const insets = useSafeAreaInsets();
  const { weather } = useWeather();
  const { getRecommendedClub } = useClubBag();
  const { preferences } = useUserPreferences();

  const [targetYardage, setTargetYardage] = React.useState(197);
  const [isLocked, setIsLocked] = React.useState(false);
  const [showBreakdown, setShowBreakdown] = React.useState(false);

  // Haptic feedback for slider every 5 yards
  const { onValueChange: onSliderHaptic, reset: resetSliderHaptic } = useHapticSlider({ interval: 5 });

  const calculations = React.useMemo(() => {
    if (!weather) return null;

    const yardageModel = new YardageModelEnhanced();
    yardageModel.setBallModel('tour_premium');
    
    yardageModel.setConditions(
      weather.temperature,
      weather.altitude,
      0, // No wind (shot calculator doesn't include wind)
      0,
      weather.pressure,
      weather.humidity
    );

    const envResult = yardageModel.calculateAdjustedYardage(
      targetYardage,
      SkillLevel.PROFESSIONAL,
      '7-iron'
    );

    const envEffectYards = -(envResult.carryDistance - targetYardage);
    const totalAdjustmentPercent = (envEffectYards / targetYardage) * 100;
    const adjustedYardage = Math.round(targetYardage + envEffectYards);

    return {
      adjustedYardage,
      totalAdjustmentPercent,
    };
  }, [weather, targetYardage]);

  const recommendedClub = React.useMemo(() => {
    if (!calculations) return null;
    return getRecommendedClub(calculations.adjustedYardage);
  }, [calculations, getRecommendedClub]);

  const targetFormat = formatDistance(targetYardage, preferences.distanceUnit);
  const adjustedFormat = calculations ? formatDistance(calculations.adjustedYardage, preferences.distanceUnit) : null;

  const handleIncrement = (amount: number) => {
    if (isLocked) return;
    setTargetYardage(prev => Math.min(350, Math.max(50, prev + amount)));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} accessibilityLabel="Back">
          <ChevronLeft color={colors.primary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shot</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Weather Card */}
        <WeatherCard />

        {/* Plays Like Card — Hero metric */}
        {calculations && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Plays Like</Text>
            <View style={styles.heroRow}>
              <Text style={styles.heroValue}>{adjustedFormat?.value}</Text>
              <Text style={styles.heroUnit}>{adjustedFormat?.label}</Text>
            </View>

            {/* Plays Like slider */}
            <Slider
              style={styles.slider}
              minimumValue={50}
              maximumValue={350}
              step={1}
              value={calculations.adjustedYardage}
              disabled={true}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
              accessibilityLabel={`Plays like: ${adjustedFormat?.value} ${adjustedFormat?.label}`}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>50</Text>
              <Text style={styles.sliderLabelText}>350</Text>
            </View>

            {/* Increment buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.incrementBtn}
                onPress={() => handleIncrement(-5)}
                accessibilityLabel="Decrease by 5"
              >
                <Text style={styles.incrementBtnText}>− 5</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.incrementBtn}
                onPress={() => handleIncrement(-1)}
                accessibilityLabel="Decrease by 1"
              >
                <Text style={styles.incrementBtnText}>− 1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.incrementBtn}
                onPress={() => handleIncrement(1)}
                accessibilityLabel="Increase by 1"
              >
                <Text style={styles.incrementBtnText}>+ 1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.incrementBtn}
                onPress={() => handleIncrement(5)}
                accessibilityLabel="Increase by 5"
              >
                <Text style={styles.incrementBtnText}>+ 5</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Target Distance Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Target Distance</Text>
          <View style={styles.heroRow}>
            <Text style={styles.targetValue}>{targetFormat.value}</Text>
            <Text style={styles.targetUnit}>{targetFormat.label}</Text>
          </View>

          {/* Target slider */}
          <View style={styles.targetSliderRow}>
            <Slider
              style={styles.targetSlider}
              minimumValue={50}
              maximumValue={350}
              step={1}
              value={targetYardage}
              disabled={isLocked}
              onValueChange={(value) => {
                onSliderHaptic(value);
                setTargetYardage(value);
              }}
              onSlidingComplete={resetSliderHaptic}
              minimumTrackTintColor={isLocked ? colors.textMuted : colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={isLocked ? colors.textMuted : colors.primary}
              accessibilityLabel={`Target distance: ${targetFormat.value} ${targetFormat.label}`}
              accessibilityRole="adjustable"
              accessibilityValue={{
                min: 50,
                max: 350,
                now: targetYardage,
                text: `${targetFormat.value} ${targetFormat.label}`,
              }}
            />
          </View>
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabelText}>50</Text>
            <Text style={styles.sliderLabelText}>350</Text>
          </View>

          {/* Lock Target button */}
          <TouchableOpacity
            style={[styles.lockButton, isLocked && styles.lockButtonActive]}
            onPress={() => setIsLocked(!isLocked)}
            accessibilityLabel={isLocked ? 'Unlock target' : 'Lock target'}
            accessibilityRole="button"
          >
            <Target color={colors.white} size={16} strokeWidth={1.5} />
            <Text style={styles.lockButtonText}>
              {isLocked ? 'Unlock Target' : 'Lock Target'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Breakdown (collapsible) */}
        {calculations && (
          <TouchableOpacity
            style={styles.breakdownToggle}
            onPress={() => setShowBreakdown(!showBreakdown)}
            accessibilityLabel={`${showBreakdown ? 'Hide' : 'Show'} breakdown`}
            accessibilityState={{ expanded: showBreakdown }}
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
        )}

        {showBreakdown && calculations && (
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Environmental Effect</Text>
              <Text style={styles.breakdownValue}>
                {calculations.totalAdjustmentPercent > 0 ? '+' : ''}
                {calculations.totalAdjustmentPercent.toFixed(1)}%
              </Text>
            </View>
            {recommendedClub && (
              <View style={[styles.breakdownRow, styles.breakdownRowLast]}>
                <Text style={styles.breakdownLabel}>Recommended Club</Text>
                <Text style={[styles.breakdownValue, { color: colors.primary }]}>
                  {recommendedClub.name}
                </Text>
              </View>
            )}
          </View>
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

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  headerSpacer: {
    flex: 1,
  },

  // ── Scroll ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    gap: 12,
  },

  // ── Card (shared) ──
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  cardLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 4,
  },

  // ── Hero metric (Plays Like) ──
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -1,
  },
  heroUnit: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.textSecondary,
    marginLeft: 6,
  },

  // ── Target Distance ──
  targetValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  targetUnit: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    marginLeft: 6,
  },

  // ── Sliders ──
  slider: {
    width: '100%',
    height: 36,
  },
  targetSliderRow: {
    marginTop: 4,
  },
  targetSlider: {
    width: '100%',
    height: 36,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 12,
  },
  sliderLabelText: {
    color: colors.textMuted,
    fontSize: 11,
  },

  // ── Increment buttons ──
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  incrementBtn: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 60,
    minHeight: touchTargets.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incrementBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },

  // ── Lock Target button ──
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 8,
    minHeight: touchTargets.minimum,
  },
  lockButtonActive: {
    backgroundColor: colors.primaryDark,
  },
  lockButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },

  // ── Breakdown ──
  breakdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  breakdownToggleText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  breakdownCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownRowLast: {
    borderBottomWidth: 0,
  },
  breakdownLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  breakdownValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
});
