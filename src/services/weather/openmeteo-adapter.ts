/**
 * Open-Meteo Weather Adapter
 * Free weather API with global coverage
 *
 * API Docs: https://open-meteo.com/en/docs
 * Returns station pressure (surface_pressure) - no conversion needed
 * Returns elevation - useful for other providers that don't include it
 */

import { NormalizedWeather, WeatherError } from './types';
import { fetchWithTimeout, withRetry, DEFAULT_RETRY_CONFIG } from './retry-strategy';

// Open-Meteo API response shape
interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  elevation: number;
}

interface GeocodingResponse {
  results?: Array<{
    name: string;
    admin1?: string;
    country?: string;
  }>;
}

const WEATHER_API_BASE = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_API_BASE = 'https://geocoding-api.open-meteo.com/v1/reverse';
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Reverse geocode to get location name
 */
async function getLocationName(lat: number, lon: number): Promise<string> {
  try {
    const url = `${GEOCODING_API_BASE}?latitude=${lat}&longitude=${lon}&count=1`;
    const response = await fetch(url);
    if (response.ok) {
      const data: GeocodingResponse = await response.json();
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
 * Fetch weather from Open-Meteo
 */
export async function fetchOpenMeteoWeather(
  latitude: number,
  longitude: number,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<NormalizedWeather | null> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: 'temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    wind_speed_unit: 'mph',
    temperature_unit: 'fahrenheit',
  });

  const url = `${WEATHER_API_BASE}?${params}`;

  const fetchFn = async (): Promise<NormalizedWeather> => {
    const response = await fetchWithTimeout(url, {}, timeoutMs);

    if (!response.ok) {
      throw WeatherError.fromHttpStatus(
        response.status,
        `Open-Meteo API error: ${response.statusText}`,
        'openmeteo'
      );
    }

    const data: OpenMeteoResponse = await response.json();

    if (!data.current) {
      throw new WeatherError(
        'INVALID_RESPONSE',
        'Open-Meteo returned invalid data structure',
        'openmeteo',
        undefined,
        false
      );
    }

    const current = data.current;

    // Get location name (don't block on this)
    const locationName = await getLocationName(latitude, longitude);

    // Convert elevation from meters to feet
    const altitudeFeet = Math.round(data.elevation * 3.28084);

    return {
      temperature: Math.round(current.temperature_2m),
      humidity: Math.round(current.relative_humidity_2m),
      pressure: Math.round(current.surface_pressure),
      windSpeed: Math.round(current.wind_speed_10m),
      windDirection: Math.round(current.wind_direction_10m),
      windGust: Math.round(current.wind_gusts_10m),
      altitude: altitudeFeet,
      locationName,
      latitude,
      longitude,
      observationTime: current.time || new Date().toISOString(),
      source: 'openmeteo',
      isManualOverride: false,
    };
  };

  try {
    return await withRetry(fetchFn, DEFAULT_RETRY_CONFIG);
  } catch (error) {
    if (error instanceof WeatherError) {
      throw error;
    }
    throw new WeatherError(
      'NETWORK_ERROR',
      `Open-Meteo fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'openmeteo',
      undefined,
      true
    );
  }
}

/**
 * Get elevation from Open-Meteo (useful for other providers)
 * This is a lightweight call that just returns elevation for coordinates
 */
export async function getElevation(
  latitude: number,
  longitude: number
): Promise<number> {
  try {
    const url = `${WEATHER_API_BASE}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m`;
    const response = await fetchWithTimeout(url, {}, 5000);

    if (response.ok) {
      const data: OpenMeteoResponse = await response.json();
      return Math.round(data.elevation * 3.28084); // Convert to feet
    }
  } catch {
    // Ignore errors, return 0 as default
  }
  return 0;
}

/**
 * Open-Meteo is always available (no API key required)
 */
export function isOpenMeteoConfigured(): boolean {
  return true;
}
