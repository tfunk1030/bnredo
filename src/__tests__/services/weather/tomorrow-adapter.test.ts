/**
 * Tomorrow.io Adapter Tests
 *
 * Tests data transformation, error handling, and API key configuration.
 *
 * MOCKING STRATEGY:
 * - fetchTomorrowWeather path: fetchWithTimeout (from retry-strategy) + withRetry passthrough
 * - getLocationName uses native fetch (not fetchWithTimeout) — mocked via global.fetch
 * - isTomorrowConfigured reads process.env directly
 */

jest.mock('@/src/services/weather/retry-strategy');

import {
  fetchTomorrowWeather,
  isTomorrowConfigured,
} from '@/src/services/weather/tomorrow-adapter';
import { fetchWithTimeout, withRetry } from '@/src/services/weather/retry-strategy';
import { WeatherError } from '@/src/services/weather/types';

const mockFetchWithTimeout = fetchWithTimeout as jest.MockedFunction<typeof fetchWithTimeout>;
const mockWithRetry = withRetry as jest.MockedFunction<typeof withRetry>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeValues(overrides: Record<string, unknown> = {}) {
  return {
    temperature: 72.4,
    humidity: 55.2,
    pressureSurfaceLevel: 1013.8,
    windSpeed: 8.3,
    windDirection: 182.7,
    windGust: 12.1,
    ...overrides,
  };
}

function makeApiResponse(valueOverrides = {}, time = '2026-02-20T04:00:00Z') {
  return {
    data: {
      time,
      values: makeValues(valueOverrides),
    },
    location: { lat: 30.2672, lon: -97.7431 },
  };
}

/** Make withRetry transparently call through to the function */
function passthrough() {
  mockWithRetry.mockImplementation(async (fn: () => unknown) => fn());
}

/** Make fetchWithTimeout return a successful response with JSON body */
function stubWeatherFetch(body: object) {
  mockFetchWithTimeout.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response);
}

/** Save & restore native fetch */
const nativeFetch = global.fetch;

function stubGeocodingSuccess(name: string, admin1?: string) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      results: [{ name, ...(admin1 ? { admin1 } : {}) }],
    }),
  } as unknown as Response);
}

function stubGeocodingFail() {
  global.fetch = jest.fn().mockRejectedValue(new Error('network'));
}

const LAT = 30.2672;
const LNG = -97.7431;
const ELEVATION_FT = 500;
const API_KEY = 'test-tomorrow-api-key';

beforeEach(() => {
  jest.resetAllMocks();
  passthrough();
  stubGeocodingFail(); // default: geocoding fails → 'Current Location'
  process.env.EXPO_PUBLIC_TOMORROW_IO_API_KEY = API_KEY;
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_TOMORROW_IO_API_KEY;
});

afterAll(() => {
  global.fetch = nativeFetch;
});

// ─── isTomorrowConfigured ────────────────────────────────────────────────────

describe('isTomorrowConfigured', () => {
  it('returns true when API key is set', () => {
    process.env.EXPO_PUBLIC_TOMORROW_IO_API_KEY = 'some-key';
    expect(isTomorrowConfigured()).toBe(true);
  });

  it('returns false when API key is absent', () => {
    delete process.env.EXPO_PUBLIC_TOMORROW_IO_API_KEY;
    expect(isTomorrowConfigured()).toBe(false);
  });
});

// ─── fetchTomorrowWeather — API key guard ─────────────────────────────────────

describe('fetchTomorrowWeather — API key', () => {
  it('throws WeatherError(API_ERROR) when key is not set', async () => {
    delete process.env.EXPO_PUBLIC_TOMORROW_IO_API_KEY;

    let thrown: unknown;
    try {
      await fetchTomorrowWeather(LAT, LNG, ELEVATION_FT);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(WeatherError);
    expect((thrown as WeatherError).code).toBe('API_ERROR');
    expect((thrown as WeatherError).provider).toBe('tomorrow');
    expect((thrown as WeatherError).isRetryable).toBe(false);
  });
});

// ─── fetchTomorrowWeather — data transformation ──────────────────────────────

describe('fetchTomorrowWeather — data transformation', () => {
  it('returns NormalizedWeather with correct shape and source="tomorrow"', async () => {
    stubWeatherFetch(makeApiResponse());
    const result = await fetchTomorrowWeather(LAT, LNG, ELEVATION_FT);

    expect(result).not.toBeNull();
    expect(result!.source).toBe('tomorrow');
    expect(result!.isManualOverride).toBe(false);
    expect(result!.latitude).toBe(LAT);
    expect(result!.longitude).toBe(LNG);
  });

  it('Math.rounds all numeric weather fields', async () => {
    stubWeatherFetch(makeApiResponse({
      temperature: 72.7,           // → 73
      humidity: 55.3,              // → 55
      pressureSurfaceLevel: 1013.6, // → 1014
      windSpeed: 8.4,              // → 8
      windDirection: 182.6,        // → 183
      windGust: 12.9,              // → 13
    }));

    const result = await fetchTomorrowWeather(LAT, LNG, ELEVATION_FT);

    expect(result!.temperature).toBe(73);
    expect(result!.humidity).toBe(55);
    expect(result!.pressure).toBe(1014);
    expect(result!.windSpeed).toBe(8);
    expect(result!.windDirection).toBe(183);
    expect(result!.windGust).toBe(13);
  });

  it('uses passed elevation directly as altitude (already in feet)', async () => {
    stubWeatherFetch(makeApiResponse());
    const result = await fetchTomorrowWeather(LAT, LNG, 9350); // Quito
    expect(result!.altitude).toBe(9350);
  });

  it('Math.rounds the elevation when passed as float', async () => {
    stubWeatherFetch(makeApiResponse());
    const result = await fetchTomorrowWeather(LAT, LNG, 499.7);
    expect(result!.altitude).toBe(500);
  });

  it('uses data.data.time as observationTime', async () => {
    stubWeatherFetch(makeApiResponse({}, '2026-04-16T14:00:00Z'));
    const result = await fetchTomorrowWeather(LAT, LNG, ELEVATION_FT);
    expect(result!.observationTime).toBe('2026-04-16T14:00:00Z');
  });
});

// ─── fetchTomorrowWeather — geocoding ────────────────────────────────────────

describe('fetchTomorrowWeather — geocoding', () => {
  it('falls back to "Current Location" when geocoding fails', async () => {
    stubWeatherFetch(makeApiResponse());
    // stubGeocodingFail() is already the default
    const result = await fetchTomorrowWeather(LAT, LNG, ELEVATION_FT);
    expect(result!.locationName).toBe('Current Location');
  });

  it('uses geocoded name with admin1 when available', async () => {
    stubWeatherFetch(makeApiResponse());
    stubGeocodingSuccess('Austin', 'Texas');
    const result = await fetchTomorrowWeather(LAT, LNG, ELEVATION_FT);
    expect(result!.locationName).toBe('Austin, Texas');
  });

  it('uses geocoded name without admin1 when admin1 absent', async () => {
    stubWeatherFetch(makeApiResponse());
    stubGeocodingSuccess('Rio de Janeiro');
    const result = await fetchTomorrowWeather(LAT, LNG, ELEVATION_FT);
    expect(result!.locationName).toBe('Rio de Janeiro');
  });

  it('falls back to "Current Location" when geocoding returns empty results', async () => {
    stubWeatherFetch(makeApiResponse());
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    } as unknown as Response);
    const result = await fetchTomorrowWeather(LAT, LNG, ELEVATION_FT);
    expect(result!.locationName).toBe('Current Location');
  });
});

// ─── fetchTomorrowWeather — error handling ───────────────────────────────────

describe('fetchTomorrowWeather — error handling', () => {
  it('rethrows WeatherError as-is (same instance, not re-wrapped)', async () => {
    const weatherErr = new WeatherError('PROVIDER_DOWN', 'server error', 'tomorrow', 503, true);
    mockWithRetry.mockRejectedValue(weatherErr);

    let thrown: unknown;
    try {
      await fetchTomorrowWeather(LAT, LNG, ELEVATION_FT);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBe(weatherErr);
  });

  it('wraps non-WeatherError as NETWORK_ERROR with retryable=true', async () => {
    mockWithRetry.mockRejectedValue(new TypeError('fetch failed'));

    let thrown: unknown;
    try {
      await fetchTomorrowWeather(LAT, LNG, ELEVATION_FT);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(WeatherError);
    expect((thrown as WeatherError).code).toBe('NETWORK_ERROR');
    expect((thrown as WeatherError).provider).toBe('tomorrow');
    expect((thrown as WeatherError).isRetryable).toBe(true);
  });

  it('throws INVALID_RESPONSE when data.data.values is missing', async () => {
    stubWeatherFetch({ data: { time: '2026-02-20T00:00:00Z' } }); // missing "values"

    await expect(fetchTomorrowWeather(LAT, LNG, ELEVATION_FT)).rejects.toBeInstanceOf(WeatherError);
  });

  it('throws WeatherError on HTTP error response', async () => {
    mockFetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response);

    await expect(fetchTomorrowWeather(LAT, LNG, ELEVATION_FT)).rejects.toBeInstanceOf(WeatherError);
  });
});
