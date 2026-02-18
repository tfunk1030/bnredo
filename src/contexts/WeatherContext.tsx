import * as React from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserPreferences } from './UserPreferencesContext';
import {
  NormalizedWeather,
  WeatherSettings,
  DEFAULT_WEATHER_SETTINGS,
  fetchWeather as fetchWeatherOrchestrated,
  getCachedWeather as getOrchCachedWeather,
  WeatherError,
  getDistanceKm,
} from '@/src/services/weather';

// Re-export the old interface for backward compatibility
export interface WeatherData {
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  altitude: number;
  locationName: string;
  latitude: number;
  longitude: number;
  observationTime: string;
  isManualOverride: boolean;
}

interface WeatherContextType {
  weather: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;
  refreshWeather: () => Promise<void>;
  updateManualWeather: (updates: Partial<WeatherData>) => void;
}

const WeatherContext = React.createContext<WeatherContextType | null>(null);

const MANUAL_OVERRIDE_KEY = 'weather_manual_override';

// Convert NormalizedWeather to legacy WeatherData format
function toWeatherData(weather: NormalizedWeather): WeatherData {
  return {
    temperature: weather.temperature,
    humidity: weather.humidity,
    pressure: weather.pressure,
    windSpeed: weather.windSpeed,
    windDirection: weather.windDirection,
    windGust: weather.windGust,
    altitude: weather.altitude,
    locationName: weather.locationName,
    latitude: weather.latitude,
    longitude: weather.longitude,
    observationTime: weather.observationTime,
    isManualOverride: weather.isManualOverride,
  };
}

function getDefaultWeather(): WeatherData {
  return {
    temperature: 72,
    humidity: 50,
    pressure: 1013,
    windSpeed: 10,
    windDirection: 0,
    windGust: 15,
    altitude: 0,
    locationName: 'Default',
    latitude: 0,
    longitude: 0,
    observationTime: new Date().toISOString(),
    isManualOverride: true,
  };
}

export function WeatherProvider({ children }: { children: React.ReactNode }) {
  const { preferences } = useUserPreferences();
  const [weather, setWeather] = React.useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isOffline, setIsOffline] = React.useState(false);
  const lastLocationRef = React.useRef<{ lat: number; lng: number } | null>(null);

  // Build settings from user preferences
  const weatherSettings: WeatherSettings = React.useMemo(() => ({
    ...DEFAULT_WEATHER_SETTINGS,
    enableMultiProvider: preferences.weatherProvider?.enableMultiProvider ?? false,
    primaryProvider: preferences.weatherProvider?.primaryProvider ?? 'openmeteo',
    fallbackOrder: preferences.weatherProvider?.fallbackOrder ?? ['tomorrow', 'openmeteo'],
  }), [preferences.weatherProvider]);

  const loadWeather = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Check for manual override first
    try {
      const manualOverride = await AsyncStorage.getItem(MANUAL_OVERRIDE_KEY);
      if (manualOverride) {
        const parsed = JSON.parse(manualOverride);
        if (parsed.isManualOverride) {
          setWeather(parsed);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Continue with auto fetch
    }

    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        // Try to get cached weather
        const cached = await getOrchCachedWeather();
        if (cached) {
          setWeather(toWeatherData(cached));
          setIsOffline(true);
        } else {
          setWeather(getDefaultWeather());
          setError('Location permission required for weather');
        }
        setIsLoading(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Check if location changed significantly (>5km) to avoid unnecessary fetches
      const lastLoc = lastLocationRef.current;
      if (lastLoc && weather && !weather.isManualOverride) {
        const distance = getDistanceKm(
          lastLoc.lat,
          lastLoc.lng,
          location.coords.latitude,
          location.coords.longitude
        );
        
        // If location hasn't changed much and weather is recent, skip fetch
        if (distance < 5) {
          const age = Date.now() - new Date(weather.observationTime).getTime();
          if (age < 5 * 60 * 1000) { // 5 minutes
            setIsLoading(false);
            return;
          }
        }
      }

      // Update location tracking
      lastLocationRef.current = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      // Fetch weather using orchestrator
      const weatherData = await fetchWeatherOrchestrated(
        location.coords.latitude,
        location.coords.longitude,
        weatherSettings.enableMultiProvider,
        weatherSettings
      );

      setWeather(toWeatherData(weatherData));
      setIsOffline(false);
      setError(null);
    } catch (err) {
      console.error('Weather fetch error:', err);

      // Try to get cached weather
      const cached = await getOrchCachedWeather();
      if (cached) {
        setWeather(toWeatherData(cached));
        setIsOffline(true);
        setError('Using cached weather data');
      } else {
        setWeather(getDefaultWeather());

        // Provide more specific error message
        if (err instanceof WeatherError) {
          setError(err.message);
        } else {
          setError('Unable to fetch weather');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [weather, weatherSettings]);

  React.useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  const refreshWeather = React.useCallback(async () => {
    await AsyncStorage.removeItem(MANUAL_OVERRIDE_KEY);
    await loadWeather();
  }, [loadWeather]);

  const updateManualWeather = React.useCallback(async (updates: Partial<WeatherData>) => {
    const newWeather: WeatherData = {
      ...(weather || getDefaultWeather()),
      ...updates,
      isManualOverride: true,
      observationTime: new Date().toISOString(),
    };
    setWeather(newWeather);
    await AsyncStorage.setItem(MANUAL_OVERRIDE_KEY, JSON.stringify(newWeather));
  }, [weather]);

  const value = React.useMemo(() => ({
    weather,
    isLoading,
    error,
    isOffline,
    refreshWeather,
    updateManualWeather,
  }), [weather, isLoading, error, isOffline, refreshWeather, updateManualWeather]);

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  const context = React.useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within WeatherProvider');
  }
  return context;
}
