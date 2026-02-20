/**
 * Provider Orchestrator Tests
 *
 * Tests the full orchestration layer: cache-first logic, provider fallback,
 * circuit breaker integration, elevation fetching, and error paths.
 *
 * MOCKING STRATEGY:
 * - circuit-breaker: mock canRequest, recordSuccess, recordFailure, getCircuitState
 * - cache-manager: mock getCachedWeather, cacheWeather, shouldUseCache
 * - tomorrow-adapter: mock fetchTomorrowWeather, isTomorrowConfigured
 * - openmeteo-adapter: mock fetchOpenMeteoWeather, getElevation
 */

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
import { WeatherError } from '@/src/services/weather/types';
import type { NormalizedWeather, WeatherSettings } from '@/src/services/weather/types';

// ─── Typed mocks ────────────────────────────────────────────────────────────
const mockCanRequest = canRequest as jest.Mock;
const mockRecordSuccess = recordSuccess as jest.Mock;
const mockRecordFailure = recordFailure as jest.Mock;
const mockGetCircuitState = getCircuitState as jest.Mock;
const mockGetCachedWeather = getCachedWeather as jest.Mock;
const mockCacheWeather = cacheWeather as jest.Mock;
const mockShouldUseCache = shouldUseCache as jest.Mock;
const mockFetchTomorrowWeather = fetchTomorrowWeather as jest.Mock;
const mockIsTomorrowConfigured = isTomorrowConfigured as jest.Mock;
const mockFetchOpenMeteoWeather = fetchOpenMeteoWeather as jest.Mock;
const mockGetElevation = getElevation as jest.Mock;

// ─── Test helpers ────────────────────────────────────────────────────────────
function makeWeather(overrides: Partial<NormalizedWeather> = {}): NormalizedWeather & { freshness?: string; cachedAt?: string } {
  return {
    temperature: 72,
    humidity: 50,
    pressure: 1013,
    windSpeed: 10,
    windDirection: 180,
    windGust: 15,
    altitude: 500,
    locationName: 'Austin, Texas',
    latitude: 30.27,
    longitude: -97.74,
    observationTime: '2026-02-20T12:00:00Z',
    source: 'openmeteo',
    isManualOverride: false,
    ...overrides,
  };
}

const SETTINGS_BOTH: WeatherSettings = {
  enableMultiProvider: true,
  primaryProvider: 'openmeteo',
  fallbackOrder: ['tomorrow', 'openmeteo'],
  timeout: 5000,
};

const SETTINGS_TOMORROW_PRIMARY: WeatherSettings = {
  enableMultiProvider: true,
  primaryProvider: 'tomorrow',
  fallbackOrder: ['openmeteo'],
  timeout: 5000,
};

// ─── Setup / Teardown ────────────────────────────────────────────────────────
beforeEach(() => {
  jest.resetAllMocks();

  // Sensible defaults: circuits open (can request), no cache, providers configured
  mockCanRequest.mockReturnValue(true);
  mockGetCircuitState.mockReturnValue('closed');
  mockIsTomorrowConfigured.mockReturnValue(true);
  mockGetCachedWeather.mockResolvedValue(null);
  mockShouldUseCache.mockReturnValue(false);
  mockCacheWeather.mockResolvedValue(undefined);
  mockGetElevation.mockResolvedValue(500);
  mockFetchOpenMeteoWeather.mockResolvedValue(makeWeather({ source: 'openmeteo' }));
  mockFetchTomorrowWeather.mockResolvedValue(makeWeather({ source: 'tomorrow' }));
});

// ═══════════════════════════════════════════════════════════════════════════
// fetchWeatherWithFallback — cache hit (fresh)
// ═══════════════════════════════════════════════════════════════════════════
describe('fetchWeatherWithFallback — cache: fresh', () => {
  test('returns cached weather immediately when fresh — no providers called', async () => {
    const cached = { ...makeWeather(), freshness: 'fresh', cachedAt: new Date().toISOString() };
    mockGetCachedWeather.mockResolvedValue(cached);

    const result = await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_BOTH);

    expect(result.fromCache).toBe(true);
    expect(result.weather).toBe(cached);
    expect(result.warnings).toEqual([]);
    expect(result.providersAttempted).toEqual([]);
    expect(mockFetchOpenMeteoWeather).not.toHaveBeenCalled();
    expect(mockFetchTomorrowWeather).not.toHaveBeenCalled();
    expect(mockGetElevation).not.toHaveBeenCalled();
  });

  test('fresh cache: cacheAge is rounded minutes since cachedAt', async () => {
    const cachedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min ago
    const cached = { ...makeWeather(), freshness: 'fresh', cachedAt };
    mockGetCachedWeather.mockResolvedValue(cached);

    const result = await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_BOTH);

    expect(result.cacheAge).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// fetchWeatherWithFallback — cache miss, primary succeeds
// ═══════════════════════════════════════════════════════════════════════════
describe('fetchWeatherWithFallback — primary provider succeeds', () => {
  test('calls primary provider (openmeteo) when no cache', async () => {
    const weather = makeWeather({ source: 'openmeteo' });
    mockFetchOpenMeteoWeather.mockResolvedValue(weather);

    const result = await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_BOTH);

    expect(result.fromCache).toBe(false);
    expect(result.weather).toBe(weather);
    expect(result.providersAttempted).toEqual(['openmeteo']);
    expect(mockRecordSuccess).toHaveBeenCalledWith('openmeteo');
    expect(mockCacheWeather).toHaveBeenCalledWith(weather);
  });

  test('calls primary provider (tomorrow) when configured as primary', async () => {
    const weather = makeWeather({ source: 'tomorrow' });
    mockFetchTomorrowWeather.mockResolvedValue(weather);

    const result = await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_TOMORROW_PRIMARY);

    expect(result.fromCache).toBe(false);
    expect(result.weather).toBe(weather);
    expect(result.providersAttempted).toEqual(['tomorrow']);
    expect(mockRecordSuccess).toHaveBeenCalledWith('tomorrow');
  });

  test('does NOT call fallback provider when primary succeeds', async () => {
    await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_TOMORROW_PRIMARY);

    // tomorrow succeeds → openmeteo never called
    expect(mockFetchOpenMeteoWeather).not.toHaveBeenCalled();
  });

  test('passes timeout from settings to provider', async () => {
    const settings: WeatherSettings = { ...SETTINGS_BOTH, timeout: 3000 };
    await fetchWeatherWithFallback(30.27, -97.74, settings);

    expect(mockFetchOpenMeteoWeather).toHaveBeenCalledWith(30.27, -97.74, 3000);
  });

  test('passes elevation to tomorrow provider', async () => {
    mockGetElevation.mockResolvedValue(1200);
    await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_TOMORROW_PRIMARY);

    expect(mockFetchTomorrowWeather).toHaveBeenCalledWith(30.27, -97.74, 1200, 5000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// fetchWeatherWithFallback — elevation
// ═══════════════════════════════════════════════════════════════════════════
describe('fetchWeatherWithFallback — elevation', () => {
  test('fetches elevation from open-meteo when no cached elevation', async () => {
    await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_TOMORROW_PRIMARY);

    expect(mockGetElevation).toHaveBeenCalledWith(30.27, -97.74);
  });

  test('uses cached altitude instead of fetching elevation when available', async () => {
    const stale = { ...makeWeather({ altitude: 9350 }), freshness: 'stale', cachedAt: new Date().toISOString() };
    mockGetCachedWeather.mockResolvedValue(stale);
    mockShouldUseCache.mockReturnValue(true);

    await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_TOMORROW_PRIMARY);

    expect(mockGetElevation).not.toHaveBeenCalled();
    expect(mockFetchTomorrowWeather).toHaveBeenCalledWith(30.27, -97.74, 9350, expect.any(Number));
  });

  test('fetches elevation when cached altitude is 0', async () => {
    const stale = { ...makeWeather({ altitude: 0 }), freshness: 'stale', cachedAt: new Date().toISOString() };
    mockGetCachedWeather.mockResolvedValue(stale);
    mockShouldUseCache.mockReturnValue(true);
    mockGetElevation.mockResolvedValue(500);

    await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_TOMORROW_PRIMARY);

    expect(mockGetElevation).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// fetchWeatherWithFallback — fallback logic
// ═══════════════════════════════════════════════════════════════════════════
describe('fetchWeatherWithFallback — fallback', () => {
  test('falls back to openmeteo when tomorrow fails', async () => {
    mockFetchTomorrowWeather.mockRejectedValue(new Error('tomorrow down'));
    const fallbackWeather = makeWeather({ source: 'openmeteo' });
    mockFetchOpenMeteoWeather.mockResolvedValue(fallbackWeather);

    const result = await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_TOMORROW_PRIMARY);

    expect(result.fromCache).toBe(false);
    expect(result.weather).toBe(fallbackWeather);
    expect(result.providersAttempted).toEqual(['tomorrow', 'openmeteo']);
    expect(mockRecordFailure).toHaveBeenCalledWith('tomorrow');
    expect(mockRecordSuccess).toHaveBeenCalledWith('openmeteo');
  });

  test('adds warning for each failed provider', async () => {
    mockFetchTomorrowWeather.mockRejectedValue(new Error('timeout'));
    mockFetchOpenMeteoWeather.mockResolvedValue(makeWeather());

    const result = await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_TOMORROW_PRIMARY);

    expect(result.warnings.some(w => w.includes('tomorrow'))).toBe(true);
  });

  test('does not duplicate primary in fallback loop', async () => {
    // Default settings: primary=openmeteo, fallbackOrder=['tomorrow','openmeteo']
    // openmeteo should only be tried once (as primary), not again as fallback
    mockFetchOpenMeteoWeather.mockResolvedValue(makeWeather());

    const result = await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_BOTH);

    expect(result.providersAttempted.filter(p => p === 'openmeteo').length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// fetchWeatherWithFallback — circuit breaker
// ═══════════════════════════════════════════════════════════════════════════
describe('fetchWeatherWithFallback — circuit breaker', () => {
  test('skips provider when circuit is open (canRequest=false)', async () => {
    // tomorrow circuit open → skip it, only try openmeteo
    mockCanRequest.mockImplementation((provider: string) => provider !== 'tomorrow');
    const weather = makeWeather({ source: 'openmeteo' });
    mockFetchOpenMeteoWeather.mockResolvedValue(weather);

    const result = await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_TOMORROW_PRIMARY);

    expect(mockFetchTomorrowWeather).not.toHaveBeenCalled();
    expect(result.providersAttempted).toEqual(['openmeteo']);
  });

  test('throws WeatherError(ALL_PROVIDERS_FAILED) when all circuits open and no cache', async () => {
    mockCanRequest.mockReturnValue(false);

    await expect(
      fetchWeatherWithFallback(30.27, -97.74, SETTINGS_BOTH)
    ).rejects.toMatchObject({
      code: 'ALL_PROVIDERS_FAILED',
    });
  });

  test('returns stale cache when all circuits open but stale cache exists', async () => {
    mockCanRequest.mockReturnValue(false);
    const stale = { ...makeWeather(), freshness: 'stale', cachedAt: new Date().toISOString() };
    mockGetCachedWeather.mockResolvedValue(stale);
    mockShouldUseCache.mockReturnValue(true);

    const result = await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_BOTH);

    expect(result.fromCache).toBe(true);
    expect(result.weather).toBe(stale);
    expect(result.warnings.some(w => w.includes('unavailable'))).toBe(true);
  });

  test('recordFailure called when provider throws', async () => {
    mockFetchTomorrowWeather.mockRejectedValue(new Error('oops'));

    await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_TOMORROW_PRIMARY);

    expect(mockRecordFailure).toHaveBeenCalledWith('tomorrow');
  });

  test('recordSuccess called when provider succeeds', async () => {
    await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_BOTH);

    expect(mockRecordSuccess).toHaveBeenCalledWith('openmeteo');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// fetchWeatherWithFallback — stale cache as last resort
// ═══════════════════════════════════════════════════════════════════════════
describe('fetchWeatherWithFallback — stale cache fallback', () => {
  test('uses stale cache when all providers fail and cache is available', async () => {
    mockFetchOpenMeteoWeather.mockRejectedValue(new Error('network error'));
    mockFetchTomorrowWeather.mockRejectedValue(new Error('timeout'));
    const stale = { ...makeWeather(), freshness: 'stale', cachedAt: new Date().toISOString() };
    mockGetCachedWeather.mockResolvedValue(stale);
    mockShouldUseCache.mockReturnValue(true);

    const result = await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_BOTH);

    expect(result.fromCache).toBe(true);
    expect(result.weather).toBe(stale);
    expect(result.warnings.some(w => w.includes('stale'))).toBe(true);
  });

  test('throws ALL_PROVIDERS_FAILED when all providers fail and no usable cache', async () => {
    mockFetchOpenMeteoWeather.mockRejectedValue(new Error('down'));
    mockFetchTomorrowWeather.mockRejectedValue(new Error('down'));
    mockShouldUseCache.mockReturnValue(false);

    await expect(
      fetchWeatherWithFallback(30.27, -97.74, SETTINGS_BOTH)
    ).rejects.toMatchObject({
      code: 'ALL_PROVIDERS_FAILED',
    });
  });

  test('throws even if expired cache exists when shouldUseCache returns false', async () => {
    mockFetchOpenMeteoWeather.mockRejectedValue(new Error('down'));
    mockFetchTomorrowWeather.mockRejectedValue(new Error('down'));
    const expired = { ...makeWeather(), freshness: 'expired', cachedAt: new Date().toISOString() };
    mockGetCachedWeather.mockResolvedValue(expired);
    mockShouldUseCache.mockReturnValue(false);

    await expect(
      fetchWeatherWithFallback(30.27, -97.74, SETTINGS_BOTH)
    ).rejects.toMatchObject({ code: 'ALL_PROVIDERS_FAILED' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// fetchWeatherWithFallback — tomorrow key check
// ═══════════════════════════════════════════════════════════════════════════
describe('fetchWeatherWithFallback — tomorrow key not configured', () => {
  test('throws WeatherError(API_ERROR) when tomorrow not configured but used as primary', async () => {
    mockIsTomorrowConfigured.mockReturnValue(false);

    // tomorrow is primary but not configured → should fail and fall through to openmeteo
    const fallback = makeWeather({ source: 'openmeteo' });
    mockFetchOpenMeteoWeather.mockResolvedValue(fallback);

    const result = await fetchWeatherWithFallback(30.27, -97.74, SETTINGS_TOMORROW_PRIMARY);

    // Falls back to openmeteo
    expect(result.weather).toBe(fallback);
    expect(mockRecordFailure).toHaveBeenCalledWith('tomorrow');
    expect(mockFetchTomorrowWeather).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// fetchWeather — simple entry point
// ═══════════════════════════════════════════════════════════════════════════
describe('fetchWeather', () => {
  test('useMultiProvider=false: calls fetchOpenMeteoWeather directly (no orchestrator)', async () => {
    const weather = makeWeather();
    mockFetchOpenMeteoWeather.mockResolvedValue(weather);

    const result = await fetchWeather(30.27, -97.74, false);

    expect(result).toBe(weather);
    expect(mockFetchOpenMeteoWeather).toHaveBeenCalledWith(30.27, -97.74);
    expect(mockCanRequest).not.toHaveBeenCalled(); // circuit breaker not involved
  });

  test('useMultiProvider=false: caches the result', async () => {
    const weather = makeWeather();
    mockFetchOpenMeteoWeather.mockResolvedValue(weather);

    await fetchWeather(30.27, -97.74, false);

    expect(mockCacheWeather).toHaveBeenCalledWith(weather);
  });

  test('useMultiProvider=false: throws WeatherError(NETWORK_ERROR) when openmeteo returns null', async () => {
    mockFetchOpenMeteoWeather.mockResolvedValue(null);

    await expect(fetchWeather(30.27, -97.74, false)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      provider: 'openmeteo',
    });
  });

  test('useMultiProvider=true: uses orchestrator with fallback', async () => {
    mockCanRequest.mockReturnValue(true);
    const weather = makeWeather();
    mockFetchOpenMeteoWeather.mockResolvedValue(weather);

    const result = await fetchWeather(30.27, -97.74, true);

    expect(result).toBe(weather);
    expect(mockCanRequest).toHaveBeenCalled(); // orchestrator ran
  });

  test('useMultiProvider=false by default', async () => {
    const weather = makeWeather();
    mockFetchOpenMeteoWeather.mockResolvedValue(weather);

    await fetchWeather(30.27, -97.74);

    // Direct call (not via orchestrator) — no canRequest check
    expect(mockCanRequest).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getProviderStatus
// ═══════════════════════════════════════════════════════════════════════════
describe('getProviderStatus', () => {
  test('returns status for both providers', () => {
    mockGetCircuitState.mockReturnValue('closed');
    mockIsTomorrowConfigured.mockReturnValue(true);

    const status = getProviderStatus();

    expect(status).toHaveProperty('tomorrow');
    expect(status).toHaveProperty('openmeteo');
  });

  test('tomorrow: configured=true when key present', () => {
    mockIsTomorrowConfigured.mockReturnValue(true);
    mockGetCircuitState.mockReturnValue('closed');

    const status = getProviderStatus();

    expect(status.tomorrow.configured).toBe(true);
  });

  test('tomorrow: configured=false when key absent', () => {
    mockIsTomorrowConfigured.mockReturnValue(false);
    mockGetCircuitState.mockReturnValue('closed');

    const status = getProviderStatus();

    expect(status.tomorrow.configured).toBe(false);
  });

  test('openmeteo: always configured=true', () => {
    mockGetCircuitState.mockReturnValue('closed');

    const status = getProviderStatus();

    expect(status.openmeteo.configured).toBe(true);
  });

  test('circuit state reported for each provider', () => {
    mockGetCircuitState
      .mockReturnValueOnce('open')   // tomorrow
      .mockReturnValueOnce('closed'); // openmeteo

    const status = getProviderStatus();

    expect(status.tomorrow.state).toBe('open');
    expect(status.openmeteo.state).toBe('closed');
  });
});
