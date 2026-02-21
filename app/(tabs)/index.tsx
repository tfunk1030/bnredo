/**
 * Shot Screen — Render-Matched Version
 * 
 * Implements Taylor's detailed render-matching guide:
 * 1. SceneBackground (gradient + bottom fade)
 * 2. RenderCard everywhere
 * 3. Material System tokens (single source of truth)
 * 4. Spacing rhythm (8/12/16 inside, 16 between)
 * 5. Typography hierarchy
 * 6. Full accessibility props on all controls
 * 
 * Feb 8, 2026
 */

import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Minus, Plus, ChevronDown, ChevronUp } from 'lucide-react-native';
import { SceneBackground, RenderCard } from '@/src/components/ui';
import { WeatherCard } from '@/src/components/WeatherCard';
import { useWeather } from '@/src/contexts/WeatherContext';
import { useClubBag } from '@/src/contexts/ClubBagContext';
import { useUserPreferences } from '@/src/contexts/UserPreferencesContext';
import { YardageModelEnhanced, SkillLevel } from '@/src/core/models/yardagemodel';
import { useHapticSlider } from '@/src/hooks/useHapticSlider';
import { formatDistance } from '@/src/utils/unit-conversions';
import {
  materialColors,
  spacing,
  typography,
  radii,
  strokes,
  controls,
} from '@/src/constants/material-system';
import { colors, cardGradient } from '@/src/constants/theme';

export default function ShotScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  // Card margins (32) + card padding (32) + track wrapper insets (32) = 96
  const sliderTrackWidth = screenWidth - 96;
  const { weather } = useWeather();
  const { getRecommendedClub } = useClubBag();
  const { preferences } = useUserPreferences();

  const [targetYardage, setTargetYardage] = React.useState(150);
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
      0, // No wind
      0, // No wind direction
      weather.pressure,
      weather.humidity
    );

    const envResult = yardageModel.calculateAdjustedYardage(
      targetYardage,
      SkillLevel.PROFESSIONAL,
      '7-iron'
    );

    // envEffectYards: how many yards shorter/longer the hole "plays like"
    // If ball flies farther (thin air), envEffectYards is negative (plays shorter).
    // adjustedYardage is what club distance to use.
    const envEffectYards = -(envResult.carryDistance - targetYardage);
    const totalAdjustmentPercent = (envEffectYards / targetYardage) * 100;
    const adjustedYardage = Math.round(targetYardage + envEffectYards);
    const yardsDelta = Math.round(Math.abs(envEffectYards));
    const playsLonger = envEffectYards > 0;

    return {
      adjustedYardage,
      totalAdjustmentPercent,
      yardsDelta,
      playsLonger,
    };
  }, [weather, targetYardage]);

  const recommendedClub = React.useMemo(() => {
    if (!calculations) return null;
    return getRecommendedClub(calculations.adjustedYardage);
  }, [calculations, getRecommendedClub]);

  const targetFormat = formatDistance(targetYardage, preferences.distanceUnit);
  const adjustedFormat = calculations ? formatDistance(calculations.adjustedYardage, preferences.distanceUnit) : null;
  const clubDistanceFormat = recommendedClub ? formatDistance(recommendedClub.customDistance, preferences.distanceUnit) : null;

  const handleIncrement = (amount: number) => {
    setTargetYardage(prev => Math.min(350, Math.max(50, prev + amount)));
  };

  return (
    <SceneBackground style={{ paddingTop: insets.top }}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* APP HEADER */}
        <View style={styles.appHeader}>
          <Text style={styles.appTitle}>AICaddy Pro</Text>
          <Text style={styles.appSubtitle}>Shot Calculator</Text>
        </View>

        <WeatherCard />

        {/* PLAYS LIKE CARD */}
        {calculations && (
          <RenderCard containerStyle={styles.cardSpacing} padding={spacing.md}>
            <Text style={styles.sectionLabel}>Plays Like</Text>
            <View style={styles.playsLikeRow}>
              <Text style={styles.playsLikeValue}>{adjustedFormat?.value}</Text>
              <Text style={styles.playsLikeUnit}> {adjustedFormat?.label}</Text>
            </View>

            {/* RECOMMENDED CLUB */}
            {recommendedClub && (
              <View style={styles.clubRecommendation}>
                <Text style={styles.clubLabel}>Recommended Club</Text>
                <Text style={styles.clubName}>{recommendedClub.name}</Text>
                <Text style={styles.clubDistance}>
                  ({clubDistanceFormat?.value} <Text style={{ color: colors.textAccent }}>{clubDistanceFormat?.shortLabel}</Text> club)
                </Text>
              </View>
            )}

            {/* BREAKDOWN TOGGLE */}
            <TouchableOpacity
              style={styles.breakdownToggle}
              onPress={() => setShowBreakdown(!showBreakdown)}
              accessibilityRole="button"
              accessibilityLabel={`${showBreakdown ? 'Hide' : 'Show'} environmental breakdown`}
              accessibilityState={{ expanded: showBreakdown }}
            >
              <Text style={styles.breakdownToggleText}>
                {showBreakdown ? 'Hide' : 'Show'} Breakdown
              </Text>
              {showBreakdown ? (
                <ChevronUp color={typography.label.color} size={16} />
              ) : (
                <ChevronDown color={typography.label.color} size={16} />
              )}
            </TouchableOpacity>

            {/* BREAKDOWN */}
            {showBreakdown && (
              <View style={styles.breakdown}>
                <View style={styles.breakdownRow}>
                  <View>
                    <Text style={styles.breakdownLabel}>Air Density &amp; Altitude</Text>
                    <Text style={styles.breakdownSubtext}>
                      {calculations.playsLonger
                        ? 'Dense air — ball carries shorter'
                        : 'Thin air — ball carries farther'}
                    </Text>
                  </View>
                  <View style={styles.breakdownValueGroup}>
                    <Text style={styles.breakdownValue}>
                      {calculations.playsLonger ? '+' : '-'}{calculations.yardsDelta} <Text style={{ color: colors.textAccent }}>yds</Text>
                    </Text>
                    <Text style={styles.breakdownPct}>
                      ({calculations.totalAdjustmentPercent > 0 ? '+' : ''}{calculations.totalAdjustmentPercent.toFixed(1)}%)
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </RenderCard>
        )}

        {/* TARGET DISTANCE CARD */}
        <RenderCard containerStyle={styles.cardSpacing} padding={spacing.md}>
          <Text style={styles.sectionLabel}>Target Distance</Text>

          <View style={styles.yardageDisplay}>
            <Text style={styles.yardageValue}>{targetFormat.value}</Text>
            <Text style={styles.yardageUnit}> {targetFormat.label}</Text>
          </View>

          {/* SLIDER */}
          <View style={styles.sliderContainer}>
            {/* Gradient track overlay — active portion only */}
            <View style={styles.sliderTrackWrapper} pointerEvents="none">
              <View style={styles.sliderTrackMax} />
              <LinearGradient
                colors={[colors.primaryDark, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.sliderTrackMin,
                  { width: ((targetYardage - 50) / 300) * sliderTrackWidth },
                ]}
              />
            </View>
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
              minimumTrackTintColor="transparent"
              maximumTrackTintColor="transparent"
              thumbTintColor={colors.primary}
              accessibilityRole="adjustable"
              accessibilityLabel={`Target distance: ${targetYardage} ${targetFormat.label}`}
              accessibilityHint="Swipe up or down to adjust target distance"
              accessibilityValue={{
                min: 50,
                max: 350,
                now: targetYardage,
                text: `${targetYardage} ${targetFormat.label}`,
              }}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>50</Text>
              <Text style={styles.sliderLabel}>350</Text>
            </View>
          </View>

          {/* INCREMENT BUTTONS */}
          <View style={styles.buttonRow}>
            {[-5, -1, 1, 5].map((amount) => (
              <Pressable
                key={amount}
                onPress={() => handleIncrement(amount)}
                accessibilityRole="button"
                accessibilityLabel={`${amount > 0 ? 'Add' : 'Subtract'} ${Math.abs(amount)} ${Math.abs(amount) === 1 ? 'yard' : 'yards'}`}
                accessibilityHint={`${amount > 0 ? 'Increases' : 'Decreases'} target distance by ${Math.abs(amount)}`}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.adjustButton,
                      { borderColor: pressed ? controls.pressed.stroke : controls.normal.stroke },
                    ]}
                  >
                    <LinearGradient
                      colors={pressed ? controls.pressed.gradient.colors : controls.normal.gradient.colors}
                      start={controls.normal.gradient.start}
                      end={controls.normal.gradient.end}
                      style={styles.adjustButtonGradient}
                    >
                      {amount < 0 ? (
                        <Minus color="rgba(255,255,255,0.85)" size={18} />
                      ) : (
                        <Plus color="rgba(255,255,255,0.85)" size={18} />
                      )}
                      <Text style={styles.adjustButtonText}>{Math.abs(amount)}</Text>
                    </LinearGradient>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </RenderCard>
      </ScrollView>
    </SceneBackground>
  );
}

const styles = StyleSheet.create({
  // APP HEADER
  appHeader: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  appTitle: {
    color: materialColors.primaryVibrant,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  appSubtitle: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  
  // SPACING RHYTHM: 16 between cards
  cardSpacing: {
    marginHorizontal: spacing.md,
    marginTop: spacing.betweenCards,
  },

  // TARGET DISTANCE SECTION
  sectionLabel: {
    ...typography.sectionTitle,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  yardageDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  yardageValue: {
    ...typography.large,
  },
  yardageUnit: {
    ...typography.unit,
    color: colors.textAccent,  // Unit labels → green accent
  },

  // SLIDER
  sliderContainer: {
    marginBottom: spacing.xs,
    position: 'relative',
  },
  slider: {
    width: '100%',
    height: 36,
  },
  // Gradient track overlay (absolutely positioned behind slider)
  sliderTrackWrapper: {
    position: 'absolute',
    left: 16,           // Inset to match slider thumb padding
    right: 16,
    top: 16,            // Center 4px track in 36px slider height: (36-4)/2=16
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderTrackMax: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: strokes.outer,
    borderRadius: 2,
  },
  sliderTrackMin: {
    height: 4,
    borderRadius: 2,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: spacing.sm,
  },
  sliderLabel: {
    ...typography.label,
  },

  // INCREMENT BUTTONS
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  adjustButton: {
    borderRadius: radii.control,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: controls.normal.stroke,
  },
  adjustButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
    minWidth: 56,
    minHeight: 44,
    justifyContent: 'center',
  },
  adjustButtonText: {
    ...typography.button,
  },

  // PLAYS LIKE
  playsLikeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  playsLikeValue: {
    fontSize: 72,
    fontWeight: '700',
    lineHeight: 76,
    color: materialColors.primaryVibrant,
  },
  playsLikeUnit: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 10,         // aligns "yards" off the number baseline
    color: colors.textAccent,
  },

  // RECOMMENDED CLUB
  clubRecommendation: {
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: strokes.inner,
  },
  clubLabel: {
    ...typography.label,
    marginBottom: 4,
  },
  clubName: {
    color: materialColors.primaryVibrant,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  clubDistance: {
    ...typography.label,
    marginTop: 4,
  },

  // BREAKDOWN TOGGLE
  breakdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  breakdownToggleText: {
    ...typography.sectionTitle,
  },

  // BREAKDOWN
  breakdown: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: strokes.inner,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    ...typography.small,
    marginBottom: 2,
  },
  breakdownSubtext: {
    ...typography.label,
    fontStyle: 'italic',
  },
  breakdownValueGroup: {
    alignItems: 'flex-end',
  },
  breakdownValue: {
    ...typography.body,
  },
  breakdownPct: {
    ...typography.label,
    marginTop: 2,
  },
});
