/**
 * CameraHUD — Phase 4 Polish
 *
 * Full-screen camera view with wind data overlay.
 * Fighter-pilot HUD aesthetic: crosshair, compass ring, lock/fire flow.
 * All results shown on existing WindResultsModal — zero data on HUD.
 *
 * Phase 2: Camera + crosshair + compass + lock/fire button.
 * Phase 3: Compass ring overlay, lock pulse animation, FIRE flash, auto-timeout countdown.
 * Phase 4: Yardage input in HUD, enhanced crosshair visibility, heading deviation indicator,
 *           visual wind-direction arrow, locked crosshair stays fixed with drift feedback.
 * Phase 5: Red crosshair (unlocked), compass-based crosshair lock — crosshair stays on target
 *           bearing as phone pans; edge arrow when target leaves camera view.
 */

import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Circle, G, Text as SvgText, Polygon } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/src/constants/theme';
import { useHapticSlider } from '@/src/hooks/useHapticSlider';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Camera FOV estimate ───────────────────────────────────────────────────────
// Phone main cameras are ~65° horizontal FOV. Half = 32.5°.
// Used to convert heading delta (degrees) → screen pixel offset for locked crosshair.
const HALF_FOV_DEG = 32.5;
const MAX_CROSSHAIR_OFFSET = SCREEN_W * 0.38; // clamp before off-screen

// ─── Auto-timeout constant ─────────────────────────────────────────────────────
const AUTO_UNLOCK_SECS = 60;

// ─── Compass Ring HUD Overlay ─────────────────────────────────────────────────

interface CompassRingOverlayProps {
  heading: number;
  frozen: boolean;
  size?: number;
}

function CompassRingOverlay({ heading, frozen: _frozen, size = 260 }: CompassRingOverlayProps) {
  const center = size / 2;
  const outerRadius = size * 0.42;
  const tickRadius = size * 0.37;
  const cardinalRadius = outerRadius - 18;

  const getPoint = (angle: number, radius: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const cardinalPoints = [
    { label: 'N', angle: 0, major: true },
    { label: 'NE', angle: 45, major: false },
    { label: 'E', angle: 90, major: true },
    { label: 'SE', angle: 135, major: false },
    { label: 'S', angle: 180, major: true },
    { label: 'SW', angle: 225, major: false },
    { label: 'W', angle: 270, major: true },
    { label: 'NW', angle: 315, major: false },
  ];

  const ticks = React.useMemo(() => Array.from({ length: 72 }, (_, i) => {
    const angle = i * 5;
    const isMajor = i % 9 === 0;
    const isMinor = i % 3 === 0;
    const startR = isMajor ? tickRadius - 10 : isMinor ? tickRadius - 6 : tickRadius - 3;
    const start = getPoint(angle, startR);
    const end = getPoint(angle, tickRadius);
    return (
      <Line
        key={i}
        x1={start.x} y1={start.y}
        x2={end.x}   y2={end.y}
        stroke={isMajor ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)'}
        strokeWidth={isMajor ? 2 : 1}
      />
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [size]);

  return (
    <Svg width={size} height={size} opacity={0.65}>
      <Circle
        cx={center} cy={center}
        r={outerRadius}
        fill="transparent"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.5}
      />

      <G rotation={-heading} origin={`${center}, ${center}`}>
        {ticks}
        {cardinalPoints.map(({ label, angle, major }) => {
          const pos = getPoint(angle, cardinalRadius);
          const isNorth = label === 'N';
          const fontSize = isNorth ? 13 : major ? 11 : 9;
          const fontWeight = isNorth ? '800' : major ? '700' : '500';
          const fill = isNorth
            ? '#FF6B6B'
            : major
            ? 'rgba(255,255,255,0.9)'
            : 'rgba(255,255,255,0.5)';

          return (
            <G key={label} rotation={heading} origin={`${pos.x}, ${pos.y}`}>
              <SvgText
                x={pos.x} y={pos.y}
                fontSize={fontSize}
                fontWeight={fontWeight}
                fill={fill}
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {label}
              </SvgText>
            </G>
          );
        })}
      </G>

      {!_frozen && (
        <Line
          x1={center} y1={center - outerRadius + 4}
          x2={center} y2={center - outerRadius - 6}
          stroke={colors.primary}
          strokeWidth={3}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}

// ─── Crosshair Reticle ────────────────────────────────────────────────────────
// Phase 4: larger, simulated glow via stacked strokes, thicker arms.

interface CrosshairProps {
  locked: boolean;
  strokeColor: string;
  size?: number;
}

function CrosshairReticle({ locked, strokeColor, size = 180 }: CrosshairProps) {
  const cx = size / 2;
  const gap   = size * 0.10;    // gap around center dot
  const arm   = size * 0.30;    // arm length — longer for more visibility
  const bracket = size * 0.09;  // corner bracket length
  const strokeW = locked ? 3.5 : 2.5;
  const glowW   = locked ? 8.0 : 6.0;
  const dotR    = locked ? 7   : 5;

  // Helper to render one axis pair at a given strokeWidth and opacity
  const renderArms = (sw: number, opacity: number) => (
    <>
      <Line x1={cx} y1={cx - gap}       x2={cx} y2={cx - gap - arm}       stroke={strokeColor} strokeWidth={sw} opacity={opacity} strokeLinecap="round" />
      <Line x1={cx} y1={cx + gap}       x2={cx} y2={cx + gap + arm}       stroke={strokeColor} strokeWidth={sw} opacity={opacity} strokeLinecap="round" />
      <Line x1={cx - gap} y1={cx}       x2={cx - gap - arm} y2={cx}       stroke={strokeColor} strokeWidth={sw} opacity={opacity} strokeLinecap="round" />
      <Line x1={cx + gap} y1={cx}       x2={cx + gap + arm} y2={cx}       stroke={strokeColor} strokeWidth={sw} opacity={opacity} strokeLinecap="round" />
    </>
  );

  return (
    <Svg width={size} height={size}>
      {/* Glow layer — wide, low opacity */}
      {renderArms(glowW, 0.12)}

      {/* Mid glow */}
      {renderArms(glowW * 0.55, 0.20)}

      {/* Crisp center arms */}
      {renderArms(strokeW, 1.0)}

      {/* Center dot — glow then crisp */}
      <Circle cx={cx} cy={cx} r={dotR + 4} fill={strokeColor} opacity={0.12} />
      <Circle cx={cx} cy={cx} r={dotR + 2} fill={strokeColor} opacity={0.20} />
      <Circle cx={cx} cy={cx} r={dotR}     fill={strokeColor} opacity={1.0} />

      {/* Corner brackets */}
      {([
        { ox: -1, oy: -1 },
        { ox:  1, oy: -1 },
        { ox: -1, oy:  1 },
        { ox:  1, oy:  1 },
      ] as const).map(({ ox, oy }, i) => {
        const bx = cx + ox * (size * 0.34);
        const by = cx + oy * (size * 0.34);
        return (
          <G key={i}>
            <Line x1={bx} y1={by} x2={bx + ox * bracket} y2={by}              stroke={strokeColor} strokeWidth={strokeW * 0.8} opacity={0.7} strokeLinecap="round" />
            <Line x1={bx} y1={by} x2={bx}                 y2={by + oy * bracket} stroke={strokeColor} strokeWidth={strokeW * 0.8} opacity={0.7} strokeLinecap="round" />
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Heading Deviation Indicator ──────────────────────────────────────────────
// Shows how far you've drifted from the locked heading after LOCK.

interface DeviationIndicatorProps {
  currentHeading: number;  // live device heading
  lockedHeading: number;   // heading at time of lock
}

function DeviationIndicator({ currentHeading, lockedHeading }: DeviationIndicatorProps) {
  const delta = ((currentHeading - lockedHeading) + 540) % 360 - 180; // −180..+180
  const absDelta = Math.abs(delta);

  if (absDelta < 2) {
    return (
      <Text style={styles.deviationOnTarget}>◎  ON TARGET</Text>
    );
  }

  const dir = delta > 0 ? '▶' : '◀';
  const color = absDelta < 10 ? '#FFC107' : '#FF6B6B';

  return (
    <Text style={[styles.deviationOff, { color }]}>
      {dir}  {Math.round(absDelta)}°  OFF
    </Text>
  );
}

// ─── Wind Direction Arrow ─────────────────────────────────────────────────────
// Arrow points in the direction the wind is BLOWING (relative to facing direction).
//   relativeAngle = 0   → headwind   → arrow points DOWN (toward you)
//   relativeAngle = 180 → tailwind   → arrow points UP (behind you)
//   relativeAngle = 90  → from right → arrow points RIGHT

interface WindArrowProps {
  relativeAngle: number;
  effect: 'headwind' | 'tailwind' | 'cross';
}

function WindArrow({ relativeAngle, effect }: WindArrowProps) {
  const color =
    effect === 'tailwind' ? colors.primary :
    effect === 'headwind' ? '#FF6B6B' :
    '#FFC107';
  const size = 52;
  const cx = size / 2;
  const cy = size / 2;

  // Arrow shaft tip at bottom (cy+16), tail at top (cy-12) — rotated so 0° = headwind
  const tipY   = cy + 16;
  const tailY  = cy - 12;
  const headW  = 8;  // arrowhead half-width
  const headH  = 10; // arrowhead height

  return (
    <Svg width={size} height={size}>
      <G rotation={relativeAngle} origin={`${cx}, ${cy}`}>
        {/* Shaft */}
        <Line
          x1={cx} y1={tailY}
          x2={cx} y2={tipY - headH}
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {/* Arrowhead triangle */}
        <Polygon
          points={`${cx},${tipY} ${cx - headW},${tipY - headH} ${cx + headW},${tipY - headH}`}
          fill={color}
        />
      </G>
    </Svg>
  );
}

// ─── Wind Direction Indicator ─────────────────────────────────────────────────

interface WindIndicatorProps {
  windLabel: string;
  windSpeed: number;
  unit: string;
  headTailEffect: 'headwind' | 'tailwind' | 'cross';
  relativeAngle: number;
}

function WindIndicator({ windLabel, windSpeed, unit, headTailEffect, relativeAngle }: WindIndicatorProps) {
  const effectColor =
    headTailEffect === 'tailwind' ? colors.primary :
    headTailEffect === 'headwind' ? '#FF6B6B' :
    '#FFC107';

  return (
    <View style={styles.windIndicator}>
      <Text style={[styles.windEffectLabel, { color: effectColor }]}>
        {headTailEffect.toUpperCase()}
      </Text>
      <WindArrow relativeAngle={relativeAngle} effect={headTailEffect} />
      <Text style={styles.windSpeedText}>
        {Math.round(windSpeed)} <Text style={styles.windUnit}>{unit}</Text>
      </Text>
      <Text style={styles.windDirText}>{windLabel}</Text>
    </View>
  );
}

// ─── Lock / Fire Button ───────────────────────────────────────────────────────

interface LockFireButtonProps {
  locked: boolean;
  countdown: number | null;
  onLock: () => void;
  onFire: () => void;
}

function LockFireButton({ locked, countdown, onLock, onFire }: LockFireButtonProps) {
  return (
    <View style={styles.lockFireWrapper}>
      <TouchableOpacity
        style={[styles.lockFireBtn, locked && styles.lockFireBtnLocked]}
        onPress={locked ? onFire : onLock}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={locked ? 'Fire — calculate wind adjustment' : 'Lock target heading'}
      >
        <Text style={[styles.lockFireText, locked && styles.lockFireTextLocked]}>
          {locked ? '▶  FIRE' : '⊕  LOCK TARGET'}
        </Text>
      </TouchableOpacity>

      {locked && countdown !== null && (
        <Text style={styles.countdownText}>
          Auto-unlocking in {countdown}s
        </Text>
      )}
    </View>
  );
}

// ─── Camera Permission Request ────────────────────────────────────────────────

interface PermissionScreenProps {
  onRequest: () => void;
  onDismiss: () => void;
}

function PermissionScreen({ onRequest, onDismiss }: PermissionScreenProps) {
  return (
    <View style={styles.permissionContainer}>
      <Text style={styles.permissionTitle}>Camera Access</Text>
      <Text style={styles.permissionBody}>
        HUD mode overlays wind data on your camera view.{'\n'}
        No photos or video are saved.
      </Text>
      <TouchableOpacity style={styles.permissionBtn} onPress={onRequest}>
        <Text style={styles.permissionBtnText}>Enable Camera</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.permissionDismiss} onPress={onDismiss}>
        <Text style={styles.permissionDismissText}>Not Now</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main HUD ─────────────────────────────────────────────────────────────────

interface CameraHUDProps {
  heading: number;         // live device heading (always current, even when locked)
  lockedHeading: number;   // heading captured at lock time (parent manages)
  windDirection: number;
  windSpeed: number;
  windSpeedUnit: string;
  targetYardage: number;
  onYardageChange: (y: number) => void;
  onFire: () => void;
  onClose: () => void;
  isLocked: boolean;
  onLock: () => void;
  onUnlock: () => void;
}

export function CameraHUD({
  heading,
  lockedHeading,
  windDirection,
  windSpeed,
  windSpeedUnit,
  targetYardage,
  onYardageChange,
  onFire,
  onClose,
  isLocked,
  onLock,
  onUnlock,
}: CameraHUDProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const { onValueChange: onSliderHaptic } = useHapticSlider({ interval: 5 });

  // ── Animation refs ────────────────────────────────────────────────────────
  const crosshairScale    = React.useRef(new Animated.Value(1)).current;
  const flashOpacity      = React.useRef(new Animated.Value(0)).current;
  const lockColorProgress = React.useRef(new Animated.Value(0)).current;

  // ── Countdown timer state ─────────────────────────────────────────────────
  const [countdown, setCountdown] = React.useState<number | null>(null);
  const countdownInterval = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const autoUnlockTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Crosshair color (JS-driven, SVG can't use native driver) ─────────────
  // Unlocked = red (#FF3B30), Locked = green (colors.primary)
  const [crosshairColor, setCrosshairColor] = React.useState('#FF3B30');

  // ── Lock pulse ────────────────────────────────────────────────────────────
  const triggerLockPulse = React.useCallback(() => {
    Animated.sequence([
      Animated.timing(crosshairScale, { toValue: 1.18, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(crosshairScale, { toValue: 1.0,  duration: 150, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
    ]).start();

    // Animate: red (#FF3B30 = 255,59,48) → green (#4CAF50 = 76,175,80)
    lockColorProgress.removeAllListeners();
    lockColorProgress.addListener(({ value }) => {
      const r = Math.round(255 + (76  - 255) * value);
      const g = Math.round(59  + (175 -  59) * value);
      const b = Math.round(48  + (80  -  48) * value);
      setCrosshairColor(`rgba(${r},${g},${b},1)`);
    });
    Animated.timing(lockColorProgress, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [crosshairScale, lockColorProgress]);

  const triggerUnlockReset = React.useCallback(() => {
    // Revert: green → red
    lockColorProgress.removeAllListeners();
    lockColorProgress.addListener(({ value }) => {
      const r = Math.round(255 + (76  - 255) * value);
      const g = Math.round(59  + (175 -  59) * value);
      const b = Math.round(48  + (80  -  48) * value);
      setCrosshairColor(`rgba(${r},${g},${b},1)`);
    });
    Animated.timing(lockColorProgress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  }, [lockColorProgress]);

  // ── FIRE flash ────────────────────────────────────────────────────────────
  const triggerFireFlash = React.useCallback((callback: () => void) => {
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.6, duration: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0,   duration: 300, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
    ]).start(() => callback());
  }, [flashOpacity]);

  // ── Auto-timeout ──────────────────────────────────────────────────────────
  const clearAutoUnlock = React.useCallback(() => {
    if (countdownInterval.current) { clearInterval(countdownInterval.current); countdownInterval.current = null; }
    if (autoUnlockTimeout.current) { clearTimeout(autoUnlockTimeout.current); autoUnlockTimeout.current = null; }
    setCountdown(null);
  }, []);

  const startAutoUnlock = React.useCallback(() => {
    clearAutoUnlock();
    setCountdown(AUTO_UNLOCK_SECS);
    let remaining = AUTO_UNLOCK_SECS;
    countdownInterval.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) { clearAutoUnlock(); }
      else { setCountdown(remaining); }
    }, 1000);
    autoUnlockTimeout.current = setTimeout(() => {
      clearAutoUnlock();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onUnlock();
    }, AUTO_UNLOCK_SECS * 1000);
  }, [clearAutoUnlock, onUnlock]);

  React.useEffect(() => {
    if (isLocked) { triggerLockPulse(); startAutoUnlock(); }
    else { triggerUnlockReset(); clearAutoUnlock(); }
    return () => { lockColorProgress.removeAllListeners(); };
  }, [isLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    return () => { clearAutoUnlock(); lockColorProgress.removeAllListeners(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLock   = React.useCallback(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onLock(); }, [onLock]);
  const handleFire   = React.useCallback(() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); clearAutoUnlock(); triggerFireFlash(onFire); }, [onFire, triggerFireFlash, clearAutoUnlock]);
  const handleUnlock = React.useCallback(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); clearAutoUnlock(); onUnlock(); }, [onUnlock, clearAutoUnlock]);

  // ── Wind calculations ─────────────────────────────────────────────────────
  // Use lockedHeading when locked so wind angle is relative to the shot direction, not current phone aim.
  const effectiveHeading = isLocked ? lockedHeading : heading;
  const windAngleRelative = ((windDirection - effectiveHeading) + 360) % 360;

  const windLabel = (() => {
    if (windAngleRelative < 22.5 || windAngleRelative >= 337.5) return 'N';
    if (windAngleRelative < 67.5)  return 'NE';
    if (windAngleRelative < 112.5) return 'E';
    if (windAngleRelative < 157.5) return 'SE';
    if (windAngleRelative < 202.5) return 'S';
    if (windAngleRelative < 247.5) return 'SW';
    if (windAngleRelative < 292.5) return 'W';
    return 'NW';
  })();

  const headTailEffect = (() => {
    const a = windAngleRelative;
    if (a < 60 || a > 300) return 'headwind' as const;
    if (a > 120 && a < 240) return 'tailwind' as const;
    return 'cross' as const;
  })();

  // ── Locked crosshair offset ───────────────────────────────────────────────
  // When locked, offset the crosshair horizontally so it stays on the locked
  // bearing as the phone pans. Uses compass heading — no ARKit needed.
  //   delta > 0 = phone turned right → target is LEFT → translateX negative
  //   delta < 0 = phone turned left  → target is RIGHT → translateX positive
  const headingDelta = isLocked
    ? ((heading - lockedHeading) + 540) % 360 - 180  // −180..+180
    : 0;
  const crosshairOffsetRaw = isLocked
    ? -(headingDelta / HALF_FOV_DEG) * (SCREEN_W / 2)
    : 0;
  const crosshairOffsetX = Math.max(
    -MAX_CROSSHAIR_OFFSET,
    Math.min(MAX_CROSSHAIR_OFFSET, crosshairOffsetRaw)
  );
  const targetOffLeft  = isLocked && crosshairOffsetRaw < -MAX_CROSSHAIR_OFFSET;
  const targetOffRight = isLocked && crosshairOffsetRaw > MAX_CROSSHAIR_OFFSET;

  // ── Permission gates ──────────────────────────────────────────────────────
  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.hudContainer}>
        <PermissionScreen onRequest={requestPermission} onDismiss={onClose} />
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.hudContainer}>
      {/* Camera background */}
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {/* Dark vignette overlay */}
      <View style={styles.vignette} pointerEvents="none" />

      {/* COMPASS RING — centered */}
      <View style={styles.compassRingContainer} pointerEvents="none">
        <CompassRingOverlay
          heading={effectiveHeading}
          frozen={isLocked}
          size={SCREEN_W * 0.72}
        />
      </View>

      {/* TOP BAR */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.hudLabel}>
          <Text style={styles.hudLabelText}>HUD MODE</Text>
          {isLocked && <Text style={styles.hudLockedBadge}>LOCKED</Text>}
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={isLocked ? handleUnlock : onClose}
          accessibilityRole="button"
          accessibilityLabel={isLocked ? 'Unlock heading' : 'Exit HUD mode'}
        >
          <Text style={styles.closeBtnText}>{isLocked ? '↺' : '✕'}</Text>
        </TouchableOpacity>
      </View>

      {/* CROSSHAIR — compass-locked: slides to track target bearing after LOCK */}
      <View style={styles.crosshairContainer} pointerEvents="none">
        {/* Offset wrapper — moves the crosshair based on heading delta */}
        <View style={{ transform: [{ translateX: crosshairOffsetX }] }}>
          <Animated.View style={{ transform: [{ scale: crosshairScale }] }}>
            <CrosshairReticle
              locked={isLocked}
              strokeColor={crosshairColor}
              size={180}
            />
          </Animated.View>
        </View>

        {/* Deviation text — shown when locked */}
        {isLocked && (
          <View style={styles.deviationContainer}>
            <DeviationIndicator
              currentHeading={heading}
              lockedHeading={lockedHeading}
            />
          </View>
        )}
      </View>

      {/* EDGE ARROWS — shown when locked target leaves camera view */}
      {targetOffLeft && (
        <View style={[styles.edgeArrow, styles.edgeArrowLeft]} pointerEvents="none">
          <Text style={styles.edgeArrowText}>◀</Text>
          <Text style={styles.edgeArrowLabel}>TARGET</Text>
        </View>
      )}
      {targetOffRight && (
        <View style={[styles.edgeArrow, styles.edgeArrowRight]} pointerEvents="none">
          <Text style={styles.edgeArrowText}>▶</Text>
          <Text style={styles.edgeArrowLabel}>TARGET</Text>
        </View>
      )}

      {/* WIND INDICATOR — top right */}
      <View style={[styles.windIndicatorPos, { top: insets.top + 68 }]} pointerEvents="none">
        <WindIndicator
          windLabel={windLabel}
          windSpeed={windSpeed}
          unit={windSpeedUnit}
          headTailEffect={headTailEffect}
          relativeAngle={windAngleRelative}
        />
      </View>

      {/* BOTTOM — yardage slider + lock/fire button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        {/* Yardage display + slider */}
        <View style={styles.yardSliderContainer}>
          <Text style={styles.yardSliderValue}>
            {targetYardage}
            <Text style={styles.yardSliderUnit}> {windSpeedUnit === 'mph' ? 'yds' : 'm'}</Text>
          </Text>
          <View style={styles.yardSliderRow}>
            <Text style={styles.yardRangeLabel}>50</Text>
            <Slider
              testID="yardage-slider"
              style={styles.yardSlider}
              value={targetYardage}
              minimumValue={50}
              maximumValue={400}
              step={1}
              onValueChange={(v) => {
                onSliderHaptic(v);
                onYardageChange(Math.round(v));
              }}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor="rgba(255,255,255,0.2)"
              thumbTintColor={colors.primary}
            />
            <Text style={styles.yardRangeLabel}>400</Text>
          </View>
        </View>

        <LockFireButton
          locked={isLocked}
          countdown={countdown}
          onLock={handleLock}
          onFire={handleFire}
        />
        {!isLocked && (
          <Text style={styles.aimHint}>Point at your target, then lock</Text>
        )}
      </View>

      {/* FIRE FLASH */}
      <Animated.View
        style={[styles.fireFlash, { opacity: flashOpacity }]}
        pointerEvents="none"
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const VIGNETTE_OPACITY = 0.35;

const styles = StyleSheet.create({
  hudContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderWidth: 60,
    borderColor: `rgba(0,0,0,${VIGNETTE_OPACITY})`,
  },
  compassRingContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── TOP BAR ──────────────────────────────────────────────────────────────
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  hudLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudLabelText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
  },
  hudLockedBadge: {
    color: '#FF6B6B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 34,
  },
  closeBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '600',
  },

  // ── YARDAGE SLIDER (bottom of HUD) ───────────────────────────────────────
  yardSliderContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  yardSliderValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  yardSliderUnit: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  yardSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 6,
  },
  yardSlider: {
    flex: 1,
    height: 40,
  },
  yardRangeLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '500',
    minWidth: 28,
    textAlign: 'center',
  },

  // ── CROSSHAIR ────────────────────────────────────────────────────────────
  crosshairContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviationContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  deviationOnTarget: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textShadowColor: 'rgba(76,175,80,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  deviationOff: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ── WIND INDICATOR ────────────────────────────────────────────────────────
  windIndicatorPos: {
    position: 'absolute',
    right: 16,
  },
  windIndicator: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  windEffectLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  windSpeedText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
    marginTop: 2,
  },
  windUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },
  windDirText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  // ── BOTTOM BAR ────────────────────────────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 48,  // overridden in JSX with insets.bottom
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  lockFireWrapper: { alignItems: 'center' },
  lockFireBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 8,
    paddingHorizontal: 40,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    minWidth: 200,
    alignItems: 'center',
  },
  lockFireBtnLocked: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}22`,
  },
  lockFireText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
  },
  lockFireTextLocked: { color: colors.primary },
  countdownText: {
    color: 'rgba(255,165,0,0.75)',
    fontSize: 11,
    marginTop: 8,
    letterSpacing: 0.3,
    fontWeight: '500',
  },
  aimHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    marginTop: 10,
    letterSpacing: 0.3,
  },

  // ── EDGE ARROWS (target off-screen) ─────────────────────────────────────
  edgeArrow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 52,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 12,
    gap: 4,
  },
  edgeArrowLeft: {
    left: 0,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,59,48,0.4)',
  },
  edgeArrowRight: {
    right: 0,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,59,48,0.4)',
  },
  edgeArrowText: {
    color: '#FF3B30',
    fontSize: 22,
    fontWeight: '700',
  },
  edgeArrowLabel: {
    color: '#FF3B30',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    transform: [{ rotate: '-90deg' }],
    width: 50,
    textAlign: 'center',
  },

  // ── PERMISSION SCREEN ────────────────────────────────────────────────────
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#0a0f0a',
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  permissionBody: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 36,
    paddingVertical: 14,
    marginBottom: 12,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  permissionDismiss: { padding: 12 },
  permissionDismissText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },

  // ── FIRE FLASH ────────────────────────────────────────────────────────────
  fireFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#6EFF70',
  },
});
