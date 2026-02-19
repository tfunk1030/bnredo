/**
 * Tests for retry-strategy.ts
 * Covers: calculateBackoffDelay, isRetryableError, sleep, withRetry, fetchWithTimeout
 */

import {
  calculateBackoffDelay,
  isRetryableError,
  sleep,
  withRetry,
  fetchWithTimeout,
  DEFAULT_RETRY_CONFIG,
  RetryConfig,
} from '../../services/weather/retry-strategy';
import { WeatherError, RETRYABLE_HTTP_CODES } from '../../services/weather/types';

// ─── calculateBackoffDelay ─────────────────────────────────────────────────────

describe('calculateBackoffDelay', () => {
  const noJitterConfig: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    jitterMs: 0,
  };

  it('returns baseDelay for attempt 0 (no jitter)', () => {
    const delay = calculateBackoffDelay(0, noJitterConfig);
    expect(delay).toBe(1000); // 1000 * 2^0 = 1000
  });

  it('doubles delay each attempt (exponential)', () => {
    expect(calculateBackoffDelay(1, noJitterConfig)).toBe(2000); // 1000 * 2^1
    expect(calculateBackoffDelay(2, noJitterConfig)).toBe(4000); // 1000 * 2^2
    expect(calculateBackoffDelay(3, noJitterConfig)).toBe(8000); // 1000 * 2^3
  });

  it('caps at maxDelayMs', () => {
    const config: RetryConfig = { ...noJitterConfig, maxDelayMs: 5000 };
    // 1000 * 2^3 = 8000, but cap = 5000
    expect(calculateBackoffDelay(3, config)).toBe(5000);
    // 1000 * 2^10 = 1024000, still capped
    expect(calculateBackoffDelay(10, config)).toBe(5000);
  });

  it('adds jitter between 0 and jitterMs', () => {
    const config: RetryConfig = { ...noJitterConfig, jitterMs: 500 };
    // Run multiple times — all results should be in [baseDelay, baseDelay + jitter]
    for (let i = 0; i < 20; i++) {
      const delay = calculateBackoffDelay(0, config);
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(1500);
    }
  });

  it('uses DEFAULT_RETRY_CONFIG when no config provided', () => {
    // With default config: base=1000, max=30000, jitter=1000
    const delay = calculateBackoffDelay(0);
    expect(delay).toBeGreaterThanOrEqual(1000);
    expect(delay).toBeLessThanOrEqual(2000); // 1000 + up to 1000 jitter
  });
});

// ─── isRetryableError ──────────────────────────────────────────────────────────

describe('isRetryableError', () => {
  it('returns true for retryable WeatherError', () => {
    const err = new WeatherError('TIMEOUT', 'timed out', undefined, undefined, true);
    expect(isRetryableError(err)).toBe(true);
  });

  it('returns false for non-retryable WeatherError', () => {
    const err = new WeatherError('PARSE_ERROR', 'bad json', undefined, undefined, false);
    expect(isRetryableError(err)).toBe(false);
  });

  it('returns true for fetch TypeError', () => {
    const err = new TypeError('Failed to fetch');
    expect(isRetryableError(err)).toBe(true);
  });

  it('returns false for non-fetch TypeError', () => {
    const err = new TypeError('Cannot read property of undefined');
    expect(isRetryableError(err)).toBe(false);
  });

  it('returns true for retryable HTTP status codes', () => {
    for (const code of RETRYABLE_HTTP_CODES) {
      expect(isRetryableError({ status: code })).toBe(true);
    }
  });

  it('returns false for non-retryable HTTP status codes', () => {
    for (const code of [400, 401, 403, 404, 200]) {
      expect(isRetryableError({ status: code })).toBe(false);
    }
  });

  it('returns false for plain string', () => {
    expect(isRetryableError('some error')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isRetryableError(null)).toBe(false);
  });

  it('returns false for generic Error', () => {
    expect(isRetryableError(new Error('oops'))).toBe(false);
  });
});

// ─── sleep ─────────────────────────────────────────────────────────────────────

describe('sleep', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('resolves after specified milliseconds', async () => {
    const promise = sleep(5000);
    jest.advanceTimersByTime(5000);
    await expect(promise).resolves.toBeUndefined();
  });

  it('does not resolve before time elapses', async () => {
    let resolved = false;
    sleep(1000).then(() => { resolved = true; });
    jest.advanceTimersByTime(999);
    // Flush microtasks
    await Promise.resolve();
    expect(resolved).toBe(false);
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(resolved).toBe(true);
  });
});

// ─── withRetry ─────────────────────────────────────────────────────────────────

describe('withRetry', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const fastConfig: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 10,
    maxDelayMs: 100,
    jitterMs: 0,
  };

  it('returns result on first success (no retries)', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, fastConfig);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error and succeeds', async () => {
    const retryableErr = new WeatherError('TIMEOUT', 'timeout', undefined, undefined, true);
    const fn = jest.fn()
      .mockRejectedValueOnce(retryableErr)
      .mockRejectedValueOnce(retryableErr)
      .mockResolvedValue('recovered');

    const resultPromise = withRetry(fn, fastConfig);

    // Advance through two retry delays
    await jest.advanceTimersByTimeAsync(10);  // attempt 0 delay: 10ms
    await jest.advanceTimersByTimeAsync(20);  // attempt 1 delay: 20ms

    const result = await resultPromise;
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws immediately on non-retryable error', async () => {
    const fatalErr = new WeatherError('PARSE_ERROR', 'bad json', undefined, undefined, false);
    const fn = jest.fn().mockRejectedValue(fatalErr);

    await expect(withRetry(fn, fastConfig)).rejects.toThrow('bad json');
    expect(fn).toHaveBeenCalledTimes(1); // no retries
  });

  it('throws after exhausting all retries', async () => {
    jest.useRealTimers(); // withRetry uses real sleep internally
    const retryableErr = new WeatherError('TIMEOUT', 'always fails', undefined, undefined, true);
    const fn = jest.fn().mockRejectedValue(retryableErr);

    const tinyConfig: RetryConfig = { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5, jitterMs: 0 };
    await expect(withRetry(fn, tinyConfig)).rejects.toThrow('always fails');
    // 1 initial + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3);
    jest.useFakeTimers(); // restore for afterEach
  });

  it('uses DEFAULT_RETRY_CONFIG when none provided', async () => {
    const fn = jest.fn().mockResolvedValue('default-config');
    const result = await withRetry(fn);
    expect(result).toBe('default-config');
  });

  it('preserves the last error when all retries fail', async () => {
    jest.useRealTimers(); // avoid fake timer issues with async retry
    const errors = [
      new WeatherError('TIMEOUT', 'fail-1', undefined, undefined, true),
      new WeatherError('TIMEOUT', 'fail-2', undefined, undefined, true),
      new WeatherError('TIMEOUT', 'fail-3', undefined, undefined, true),
    ];
    let callIdx = 0;
    const fn = jest.fn().mockImplementation(() => {
      return Promise.reject(errors[callIdx++]);
    });

    const tinyConfig: RetryConfig = { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5, jitterMs: 0 };
    await expect(withRetry(fn, tinyConfig)).rejects.toThrow('fail-3');
    expect(fn).toHaveBeenCalledTimes(3);
    jest.useFakeTimers(); // restore
  });
});

// ─── fetchWithTimeout ──────────────────────────────────────────────────────────

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (global as any).fetch;
  });

  it('returns response when fetch completes before timeout', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const result = await fetchWithTimeout('https://api.example.com', {}, 5000);
    expect(result).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('passes abort signal to fetch', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(new Response('ok'));

    await fetchWithTimeout('https://api.example.com', { method: 'POST' }, 5000);

    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.example.com');
    expect(opts.method).toBe('POST');
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });

  it('throws WeatherError with TIMEOUT code when request times out', async () => {
    // Simulate abort: when signal aborts, fetch throws AbortError
    (global.fetch as jest.Mock).mockImplementation((_url: string, opts: RequestInit) => {
      return new Promise((_resolve, reject) => {
        if (opts.signal) {
          opts.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    const promise = fetchWithTimeout('https://api.example.com', {}, 3000);
    jest.advanceTimersByTime(3000);

    try {
      await promise;
      fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(WeatherError);
      expect(err.code).toBe('TIMEOUT');
      expect(err.isRetryable).toBe(true);
      expect(err.message).toContain('3000');
    }
  });

  it('re-throws non-abort errors as-is', async () => {
    const networkErr = new Error('Network failure');
    (global.fetch as jest.Mock).mockRejectedValue(networkErr);

    await expect(
      fetchWithTimeout('https://api.example.com', {}, 5000)
    ).rejects.toThrow('Network failure');
  });

  it('clears timeout after successful fetch (no abort after resolve)', async () => {
    const clearSpy = jest.spyOn(global, 'clearTimeout');
    (global.fetch as jest.Mock).mockResolvedValue(new Response('ok'));

    await fetchWithTimeout('https://api.example.com', {}, 5000);

    // clearTimeout should have been called in finally block
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});

// ─── DEFAULT_RETRY_CONFIG ──────────────────────────────────────────────────────

describe('DEFAULT_RETRY_CONFIG', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
    expect(DEFAULT_RETRY_CONFIG.baseDelayMs).toBe(1000);
    expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(30000);
    expect(DEFAULT_RETRY_CONFIG.jitterMs).toBe(1000);
  });
});
