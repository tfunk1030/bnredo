/**
 * Shot Screen — Render-Matched Version
 * 
 * Implements Taylor's detailed render-matching guide:
 * 1. SceneBackground (gradient + vignette)
 * 2. RenderCard everywhere
 * 3. Material System tokens
 * 4. Spacing rhythm (8/12/16 inside, 16 between)
 * 5. Typography hierarchy
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
  spacing,
  typography,
  radii,
  strokes,
  controls,
} from '@/src/constants/material-system';

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
        <WeatherCard />

        {/* TARGET DISTANCE CARD */}
        <RenderCard style={styles.cardSpacing} padding={spacing.md}>
          <Text style={styles.sectionLabel}>Target Distance</Text>

          <View style={styles.yardageDisplay}>
            <Text style={styles.yardageValue}>{targetFormat.value}</Text>
            <Text style={styles.yardageUnit}> {targetFormat.label}</Text>
          </View>

          {/* SLIDER */}
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
              minimumTrackTintColor="#39FF14"
              maximumTrackTintColor={strokes.outer}
              thumbTintColor="#39FF14"
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
                style={({ pressed }) => [
                  styles.adjustButton,
                  pressed && styles.adjustButtonPressed,
                ]}
              >
                <LinearGradient
                  colors={controls.normal.gradient.colors}
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
              </Pressable>
            ))}
          </View>
        </RenderCard>

        {/* PLAYS LIKE CARD */}
        {calculations && (
          <RenderCard style={styles.cardSpacing} padding={spacing.md}>
            <Text style={styles.sectionLabel}>Plays Like</Text>
            <Text style={styles.playsLikeValue}>
              {adjustedFormat?.value}
              <Text style={styles.playsLikeUnit}> {adjustedFormat?.label}</Text>
            </Text>

            {/* RECOMMENDED CLUB */}
            {recommendedClub && (
              <View style={styles.clubRecommendation}>
                <Text style={styles.clubLabel}>Recommended Club</Text>
                <Text style={styles.clubName}>{recommendedClub.name}</Text>
                <Text style={styles.clubDistance}>
                  ({clubDistanceFormat?.value} {clubDistanceFormat?.shortLabel} club)
                </Text>
              </View>
            )}

            {/* BREAKDOWN TOGGLE */}
            <TouchableOpacity
              style={styles.breakdownToggle}
              onPress={() => setShowBreakdown(!showBreakdown)}
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
                <Text style={styles.breakdownLabel}>Environmental Effect</Text>
                <Text style={styles.breakdownSubtext}>
                  (includes air density and altitude)
                </Text>
                <Text style={styles.breakdownValue}>
                  {calculations.totalAdjustmentPercent > 0 ? '+' : ''}
                  {calculations.totalAdjustmentPercent.toFixed(1)}%
                </Text>
              </View>
            )}
          </RenderCard>
        )}
      </ScrollView>
    </SceneBackground>
  );
}

const styles = StyleSheet.create({
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
  },

  // SLIDER
  sliderContainer: {
    marginBottom: spacing.xs,
  },
  slider: {
    width: '100%',
    height: 36,
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
  adjustButtonPressed: {
    opacity: 0.8,
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
    ...typography.medium,
    fontSize: 15,
  },

  // PLAYS LIKE
  playsLikeValue: {
    ...typography.hero,
    color: '#39FF14',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  playsLikeUnit: {
    ...typography.unit,
    fontSize: 18,
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
    color: '#39FF14',
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
  breakdownLabel: {
    ...typography.medium,
    fontSize: 14,
    marginBottom: 2,
  },
  breakdownSubtext: {
    ...typography.label,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  breakdownValue: {
    ...typography.medium,
    fontSize: 16,
    fontWeight: '600',
  },
});
