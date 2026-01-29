/**
 * Retry Strategy with Exponential Backoff
 * Handles transient failures with intelligent retry timing
 */

import { WeatherError, RETRYABLE_HTTP_CODES } from './types';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterMs: 1000,
};

/**
 * Calculate delay for exponential backoff with jitter
 * Formula: min(maxDelay, baseDelay * 2^attempt) + random(0, jitter)
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(config.maxDelayMs, exponentialDelay);
  const jitter = Math.random() * config.jitterMs;
  return cappedDelay + jitter;
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof WeatherError) {
    return error.isRetryable;
  }

  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Check HTTP status if available
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: number }).status;
    return RETRYABLE_HTTP_CODES.includes(status);
  }

  return false;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry non-retryable errors
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry after max attempts
      if (attempt >= config.maxRetries) {
        break;
      }

      // Wait before next attempt
      const delay = calculateBackoffDelay(attempt, config);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Wrap fetch with timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new WeatherError(
        'TIMEOUT',
        `Request timed out after ${timeoutMs}ms`,
        undefined,
        undefined,
        true // Timeouts are retryable
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
