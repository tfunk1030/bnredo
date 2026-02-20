/**
 * Open-Meteo Adapter Tests
 *
 * Tests data transformation, error handling, and pure utility logic.
 *
 * MOCKING STRATEGY:
 * - fetchWeather path: fetchWithTimeout (from retry-strategy) + withRetry passthrough
 * - getLocationName uses native fetch (not fetchWithTimeout) — mocked via global.fetch
 * - getElevation calls fetchWithTimeout directly
 */

jest.mock('@/src/services/weather/retry-strategy');

import {
  fetchOpenMeteoWeather,
  getElevation,
  isOpenMeteoConfigured,
} from '@/src/services/weather/openmeteo-adapter';
import { fetchWithTimeout, withRetry } from '@/src/services/weather/retry-strategy';
import { WeatherError } from '@/src/services/weather/types';

const mockFetchWithTimeout = fetchWithTimeout as jest.MockedFunction<typeof fetchWithTimeout>;
const mockWithRetry = withRetry as jest.MockedFunction<typeof withRetry>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeCurrentWeather(overrides: Record<string, unknown> = {}) {
  return {
    time: '2026-02-19T20:00',
    temperature_2m: 72.4,
    relative_humidity_2m: 55.2,
    surface_pressure: 1013.8,
    wind_speed_10m: 8.3,
    wind_direction_10m: 182.7,
    wind_gusts_10m: 12.1,
    ...overrides,
  };
}

function makeApiResponse(currentOverrides = {}, elevation = 152.4) {
  return {
    current: makeCurrentWeather(currentOverrides),
    elevation, // meters
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

/** Silence geocoding by making global.fetch fail gracefully */
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

beforeEach(() => {
  jest.resetAllMocks(); // full reset — clears implementations + return values
  passthrough();
  stubGeocodingFail(); // default: geocoding fails → 'Current Location'
});

afterAll(() => {
  global.fetch = nativeFetch;
});

// ─── isOpenMeteoConfigured ───────────────────────────────────────────────────

describe('isOpenMeteoConfigured', () => {
  it('always returns true (no API key required)', () => {
    expect(isOpenMeteoConfigured()).toBe(true);
  });
});

// ─── fetchOpenMeteoWeather ───────────────────────────────────────────────────

describe('fetchOpenMeteoWeather', () => {
  describe('data transformation', () => {
    it('returns NormalizedWeather with correct shape and source', async () => {
      stubWeatherFetch(makeApiResponse());
      const result = await fetchOpenMeteoWeather(LAT, LNG);

      expect(result).not.toBeNull();
      expect(result!.source).toBe('openmeteo');
      expect(result!.isManualOverride).toBe(false);
      expect(result!.latitude).toBe(LAT);
      expect(result!.longitude).toBe(LNG);
    });

    it('Math.rounds all numeric weather fields', async () => {
      stubWeatherFetch(makeApiResponse({
        temperature_2m: 72.7,      // → 73
        relative_humidity_2m: 55.3, // → 55
        surface_pressure: 1013.6,  // → 1014
        wind_speed_10m: 8.4,       // → 8
        wind_direction_10m: 182.6, // → 183
        wind_gusts_10m: 12.9,      // → 13
      }, 152.4));

      const result = await fetchOpenMeteoWeather(LAT, LNG);

      expect(result!.temperature).toBe(73);
      expect(result!.humidity).toBe(55);
      expect(result!.pressure).toBe(1014);
      expect(result!.windSpeed).toBe(8);
      expect(result!.windDirection).toBe(183);
      expect(result!.windGust).toBe(13);
    });

    it('converts elevation meters → feet (152.4m → 500ft)', async () => {
      stubWeatherFetch(makeApiResponse({}, 152.4)); // 152.4 * 3.28084 = 499.97 → 500
      const result = await fetchOpenMeteoWeather(LAT, LNG);
      expect(result!.altitude).toBe(500);
    });

    it('converts zero elevation correctly', async () => {
      stubWeatherFetch(makeApiResponse({}, 0));
      const result = await fetchOpenMeteoWeather(LAT, LNG);
      expect(result!.altitude).toBe(0);
    });

    it('uses current.time as observationTime', async () => {
      stubWeatherFetch(makeApiResponse({ time: '2026-04-16T14:00' }));
      const result = await fetchOpenMeteoWeather(LAT, LNG);
      expect(result!.observationTime).toBe('2026-04-16T14:00');
    });

    it('falls back to "Current Location" when geocoding fails', async () => {
      stubWeatherFetch(makeApiResponse());
      stubGeocodingFail(); // already default, but explicit for clarity
      const result = await fetchOpenMeteoWeather(LAT, LNG);
      expect(result!.locationName).toBe('Current Location');
    });

    it('uses geocoded name with admin1 when available', async () => {
      stubWeatherFetch(makeApiResponse());
      stubGeocodingSuccess('Austin', 'Texas');
      const result = await fetchOpenMeteoWeather(LAT, LNG);
      expect(result!.locationName).toBe('Austin, Texas');
    });

    it('uses geocoded name without admin1 when admin1 absent', async () => {
      stubWeatherFetch(makeApiResponse());
      stubGeocodingSuccess('Rio de Janeiro');
      const result = await fetchOpenMeteoWeather(LAT, LNG);
      expect(result!.locationName).toBe('Rio de Janeiro');
    });

    it('falls back to "Current Location" when geocoding returns empty results', async () => {
      stubWeatherFetch(makeApiResponse());
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      } as unknown as Response);
      const result = await fetchOpenMeteoWeather(LAT, LNG);
      expect(result!.locationName).toBe('Current Location');
    });
  });

  describe('error handling', () => {
    it('throws WeatherError (re-thrown) when withRetry rejects with WeatherError', async () => {
      const weatherErr = new WeatherError('PROVIDER_DOWN', 'server error', 'openmeteo', 503, true);
      mockWithRetry.mockRejectedValue(weatherErr);

      let thrown: unknown;
      try { await fetchOpenMeteoWeather(LAT, LNG); } catch (e) { thrown = e; }

      expect(thrown).toBe(weatherErr); // exact same instance
    });

    it('wraps non-WeatherError as NETWORK_ERROR', async () => {
      mockWithRetry.mockRejectedValue(new TypeError('fetch failed'));

      let thrown: unknown;
      try { await fetchOpenMeteoWeather(LAT, LNG); } catch (e) { thrown = e; }

      expect(thrown).toBeInstanceOf(WeatherError);
      expect((thrown as WeatherError).code).toBe('NETWORK_ERROR');
      expect((thrown as WeatherError).provider).toBe('openmeteo');
      expect((thrown as WeatherError).isRetryable).toBe(true);
    });

    it('throws INVALID_RESPONSE when response has no current field', async () => {
      stubWeatherFetch({ elevation: 100 }); // missing "current"

      await expect(fetchOpenMeteoWeather(LAT, LNG)).rejects.toBeInstanceOf(WeatherError);
    });

    it('throws WeatherError on HTTP error (non-ok response)', async () => {
      mockFetchWithTimeout.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: jest.fn().mockResolvedValue({}),
      } as unknown as Response);

      await expect(fetchOpenMeteoWeather(LAT, LNG)).rejects.toBeInstanceOf(WeatherError);
    });
  });
});

// ─── getElevation ────────────────────────────────────────────────────────────

describe('getElevation', () => {
  it('converts elevation meters → feet (152.4m → 500ft)', async () => {
    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ elevation: 152.4 }),
    } as unknown as Response);

    expect(await getElevation(LAT, LNG)).toBe(500);
  });

  it('returns 0 for sea-level elevation', async () => {
    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ elevation: 0 }),
    } as unknown as Response);

    expect(await getElevation(LAT, LNG)).toBe(0);
  });

  it('converts Quito altitude (2850m → 9350ft)', async () => {
    // 2850 * 3.28084 = 9350.394 → Math.round → 9350
    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ elevation: 2850 }),
    } as unknown as Response);

    expect(await getElevation(-0.22, -78.51)).toBe(9350);
  });

  it('converts Bogotá altitude (2600m → 8530ft)', async () => {
    // 2600 * 3.28084 = 8530.184 → 8530
    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ elevation: 2600 }),
    } as unknown as Response);

    expect(await getElevation(4.71, -74.07)).toBe(8530);
  });

  it('returns 0 on non-OK HTTP response', async () => {
    mockFetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response);

    expect(await getElevation(LAT, LNG)).toBe(0);
  });

  it('returns 0 when fetch throws', async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error('network down'));
    expect(await getElevation(LAT, LNG)).toBe(0);
  });

  it('passes correct timeout (5000ms) to fetchWithTimeout', async () => {
    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ elevation: 100 }),
    } as unknown as Response);

    await getElevation(LAT, LNG);

    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      expect.stringContaining('latitude='),
      expect.any(Object),
      5000
    );
  });
});
