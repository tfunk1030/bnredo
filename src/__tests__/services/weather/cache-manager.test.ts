/**
 * Cache Manager Tests
 * Covers: calculateFreshness, shouldUseCache, shouldRefreshInBackground,
 *         getFreshnessMessage, getCacheAgeMinutes, cacheWeather,
 *         getCachedWeather (location check, legacy migration), getProviderCache,
 *         clearWeatherCache
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  calculateFreshness,
  shouldUseCache,
  shouldRefreshInBackground,
  getFreshnessMessage,
  getCacheAgeMinutes,
  cacheWeather,
  getCachedWeather,
  getProviderCache,
  clearWeatherCache,
} from '@/src/services/weather/cache-manager';
import { NormalizedWeather } from '@/src/services/weather/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tsAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

const MIN = 60 * 1000;
const HR = 60 * MIN;

function makeWeather(overrides: Partial<NormalizedWeather> = {}): NormalizedWeather {
  return {
    temperature: 72,
    humidity: 50,
    pressure: 1013,
    windSpeed: 10,
    windDirection: 180,
    windGust: 15,
    altitude: 100,
    locationName: 'Austin, TX',
    latitude: 30.2672,
    longitude: -97.7431,
    observationTime: new Date().toISOString(),
    source: 'openmeteo',
    isManualOverride: false,
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useFakeTimers({ now: Date.now() });
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── calculateFreshness ──────────────────────────────────────────────────────

describe('calculateFreshness', () => {
  it('returns "fresh" for data < 5 minutes old', () => {
    expect(calculateFreshness(tsAgo(1 * MIN))).toBe('fresh');
    expect(calculateFreshness(tsAgo(4 * MIN + 59000))).toBe('fresh');
  });

  it('returns "fresh" for brand-new data', () => {
    expect(calculateFreshness(new Date().toISOString())).toBe('fresh');
  });

  it('returns "stale" for data 5-30 minutes old', () => {
    expect(calculateFreshness(tsAgo(5 * MIN))).toBe('stale');
    expect(calculateFreshness(tsAgo(15 * MIN))).toBe('stale');
    expect(calculateFreshness(tsAgo(29 * MIN + 59000))).toBe('stale');
  });

  it('returns "emergency" for data 30 minutes to 2 hours old', () => {
    expect(calculateFreshness(tsAgo(30 * MIN))).toBe('emergency');
    expect(calculateFreshness(tsAgo(60 * MIN))).toBe('emergency');
    expect(calculateFreshness(tsAgo(2 * HR - 1))).toBe('emergency');
  });

  it('returns "expired" for data > 2 hours old', () => {
    expect(calculateFreshness(tsAgo(2 * HR))).toBe('expired');
    expect(calculateFreshness(tsAgo(5 * HR))).toBe('expired');
    expect(calculateFreshness(tsAgo(24 * HR))).toBe('expired');
  });
});

// ─── shouldUseCache ──────────────────────────────────────────────────────────

describe('shouldUseCache', () => {
  it('returns true for "fresh"', () => {
    expect(shouldUseCache('fresh')).toBe(true);
  });

  it('returns true for "stale"', () => {
    expect(shouldUseCache('stale')).toBe(true);
  });

  it('returns true for "emergency"', () => {
    expect(shouldUseCache('emergency')).toBe(true);
  });

  it('returns false for "expired"', () => {
    expect(shouldUseCache('expired')).toBe(false);
  });
});

// ─── shouldRefreshInBackground ───────────────────────────────────────────────

describe('shouldRefreshInBackground', () => {
  it('returns false for "fresh" (no refresh needed)', () => {
    expect(shouldRefreshInBackground('fresh')).toBe(false);
  });

  it('returns true for "stale" (serve + revalidate)', () => {
    expect(shouldRefreshInBackground('stale')).toBe(true);
  });

  it('returns true for "emergency" (urgent refresh)', () => {
    expect(shouldRefreshInBackground('emergency')).toBe(true);
  });

  it('returns false for "expired" (must fetch synchronously, not background)', () => {
    expect(shouldRefreshInBackground('expired')).toBe(false);
  });
});

// ─── getFreshnessMessage ─────────────────────────────────────────────────────

describe('getFreshnessMessage', () => {
  it('returns null for "fresh" (no message needed)', () => {
    expect(getFreshnessMessage('fresh')).toBeNull();
  });

  it('returns a non-null string for "stale"', () => {
    const msg = getFreshnessMessage('stale');
    expect(msg).not.toBeNull();
    expect(typeof msg).toBe('string');
    expect(msg!.length).toBeGreaterThan(0);
  });

  it('returns a non-null string for "emergency"', () => {
    const msg = getFreshnessMessage('emergency');
    expect(msg).not.toBeNull();
    expect(typeof msg).toBe('string');
  });

  it('returns a non-null string for "expired"', () => {
    const msg = getFreshnessMessage('expired');
    expect(msg).not.toBeNull();
    expect(typeof msg).toBe('string');
  });

  it('each non-fresh message is distinct', () => {
    const stale = getFreshnessMessage('stale');
    const emergency = getFreshnessMessage('emergency');
    const expired = getFreshnessMessage('expired');
    expect(stale).not.toBe(emergency);
    expect(emergency).not.toBe(expired);
  });
});

// ─── getCacheAgeMinutes ──────────────────────────────────────────────────────

describe('getCacheAgeMinutes', () => {
  it('returns 0 for a brand-new timestamp', () => {
    expect(getCacheAgeMinutes(new Date().toISOString())).toBe(0);
  });

  it('returns 1 for 90 seconds old (floors to full minutes)', () => {
    expect(getCacheAgeMinutes(tsAgo(90 * 1000))).toBe(1);
  });

  it('returns 5 for 5 minutes old', () => {
    expect(getCacheAgeMinutes(tsAgo(5 * MIN))).toBe(5);
  });

  it('returns 65 for 65 minutes old', () => {
    expect(getCacheAgeMinutes(tsAgo(65 * MIN))).toBe(65);
  });

  it('floors partial minutes', () => {
    // 4 min 59 sec = 299s → should be 4
    expect(getCacheAgeMinutes(tsAgo(4 * MIN + 59000))).toBe(4);
  });
});

// ─── cacheWeather ────────────────────────────────────────────────────────────

describe('cacheWeather', () => {
  it('stores data in AsyncStorage without throwing', async () => {
    const weather = makeWeather();
    await expect(cacheWeather(weather)).resolves.toBeUndefined();
  });

  it('stored data is retrievable', async () => {
    const weather = makeWeather({ temperature: 85 });
    await cacheWeather(weather);

    const result = await getCachedWeather();
    expect(result).not.toBeNull();
    expect(result!.temperature).toBe(85);
  });

  it('sets cachedAt to approximately now', async () => {
    const before = Date.now();
    await cacheWeather(makeWeather());
    const after = Date.now();

    const result = await getCachedWeather();
    const cachedAtMs = new Date(result!.cachedAt).getTime();
    expect(cachedAtMs).toBeGreaterThanOrEqual(before);
    expect(cachedAtMs).toBeLessThanOrEqual(after);
  });

  it('stores a provider-specific cache entry as well', async () => {
    await cacheWeather(makeWeather({ source: 'openmeteo' }));
    const providerCache = await getProviderCache('openmeteo');
    expect(providerCache).not.toBeNull();
  });

  it('handles AsyncStorage errors gracefully (does not throw)', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Storage full'));
    await expect(cacheWeather(makeWeather())).resolves.toBeUndefined();
    jest.restoreAllMocks();
  });
});

// ─── getCachedWeather ─────────────────────────────────────────────────────────

describe('getCachedWeather', () => {
  it('returns null when cache is empty', async () => {
    const result = await getCachedWeather();
    expect(result).toBeNull();
  });

  it('returns cached weather with freshness set', async () => {
    await cacheWeather(makeWeather());
    const result = await getCachedWeather();
    expect(result).not.toBeNull();
    expect(result!.freshness).toBe('fresh');
  });

  it('includes all original weather fields', async () => {
    const weather = makeWeather({ windSpeed: 22, humidity: 75 });
    await cacheWeather(weather);
    const result = await getCachedWeather();
    expect(result!.windSpeed).toBe(22);
    expect(result!.humidity).toBe(75);
  });

  it('returns null when location is too far (>5km)', async () => {
    // Cache at Austin TX
    await cacheWeather(makeWeather({ latitude: 30.2672, longitude: -97.7431 }));

    // Query from Houston TX (~250km away)
    const result = await getCachedWeather(29.7604, -95.3698, 5);
    expect(result).toBeNull();
  });

  it('returns data when location is nearby (<5km)', async () => {
    // Cache at Austin TX
    await cacheWeather(makeWeather({ latitude: 30.2672, longitude: -97.7431 }));

    // Query from very close (within 1km)
    const result = await getCachedWeather(30.2680, -97.7440, 5);
    expect(result).not.toBeNull();
  });

  it('skips location check when lat/lng not provided', async () => {
    await cacheWeather(makeWeather({ latitude: 30.2672, longitude: -97.7431 }));
    const result = await getCachedWeather(); // no location args
    expect(result).not.toBeNull();
  });

  it('handles corrupt JSON gracefully (returns null)', async () => {
    await AsyncStorage.setItem('weather_cache_primary', 'not-valid-json{{{');
    const result = await getCachedWeather();
    expect(result).toBeNull();
  });

  it('migrates legacy cache format', async () => {
    // Write in old legacy format (no cachedAt, no freshness, no source)
    const legacyWeather = {
      temperature: 70,
      humidity: 45,
      pressure: 1015,
      windSpeed: 8,
      windDirection: 90,
      windGust: 12,
      altitude: 200,
      locationName: 'Legacy Location',
      latitude: 30.2672,
      longitude: -97.7431,
      observationTime: new Date().toISOString(),
      isManualOverride: false,
    };
    await AsyncStorage.setItem('weather_cache', JSON.stringify(legacyWeather));

    const result = await getCachedWeather();
    expect(result).not.toBeNull();
    expect(result!.temperature).toBe(70);
    expect(result!.source).toBe('openmeteo'); // migration default
    expect(result!.cachedAt).toBeDefined();
    expect(result!.freshness).toBeDefined();

    // Legacy key should be cleaned up after migration
    const legacyAfter = await AsyncStorage.getItem('weather_cache');
    expect(legacyAfter).toBeNull();
  });

  it('uses custom maxDistance parameter', async () => {
    // Cache at Austin
    await cacheWeather(makeWeather({ latitude: 30.2672, longitude: -97.7431 }));

    // 8km away — should fail with default 5km, succeed with 10km
    const nearbyLat = 30.2672 + 0.072; // ~8km north
    const resultDefault = await getCachedWeather(nearbyLat, -97.7431, 5);
    expect(resultDefault).toBeNull();

    const resultLax = await getCachedWeather(nearbyLat, -97.7431, 10);
    expect(resultLax).not.toBeNull();
  });
});

// ─── getProviderCache ─────────────────────────────────────────────────────────

describe('getProviderCache', () => {
  it('returns null when no provider cache exists', async () => {
    const result = await getProviderCache('openmeteo');
    expect(result).toBeNull();
  });

  it('returns provider-specific cache after cacheWeather', async () => {
    await cacheWeather(makeWeather({ source: 'openmeteo', temperature: 68 }));
    const result = await getProviderCache('openmeteo');
    expect(result).not.toBeNull();
    expect(result!.temperature).toBe(68);
    expect(result!.source).toBe('openmeteo');
  });

  it('tomorrow provider cache is separate from openmeteo', async () => {
    await cacheWeather(makeWeather({ source: 'openmeteo' }));
    const tomorrowCache = await getProviderCache('tomorrow');
    expect(tomorrowCache).toBeNull();
  });

  it('freshness is recalculated on retrieval', async () => {
    await cacheWeather(makeWeather({ source: 'openmeteo' }));
    const result = await getProviderCache('openmeteo');
    expect(['fresh', 'stale', 'emergency', 'expired']).toContain(result!.freshness);
  });
});

// ─── clearWeatherCache ───────────────────────────────────────────────────────

describe('clearWeatherCache', () => {
  it('clears the primary cache', async () => {
    await cacheWeather(makeWeather());
    await clearWeatherCache();
    const result = await getCachedWeather();
    expect(result).toBeNull();
  });

  it('clears provider-specific caches', async () => {
    await cacheWeather(makeWeather({ source: 'openmeteo' }));
    await clearWeatherCache();
    const result = await getProviderCache('openmeteo');
    expect(result).toBeNull();
  });

  it('does not throw when cache is already empty', async () => {
    await expect(clearWeatherCache()).resolves.toBeUndefined();
  });

  it('allows fresh data to be cached after clearing', async () => {
    await cacheWeather(makeWeather({ temperature: 70 }));
    await clearWeatherCache();
    await cacheWeather(makeWeather({ temperature: 95 }));
    const result = await getCachedWeather();
    expect(result!.temperature).toBe(95);
  });
});
