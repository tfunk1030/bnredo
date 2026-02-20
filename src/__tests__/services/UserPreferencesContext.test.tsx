/**
 * Tests for UserPreferencesContext (UserPreferencesProvider + useUserPreferences)
 *
 * Key logic under test:
 *   - Default preference values (distanceUnit, isPremium, weatherProvider, etc.)
 *   - loadPreferences: AsyncStorage fallback path (no user, no Supabase)
 *   - loadPreferences: merges stored with defaults (partial storage)
 *   - updatePreferences: AsyncStorage persistence + state update
 *   - isLoading lifecycle (true → false after load)
 *   - useUserPreferences error when outside provider
 *
 * MOCKING:
 *   - @react-native-async-storage/async-storage
 *   - @/src/lib/supabase (null — offline path tests)
 *   - @/src/contexts/AuthContext (useAuth)
 */

import * as React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@/src/lib/supabase', () => ({
  supabase: null,
}));

jest.mock('@/src/contexts/AuthContext', () => ({
  useAuth: jest.fn().mockReturnValue({ user: null }),
}));

import {
  UserPreferencesProvider,
  useUserPreferences,
} from '@/src/contexts/UserPreferencesContext';
import { useAuth } from '@/src/contexts/AuthContext';

// ─── Helpers ───────────────────────────────────────────────────────────────

const mockUseAuth = useAuth as jest.Mock;
const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <UserPreferencesProvider>{children}</UserPreferencesProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: null });
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
});

// ═══════════════════════════════════════════════════════════════════════════
// Default preferences
// ═══════════════════════════════════════════════════════════════════════════
describe('default preferences', () => {
  test('uses yards as default distance unit', async () => {
    const { result } = renderHook(() => useUserPreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.preferences.distanceUnit).toBe('yards');
  });

  test('uses fahrenheit as default temperature unit', async () => {
    const { result } = renderHook(() => useUserPreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.preferences.temperatureUnit).toBe('fahrenheit');
  });

  test('uses mph as default wind speed unit', async () => {
    const { result } = renderHook(() => useUserPreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.preferences.windSpeedUnit).toBe('mph');
  });

  test('isPremium defaults to false', async () => {
    const { result } = renderHook(() => useUserPreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.preferences.isPremium).toBe(false);
  });

  test('weatherProvider defaults to openmeteo (single-provider mode)', async () => {
    const { result } = renderHook(() => useUserPreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.preferences.weatherProvider.primaryProvider).toBe('openmeteo');
    expect(result.current.preferences.weatherProvider.enableMultiProvider).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// loadPreferences — AsyncStorage paths
// ═══════════════════════════════════════════════════════════════════════════
describe('loadPreferences — AsyncStorage', () => {
  test('loads stored preferences from AsyncStorage', async () => {
    const stored = {
      distanceUnit: 'meters',
      temperatureUnit: 'celsius',
      windSpeedUnit: 'kmh',
      handPreference: 'left',
      isPremium: true,
      weatherProvider: {
        enableMultiProvider: true,
        primaryProvider: 'tomorrow',
        fallbackOrder: ['openmeteo'],
      },
    };
    mockGetItem.mockResolvedValue(JSON.stringify(stored));

    const { result } = renderHook(() => useUserPreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.preferences.distanceUnit).toBe('meters');
    expect(result.current.preferences.isPremium).toBe(true);
    expect(result.current.preferences.weatherProvider.primaryProvider).toBe('tomorrow');
  });

  test('merges stored preferences with defaults for missing keys', async () => {
    // Only distanceUnit stored — other fields should fall back to defaults
    const partial = { distanceUnit: 'meters' };
    mockGetItem.mockResolvedValue(JSON.stringify(partial));

    const { result } = renderHook(() => useUserPreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.preferences.distanceUnit).toBe('meters');
    // Other fields default
    expect(result.current.preferences.temperatureUnit).toBe('fahrenheit');
    expect(result.current.preferences.isPremium).toBe(false);
  });

  test('uses full defaults when AsyncStorage has null', async () => {
    mockGetItem.mockResolvedValue(null);

    const { result } = renderHook(() => useUserPreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.preferences.distanceUnit).toBe('yards');
    expect(result.current.preferences.isPremium).toBe(false);
  });

  test('isLoading starts true and becomes false after load', async () => {
    let resolveStorage: (v: string | null) => void;
    mockGetItem.mockReturnValue(new Promise(r => { resolveStorage = r; }));

    const { result } = renderHook(() => useUserPreferences(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveStorage!(null);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updatePreferences
// ═══════════════════════════════════════════════════════════════════════════
describe('updatePreferences', () => {
  test('updates state immediately (optimistic)', async () => {
    const { result } = renderHook(() => useUserPreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updatePreferences({ distanceUnit: 'meters' });
    });

    expect(result.current.preferences.distanceUnit).toBe('meters');
  });

  test('persists to AsyncStorage', async () => {
    const { result } = renderHook(() => useUserPreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updatePreferences({ isPremium: true });
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      'user_preferences',
      expect.stringContaining('"isPremium":true')
    );
  });

  test('partial update preserves unchanged preferences', async () => {
    const stored = { distanceUnit: 'meters', isPremium: true };
    mockGetItem.mockResolvedValue(JSON.stringify(stored));

    const { result } = renderHook(() => useUserPreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updatePreferences({ temperatureUnit: 'celsius' });
    });

    // Changed
    expect(result.current.preferences.temperatureUnit).toBe('celsius');
    // Preserved
    expect(result.current.preferences.distanceUnit).toBe('meters');
    expect(result.current.preferences.isPremium).toBe(true);
  });

  test('can update weatherProvider settings', async () => {
    const { result } = renderHook(() => useUserPreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updatePreferences({
        weatherProvider: {
          enableMultiProvider: true,
          primaryProvider: 'tomorrow',
          fallbackOrder: ['openmeteo'],
        },
      });
    });

    expect(result.current.preferences.weatherProvider.enableMultiProvider).toBe(true);
    expect(result.current.preferences.weatherProvider.primaryProvider).toBe('tomorrow');
  });

  test('multiple sequential updates accumulate correctly', async () => {
    const { result } = renderHook(() => useUserPreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updatePreferences({ distanceUnit: 'meters' });
      await result.current.updatePreferences({ isPremium: true });
      await result.current.updatePreferences({ windSpeedUnit: 'kmh' });
    });

    expect(result.current.preferences.distanceUnit).toBe('meters');
    expect(result.current.preferences.isPremium).toBe(true);
    expect(result.current.preferences.windSpeedUnit).toBe('kmh');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// useUserPreferences outside provider
// ═══════════════════════════════════════════════════════════════════════════
describe('useUserPreferences outside provider', () => {
  test('does not throw when used outside provider (returns default context)', () => {
    // UserPreferencesContext has a non-null default value (not null like ClubBagContext),
    // so no error is thrown — the hook returns the default context object.
    expect(() => {
      renderHook(() => useUserPreferences());
    }).not.toThrow();
  });
});
