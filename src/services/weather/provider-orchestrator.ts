/**
 * Weather Provider Orchestrator
 * Coordinates multiple weather providers with fallback and circuit breakers
 *
 * Flow:
 * 1. Check cache first (if fresh, return immediately)
 * 2. Try primary provider (if circuit closed)
 * 3. Try fallback providers in order
 * 4. If all fail, return stale cache with warning
 * 5. If no cache, throw error
 */

import {
  NormalizedWeather,
  WeatherProvider,
  WeatherSettings,
  DEFAULT_WEATHER_SETTINGS,
  WeatherError,
  ProviderResult,
} from './types';
import {
  canRequest,
  recordSuccess,
  recordFailure,
  getCircuitState,
} from './circuit-breaker';
import {
  getCachedWeather,
  cacheWeather,
  shouldUseCache,
} from './cache-manager';
import { fetchTomorrowWeather, isTomorrowConfigured } from './tomorrow-adapter';
import { fetchOpenMeteoWeather, getElevation } from './openmeteo-adapter';

interface OrchestratorResult {
  weather: NormalizedWeather;
  fromCache: boolean;
  cacheAge?: number;  // minutes
  warnings: string[];
  providersAttempted: WeatherProvider[];
}

/**
 * Fetch from a specific provider
 */
async function fetchFromProvider(
  provider: WeatherProvider,
  latitude: number,
  longitude: number,
  elevation: number,
  timeout: number
): Promise<ProviderResult> {
  const startTime = Date.now();

  try {
    let data: NormalizedWeather | null = null;

    switch (provider) {
      case 'tomorrow':
        if (!isTomorrowConfigured()) {
          throw new WeatherError(
            'API_ERROR',
            'Tomorrow.io API key not configured',
            'tomorrow',
            undefined,
            false
          );
        }
        data = await fetchTomorrowWeather(latitude, longitude, elevation, timeout);
        break;

      case 'openmeteo':
        data = await fetchOpenMeteoWeather(latitude, longitude, timeout);
        break;
    }

    if (!data) {
      throw new WeatherError(
        'INVALID_RESPONSE',
        `${provider} returned no data`,
        provider,
        undefined,
        false
      );
    }

    return {
      success: true,
      data,
      provider,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof WeatherError
        ? error
        : new WeatherError(
            'NETWORK_ERROR',
            error instanceof Error ? error.message : 'Unknown error',
            provider,
            undefined,
            true
          ),
      provider,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Get list of providers to try, respecting circuit breaker state
 */
function getProvidersToTry(settings: WeatherSettings): WeatherProvider[] {
  const providers: WeatherProvider[] = [];

  // Primary first
  if (canRequest(settings.primaryProvider)) {
    providers.push(settings.primaryProvider);
  }

  // Then fallbacks
  for (const provider of settings.fallbackOrder) {
    if (provider !== settings.primaryProvider && canRequest(provider)) {
      providers.push(provider);
    }
  }

  return providers;
}

/**
 * Fetch weather with provider fallback and caching
 */
export async function fetchWeatherWithFallback(
  latitude: number,
  longitude: number,
  settings: WeatherSettings = DEFAULT_WEATHER_SETTINGS
): Promise<OrchestratorResult> {
  const warnings: string[] = [];
  const providersAttempted: WeatherProvider[] = [];

  // Step 1: Check cache first
  const cached = await getCachedWeather(latitude, longitude);

  if (cached && cached.freshness === 'fresh') {
    // Fresh cache - return immediately
    return {
      weather: cached,
      fromCache: true,
      cacheAge: Math.floor((Date.now() - new Date(cached.cachedAt).getTime()) / 60000),
      warnings: [],
      providersAttempted: [],
    };
  }

  // Step 2: Get elevation (needed for Tomorrow.io)
  // Use cached elevation if available, otherwise fetch from Open-Meteo
  let elevation = cached?.altitude ?? 0;
  if (elevation === 0) {
    elevation = await getElevation(latitude, longitude);
  }

  // Step 3: Get providers to try (respecting circuit breakers)
  const providers = getProvidersToTry(settings);

  if (providers.length === 0) {
    // All circuits open
    warnings.push('All weather providers are temporarily unavailable');

    if (cached && shouldUseCache(cached.freshness)) {
      warnings.push(`Using ${cached.freshness} cached data`);
      return {
        weather: cached,
        fromCache: true,
        cacheAge: Math.floor((Date.now() - new Date(cached.cachedAt).getTime()) / 60000),
        warnings,
        providersAttempted: [],
      };
    }

    throw new WeatherError(
      'ALL_PROVIDERS_FAILED',
      'All weather providers failed and no cached data available',
      undefined,
      undefined,
      false
    );
  }

  // Step 4: Try providers in order
  for (const provider of providers) {
    providersAttempted.push(provider);

    const result = await fetchFromProvider(
      provider,
      latitude,
      longitude,
      elevation,
      settings.timeout
    );

    if (result.success && result.data) {
      // Success! Update circuit breaker and cache
      recordSuccess(provider);
      await cacheWeather(result.data);

      return {
        weather: result.data,
        fromCache: false,
        warnings,
        providersAttempted,
      };
    } else {
      // Failure - update circuit breaker
      recordFailure(provider);
      warnings.push(`${provider}: ${result.error?.message ?? 'Unknown error'}`);
    }
  }

  // Step 5: All providers failed - try cache
  if (cached && shouldUseCache(cached.freshness)) {
    warnings.push(`All providers failed, using ${cached.freshness} cached data`);
    return {
      weather: cached,
      fromCache: true,
      cacheAge: Math.floor((Date.now() - new Date(cached.cachedAt).getTime()) / 60000),
      warnings,
      providersAttempted,
    };
  }

  // No cache - throw error
  throw new WeatherError(
    'ALL_PROVIDERS_FAILED',
    `All providers failed: ${warnings.join('; ')}`,
    undefined,
    undefined,
    false
  );
}

/**
 * Simple fetch that uses orchestrator when enabled, or direct Open-Meteo
 * This is the main entry point for the WeatherContext
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
  useMultiProvider: boolean = false,
  settings: WeatherSettings = DEFAULT_WEATHER_SETTINGS
): Promise<NormalizedWeather> {
  if (!useMultiProvider) {
    // Use direct Open-Meteo (original behavior)
    const weather = await fetchOpenMeteoWeather(latitude, longitude);
    if (!weather) {
      throw new WeatherError(
        'NETWORK_ERROR',
        'Failed to fetch weather from Open-Meteo',
        'openmeteo',
        undefined,
        true
      );
    }
    await cacheWeather(weather);
    return weather;
  }

  // Use orchestrator with fallback
  const result = await fetchWeatherWithFallback(latitude, longitude, settings);

  // Log warnings for debugging
  if (result.warnings.length > 0) {
    console.warn('Weather fetch warnings:', result.warnings);
  }

  return result.weather;
}

/**
 * Get status of all provider circuits (for debugging/settings UI)
 */
export function getProviderStatus(): Record<WeatherProvider, {
  state: string;
  configured: boolean;
}> {
  return {
    tomorrow: {
      state: getCircuitState('tomorrow'),
      configured: isTomorrowConfigured(),
    },
    openmeteo: {
      state: getCircuitState('openmeteo'),
      configured: true, // Always available
    },
  };
}
