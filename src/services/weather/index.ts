/**
 * Weather Service Module
 * Multi-provider weather data with fallback and caching
 */

// Types
export {
  NormalizedWeather,
  WeatherProvider,
  WeatherSettings,
  DEFAULT_WEATHER_SETTINGS,
  WeatherError,
  CacheFreshness,
  CachedWeather,
} from './types';

// Cache management
export {
  cacheWeather,
  getCachedWeather,
  clearWeatherCache,
  calculateFreshness,
  getFreshnessMessage,
  getCacheAgeMinutes,
} from './cache-manager';

// Provider orchestration
export {
  fetchWeather,
  fetchWeatherWithFallback,
  getProviderStatus,
} from './provider-orchestrator';

// Individual adapters (for direct access if needed)
export { fetchOpenMeteoWeather, getElevation } from './openmeteo-adapter';
export { fetchTomorrowWeather, isTomorrowConfigured } from './tomorrow-adapter';

// Circuit breaker (for status/debugging)
export {
  getCircuitState,
  resetCircuit,
  resetAllCircuits,
} from './circuit-breaker';

// Retry utilities
export { withRetry, fetchWithTimeout } from './retry-strategy';

// Utility functions
export { getWindDirectionLabel, getDistanceKm } from './utils';
