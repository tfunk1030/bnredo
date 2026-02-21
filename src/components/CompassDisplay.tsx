import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Polygon, G, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '@/src/constants/theme';
import { useReduceMotion } from '@/src/hooks/useReduceMotion';
import { useUserPreferences } from '@/src/contexts/UserPreferencesContext';
import { getWindColor, getWindEffectDescription } from '@/src/features/wind/utils/wind-colors';
import { formatWindSpeed } from '@/src/utils/unit-conversions';

interface CompassDisplayProps {
  heading: number;
  windDirection: number;
  windSpeed: number;
  isLocked?: boolean;
  reduceMotion?: boolean;
}

export const CompassDisplay = React.memo(function CompassDisplay({ heading, windDirection, windSpeed, isLocked = false, reduceMotion: reduceMotionProp }: CompassDisplayProps) {
  // Reduce motion preference - use prop if provided, otherwise use hook
  const systemReduceMotion = useReduceMotion();
  const reduceMotion = reduceMotionProp ?? systemReduceMotion;
  const { preferences } = useUserPreferences();

  // Format wind speed based on user preferences
  const windFormat = formatWindSpeed(windSpeed, preferences.windSpeedUnit);

  // Get dynamic wind color based on wind direction relative to heading
  const windColorResult = getWindColor(windDirection, heading, windSpeed);
  const windArrowColor = windColorResult.color;
  const windArrowOpacity = windColorResult.opacity;

  // Accessibility description with wind effect
  const windEffectDesc = getWindEffectDescription(windColorResult.effect);
  const accessibilityDescription = `Compass showing ${Math.round(heading)} degrees heading. Wind ${windFormat.value} ${windFormat.label}, ${windEffectDesc}. ${isLocked ? 'Target locked.' : 'Facing direction.'}`;

  const size = 340;
  const center = size / 2;
  const outerRadius = 120;
  const innerRadius = 42;
  const tickRadius = 105;
  const cardinalRadius = 138;
  const ringColor = isLocked ? colors.primary : colors.border;

  const cardinalPoints = [
    { label: 'N', angle: 0, cardinal: true },
    { label: 'NE', angle: 45, cardinal: false },
    { label: 'E', angle: 90, cardinal: true },
    { label: 'SE', angle: 135, cardinal: false },
    { label: 'S', angle: 180, cardinal: true },
    { label: 'SW', angle: 225, cardinal: false },
    { label: 'W', angle: 270, cardinal: true },
    { label: 'NW', angle: 315, cardinal: false },
  ];

  const getPoint = (angle: number, radius: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  // Wind angle relative to user's heading
  // If user faces North (0°) and wind from East (90°), wind arrow at 90° (right side)
  // If user faces East (90°) and wind from East (90°), wind arrow at 0° (top) = headwind
  const relativeWindAngle = ((windDirection - heading) + 360) % 360;

  const windStart = getPoint(relativeWindAngle, outerRadius - 8);
  const windEnd = getPoint(relativeWindAngle, innerRadius + 12);
  const relativeWindAngleRad = ((relativeWindAngle - 90) * Math.PI) / 180;

  const windArrowTip = windEnd;
  const windArrowSize = 14;
  const windArrowNotch = 8;
  const windArrowLeft = {
    x: windArrowTip.x + windArrowSize * Math.cos(relativeWindAngleRad - Math.PI / 4),
    y: windArrowTip.y + windArrowSize * Math.sin(relativeWindAngleRad - Math.PI / 4),
  };
  const windArrowRight = {
    x: windArrowTip.x + windArrowSize * Math.cos(relativeWindAngleRad + Math.PI / 4),
    y: windArrowTip.y + windArrowSize * Math.sin(relativeWindAngleRad + Math.PI / 4),
  };
  const windArrowNotchPoint = {
    x: windArrowTip.x + windArrowNotch * Math.cos(relativeWindAngleRad),
    y: windArrowTip.y + windArrowNotch * Math.sin(relativeWindAngleRad),
  };

  const userHeadingAngle = 0;
  const userArrowTip = getPoint(userHeadingAngle, outerRadius - 12);
  const userArrowBase = getPoint(userHeadingAngle, innerRadius + 12);
  const userAngleRad = ((userHeadingAngle - 90) * Math.PI) / 180;
  const userArrowSize = 12;
  const userArrowNotch = 6;
  const userArrowLeft = {
    x: userArrowTip.x - userArrowSize * Math.cos(userAngleRad - Math.PI / 4),
    y: userArrowTip.y - userArrowSize * Math.sin(userAngleRad - Math.PI / 4),
  };
  const userArrowRight = {
    x: userArrowTip.x - userArrowSize * Math.cos(userAngleRad + Math.PI / 4),
    y: userArrowTip.y - userArrowSize * Math.sin(userAngleRad + Math.PI / 4),
  };
  const userArrowNotchPoint = {
    x: userArrowTip.x - userArrowNotch * Math.cos(userAngleRad),
    y: userArrowTip.y - userArrowNotch * Math.sin(userAngleRad),
  };

  const getTicks = () => {
    const ticks = [];
    for (let i = 0; i < 72; i++) {
      const angle = i * 5;
      const isMajor = i % 9 === 0;
      const isMinor = i % 3 === 0;

      const startRadius = isMajor ? tickRadius - 14 : isMinor ? tickRadius - 8 : tickRadius - 4;
      const start = getPoint(angle, startRadius);
      const end = getPoint(angle, tickRadius);

      ticks.push(
        <Line
          key={i}
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke={isMajor ? colors.textSecondary : colors.textMuted}
          strokeWidth={isMajor ? 2.5 : 1}
          opacity={isMajor ? 0.9 : 0.5}
        />
      );
    }
    return ticks;
  };

  const getCardinalBackground = (angle: number, isCardinal: boolean) => {
    if (!isCardinal) return null;
    const pos = getPoint(angle, cardinalRadius);
    return (
      <Circle
        key={`bg-${angle}`}
        cx={pos.x}
        cy={pos.y}
        r={14}
        fill={colors.surfaceElevated}
        stroke={colors.border}
        strokeWidth={1}
        opacity={0.6}
      />
    );
  };

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={accessibilityDescription}
      accessibilityLiveRegion="polite"
    >
      <Svg width={size} height={size} accessibilityElementsHidden={true}>
        <Defs>
          <RadialGradient id="centerGradient" cx="50%" cy="50%">
            <Stop offset="0%" stopColor={colors.surfaceElevated} stopOpacity="1" />
            <Stop offset="100%" stopColor={colors.surface} stopOpacity="1" />
          </RadialGradient>
          <RadialGradient id="compassGradient" cx="50%" cy="50%">
            <Stop offset="0%" stopColor={colors.surface} stopOpacity="1" />
            <Stop offset="100%" stopColor={colors.background} stopOpacity="1" />
          </RadialGradient>
        </Defs>

        <Circle
          cx={center}
          cy={center}
          r={outerRadius + 8}
          fill="transparent"
          stroke={ringColor}
          strokeWidth={isLocked ? 3 : 1.5}
          opacity={isLocked ? 0.7 : 0.4}
        />

        <Circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill="url(#compassGradient)"
          stroke={ringColor}
          strokeWidth={3}
          opacity={0.95}
        />

        {/* Compass face rotates with heading - NW wind anchors at NW cardinal */}
        <G rotation={-heading} origin={`${center}, ${center}`}>
          {getTicks()}

          {cardinalPoints.map((point) => getCardinalBackground(point.angle, point.cardinal))}

          {cardinalPoints.map((point) => {
            const pos = getPoint(point.angle, cardinalRadius);
            const isNorth = point.label === 'N';
            const isCardinal = point.cardinal;
            return (
              // Counter-rotate each label so it stays upright as the ring spins
              <G key={point.label} rotation={heading} origin={`${pos.x}, ${pos.y}`}>
                <SvgText
                  x={pos.x}
                  y={pos.y}
                  fontSize={isNorth ? 18 : isCardinal ? 14 : 14}
                  fontWeight={isNorth ? '800' : isCardinal ? '700' : '500'}
                  fill={isNorth ? colors.error : isCardinal ? colors.text : colors.textSecondary}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {point.label}
                </SvgText>
              </G>
            );
          })}
        </G>

        <G opacity={windArrowOpacity}>
          <Line
            x1={windStart.x}
            y1={windStart.y}
            x2={windEnd.x}
            y2={windEnd.y}
            stroke={windArrowColor}
            strokeWidth={5}
            strokeLinecap="butt"
          />

          <Polygon
            points={`${windArrowTip.x},${windArrowTip.y} ${windArrowLeft.x},${windArrowLeft.y} ${windArrowNotchPoint.x},${windArrowNotchPoint.y} ${windArrowRight.x},${windArrowRight.y}`}
            fill={windArrowColor}
            stroke={colors.background}
            strokeWidth={1}
            strokeLinejoin="miter"
          />

          <Circle
            cx={windStart.x}
            cy={windStart.y}
            r={6}
            fill={windArrowColor}
            stroke={colors.background}
            strokeWidth={2}
          />
        </G>

        <G>
          <Line
            x1={userArrowBase.x}
            y1={userArrowBase.y}
            x2={userArrowTip.x}
            y2={userArrowTip.y}
            stroke={colors.primary}
            strokeWidth={4}
            strokeLinecap="butt"
          />

          <Polygon
            points={`${userArrowTip.x},${userArrowTip.y} ${userArrowLeft.x},${userArrowLeft.y} ${userArrowNotchPoint.x},${userArrowNotchPoint.y} ${userArrowRight.x},${userArrowRight.y}`}
            fill={colors.primary}
            stroke={colors.background}
            strokeWidth={1}
            strokeLinejoin="miter"
          />
        </G>

        <Circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="url(#centerGradient)"
          stroke={colors.border}
          strokeWidth={2}
        />

        <SvgText
          x={center}
          y={center - 6}
          fontSize={18}
          fontWeight="700"
          fill={windArrowColor}
          textAnchor="middle"
          alignmentBaseline="middle"
          opacity={windArrowOpacity}
        >
          {windFormat.value}
        </SvgText>
        <SvgText
          x={center}
          y={center + 10}
          fontSize={9}
          fontWeight="600"
          fill={colors.textSecondary}
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {windFormat.shortLabel.toUpperCase()}
        </SvgText>
      </Svg>

      <View
        style={styles.legendRow}
        accessibilityRole="none"
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Your Heading</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: windArrowColor, opacity: windArrowOpacity }]} />
          <Text style={styles.legendText}>Wind ({windColorResult.effect})</Text>
        </View>
      </View>

    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // (heading degree display removed per coach feedback — Feb 21 2026)
});
