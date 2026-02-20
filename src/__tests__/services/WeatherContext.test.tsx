/**
 * Tests for WeatherContext (WeatherProvider + useWeather)
 * Covers: manual override, permission denied fallback, fetch error fallback
 */

import * as React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Mocks ---

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@/src/services/weather', () => ({
  fetchWeather: jest.fn(),
  getCachedWeather: jest.fn(),
  getDistanceKm: jest.fn().mockReturnValue(100),
  WeatherError: class WeatherError extends Error {
    code: string;
    constructor(msg: string, code: string) {
      super(msg);
      this.code = code;
    }
  },
  DEFAULT_WEATHER_SETTINGS: {
    enableMultiProvider: false,
    primaryProvider: 'openmeteo',
    fallbackOrder: ['tomorrow', 'openmeteo'],
  },
}));

jest.mock('@/src/contexts/UserPreferencesContext', () => ({
  useUserPreferences: jest.fn().mockReturnValue({
    preferences: { weatherProvider: null },
  }),
}));

import { WeatherProvider, useWeather } from '@/src/contexts/WeatherContext';
import {
  fetchWeather as mockFetchWeather,
  getCachedWeather as mockGetCachedWeather,
} from '@/src/services/weather';

const mockLocation = {
  coords: { latitude: 30.2672, longitude: -97.7431, altitude: 150 },
};

const mockNormalizedWeather = {
  temperature: 72,
  humidity: 55,
  pressure: 1013,
  windSpeed: 8,
  windDirection: 180,
  windGust: 12,
  altitude: 150,
  locationName: 'Austin, TX',
  latitude: 30.2672,
  longitude: -97.7431,
  observationTime: new Date().toISOString(),
  isManualOverride: false,
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WeatherProvider>{children}</WeatherProvider>
);

describe('WeatherContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('manual override', () => {
    it('uses stored manual override without fetching location', async () => {
      const manualWeather = {
        temperature: 65,
        humidity: 40,
        pressure: 1010,
        windSpeed: 5,
        windDirection: 90,
        windGust: 8,
        altitude: 0,
        locationName: 'Manual',
        latitude: 0,
        longitude: 0,
        observationTime: new Date().toISOString(),
        isManualOverride: true,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(manualWeather)
      );

      const { result } = renderHook(() => useWeather(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.weather?.isManualOverride).toBe(true);
      expect(result.current.weather?.temperature).toBe(65);
      // Should NOT request location if manual override is present
      expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    });
  });

  describe('location permission denied', () => {
    it('falls back to cached weather when permission is denied', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (mockGetCachedWeather as jest.Mock).mockResolvedValue(mockNormalizedWeather);

      const { result } = renderHook(() => useWeather(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isOffline).toBe(true);
      expect(result.current.weather?.locationName).toBe('Austin, TX');
      expect(mockFetchWeather).not.toHaveBeenCalled();
    });

    it('uses default weather when permission denied and no cache', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (mockGetCachedWeather as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useWeather(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.weather?.isManualOverride).toBe(true);
      expect(result.current.error).toContain('Location permission');
    });
  });

  describe('fetch error fallback', () => {
    it('falls back to cached weather on fetch error', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);
      (mockFetchWeather as jest.Mock).mockRejectedValue(new Error('Network error'));
      (mockGetCachedWeather as jest.Mock).mockResolvedValue(mockNormalizedWeather);

      const { result } = renderHook(() => useWeather(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isOffline).toBe(true);
      expect(result.current.weather?.locationName).toBe('Austin, TX');
      expect(result.current.error).toContain('cached');
    });
  });

  describe('updateManualWeather', () => {
    it('persists manual weather to AsyncStorage and updates state', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);
      (mockFetchWeather as jest.Mock).mockResolvedValue(mockNormalizedWeather);

      const { result } = renderHook(() => useWeather(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.updateManualWeather({ windSpeed: 20, windDirection: 270 });
      });

      expect(result.current.weather?.windSpeed).toBe(20);
      expect(result.current.weather?.windDirection).toBe(270);
      expect(result.current.weather?.isManualOverride).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'weather_manual_override',
        expect.stringContaining('"windSpeed":20')
      );
    });
  });
});
