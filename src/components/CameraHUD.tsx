/**
 * CameraHUD — Phase 2 Prototype
 *
 * Full-screen camera view with wind data overlay.
 * Fighter-pilot HUD aesthetic: crosshair, compass ring, lock/fire flow.
 * All results shown on existing WindResultsModal — zero data on HUD.
 *
 * Phase 2: Camera + crosshair + compass + lock/fire button.
 * Phase 3: Reticle animations, FIRE flash, green tint filter.
 */

import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Line, Rect, Circle, G, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '@/src/constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Crosshair Reticle ────────────────────────────────────────────────────────

interface CrosshairProps {
  locked: boolean;
  size?: number;
}

function CrosshairReticle({ locked, size = 120 }: CrosshairProps) {
  const cx = size / 2;
  const gap = size * 0.12;    // gap around center dot
  const arm  = size * 0.25;   // length of each arm
  const bracket = size * 0.08; // corner bracket length
  const stroke = locked ? colors.primary : 'rgba(255,255,255,0.85)';
  const strokeW = locked ? 2.5 : 1.5;

  return (
    <Svg width={size} height={size}>
      {/* Center dot */}
      <Circle
        cx={cx}
        cy={cx}
        r={locked ? 5 : 3}
        fill={stroke}
        opacity={locked ? 1 : 0.9}
      />

      {/* Crosshair arms */}
      {/* Top */}
      <Line x1={cx} y1={cx - gap} x2={cx} y2={cx - gap - arm} stroke={stroke} strokeWidth={strokeW} />
      {/* Bottom */}
      <Line x1={cx} y1={cx + gap} x2={cx} y2={cx + gap + arm} stroke={stroke} strokeWidth={strokeW} />
      {/* Left */}
      <Line x1={cx - gap} y1={cx} x2={cx - gap - arm} y2={cx} stroke={stroke} strokeWidth={strokeW} />
      {/* Right */}
      <Line x1={cx + gap} y1={cx} x2={cx + gap + arm} y2={cx} stroke={stroke} strokeWidth={strokeW} />

      {/* Corner brackets (top-left, top-right, bottom-left, bottom-right) */}
      {[
        { ox: -1, oy: -1 }, // TL
        { ox:  1, oy: -1 }, // TR
        { ox: -1, oy:  1 }, // BL
        { ox:  1, oy:  1 }, // BR
      ].map(({ ox, oy }, i) => {
        const bx = cx + ox * (size * 0.32);
        const by = cx + oy * (size * 0.32);
        return (
          <G key={i}>
            <Line
              x1={bx}
              y1={by}
              x2={bx + ox * bracket}
              y2={by}
              stroke={stroke}
              strokeWidth={strokeW}
              opacity={0.6}
            />
            <Line
              x1={bx}
              y1={by}
              x2={bx}
              y2={by + oy * bracket}
              stroke={stroke}
              strokeWidth={strokeW}
              opacity={0.6}
            />
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Wind Direction Indicator ─────────────────────────────────────────────────

interface WindIndicatorProps {
  windLabel: string;   // e.g. "NW", "SW"
  windSpeed: number;
  unit: string;        // "mph" | "kph"
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
  onLock: () => void;
  onFire: () => void;
}

function LockFireButton({ locked, onLock, onFire }: LockFireButtonProps) {
  return (
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
  heading: number;           // live compass heading (deg)
  windDirection: number;     // wind direction (deg, met convention)
  windSpeed: number;
  windSpeedUnit: string;
  onFire: () => void;        // called when user fires → show results
  onClose: () => void;       // exit HUD mode
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

  const handleLock = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLock();
  }, [onLock]);

  const handleFire = React.useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onFire();
  }, [onFire]);

  const handleUnlock = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUnlock();
  }, [onUnlock]);

  // Wind label relative to target heading
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

  // Permission not yet determined
  if (!permission) return null;

  // Permission denied — show request screen
  if (!permission.granted) {
    return (
      <View style={styles.hudContainer}>
        <PermissionScreen
          onRequest={requestPermission}
          onDismiss={onClose}
        />
      </View>
    );
  }

  return (
    <View style={styles.hudContainer}>
      {/* Camera background */}
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {/* Dark vignette overlay for readability */}
      <View style={styles.vignette} pointerEvents="none" />

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

      {/* CROSSHAIR — centered */}
      <View style={styles.crosshairContainer} pointerEvents="none">
        <CrosshairReticle locked={isLocked} size={140} />
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
          onLock={handleLock}
          onFire={handleFire}
        />
        {!isLocked && (
          <Text style={styles.aimHint}>Point at your target, then lock</Text>
        )}
      </View>
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
    // Simulate vignette with semi-transparent edges
    borderWidth: 60,
    borderColor: `rgba(0,0,0,${VIGNETTE_OPACITY})`,
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
});
