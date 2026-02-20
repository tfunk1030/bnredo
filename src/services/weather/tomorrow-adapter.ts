/**
 * Tomorrow.io Weather Adapter
 * Premium hyperlocal weather data
 *
 * API Docs: https://docs.tomorrow.io/reference/realtime-weather
 * Returns station pressure (pressureSurfaceLevel) - no conversion needed
 */

import { NormalizedWeather, WeatherError } from './types';
import { fetchWithTimeout, withRetry, DEFAULT_RETRY_CONFIG } from './retry-strategy';

// Tomorrow.io API response shape
interface TomorrowApiResponse {
  data: {
    time: string;
    values: {
      temperature: number;           // °F (imperial)
      humidity: number;              // %
      pressureSurfaceLevel: number;  // hPa (station pressure)
      pressureSeaLevel: number;      // hPa (MSL - not used)
      windSpeed: number;             // mph (imperial)
      windDirection: number;         // degrees
      windGust: number;              // mph (imperial)
    };
  };
  location: {
    lat: number;
    lon: number;
  };
}

const API_BASE = 'https://api.tomorrow.io/v4/weather/realtime';
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Get API key from environment
 * Expo SDK 49+ automatically loads EXPO_PUBLIC_* from .env
 */
const FALLBACK_TOMORROW_API_KEY = 'jG9onLuVeiR4NWlVIO85EWWLCtQ2Uzqv';

function getApiKey(): string {
  return process.env.EXPO_PUBLIC_TOMORROW_IO_API_KEY || FALLBACK_TOMORROW_API_KEY;
}

/**
 * Reverse geocode to get location name
 */
async function getLocationName(
  lat: number,
  lon: number
): Promise<string> {
  try {
    // Use Open-Meteo's free geocoding as fallback
    const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const place = data.results[0];
        return place.admin1
          ? `${place.name}, ${place.admin1}`
          : place.name;
      }
    }
  } catch {
    // Ignore geocoding errors
  }
  return 'Current Location';
}

/**
 * Fetch weather from Tomorrow.io
 */
export async function fetchTomorrowWeather(
  latitude: number,
  longitude: number,
  elevation: number,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<NormalizedWeather | null> {
  const apiKey = getApiKey();

  const url = `${API_BASE}?location=${latitude},${longitude}&apikey=${apiKey}&units=imperial`;

  const fetchFn = async (): Promise<NormalizedWeather> => {
    const response = await fetchWithTimeout(url, {}, timeoutMs);

    if (!response.ok) {
      throw WeatherError.fromHttpStatus(
        response.status,
        `Tomorrow.io API error: ${response.statusText}`,
        'tomorrow'
      );
    }

    const data: TomorrowApiResponse = await response.json();

    if (!data.data?.values) {
      throw new WeatherError(
        'INVALID_RESPONSE',
        'Tomorrow.io returned invalid data structure',
        'tomorrow',
        undefined,
        false
      );
    }

    const values = data.data.values;

    // Get location name asynchronously (don't block on this)
    const locationName = await getLocationName(latitude, longitude);

    return {
      temperature: Math.round(values.temperature),
      humidity: Math.round(values.humidity),
      pressure: Math.round(values.pressureSurfaceLevel),
      windSpeed: Math.round(values.windSpeed),
      windDirection: Math.round(values.windDirection),
      windGust: Math.round(values.windGust),
      altitude: Math.round(elevation),
      locationName,
      latitude,
      longitude,
      observationTime: data.data.time,
      source: 'tomorrow',
      isManualOverride: false,
    };
  };

  try {
    return await withRetry(fetchFn, {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: 2, // Fewer retries for paid API
    });
  } catch (error) {
    if (error instanceof WeatherError) {
      throw error;
    }
    throw new WeatherError(
      'NETWORK_ERROR',
      `Tomorrow.io fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'tomorrow',
      undefined,
      true
    );
  }
}

/**
 * Check if Tomorrow.io is configured
 */
export function isTomorrowConfigured(): boolean {
  return true; // Always available via fallback key
}
