import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  AccessibilityInfo,
  findNodeHandle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Wind, AlertTriangle, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography, hitSlop } from '@/src/constants/theme';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { useWeather } from '@/src/contexts/WeatherContext';
import { useClubBag } from '@/src/contexts/ClubBagContext';
import { useUserPreferences } from '@/src/contexts/UserPreferencesContext';
import { calculateWindEffect } from '@/src/core/services/wind-calculator';
import { EnvironmentalCalculator } from '@/src/core/services/environmental-calculations';
import { formatDistance, formatWindSpeed } from '@/src/utils/unit-conversions';

interface WindResultsModalProps {
  visible: boolean;
  onClose: () => void;
  targetYardage: number;
  windAngle: number;
}

interface CalculationResult {
  adjustedYardage: number;
  lateralOffset: number;
  recommendedClub: string | null;
  windEffect: number;
  environmentalEffect: number;
}

export function WindResultsModal({
  visible,
  onClose,
  targetYardage,
  windAngle,
}: WindResultsModalProps) {
  const insets = useSafeAreaInsets();
  const { weather } = useWeather();
  const { getRecommendedClub } = useClubBag();
  const { preferences } = useUserPreferences();
  const firstResultRef = React.useRef<View>(null);

  // Format values based on user preferences
  const targetFormat = formatDistance(targetYardage, preferences.distanceUnit);
  const windSpeedFormat = weather ? formatWindSpeed(weather.windSpeed, preferences.windSpeedUnit) : null;
  const gustSpeedFormat = weather ? formatWindSpeed(weather.windGust, preferences.windSpeedUnit) : null;

  const calculations = React.useMemo(() => {
    if (!weather || !visible) return null;

    const conditions = {
      temperature: weather.temperature,
      humidity: weather.humidity,
      pressure: weather.pressure,
      altitude: weather.altitude,
      windSpeed: weather.windSpeed,
      windDirection: windAngle,
      windGust: weather.windGust,
      density: EnvironmentalCalculator.calculateAirDensity({
        temperature: weather.temperature,
        humidity: weather.humidity,
        pressure: weather.pressure,
      }),
    };

    const club = getRecommendedClub(targetYardage);
    if (!club) return null;

    const sustainedResult = calculateWindEffect({
      targetYardage,
      windSpeed: weather.windSpeed,
      windAngle,
      clubName: club.key,
      conditions,
    });

    const gustConditions = { ...conditions, windSpeed: weather.windGust };
    const gustResult = calculateWindEffect({
      targetYardage,
      windSpeed: weather.windGust,
      windAngle,
      clubName: club.key,
      conditions: gustConditions,
    });

    const sustainedYardage = sustainedResult
      ? Math.round(sustainedResult.totalDistance)
      : targetYardage;
    const gustYardage = gustResult
      ? Math.round(gustResult.totalDistance)
      : targetYardage;

    const sustainedClub = getRecommendedClub(sustainedYardage);
    const gustClub = getRecommendedClub(gustYardage);

    return {
      sustained: {
        adjustedYardage: sustainedYardage,
        lateralOffset: sustainedResult ? Math.round(sustainedResult.lateralEffect) : 0,
        recommendedClub: sustainedClub?.name || null,
        windEffect: sustainedResult?.windEffect || 0,
        environmentalEffect: sustainedResult?.environmentalEffect || 0,
      } as CalculationResult,
      gust: {
        adjustedYardage: gustYardage,
        lateralOffset: gustResult ? Math.round(gustResult.lateralEffect) : 0,
        recommendedClub: gustClub?.name || null,
        windEffect: gustResult?.windEffect || 0,
        environmentalEffect: gustResult?.environmentalEffect || 0,
      } as CalculationResult,
    };
  }, [weather, visible, targetYardage, windAngle, getRecommendedClub]);

  const getAimDirection = (offset: number): string => {
    if (Math.abs(offset) < 1) return 'On target';
    const dist = formatDistance(Math.abs(offset), preferences.distanceUnit);
    return offset > 0 ? `Aim ${dist.value} ${dist.shortLabel} RIGHT` : `Aim ${dist.value} ${dist.shortLabel} LEFT`;
  };

  React.useEffect(() => {
    if (visible && firstResultRef.current) {
      const reactTag = findNodeHandle(firstResultRef.current);
      if (reactTag) {
        AccessibilityInfo.setAccessibilityFocus(reactTag);
      }
    }
  }, [visible]);

  if (!calculations) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close wind calculation"
            hitSlop={hitSlop.medium}
          >
            <X color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.title} accessibilityRole="header">Wind Calculation</Text>
          <TouchableOpacity
            style={styles.recalcButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Recalculate wind effect"
            hitSlop={hitSlop.medium}
          >
            <RotateCcw color={colors.primary} size={20} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.targetInfo}>
            <Text style={styles.targetLabel}>Target Distance</Text>
            <Text style={styles.targetValue}>{targetFormat.value} {targetFormat.label}</Text>
          </View>

          <View
            ref={firstResultRef}
            accessible
            accessibilityLabel={`Sustained wind at ${windSpeedFormat?.value} ${windSpeedFormat?.label}. Plays like ${formatDistance(calculations.sustained.adjustedYardage, preferences.distanceUnit).value} ${formatDistance(calculations.sustained.adjustedYardage, preferences.distanceUnit).label}. ${getAimDirection(calculations.sustained.lateralOffset)}. ${calculations.sustained.recommendedClub ? `Recommended club: ${calculations.sustained.recommendedClub}` : ''}`}
          >
          <GradientCard variant="result" style={styles.scenarioCard}>
            <View style={styles.scenarioHeader}>
              <Wind color={colors.primary} size={20} />
              <Text style={styles.scenarioTitle}>Sustained Wind</Text>
              <Text style={styles.windSpeed}>{windSpeedFormat?.value} {windSpeedFormat?.shortLabel}</Text>
            </View>

            <View style={styles.mainResult}>
              <Text style={styles.playsLikeLabel}>Plays Like</Text>
              <Text style={styles.playsLikeValue}>
                {formatDistance(calculations.sustained.adjustedYardage, preferences.distanceUnit).value}
                <Text style={styles.playsLikeUnit}> {formatDistance(calculations.sustained.adjustedYardage, preferences.distanceUnit).shortLabel}</Text>
              </Text>
            </View>

            <View style={styles.aimIndicator}>
              {calculations.sustained.lateralOffset > 0 ? (
                <ArrowRight color={colors.accent} size={24} />
              ) : calculations.sustained.lateralOffset < 0 ? (
                <ArrowLeft color={colors.accent} size={24} />
              ) : null}
              <Text style={styles.aimText}>
                {getAimDirection(calculations.sustained.lateralOffset)}
              </Text>
            </View>

            {calculations.sustained.recommendedClub && (
              <View style={styles.clubRecommendation}>
                <Text style={styles.clubLabel}>Recommended</Text>
                <Text style={styles.clubName}>
                  {calculations.sustained.recommendedClub}
                </Text>
              </View>
            )}
          </GradientCard>
          </View>

          <View
            accessible
            accessibilityLabel={`With gusts at ${gustSpeedFormat?.value} ${gustSpeedFormat?.label}. Plays like ${formatDistance(calculations.gust.adjustedYardage, preferences.distanceUnit).value} ${formatDistance(calculations.gust.adjustedYardage, preferences.distanceUnit).label}. ${getAimDirection(calculations.gust.lateralOffset)}. ${calculations.gust.recommendedClub ? `Recommended club: ${calculations.gust.recommendedClub}` : ''}`}
          >
          <GradientCard variant="premium" style={styles.scenarioCard}>
            <View style={styles.scenarioHeader}>
              <AlertTriangle color={colors.warning} size={20} />
              <Text style={styles.scenarioTitle}>With Gusts</Text>
              <Text style={[styles.windSpeed, { color: colors.warning }]}>
                {gustSpeedFormat?.value} {gustSpeedFormat?.shortLabel}
              </Text>
            </View>

            <View style={styles.mainResult}>
              <Text style={styles.playsLikeLabel}>Plays Like</Text>
              <Text style={[styles.playsLikeValue, { color: colors.warning }]}>
                {formatDistance(calculations.gust.adjustedYardage, preferences.distanceUnit).value}
                <Text style={styles.playsLikeUnit}> {formatDistance(calculations.gust.adjustedYardage, preferences.distanceUnit).shortLabel}</Text>
              </Text>
            </View>

            <View style={styles.aimIndicator}>
              {calculations.gust.lateralOffset > 0 ? (
                <ArrowRight color={colors.warning} size={24} />
              ) : calculations.gust.lateralOffset < 0 ? (
                <ArrowLeft color={colors.warning} size={24} />
              ) : null}
              <Text style={[styles.aimText, { color: colors.warning }]}>
                {getAimDirection(calculations.gust.lateralOffset)}
              </Text>
            </View>

            {calculations.gust.recommendedClub && (
              <View style={styles.clubRecommendation}>
                <Text style={styles.clubLabel}>Recommended</Text>
                <Text style={[styles.clubName, { color: colors.warning }]}>
                  {calculations.gust.recommendedClub}
                </Text>
              </View>
            )}
          </GradientCard>
          </View>

          <GradientCard variant="default" style={styles.breakdownSection}>
            <Text style={styles.breakdownTitle}>Effect Breakdown</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Environmental</Text>
              <Text style={styles.breakdownValue}>
                {calculations.sustained.environmentalEffect > 0 ? '+' : ''}
                {preferences.distanceUnit === 'meters'
                  ? (calculations.sustained.environmentalEffect * 0.9144).toFixed(1)
                  : calculations.sustained.environmentalEffect.toFixed(1)} {preferences.distanceUnit === 'meters' ? 'm' : 'yds'}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Wind (sustained)</Text>
              <Text style={styles.breakdownValue}>
                {calculations.sustained.windEffect > 0 ? '+' : ''}
                {preferences.distanceUnit === 'meters'
                  ? (calculations.sustained.windEffect * 0.9144).toFixed(1)
                  : calculations.sustained.windEffect.toFixed(1)} {preferences.distanceUnit === 'meters' ? 'm' : 'yds'}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Wind (gusts)</Text>
              <Text style={[styles.breakdownValue, { color: colors.warning }]}>
                {calculations.gust.windEffect > 0 ? '+' : ''}
                {preferences.distanceUnit === 'meters'
                  ? (calculations.gust.windEffect * 0.9144).toFixed(1)
                  : calculations.gust.windEffect.toFixed(1)} {preferences.distanceUnit === 'meters' ? 'm' : 'yds'}
              </Text>
            </View>
          </GradientCard>
        </ScrollView>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Back to compass"
          accessibilityHint="Double tap to return to the wind calculator compass"
        >
          <Text style={styles.doneButtonText}>Back to Compass</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: spacing.sm,
  },
  title: {
    ...typography.headline,
    color: colors.text,
  },
  recalcButton: {
    padding: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  targetInfo: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  targetLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  targetValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  scenarioCard: {
    marginBottom: spacing.md,
  },
  scenarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  scenarioTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  windSpeed: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  mainResult: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  playsLikeLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  playsLikeValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
  },
  playsLikeUnit: {
    fontSize: 18,
    fontWeight: '400',
  },
  aimIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  aimText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  clubRecommendation: {
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clubLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  clubName: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '700',
  },
  breakdownSection: {
    marginTop: spacing.md,
  },
  breakdownTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.md,
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
  breakdownValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '400',
  },
  doneButton: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  doneButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
