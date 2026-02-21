/**
 * Tests for CameraHUD component
 *
 * Focuses on:
 * 1. Wind calculation logic (windLabel, headTailEffect) via WindIndicator rendering
 * 2. Permission states (null → null, !granted → permission screen, granted → HUD)
 * 3. LockFireButton state rendering
 */

import * as React from 'react';
import { render } from '@testing-library/react-native';
import { CameraHUD } from '@/src/components/CameraHUD';

// ─── expo-camera mock ──────────────────────────────────────────────────────────
// NOTE: mockPermission must start with 'mock' (case-insensitive) to be allowed
// in jest.mock factory closures (Jest out-of-scope variable rule).
let mockPermission: { granted: boolean } | null = { granted: true };
const mockRequestPermission = jest.fn();

jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [mockPermission, mockRequestPermission],
}));

// ─── react-native-svg mock ─────────────────────────────────────────────────────
// Return simple null stubs — just need SVG to not crash.
jest.mock('react-native-svg', () => {
  const nullEl = () => null;
  return {
    __esModule: true,
    default: nullEl,
    Svg: nullEl,
    Circle: nullEl,
    Line: nullEl,
    G: ({ children }: { children?: React.ReactNode }) => children ?? null,
    Text: nullEl,
  };
});

// ─── lucide-react-native ───────────────────────────────────────────────────────
jest.mock('lucide-react-native', () =>
  new Proxy({}, { get: () => () => null })
);

// ─── Fake timers — prevent setInterval/setTimeout leaking after tests ──────────
beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

// ─── Default props ─────────────────────────────────────────────────────────────

const baseProps = {
  heading: 0,
  windDirection: 0,
  windSpeed: 10,
  windSpeedUnit: 'mph',
  onFire: jest.fn(),
  onClose: jest.fn(),
  isLocked: false,
  onLock: jest.fn(),
  onUnlock: jest.fn(),
};

function renderHUD(overrides = {}) {
  return render(<CameraHUD {...baseProps} {...overrides} />);
}

// ─── Permission States ─────────────────────────────────────────────────────────

describe('CameraHUD — permission states', () => {
  afterEach(() => {
    mockPermission = { granted: true };
  });

  it('returns null when permission is still loading', () => {
    mockPermission = null;
    const { toJSON } = renderHUD();
    expect(toJSON()).toBeNull();
  });

  it('shows permission screen when camera is not granted', () => {
    mockPermission = { granted: false };
    const { getByText } = renderHUD();
    expect(getByText('Camera Access')).toBeTruthy();
    expect(getByText('Enable Camera')).toBeTruthy();
    expect(getByText('Not Now')).toBeTruthy();
  });

  it('shows HUD label when permission is granted', () => {
    mockPermission = { granted: true };
    const { getByText } = renderHUD();
    expect(getByText('HUD MODE')).toBeTruthy();
  });
});

// ─── LockFireButton ───────────────────────────────────────────────────────────

describe('CameraHUD — LockFireButton', () => {
  beforeEach(() => { mockPermission = { granted: true }; });

  it('shows LOCK TARGET when unlocked', () => {
    const { getByText } = renderHUD({ isLocked: false });
    expect(getByText(/LOCK TARGET/)).toBeTruthy();
  });

  it('shows FIRE when locked', () => {
    const { getByText } = renderHUD({ isLocked: true });
    expect(getByText(/FIRE/)).toBeTruthy();
  });

  it('shows LOCKED badge in top bar when locked', () => {
    const { getByText } = renderHUD({ isLocked: true });
    expect(getByText('LOCKED')).toBeTruthy();
  });

  it('shows aiming hint when unlocked', () => {
    const { getByText } = renderHUD({ isLocked: false });
    expect(getByText('Point at your target, then lock')).toBeTruthy();
  });

  it('hides aiming hint when locked', () => {
    const { queryByText } = renderHUD({ isLocked: true });
    expect(queryByText('Point at your target, then lock')).toBeNull();
  });
});

// ─── Wind Indicator — headTailEffect ─────────────────────────────────────────
// windAngleRelative = ((windDirection - heading) + 360) % 360
// headwind:  angle < 60  || angle > 300
// tailwind:  angle > 120 && angle < 240
// cross:     60–120 and 240–300

describe('CameraHUD — headTailEffect', () => {
  beforeEach(() => { mockPermission = { granted: true }; });

  it('HEADWIND when wind is directly in front (angle 0)', () => {
    const { getByText } = renderHUD({ heading: 0, windDirection: 0 });
    expect(getByText('HEADWIND')).toBeTruthy();
  });

  it('HEADWIND for angle 45 (< 60 threshold)', () => {
    const { getByText } = renderHUD({ heading: 0, windDirection: 45 });
    expect(getByText('HEADWIND')).toBeTruthy();
  });

  it('HEADWIND for angle 315 (> 300 threshold)', () => {
    // heading=0, windDirection=315 → angle=315
    const { getByText } = renderHUD({ heading: 0, windDirection: 315 });
    expect(getByText('HEADWIND')).toBeTruthy();
  });

  it('TAILWIND when wind is directly behind (angle 180)', () => {
    const { getByText } = renderHUD({ heading: 0, windDirection: 180 });
    expect(getByText('TAILWIND')).toBeTruthy();
  });

  it('TAILWIND for angle 150 (in 120–240 band)', () => {
    const { getByText } = renderHUD({ heading: 0, windDirection: 150 });
    expect(getByText('TAILWIND')).toBeTruthy();
  });

  it('CROSS for right crosswind (angle 90)', () => {
    const { getByText } = renderHUD({ heading: 0, windDirection: 90 });
    expect(getByText('CROSS')).toBeTruthy();
  });

  it('CROSS for left crosswind (angle 270)', () => {
    const { getByText } = renderHUD({ heading: 0, windDirection: 270 });
    expect(getByText('CROSS')).toBeTruthy();
  });

  it('respects heading offset — same angle relative to facing direction', () => {
    // heading=90, windDirection=90 → angle=0 → headwind
    const { getByText } = renderHUD({ heading: 90, windDirection: 90 });
    expect(getByText('HEADWIND')).toBeTruthy();
  });

  it('handles wraparound (heading=350, windDir=10 → angle=20 → headwind)', () => {
    // angle = ((10 - 350) + 360) % 360 = 20 → headwind
    const { getByText } = renderHUD({ heading: 350, windDirection: 10 });
    expect(getByText('HEADWIND')).toBeTruthy();
  });
});

// ─── Wind Indicator — windLabel (8-point compass from angle) ─────────────────

describe('CameraHUD — windLabel', () => {
  beforeEach(() => { mockPermission = { granted: true }; });

  it('shows N when angle is 0', () => {
    const { getByText } = renderHUD({ heading: 0, windDirection: 0 });
    expect(getByText('N')).toBeTruthy();
  });

  it('shows S when angle is 180', () => {
    const { getByText } = renderHUD({ heading: 0, windDirection: 180 });
    expect(getByText('S')).toBeTruthy();
  });

  it('shows E when angle is 90', () => {
    const { getByText } = renderHUD({ heading: 0, windDirection: 90 });
    expect(getByText('E')).toBeTruthy();
  });

  it('shows W when angle is 270', () => {
    const { getByText } = renderHUD({ heading: 0, windDirection: 270 });
    expect(getByText('W')).toBeTruthy();
  });

  it('shows NE when angle is 45', () => {
    const { getByText } = renderHUD({ heading: 0, windDirection: 45 });
    expect(getByText('NE')).toBeTruthy();
  });

  it('shows SW when angle is 225', () => {
    const { getByText } = renderHUD({ heading: 0, windDirection: 225 });
    expect(getByText('SW')).toBeTruthy();
  });
});

// ─── Wind speed display ────────────────────────────────────────────────────────

describe('CameraHUD — wind display', () => {
  beforeEach(() => { mockPermission = { granted: true }; });

  it('rounds wind speed to nearest integer', () => {
    const { getByText } = renderHUD({ windSpeed: 12.7 });
    // Wind speed renders as Math.round(12.7) = 13 inside a Text element
    // Use regex to find the "13" regardless of surrounding whitespace/children
    expect(getByText(/\b13\b/)).toBeTruthy();
  });

  it('displays the unit', () => {
    const { getByText } = renderHUD({ windSpeedUnit: 'kph' });
    expect(getByText('kph')).toBeTruthy();
  });
});
