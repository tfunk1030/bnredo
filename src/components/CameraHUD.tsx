/**
 * CameraHUD — Phase 3 Polish
 *
 * Full-screen camera view with wind data overlay.
 * Fighter-pilot HUD aesthetic: crosshair, compass ring, lock/fire flow.
 * All results shown on existing WindResultsModal — zero data on HUD.
 *
 * Phase 2: Camera + crosshair + compass + lock/fire button.
 * Phase 3: Compass ring overlay, lock pulse animation, FIRE flash, auto-timeout countdown.
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Line, Rect, Circle, G, Path, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/src/constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Auto-timeout constant ─────────────────────────────────────────────────────
const AUTO_UNLOCK_SECS = 60;

// ─── Compass Ring HUD Overlay ─────────────────────────────────────────────────
// A semi-transparent compass ring that rotates with device heading,
// freezes when target is locked.

interface CompassRingOverlayProps {
  heading: number;     // current device heading (degrees)
  frozen: boolean;     // when true, ring stops rotating (locked state)
  size?: number;
}

function CompassRingOverlay({ heading, frozen, size = 260 }: CompassRingOverlayProps) {
  const center = size / 2;
  const outerRadius = size * 0.42;
  const tickRadius = size * 0.37;

  // Cardinals positioned just inside the outer edge
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

  // Generate tick marks around the ring (72 ticks = every 5 degrees)
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const angle = i * 5;
    const isMajor = i % 9 === 0;   // every 45°
    const isMinor = i % 3 === 0;   // every 15°
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
  });

  // Heading to use for rotation — frozen when locked
  const ringHeading = frozen ? 0 : heading;

  return (
    <Svg width={size} height={size} opacity={0.65}>
      {/* Outer ring border */}
      <Circle
        cx={center} cy={center}
        r={outerRadius}
        fill="transparent"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.5}
      />

      {/* Rotating group: ticks + cardinal labels */}
      <G rotation={-ringHeading} origin={`${center}, ${center}`}>
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
            // Counter-rotate label so it stays upright as ring spins
            <G key={label} rotation={ringHeading} origin={`${pos.x}, ${pos.y}`}>
              <SvgText
                x={pos.x}
                y={pos.y}
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

      {/* Fixed north indicator at top (12 o'clock) — shows current heading direction */}
      {!frozen && (
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

interface CrosshairProps {
  locked: boolean;
  strokeColor: string;
  size?: number;
}

function CrosshairReticle({ locked, strokeColor, size = 120 }: CrosshairProps) {
  const cx = size / 2;
  const gap = size * 0.12;      // gap around center dot
  const arm  = size * 0.25;     // length of each arm
  const bracket = size * 0.08;  // corner bracket length
  const strokeW = locked ? 2.5 : 1.5;

  return (
    <Svg width={size} height={size}>
      {/* Center dot */}
      <Circle
        cx={cx}
        cy={cx}
        r={locked ? 5 : 3}
        fill={strokeColor}
        opacity={locked ? 1 : 0.9}
      />

      {/* Crosshair arms */}
      <Line x1={cx} y1={cx - gap}       x2={cx} y2={cx - gap - arm}       stroke={strokeColor} strokeWidth={strokeW} />
      <Line x1={cx} y1={cx + gap}       x2={cx} y2={cx + gap + arm}       stroke={strokeColor} strokeWidth={strokeW} />
      <Line x1={cx - gap} y1={cx}       x2={cx - gap - arm} y2={cx}       stroke={strokeColor} strokeWidth={strokeW} />
      <Line x1={cx + gap} y1={cx}       x2={cx + gap + arm} y2={cx}       stroke={strokeColor} strokeWidth={strokeW} />

      {/* Corner brackets */}
      {[
        { ox: -1, oy: -1 },
        { ox:  1, oy: -1 },
        { ox: -1, oy:  1 },
        { ox:  1, oy:  1 },
      ].map(({ ox, oy }, i) => {
        const bx = cx + ox * (size * 0.32);
        const by = cx + oy * (size * 0.32);
        return (
          <G key={i}>
            <Line
              x1={bx} y1={by}
              x2={bx + ox * bracket} y2={by}
              stroke={strokeColor} strokeWidth={strokeW} opacity={0.6}
            />
            <Line
              x1={bx} y1={by}
              x2={bx} y2={by + oy * bracket}
              stroke={strokeColor} strokeWidth={strokeW} opacity={0.6}
            />
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Wind Direction Indicator ─────────────────────────────────────────────────

interface WindIndicatorProps {
  windLabel: string;
  windSpeed: number;
  unit: string;
  headTailEffect: 'headwind' | 'tailwind' | 'cross';
}

function WindIndicator({ windLabel, windSpeed, unit, headTailEffect }: WindIndicatorProps) {
  const effectColor =
    headTailEffect === 'tailwind' ? colors.primary :
    headTailEffect === 'headwind' ? '#FF6B6B' :
    '#FFC107';

  return (
    <View style={styles.windIndicator}>
      <Text style={[styles.windEffectLabel, { color: effectColor }]}>
        {headTailEffect.toUpperCase()}
      </Text>
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
  countdown: number | null;   // seconds remaining, null when not locked
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

      {/* Auto-unlock countdown */}
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
  heading: number;
  windDirection: number;
  windSpeed: number;
  windSpeedUnit: string;
  onFire: () => void;
  onClose: () => void;
  isLocked: boolean;
  onLock: () => void;
  onUnlock: () => void;
}

export function CameraHUD({
  heading,
  windDirection,
  windSpeed,
  windSpeedUnit,
  onFire,
  onClose,
  isLocked,
  onLock,
  onUnlock,
}: CameraHUDProps) {
  const [permission, requestPermission] = useCameraPermissions();

  // ── Animation refs ────────────────────────────────────────────────────────
  // Crosshair scale pulse on lock
  const crosshairScale = React.useRef(new Animated.Value(1)).current;
  // Full-screen flash opacity on FIRE
  const flashOpacity = React.useRef(new Animated.Value(0)).current;
  // Crosshair color: 0 = white, 1 = green (colors.primary)
  const lockColorProgress = React.useRef(new Animated.Value(0)).current;

  // ── Countdown timer state ─────────────────────────────────────────────────
  const [countdown, setCountdown] = React.useState<number | null>(null);
  const countdownInterval = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const autoUnlockTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Color interpolation (for crosshair stroke, driven via JS) ────────────
  const [crosshairColor, setCrosshairColor] = React.useState('rgba(255,255,255,0.85)');

  // ── Crosshair pulse animation ─────────────────────────────────────────────
  const triggerLockPulse = React.useCallback(() => {
    // Scale: 1 → 1.15 → 1.0 over ~300ms
    Animated.sequence([
      Animated.timing(crosshairScale, {
        toValue: 1.15,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(crosshairScale, {
        toValue: 1.0,
        duration: 150,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Color fade white → green over 300ms (JS-driven since SVG props can't use native driver)
    Animated.timing(lockColorProgress, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    lockColorProgress.addListener(({ value }) => {
      // Interpolate white → colors.primary (#4B9E50)
      const r = Math.round(255 + (75  - 255) * value);
      const g = Math.round(255 + (158 - 255) * value);
      const b = Math.round(255 + (80  - 255) * value);
      setCrosshairColor(`rgba(${r},${g},${b},${0.85 + 0.15 * value})`);
    });
  }, [crosshairScale, lockColorProgress]);

  // Revert crosshair to white on unlock
  const triggerUnlockReset = React.useCallback(() => {
    Animated.timing(lockColorProgress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();

    lockColorProgress.addListener(({ value }) => {
      const r = Math.round(255 + (75  - 255) * value);
      const g = Math.round(255 + (158 - 255) * value);
      const b = Math.round(255 + (80  - 255) * value);
      setCrosshairColor(`rgba(${r},${g},${b},${0.85 + 0.15 * value})`);
    });
  }, [lockColorProgress]);

  // ── FIRE flash animation ──────────────────────────────────────────────────
  const triggerFireFlash = React.useCallback((callback: () => void) => {
    Animated.sequence([
      Animated.timing(flashOpacity, {
        toValue: 0.6,
        duration: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(flashOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => callback());
  }, [flashOpacity]);

  // ── Auto-timeout management ───────────────────────────────────────────────
  const clearAutoUnlock = React.useCallback(() => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    if (autoUnlockTimeout.current) {
      clearTimeout(autoUnlockTimeout.current);
      autoUnlockTimeout.current = null;
    }
    setCountdown(null);
  }, []);

  const startAutoUnlock = React.useCallback(() => {
    clearAutoUnlock();
    setCountdown(AUTO_UNLOCK_SECS);

    // Countdown tick every second
    let remaining = AUTO_UNLOCK_SECS;
    countdownInterval.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearAutoUnlock();
      }
    }, 1000);

    // Auto-unlock after timeout
    autoUnlockTimeout.current = setTimeout(() => {
      clearAutoUnlock();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onUnlock();
    }, AUTO_UNLOCK_SECS * 1000);
  }, [clearAutoUnlock, onUnlock]);

  // React to isLocked changes
  React.useEffect(() => {
    if (isLocked) {
      triggerLockPulse();
      startAutoUnlock();
    } else {
      triggerUnlockReset();
      clearAutoUnlock();
    }
    return () => {
      // Cleanup listeners to avoid memory leaks
      lockColorProgress.removeAllListeners();
    };
  }, [isLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      clearAutoUnlock();
      lockColorProgress.removeAllListeners();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLock = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLock();
  }, [onLock]);

  const handleFire = React.useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    clearAutoUnlock();
    triggerFireFlash(onFire);
  }, [onFire, triggerFireFlash, clearAutoUnlock]);

  const handleUnlock = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearAutoUnlock();
    onUnlock();
  }, [onUnlock, clearAutoUnlock]);

  // ── Wind calculations ─────────────────────────────────────────────────────
  const windAngleRelative = ((windDirection - heading) + 360) % 360;
  const windLabel = (() => {
    if (windAngleRelative < 22.5 || windAngleRelative >= 337.5) return 'N';
    if (windAngleRelative < 67.5) return 'NE';
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

      {/* Dark vignette overlay for readability */}
      <View style={styles.vignette} pointerEvents="none" />

      {/* ── COMPASS RING OVERLAY ── centered, semi-transparent */}
      <View style={styles.compassRingContainer} pointerEvents="none">
        <CompassRingOverlay
          heading={heading}
          frozen={isLocked}
          size={SCREEN_W * 0.72}
        />
      </View>

      {/* TOP BAR */}
      <View style={styles.topBar}>
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

      {/* CROSSHAIR — centered, animated scale */}
      <View style={styles.crosshairContainer} pointerEvents="none">
        <Animated.View style={{ transform: [{ scale: crosshairScale }] }}>
          <CrosshairReticle
            locked={isLocked}
            strokeColor={crosshairColor}
            size={140}
          />
        </Animated.View>
      </View>

      {/* WIND INDICATOR — top right */}
      <View style={styles.windIndicatorPos} pointerEvents="none">
        <WindIndicator
          windLabel={windLabel}
          windSpeed={windSpeed}
          unit={windSpeedUnit}
          headTailEffect={headTailEffect}
        />
      </View>

      {/* BOTTOM — lock/fire button */}
      <View style={styles.bottomBar}>
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

      {/* ── FIRE FLASH OVERLAY ── full-screen, pointer-events none */}
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

  // Dark edges to improve overlay contrast
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderWidth: 60,
    borderColor: `rgba(0,0,0,${VIGNETTE_OPACITY})`,
  },

  // COMPASS RING — centered behind crosshair
  compassRingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // TOP BAR
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  hudLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudLabelText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  hudLockedBadge: {
    color: '#FF6B6B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },

  // CROSSHAIR
  crosshairContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // WIND INDICATOR (top-right corner)
  windIndicatorPos: {
    position: 'absolute',
    top: 72,
    right: 20,
  },
  windIndicator: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 72,
  },
  windEffectLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  windSpeedText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  windUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
  },
  windDirText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  // BOTTOM BAR
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 48,
    paddingTop: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  lockFireWrapper: {
    alignItems: 'center',
  },
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
  lockFireTextLocked: {
    color: colors.primary,
  },
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

  // PERMISSION SCREEN
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
  permissionDismiss: {
    padding: 12,
  },
  permissionDismissText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },

  // FIRE FLASH — full-screen white/green overlay
  fireFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#6EFF70',  // green-tinted white flash
  },
});
