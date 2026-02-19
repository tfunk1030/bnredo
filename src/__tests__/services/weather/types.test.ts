import {
  WeatherError,
  RETRYABLE_HTTP_CODES,
  FATAL_HTTP_CODES,
  DEFAULT_WEATHER_SETTINGS,
} from '@/src/services/weather/types';

describe('WeatherError', () => {
  it('should create error with all properties', () => {
    const err = new WeatherError('NETWORK_ERROR', 'fetch failed', 'openmeteo', 500, true);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(WeatherError);
    expect(err.name).toBe('WeatherError');
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.message).toBe('fetch failed');
    expect(err.provider).toBe('openmeteo');
    expect(err.httpStatus).toBe(500);
    expect(err.isRetryable).toBe(true);
  });

  it('should default isRetryable to false', () => {
    const err = new WeatherError('API_ERROR', 'bad request', 'tomorrow');
    expect(err.isRetryable).toBe(false);
  });

  it('should allow undefined provider and httpStatus', () => {
    const err = new WeatherError('ALL_PROVIDERS_FAILED', 'all down');
    expect(err.provider).toBeUndefined();
    expect(err.httpStatus).toBeUndefined();
  });

  describe('fromHttpStatus', () => {
    it('should classify 429 as RATE_LIMITED and retryable', () => {
      const err = WeatherError.fromHttpStatus(429, 'rate limit', 'tomorrow');
      expect(err.code).toBe('RATE_LIMITED');
      expect(err.isRetryable).toBe(true);
      expect(err.httpStatus).toBe(429);
      expect(err.provider).toBe('tomorrow');
    });

    it('should classify 500 as PROVIDER_DOWN and retryable', () => {
      const err = WeatherError.fromHttpStatus(500, 'server error', 'openmeteo');
      expect(err.code).toBe('PROVIDER_DOWN');
      expect(err.isRetryable).toBe(true);
    });

    it('should classify 502 as PROVIDER_DOWN and retryable', () => {
      const err = WeatherError.fromHttpStatus(502, 'bad gateway', 'openmeteo');
      expect(err.code).toBe('PROVIDER_DOWN');
      expect(err.isRetryable).toBe(true);
    });

    it('should classify 503 as PROVIDER_DOWN and retryable', () => {
      const err = WeatherError.fromHttpStatus(503, 'unavailable', 'tomorrow');
      expect(err.code).toBe('PROVIDER_DOWN');
      expect(err.isRetryable).toBe(true);
    });

    it('should classify 504 as PROVIDER_DOWN and retryable', () => {
      const err = WeatherError.fromHttpStatus(504, 'gateway timeout', 'openmeteo');
      expect(err.code).toBe('PROVIDER_DOWN');
      expect(err.isRetryable).toBe(true);
    });

    it('should classify 408 as API_ERROR and retryable', () => {
      const err = WeatherError.fromHttpStatus(408, 'request timeout', 'openmeteo');
      expect(err.code).toBe('API_ERROR');
      expect(err.isRetryable).toBe(true);
    });

    it('should classify 400 as API_ERROR and NOT retryable', () => {
      const err = WeatherError.fromHttpStatus(400, 'bad request', 'tomorrow');
      expect(err.code).toBe('API_ERROR');
      expect(err.isRetryable).toBe(false);
    });

    it('should classify 401 as API_ERROR and NOT retryable', () => {
      const err = WeatherError.fromHttpStatus(401, 'unauthorized', 'tomorrow');
      expect(err.code).toBe('API_ERROR');
      expect(err.isRetryable).toBe(false);
    });

    it('should classify 403 as API_ERROR and NOT retryable', () => {
      const err = WeatherError.fromHttpStatus(403, 'forbidden', 'tomorrow');
      expect(err.code).toBe('API_ERROR');
      expect(err.isRetryable).toBe(false);
    });

    it('should classify 404 as API_ERROR and NOT retryable', () => {
      const err = WeatherError.fromHttpStatus(404, 'not found', 'openmeteo');
      expect(err.code).toBe('API_ERROR');
      expect(err.isRetryable).toBe(false);
    });

    it('should classify 200 as API_ERROR and NOT retryable', () => {
      // Edge case: 200 isn't in either list
      const err = WeatherError.fromHttpStatus(200, 'unexpected success', 'openmeteo');
      expect(err.code).toBe('API_ERROR');
      expect(err.isRetryable).toBe(false);
    });
  });
});

describe('Constants', () => {
  it('RETRYABLE_HTTP_CODES should include standard retryable codes', () => {
    expect(RETRYABLE_HTTP_CODES).toContain(408);
    expect(RETRYABLE_HTTP_CODES).toContain(429);
    expect(RETRYABLE_HTTP_CODES).toContain(500);
    expect(RETRYABLE_HTTP_CODES).toContain(502);
    expect(RETRYABLE_HTTP_CODES).toContain(503);
    expect(RETRYABLE_HTTP_CODES).toContain(504);
  });

  it('FATAL_HTTP_CODES should include non-retryable client errors', () => {
    expect(FATAL_HTTP_CODES).toContain(400);
    expect(FATAL_HTTP_CODES).toContain(401);
    expect(FATAL_HTTP_CODES).toContain(403);
    expect(FATAL_HTTP_CODES).toContain(404);
  });

  it('RETRYABLE and FATAL codes should not overlap', () => {
    const overlap = RETRYABLE_HTTP_CODES.filter(c => FATAL_HTTP_CODES.includes(c));
    expect(overlap).toHaveLength(0);
  });
});

describe('DEFAULT_WEATHER_SETTINGS', () => {
  it('should default to openmeteo as primary provider', () => {
    expect(DEFAULT_WEATHER_SETTINGS.primaryProvider).toBe('openmeteo');
  });

  it('should have multi-provider disabled by default', () => {
    expect(DEFAULT_WEATHER_SETTINGS.enableMultiProvider).toBe(false);
  });

  it('should have a reasonable timeout', () => {
    expect(DEFAULT_WEATHER_SETTINGS.timeout).toBeGreaterThanOrEqual(5000);
    expect(DEFAULT_WEATHER_SETTINGS.timeout).toBeLessThanOrEqual(30000);
  });

  it('should include both providers in fallback order', () => {
    expect(DEFAULT_WEATHER_SETTINGS.fallbackOrder).toContain('tomorrow');
    expect(DEFAULT_WEATHER_SETTINGS.fallbackOrder).toContain('openmeteo');
  });
});
