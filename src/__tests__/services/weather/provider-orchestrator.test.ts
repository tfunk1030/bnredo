/**
 * Provider Orchestrator Tests
 *
 * Tests the full weather fetching pipeline:
 * - Cache-first strategy
 * - Provider fallback chain
 * - Circuit breaker integration
 * - Error handling
 * - Simple/multi-provider modes
 */

import {
  NormalizedWeather,
  WeatherSettings,
  WeatherError,
  CachedWeather,
} from '@/src/services/weather/types';

// Mock all dependencies before importing the module under test
jest.mock('@/src/services/weather/circuit-breaker');
jest.mock('@/src/services/weather/cache-manager');
jest.mock('@/src/services/weather/tomorrow-adapter');
jest.mock('@/src/services/weather/openmeteo-adapter');

import {
  fetchWeatherWithFallback,
  fetchWeather,
  getProviderStatus,
} from '@/src/services/weather/provider-orchestrator';
import {
  canRequest,
  recordSuccess,
  recordFailure,
  getCircuitState,
} from '@/src/services/weather/circuit-breaker';
import {
  getCachedWeather,
  cacheWeather,
  shouldUseCache,
} from '@/src/services/weather/cache-manager';
import {
  fetchTomorrowWeather,
  isTomorrowConfigured,
} from '@/src/services/weather/tomorrow-adapter';
import {
  fetchOpenMeteoWeather,
  getElevation,
} from '@/src/services/weather/openmeteo-adapter';

// Typed mocks
const mockCanRequest = canRequest as jest.MockedFunction<typeof canRequest>;
const mockRecordSuccess = recordSuccess as jest.MockedFunction<typeof recordSuccess>;
const mockRecordFailure = recordFailure as jest.MockedFunction<typeof recordFailure>;
const mockGetCircuitState = getCircuitState as jest.MockedFunction<typeof getCircuitState>;
const mockGetCachedWeather = getCachedWeather as jest.MockedFunction<typeof getCachedWeather>;
const mockCacheWeather = cacheWeather as jest.MockedFunction<typeof cacheWeather>;
const mockShouldUseCache = shouldUseCache as jest.MockedFunction<typeof shouldUseCache>;
const mockFetchTomorrow = fetchTomorrowWeather as jest.MockedFunction<typeof fetchTomorrowWeather>;
const mockIsTomorrowConfigured = isTomorrowConfigured as jest.MockedFunction<typeof isTomorrowConfigured>;
const mockFetchOpenMeteo = fetchOpenMeteoWeather as jest.MockedFunction<typeof fetchOpenMeteoWeather>;
const mockGetElevation = getElevation as jest.MockedFunction<typeof getElevation>;

// Test fixtures
const LAT = 30.2672;
const LNG = -97.7431;

function makeWeather(overrides: Partial<NormalizedWeather> = {}): NormalizedWeather {
  return {
    temperature: 72,
    humidity: 55,
    pressure: 1013.25,
    windSpeed: 8,
    windDirection: 180,
    windGust: 12,
    altitude: 500,
    locationName: 'Austin, TX',
    latitude: LAT,
    longitude: LNG,
    observationTime: new Date().toISOString(),
    source: 'openmeteo',
    isManualOverride: false,
    ...overrides,
  };
}

function makeCached(
  freshness: 'fresh' | 'stale' | 'emergency' | 'expired' = 'fresh',
  ageMinutes: number = 2,
  overrides: Partial<CachedWeather> = {}
): CachedWeather {
  return {
    ...makeWeather(),
    cachedAt: new Date(Date.now() - ageMinutes * 60000).toISOString(),
    freshness,
    ...overrides,
  };
}

const defaultSettings: WeatherSettings = {
  enableMultiProvider: true,
  primaryProvider: 'openmeteo',
  fallbackOrder: ['tomorrow', 'openmeteo'],
  timeout: 10000,
};

beforeEach(() => {
  jest.clearAllMocks();

  // Default: all circuits closed, no cache, Tomorrow configured, elevation 500ft
  mockCanRequest.mockReturnValue(true);
  mockGetCachedWeather.mockResolvedValue(null);
  mockCacheWeather.mockResolvedValue(undefined);
  mockShouldUseCache.mockReturnValue(false);
  mockIsTomorrowConfigured.mockReturnValue(true);
  mockGetElevation.mockResolvedValue(500);
  mockGetCircuitState.mockReturnValue('closed');
});

describe('fetchWeatherWithFallback', () => {
  describe('cache-first strategy', () => {
    it('should return fresh cache immediately without hitting providers', async () => {
      const cached = makeCached('fresh', 2);
      mockGetCachedWeather.mockResolvedValue(cached);

      const result = await fetchWeatherWithFallback(LAT, LNG, defaultSettings);

      expect(result.fromCache).toBe(true);
      expect(result.weather).toBe(cached);
      expect(result.warnings).toHaveLength(0);
      expect(result.providersAttempted).toHaveLength(0);
      expect(result.cacheAge).toBeDefined();
      // Should NOT have called any provider
      expect(mockFetchOpenMeteo).not.toHaveBeenCalled();
      expect(mockFetchTomorrow).not.toHaveBeenCalled();
    });

    it('should NOT return stale cache immediately — fetches from providers', async () => {
      const cached = makeCached('stale', 10);
      mockGetCachedWeather.mockResolvedValue(cached);

      const freshWeather = makeWeather();
      mockFetchOpenMeteo.mockResolvedValue(freshWeather);

      const result = await fetchWeatherWithFallback(LAT, LNG, defaultSettings);

      expect(result.fromCache).toBe(false);
      expect(result.weather).toBe(freshWeather);
    });
  });

  describe('provider chain', () => {
    it('should try primary provider first and succeed', async () => {
      const weather = makeWeather({ source: 'openmeteo' });
      mockFetchOpenMeteo.mockResolvedValue(weather);

      const result = await fetchWeatherWithFallback(LAT, LNG, defaultSettings);

      expect(result.fromCache).toBe(false);
      expect(result.weather).toBe(weather);
      expect(result.providersAttempted).toContain('openmeteo');
      expect(mockRecordSuccess).toHaveBeenCalledWith('openmeteo');
      expect(mockCacheWeather).toHaveBeenCalledWith(weather);
    });

    it('should fall back to tomorrow when openmeteo fails', async () => {
      mockFetchOpenMeteo.mockResolvedValue(null); // Primary fails (null = no data)
      const tomorrowWeather = makeWeather({ source: 'tomorrow' });
      mockFetchTomorrow.mockResolvedValue(tomorrowWeather);

      const result = await fetchWeatherWithFallback(LAT, LNG, defaultSettings);

      expect(result.weather).toBe(tomorrowWeather);
      expect(result.providersAttempted).toContain('openmeteo');
      expect(result.providersAttempted).toContain('tomorrow');
      expect(mockRecordFailure).toHaveBeenCalledWith('openmeteo');
      expect(mockRecordSuccess).toHaveBeenCalledWith('tomorrow');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should fall back to tomorrow when openmeteo throws', async () => {
      mockFetchOpenMeteo.mockRejectedValue(new Error('network down'));
      const tomorrowWeather = makeWeather({ source: 'tomorrow' });
      mockFetchTomorrow.mockResolvedValue(tomorrowWeather);

      const result = await fetchWeatherWithFallback(LAT, LNG, defaultSettings);

      expect(result.weather).toBe(tomorrowWeather);
      expect(mockRecordFailure).toHaveBeenCalledWith('openmeteo');
      expect(mockRecordSuccess).toHaveBeenCalledWith('tomorrow');
    });

    it('should skip providers with open circuits', async () => {
      // Primary circuit is open
      mockCanRequest.mockImplementation((p) => p !== 'openmeteo');
      const tomorrowWeather = makeWeather({ source: 'tomorrow' });
      mockFetchTomorrow.mockResolvedValue(tomorrowWeather);

      const result = await fetchWeatherWithFallback(LAT, LNG, defaultSettings);

      expect(result.weather).toBe(tomorrowWeather);
      expect(result.providersAttempted).not.toContain('openmeteo');
      expect(result.providersAttempted).toContain('tomorrow');
    });

    it('should use cached elevation when available', async () => {
      const cached = makeCached('stale', 10, { altitude: 750 });
      mockGetCachedWeather.mockResolvedValue(cached);
      const weather = makeWeather();
      mockFetchOpenMeteo.mockResolvedValue(weather);

      await fetchWeatherWithFallback(LAT, LNG, defaultSettings);

      // getElevation should still be called since altitude from cache (750) is non-zero,
      // but the code uses cached.altitude when available. Let's verify
      // In the source: elevation = cached?.altitude ?? 0, if 0 then getElevation
      // Since cached.altitude = 750, getElevation should NOT be called
      expect(mockGetElevation).not.toHaveBeenCalled();
    });

    it('should fetch elevation when not in cache', async () => {
      // No cache
      mockGetCachedWeather.mockResolvedValue(null);
      const weather = makeWeather();
      mockFetchOpenMeteo.mockResolvedValue(weather);

      await fetchWeatherWithFallback(LAT, LNG, defaultSettings);

      expect(mockGetElevation).toHaveBeenCalledWith(LAT, LNG);
    });
  });

  describe('all providers fail', () => {
    it('should return stale cache when all providers fail', async () => {
      const cached = makeCached('stale', 15);
      mockGetCachedWeather.mockResolvedValue(cached);
      mockShouldUseCache.mockReturnValue(true);

      // Both providers fail
      mockFetchOpenMeteo.mockResolvedValue(null);
      mockFetchTomorrow.mockResolvedValue(null);

      const result = await fetchWeatherWithFallback(LAT, LNG, defaultSettings);

      expect(result.fromCache).toBe(true);
      expect(result.weather).toBe(cached);
      expect(result.warnings.some(w => w.includes('failed'))).toBe(true);
    });

    it('should return emergency cache when all providers fail', async () => {
      const cached = makeCached('emergency', 90);
      mockGetCachedWeather.mockResolvedValue(cached);
      mockShouldUseCache.mockReturnValue(true);

      mockFetchOpenMeteo.mockRejectedValue(new Error('down'));
      mockFetchTomorrow.mockRejectedValue(new Error('down'));

      const result = await fetchWeatherWithFallback(LAT, LNG, defaultSettings);

      expect(result.fromCache).toBe(true);
    });

    it('should throw when all providers fail and no usable cache', async () => {
      mockGetCachedWeather.mockResolvedValue(null);
      mockFetchOpenMeteo.mockResolvedValue(null);
      mockFetchTomorrow.mockResolvedValue(null);

      await expect(
        fetchWeatherWithFallback(LAT, LNG, defaultSettings)
      ).rejects.toThrow(WeatherError);
    });

    it('should throw when all providers fail and cache is expired', async () => {
      const cached = makeCached('expired', 180);
      mockGetCachedWeather.mockResolvedValue(cached);
      mockShouldUseCache.mockReturnValue(false); // expired → don't use

      mockFetchOpenMeteo.mockResolvedValue(null);
      mockFetchTomorrow.mockResolvedValue(null);

      await expect(
        fetchWeatherWithFallback(LAT, LNG, defaultSettings)
      ).rejects.toThrow('All providers failed');
    });
  });

  describe('all circuits open', () => {
    it('should return stale cache when all circuits open', async () => {
      mockCanRequest.mockReturnValue(false);
      const cached = makeCached('stale', 20);
      mockGetCachedWeather.mockResolvedValue(cached);
      mockShouldUseCache.mockReturnValue(true);

      const result = await fetchWeatherWithFallback(LAT, LNG, defaultSettings);

      expect(result.fromCache).toBe(true);
      expect(result.warnings.some(w => w.includes('unavailable'))).toBe(true);
      expect(result.providersAttempted).toHaveLength(0);
    });

    it('should throw when all circuits open and no usable cache', async () => {
      mockCanRequest.mockReturnValue(false);
      mockGetCachedWeather.mockResolvedValue(null);

      await expect(
        fetchWeatherWithFallback(LAT, LNG, defaultSettings)
      ).rejects.toThrow('All weather providers failed');
    });
  });

  describe('tomorrow not configured', () => {
    it('should handle unconfigured tomorrow gracefully in fallback chain', async () => {
      mockIsTomorrowConfigured.mockReturnValue(false);
      // Primary (openmeteo) fails
      mockFetchOpenMeteo.mockResolvedValue(null);
      // Tomorrow will throw API_ERROR due to unconfigured
      mockFetchTomorrow.mockRejectedValue(
        new WeatherError('API_ERROR', 'Tomorrow.io API key not configured', 'tomorrow', undefined, false)
      );

      // No cache
      await expect(
        fetchWeatherWithFallback(LAT, LNG, defaultSettings)
      ).rejects.toThrow(WeatherError);
    });
  });

  describe('WeatherError wrapping', () => {
    it('should wrap non-WeatherError exceptions into WeatherError', async () => {
      // Throws a plain TypeError (not WeatherError)
      mockFetchOpenMeteo.mockRejectedValue(new TypeError('Cannot read property'));
      const tomorrowWeather = makeWeather({ source: 'tomorrow' });
      mockFetchTomorrow.mockResolvedValue(tomorrowWeather);

      const result = await fetchWeatherWithFallback(LAT, LNG, defaultSettings);

      // Should still succeed via fallback
      expect(result.weather).toBe(tomorrowWeather);
      // Failure should have been recorded for openmeteo
      expect(mockRecordFailure).toHaveBeenCalledWith('openmeteo');
      // Warning should contain the original error message
      expect(result.warnings.some(w => w.includes('Cannot read property'))).toBe(true);
    });
  });
});

describe('fetchWeather', () => {
  describe('simple mode (useMultiProvider = false)', () => {
    it('should fetch directly from openmeteo', async () => {
      const weather = makeWeather();
      mockFetchOpenMeteo.mockResolvedValue(weather);

      const result = await fetchWeather(LAT, LNG, false);

      expect(result).toBe(weather);
      expect(mockFetchOpenMeteo).toHaveBeenCalledWith(LAT, LNG);
      expect(mockCacheWeather).toHaveBeenCalledWith(weather);
      // Should NOT touch circuit breaker
      expect(mockCanRequest).not.toHaveBeenCalled();
    });

    it('should throw WeatherError when openmeteo returns null', async () => {
      mockFetchOpenMeteo.mockResolvedValue(null);

      await expect(fetchWeather(LAT, LNG, false)).rejects.toThrow(WeatherError);
      await expect(fetchWeather(LAT, LNG, false)).rejects.toThrow('Failed to fetch weather');
    });

    it('should default to simple mode when useMultiProvider not specified', async () => {
      const weather = makeWeather();
      mockFetchOpenMeteo.mockResolvedValue(weather);

      const result = await fetchWeather(LAT, LNG);

      expect(result).toBe(weather);
      expect(mockCanRequest).not.toHaveBeenCalled();
    });
  });

  describe('multi-provider mode', () => {
    it('should use orchestrator when useMultiProvider is true', async () => {
      const weather = makeWeather();
      mockFetchOpenMeteo.mockResolvedValue(weather);

      const result = await fetchWeather(LAT, LNG, true, defaultSettings);

      expect(result).toEqual(weather);
      // In multi-provider mode, circuit breaker should be used
      expect(mockCanRequest).toHaveBeenCalled();
    });

    it('should log warnings when providers report issues', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Primary fails, fallback succeeds
      mockFetchOpenMeteo.mockResolvedValue(null);
      const tomorrowWeather = makeWeather({ source: 'tomorrow' });
      mockFetchTomorrow.mockResolvedValue(tomorrowWeather);

      await fetchWeather(LAT, LNG, true, defaultSettings);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not log when no warnings', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Fresh cache → no warnings
      const cached = makeCached('fresh', 1);
      mockGetCachedWeather.mockResolvedValue(cached);

      await fetchWeather(LAT, LNG, true, defaultSettings);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

describe('getProviderStatus', () => {
  it('should return status for both providers', () => {
    mockGetCircuitState.mockReturnValue('closed');
    mockIsTomorrowConfigured.mockReturnValue(true);

    const status = getProviderStatus();

    expect(status.tomorrow).toEqual({ state: 'closed', configured: true });
    expect(status.openmeteo).toEqual({ state: 'closed', configured: true });
  });

  it('should reflect open circuits', () => {
    mockGetCircuitState.mockImplementation((p) =>
      p === 'tomorrow' ? 'open' : 'closed'
    );
    mockIsTomorrowConfigured.mockReturnValue(true);

    const status = getProviderStatus();

    expect(status.tomorrow.state).toBe('open');
    expect(status.openmeteo.state).toBe('closed');
  });

  it('should show tomorrow as unconfigured when API key missing', () => {
    mockGetCircuitState.mockReturnValue('closed');
    mockIsTomorrowConfigured.mockReturnValue(false);

    const status = getProviderStatus();

    expect(status.tomorrow.configured).toBe(false);
    expect(status.openmeteo.configured).toBe(true);
  });
});
