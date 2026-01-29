/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by fast-failing when a provider is down
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Provider is down, fail fast without attempting
 * - HALF_OPEN: Testing if provider recovered, allow one request
 */

import { WeatherProvider } from './types';

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Failures before opening
  failureWindowMs: number;     // Time window to count failures
  recoveryTimeMs: number;      // Time before trying half-open
}

export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  failureWindowMs: 60000,      // 60 seconds
  recoveryTimeMs: 30000,       // 30 seconds
};

interface CircuitBreakerState {
  state: CircuitState;
  failures: number[];          // Timestamps of recent failures
  lastFailure: number | null;
  lastStateChange: number;
}

// Per-provider circuit breaker state
const circuitStates = new Map<WeatherProvider, CircuitBreakerState>();

function getState(provider: WeatherProvider): CircuitBreakerState {
  if (!circuitStates.has(provider)) {
    circuitStates.set(provider, {
      state: 'closed',
      failures: [],
      lastFailure: null,
      lastStateChange: Date.now(),
    });
  }
  return circuitStates.get(provider)!;
}

/**
 * Check if a request should be allowed through the circuit
 */
export function canRequest(
  provider: WeatherProvider,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): boolean {
  const state = getState(provider);
  const now = Date.now();

  switch (state.state) {
    case 'closed':
      return true;

    case 'open':
      // Check if recovery time has passed
      if (now - state.lastStateChange >= config.recoveryTimeMs) {
        // Transition to half-open
        state.state = 'half_open';
        state.lastStateChange = now;
        return true;
      }
      return false;

    case 'half_open':
      // Only allow one request in half-open state
      // The next recordSuccess/recordFailure will determine next state
      return true;
  }
}

/**
 * Record a successful request
 */
export function recordSuccess(
  provider: WeatherProvider,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): void {
  const state = getState(provider);

  if (state.state === 'half_open') {
    // Success in half-open: circuit recovered
    state.state = 'closed';
    state.failures = [];
    state.lastStateChange = Date.now();
  }
  // In closed state, just clear any old failures
  else if (state.state === 'closed') {
    const now = Date.now();
    state.failures = state.failures.filter(
      ts => now - ts < config.failureWindowMs
    );
  }
}

/**
 * Record a failed request
 */
export function recordFailure(
  provider: WeatherProvider,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): void {
  const state = getState(provider);
  const now = Date.now();

  state.lastFailure = now;

  if (state.state === 'half_open') {
    // Failure in half-open: back to open
    state.state = 'open';
    state.lastStateChange = now;
    return;
  }

  // In closed state, track failures
  state.failures.push(now);

  // Remove old failures outside the window
  state.failures = state.failures.filter(
    ts => now - ts < config.failureWindowMs
  );

  // Check if we should open the circuit
  if (state.failures.length >= config.failureThreshold) {
    state.state = 'open';
    state.lastStateChange = now;
    state.failures = [];
  }
}

/**
 * Get current circuit state for a provider
 */
export function getCircuitState(provider: WeatherProvider): CircuitState {
  return getState(provider).state;
}

/**
 * Get time until circuit will try half-open (0 if not open)
 */
export function getTimeUntilRetry(
  provider: WeatherProvider,
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
): number {
  const state = getState(provider);

  if (state.state !== 'open') {
    return 0;
  }

  const elapsed = Date.now() - state.lastStateChange;
  return Math.max(0, config.recoveryTimeMs - elapsed);
}

/**
 * Force reset a circuit (for testing/admin purposes)
 */
export function resetCircuit(provider: WeatherProvider): void {
  circuitStates.delete(provider);
}

/**
 * Reset all circuits
 */
export function resetAllCircuits(): void {
  circuitStates.clear();
}
