/**
 * WindScreen tests
 * Tests premium gate, wind calculator UI, yardage controls, manual wind input, and lock/calculate flow
 */
import * as React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@/src/test-utils';
import { AccessibilityInfo } from 'react-native';
import WindScreen from '@/app/(tabs)/wind';

// ─── Mock heavy deps that aren't testable in Node env ───────────────────────

jest.mock('@/src/components/CompassDisplay', () => ({
  CompassDisplay: ({ isLocked }: { isLocked?: boolean }) => {
    const { View, Text } = require('react-native');
    return (
      <View accessible={true} accessibilityRole="image" accessibilityLabel="Compass">
        <Text testID="compass-locked-state">{isLocked ? 'locked' : 'unlocked'}</Text>
      </View>
    );
  },
}));

jest.mock('@/src/components/WindResultsModal', () => ({
  WindResultsModal: ({
    visible,
    onClose,
    targetYardage,
  }: {
    visible: boolean;
    onClose: () => void;
    targetYardage: number;
  }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    if (!visible) return null;
    return (
      <View testID="wind-results-modal">
        <Text testID="results-target-yardage">{targetYardage}</Text>
        <TouchableOpacity testID="results-close" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

jest.mock('@/src/components/ui', () => ({
  SceneBackground: ({ children, style }: { children: React.ReactNode; style?: object }) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, style }: { children: React.ReactNode; style?: object }) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

jest.mock('@react-native-community/slider', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({
      value,
      onValueChange,
      onSlidingComplete,
      minimumValue = 0,
      maximumValue = 100,
      step = 1,
      ...rest
    }: {
      value?: number;
      onValueChange?: (v: number) => void;
      onSlidingComplete?: (v: number) => void;
      minimumValue?: number;
      maximumValue?: number;
      step?: number;
      [key: string]: unknown;
    }) => (
      <View
        testID="distance-slider"
        accessibilityRole="adjustable"
        accessibilityValue={{ min: minimumValue, max: maximumValue, now: value }}
      />
    ),
  };
});

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const Icon = ({ testID }: { testID?: string }) => <View testID={testID} />;
  return {
    Lock: Icon,
    Wind: Icon,
    Navigation: Icon,
    Target: Icon,
    Minus: Icon,
    Plus: Icon,
    AlertCircle: Icon,
    Edit3: Icon,
    Check: Icon,
    X: Icon,
    Camera: Icon,  // Added: HUD toggle button uses Camera icon
  };
});

jest.mock('@/src/components/CameraHUD', () => ({
  CameraHUD: () => null,  // Not rendered in tests (hudMode defaults false)
}));

// ─── Mock contexts ────────────────────────────────────────────────────────────

const mockUpdatePreferences = jest.fn();
const mockUpdateManualWeather = jest.fn().mockResolvedValue(undefined);

jest.mock('@/src/contexts/WeatherContext', () => ({
  useWeather: jest.fn(),
  WeatherProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/src/contexts/UserPreferencesContext', () => ({
  useUserPreferences: jest.fn(),
  UserPreferencesProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ─── Mock hooks ───────────────────────────────────────────────────────────────

const mockOnValueChange = jest.fn();
const mockResetHaptic = jest.fn();

jest.mock('@/src/hooks/useCompassHeading', () => ({
  useCompassHeading: jest.fn(),
}));

jest.mock('@/src/hooks/useHapticSlider', () => ({
  useHapticSlider: jest.fn(),
}));

const { useWeather } = require('@/src/contexts/WeatherContext');
const { useUserPreferences } = require('@/src/contexts/UserPreferencesContext');
const { useCompassHeading } = require('@/src/hooks/useCompassHeading');
const { useHapticSlider } = require('@/src/hooks/useHapticSlider');

// ─── Test data ────────────────────────────────────────────────────────────────

const mockWeather = {
  temperature: 72,
  humidity: 50,
  pressure: 1013,
  altitude: 500,
  windSpeed: 12,
  windDirection: 270,
  windGust: 18,
  locationName: 'Test Course',
  observationTime: new Date().toISOString(),
  isManualOverride: false,
};

const mockPreferences = {
  distanceUnit: 'yards',
  temperatureUnit: 'fahrenheit',
  windSpeedUnit: 'mph',
  handPreference: 'right',
  isPremium: true,
  weatherProvider: {
    enableMultiProvider: false,
    primaryProvider: 'openmeteo',
    fallbackOrder: ['tomorrow', 'openmeteo'],
  },
};

jest.setTimeout(15000);

// ─── Setup helpers ────────────────────────────────────────────────────────────

function setupMocks({
  isPremium = true,
  weather = mockWeather as typeof mockWeather | null,
  heading = 45,
  hasPermission = true,
} = {}) {
  useWeather.mockReturnValue({
    weather,
    isLoading: false,
    error: null,
    isOffline: false,
    updateManualWeather: mockUpdateManualWeather,
  });

  useUserPreferences.mockReturnValue({
    preferences: { ...mockPreferences, isPremium },
    updatePreferences: mockUpdatePreferences,
  });

  useCompassHeading.mockReturnValue({ heading, hasPermission });

  useHapticSlider.mockReturnValue({
    onValueChange: mockOnValueChange,
    reset: mockResetHaptic,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WindScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);
    (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValue({ remove: jest.fn() });
    setupMocks();
  });

  // ─── Premium gate ──────────────────────────────────────────────────────────

  describe('Premium gate', () => {
    it('shows locked screen when user is not premium', async () => {
      setupMocks({ isPremium: false });
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByText('Wind Calculator')).toBeTruthy();
        expect(screen.getByText('Premium Feature')).toBeTruthy();
      });
    });

    it('shows feature list on locked screen', async () => {
      setupMocks({ isPremium: false });
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByText('Real-time compass integration')).toBeTruthy();
        expect(screen.getByText('Sustained and gust calculations')).toBeTruthy();
        expect(screen.getByText('Lateral aim adjustments')).toBeTruthy();
      });
    });

    it('tapping Unlock Premium calls updatePreferences with isPremium: true', async () => {
      setupMocks({ isPremium: false });
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByText('Unlock Premium')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Unlock Premium'));

      expect(mockUpdatePreferences).toHaveBeenCalledWith({ isPremium: true });
    });

    it('renders wind calculator when user is premium', async () => {
      setupMocks({ isPremium: true });
      render(<WindScreen />);

      await waitFor(() => {
        // Compass renders (via testID on mock)
        expect(screen.getByTestId('compass-locked-state')).toBeTruthy();
        expect(screen.getByText('Target Distance')).toBeTruthy();
      });
    });
  });

  // ─── Wind screen layout ────────────────────────────────────────────────────

  describe('Wind screen layout', () => {
    it('renders compass display', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        // CompassDisplay mock renders with testID="compass-locked-state"
        expect(screen.getByTestId('compass-locked-state')).toBeTruthy();
        expect(screen.getByLabelText('Compass')).toBeTruthy();
      });
    });

    it('renders target distance with default 150y', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByText('Target Distance')).toBeTruthy();
        // Distance value is "150 yds" in a nested Text — use regex to match
        expect(screen.getByText(/^150/)).toBeTruthy();
      });
    });

    it('renders Calculate button when weather is available', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByText('Calculate')).toBeTruthy();
      });

      const btn = screen.getByRole('button', { name: /calculate wind effect/i });
      expect(btn.props.accessibilityState?.disabled).toBeFalsy();
    });

    it('renders wind info bar with speed and gust', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        // wind bar shows "12 mph" and "Gusts: 18 mph"
        expect(screen.getByText(/Gusts:/)).toBeTruthy();
      });
    });

    it('shows permission warning when compass access is denied', async () => {
      setupMocks({ hasPermission: false });
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByText('Compass access required for accurate readings')).toBeTruthy();
      });
    });

    it('does NOT show permission warning when compass is granted', async () => {
      setupMocks({ hasPermission: true });
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByText('Target Distance')).toBeTruthy();
      });

      expect(screen.queryByText('Compass access required for accurate readings')).toBeNull();
    });

    it('renders HUD toggle button', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        const hudBtn = screen.getByRole('button', { name: /switch to camera hud mode/i });
        expect(hudBtn).toBeTruthy();
        expect(screen.getByText('HUD')).toBeTruthy();
      });
    });
  });

  // ─── No weather state ──────────────────────────────────────────────────────

  describe('No weather state', () => {
    it('shows loading bar when weather is null', async () => {
      setupMocks({ weather: null });
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByText('Loading weather data...')).toBeTruthy();
      });
    });

    it('Calculate button is disabled when weather is null', async () => {
      setupMocks({ weather: null });
      render(<WindScreen />);

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: /calculate wind effect/i });
        expect(btn.props.accessibilityState?.disabled).toBe(true);
      });
    });
  });

  // ─── Calculate / Lock flow ─────────────────────────────────────────────────

  describe('Calculate / Lock flow', () => {
    it('pressing Calculate shows WindResultsModal', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByText('Calculate')).toBeTruthy();
      });

      fireEvent.press(screen.getByRole('button', { name: /calculate wind effect/i }));

      await waitFor(() => {
        expect(screen.getByTestId('wind-results-modal')).toBeTruthy();
      });
    });

    it('WindResultsModal receives the current targetYardage', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByText('Calculate')).toBeTruthy();
      });

      // Default yardage is 150
      fireEvent.press(screen.getByRole('button', { name: /calculate wind effect/i }));

      await waitFor(() => {
        expect(screen.getByTestId('results-target-yardage').props.children).toBe(150);
      });
    });

    it('closing the results modal resets lock state', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByText('Calculate')).toBeTruthy();
      });

      fireEvent.press(screen.getByRole('button', { name: /calculate wind effect/i }));

      await waitFor(() => {
        expect(screen.getByTestId('wind-results-modal')).toBeTruthy();
      });

      fireEvent.press(screen.getByTestId('results-close'));

      await waitFor(() => {
        expect(screen.queryByTestId('wind-results-modal')).toBeNull();
      });
    });

    it('compass locked state updates on Calculate press', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByTestId('compass-locked-state').props.children).toBe('unlocked');
      });

      fireEvent.press(screen.getByRole('button', { name: /calculate wind effect/i }));

      await waitFor(() => {
        expect(screen.getByTestId('compass-locked-state').props.children).toBe('locked');
      });
    });
  });

  // ─── Yardage fine-adjust ───────────────────────────────────────────────────

  describe('Yardage fine-adjust buttons', () => {
    it('minus button decreases yardage by 1', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByText(/^150/)).toBeTruthy();
      });

      fireEvent.press(
        screen.getByRole('button', { name: /decrease distance by 1 yard/i })
      );

      await waitFor(() => {
        // After decrement: "149 yds" — use regex to match
        expect(screen.getByText(/^149/)).toBeTruthy();
      });
    });

    it('plus button increases yardage by 1', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByText(/^150/)).toBeTruthy();
      });

      fireEvent.press(
        screen.getByRole('button', { name: /increase distance by 1 yard/i })
      );

      await waitFor(() => {
        // After increment: "151 yds" — use regex to match
        expect(screen.getByText(/^151/)).toBeTruthy();
      });
    });

    it('yardage does not go below 50', async () => {
      render(<WindScreen />);

      // Press minus 200 times via rapid presses
      for (let i = 0; i < 120; i++) {
        fireEvent.press(
          screen.getByRole('button', { name: /decrease distance by 1 yard/i })
        );
      }

      await waitFor(() => {
        expect(screen.getByText('50')).toBeTruthy();
      });
    });

    it('yardage does not exceed 350', async () => {
      render(<WindScreen />);

      // Press plus 220 times to try to exceed 350
      for (let i = 0; i < 220; i++) {
        fireEvent.press(
          screen.getByRole('button', { name: /increase distance by 1 yard/i })
        );
      }

      await waitFor(() => {
        expect(screen.getByText('350')).toBeTruthy();
      });
    });
  });

  // ─── Manual wind input ─────────────────────────────────────────────────────

  describe('Manual wind input modal', () => {
    it('tapping wind info bar opens the manual input modal', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i })).toBeTruthy();
      });

      fireEvent.press(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i }));

      await waitFor(() => {
        expect(screen.getByText('Manual Wind Entry')).toBeTruthy();
      });
    });

    it('manual input modal pre-fills current weather values', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i })).toBeTruthy();
      });

      fireEvent.press(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i }));

      await waitFor(() => {
        expect(screen.getByText('Manual Wind Entry')).toBeTruthy();
      });

      // After openManualInput(), state is set from weather: windSpeed=12, windGust=18, windDirection=270
      // Use getByDisplayValue to find inputs by their current value
      const windSpeedInput = screen.getByDisplayValue('12');
      const windGustInput = screen.getByDisplayValue('18');
      const windDirInput = screen.getByDisplayValue('270');

      expect(windSpeedInput).toBeTruthy();
      expect(windGustInput).toBeTruthy();
      expect(windDirInput).toBeTruthy();
    });

    it('submitting manual wind calls updateManualWeather', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i })).toBeTruthy();
      });

      fireEvent.press(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i }));

      await waitFor(() => {
        expect(screen.getByText('Manual Wind Entry')).toBeTruthy();
      });

      // Inputs pre-filled from weather: windSpeed='12', windGust='18', windDirection='270'
      // Use getByDisplayValue to find each input, then changeText
      fireEvent.changeText(screen.getByDisplayValue('12'), '20');
      fireEvent.changeText(screen.getByDisplayValue('18'), '25');
      fireEvent.changeText(screen.getByDisplayValue('270'), '90');

      fireEvent.press(screen.getByRole('button', { name: /apply manual wind settings/i }));

      await waitFor(() => {
        expect(mockUpdateManualWeather).toHaveBeenCalledWith({
          windSpeed: 20,
          windGust: 25,
          windDirection: 90,
        });
      });
    });

    it('clamps wind speed to max 100', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i })).toBeTruthy();
      });

      fireEvent.press(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i }));

      await waitFor(() => {
        expect(screen.getByText('Manual Wind Entry')).toBeTruthy();
      });

      // Inputs pre-filled: '12', '18', '270'
      fireEvent.changeText(screen.getByDisplayValue('12'), '200');
      fireEvent.changeText(screen.getByDisplayValue('18'), '150');
      fireEvent.changeText(screen.getByDisplayValue('270'), '0');

      fireEvent.press(screen.getByRole('button', { name: /apply manual wind settings/i }));

      await waitFor(() => {
        expect(mockUpdateManualWeather).toHaveBeenCalledWith({
          windSpeed: 100,   // clamped
          windGust: 150,    // clamped gust (also max 150)
          windDirection: 0,
        });
      });
    });

    it('gust is raised to wind speed minimum when entered below it', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i })).toBeTruthy();
      });

      fireEvent.press(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i }));

      await waitFor(() => {
        expect(screen.getByText('Manual Wind Entry')).toBeTruthy();
      });

      // Gust (5) < Wind (15) — should be raised to 15
      // Inputs pre-filled: '12', '18', '270'
      fireEvent.changeText(screen.getByDisplayValue('12'), '15');
      fireEvent.changeText(screen.getByDisplayValue('18'), '5');
      fireEvent.changeText(screen.getByDisplayValue('270'), '180');

      fireEvent.press(screen.getByRole('button', { name: /apply manual wind settings/i }));

      await waitFor(() => {
        expect(mockUpdateManualWeather).toHaveBeenCalledWith({
          windSpeed: 15,
          windGust: 15, // raised to match wind speed
          windDirection: 180,
        });
      });
    });

    it('does not call updateManualWeather if input is NaN', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i })).toBeTruthy();
      });

      fireEvent.press(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i }));

      await waitFor(() => {
        expect(screen.getByText('Manual Wind Entry')).toBeTruthy();
      });

      // Pre-filled: '12' for wind speed. Enter invalid 'abc'.
      fireEvent.changeText(screen.getByDisplayValue('12'), 'abc');
      fireEvent.press(screen.getByRole('button', { name: /apply manual wind settings/i }));

      // Should not call updateManualWeather with invalid input
      await waitFor(() => {
        expect(mockUpdateManualWeather).not.toHaveBeenCalled();
      });
    });

    it('cancel button closes manual input modal without saving', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i })).toBeTruthy();
      });

      fireEvent.press(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i }));

      await waitFor(() => {
        expect(screen.getByText('Manual Wind Entry')).toBeTruthy();
      });

      fireEvent.press(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByText('Manual Wind Entry')).toBeNull();
      });

      expect(mockUpdateManualWeather).not.toHaveBeenCalled();
    });
  });

  // ─── Wind direction normalization ──────────────────────────────────────────

  describe('Wind direction normalization', () => {
    it('normalizes wind direction above 360', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i })).toBeTruthy();
      });

      fireEvent.press(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i }));

      await waitFor(() => {
        expect(screen.getByText('Manual Wind Entry')).toBeTruthy();
      });

      // Inputs pre-filled: '12', '18', '270'
      fireEvent.changeText(screen.getByDisplayValue('12'), '10');
      fireEvent.changeText(screen.getByDisplayValue('18'), '15');
      fireEvent.changeText(screen.getByDisplayValue('270'), '450'); // 450 % 360 = 90

      fireEvent.press(screen.getByRole('button', { name: /apply manual wind settings/i }));

      await waitFor(() => {
        expect(mockUpdateManualWeather).toHaveBeenCalledWith(
          expect.objectContaining({ windDirection: 90 })
        );
      });
    });

    it('normalizes negative wind direction', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i })).toBeTruthy();
      });

      fireEvent.press(screen.getByRole('button', { name: /wind.*gusts.*tap to enter manual wind/i }));

      await waitFor(() => {
        expect(screen.getByText('Manual Wind Entry')).toBeTruthy();
      });

      // Inputs pre-filled: '12', '18', '270'
      fireEvent.changeText(screen.getByDisplayValue('12'), '10');
      fireEvent.changeText(screen.getByDisplayValue('18'), '15');
      fireEvent.changeText(screen.getByDisplayValue('270'), '-90'); // -90 → 270

      fireEvent.press(screen.getByRole('button', { name: /apply manual wind settings/i }));

      await waitFor(() => {
        expect(mockUpdateManualWeather).toHaveBeenCalledWith(
          expect.objectContaining({ windDirection: 270 })
        );
      });
    });
  });

  // ─── Distance unit display ─────────────────────────────────────────────────

  describe('Distance unit display', () => {
    it('displays distance in yards by default', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        // Distance renders as "150 yds" (with nested Text for unit)
        expect(screen.getByText(/^150/)).toBeTruthy();
        // Unit label is a separate nested Text element
        expect(screen.getByText(/yds/i)).toBeTruthy();
      });
    });

    it('shows slider range labels', async () => {
      render(<WindScreen />);

      await waitFor(() => {
        expect(screen.getByText('50')).toBeTruthy();
        expect(screen.getByText('350')).toBeTruthy();
      });
    });
  });
});
