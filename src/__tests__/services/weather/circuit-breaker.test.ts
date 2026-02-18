/**
 * Circuit Breaker Tests
 * Covers all state transitions: closed → open → half-open → closed/open
 *
 * Uses jest fake timers to control time-based state transitions
 */

import {
  canRequest,
  recordSuccess,
  recordFailure,
  getCircuitState,
  getTimeUntilRetry,
  resetCircuit,
  resetAllCircuits,
  CircuitBreakerConfig,
} from '@/src/services/weather/circuit-breaker';

// Tight config for faster testing
const TEST_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  failureWindowMs: 10000,   // 10 seconds
  recoveryTimeMs: 5000,     // 5 seconds
};

beforeEach(() => {
  resetAllCircuits();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Initial State ────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts in closed state for a new provider', () => {
    expect(getCircuitState('openmeteo')).toBe('closed');
  });

  it('starts in closed state for tomorrow provider', () => {
    expect(getCircuitState('tomorrow')).toBe('closed');
  });

  it('allows requests in closed state', () => {
    expect(canRequest('openmeteo', TEST_CONFIG)).toBe(true);
  });

  it('tracks separate state per provider', () => {
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG); // opens openmeteo
    expect(getCircuitState('openmeteo')).toBe('open');
    expect(getCircuitState('tomorrow')).toBe('closed'); // tomorrow unaffected
  });
});

// ─── Closed State ─────────────────────────────────────────────────────────────

describe('closed state', () => {
  it('stays closed after fewer failures than threshold', () => {
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    // threshold is 3, only 2 failures
    expect(getCircuitState('openmeteo')).toBe('closed');
    expect(canRequest('openmeteo', TEST_CONFIG)).toBe(true);
  });

  it('opens after hitting failure threshold', () => {
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    expect(getCircuitState('openmeteo')).toBe('open');
  });

  it('discards failures outside the time window', () => {
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);

    // Advance time past failure window
    jest.advanceTimersByTime(TEST_CONFIG.failureWindowMs + 1);

    // These old failures should be discarded, so 2 new ones = 2 total (< threshold)
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    expect(getCircuitState('openmeteo')).toBe('closed');
  });

  it('success in closed state clears old failures (pruning)', () => {
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    recordSuccess('openmeteo', TEST_CONFIG);
    // Success prunes stale failures; still closed
    expect(getCircuitState('openmeteo')).toBe('closed');
  });

  it('failure count resets after opening and re-closing', () => {
    // Open the circuit
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    expect(getCircuitState('openmeteo')).toBe('open');

    // Wait for recovery → half-open
    jest.advanceTimersByTime(TEST_CONFIG.recoveryTimeMs + 1);
    canRequest('openmeteo', TEST_CONFIG); // triggers half-open transition
    expect(getCircuitState('openmeteo')).toBe('half_open');

    // Success → closed again
    recordSuccess('openmeteo', TEST_CONFIG);
    expect(getCircuitState('openmeteo')).toBe('closed');
  });
});

// ─── Open State ───────────────────────────────────────────────────────────────

describe('open state', () => {
  beforeEach(() => {
    // Get the circuit open
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
  });

  it('blocks requests in open state', () => {
    expect(canRequest('openmeteo', TEST_CONFIG)).toBe(false);
  });

  it('continues blocking before recovery time', () => {
    jest.advanceTimersByTime(TEST_CONFIG.recoveryTimeMs - 100);
    expect(canRequest('openmeteo', TEST_CONFIG)).toBe(false);
  });

  it('transitions to half-open after recovery time', () => {
    jest.advanceTimersByTime(TEST_CONFIG.recoveryTimeMs + 1);
    const allowed = canRequest('openmeteo', TEST_CONFIG);
    expect(allowed).toBe(true);
    expect(getCircuitState('openmeteo')).toBe('half_open');
  });

  it('getTimeUntilRetry returns remaining recovery time', () => {
    const timeUntil = getTimeUntilRetry('openmeteo', TEST_CONFIG);
    expect(timeUntil).toBeGreaterThan(0);
    expect(timeUntil).toBeLessThanOrEqual(TEST_CONFIG.recoveryTimeMs);
  });

  it('getTimeUntilRetry decreases as time passes', () => {
    const before = getTimeUntilRetry('openmeteo', TEST_CONFIG);
    jest.advanceTimersByTime(1000);
    const after = getTimeUntilRetry('openmeteo', TEST_CONFIG);
    expect(after).toBeLessThan(before);
  });

  it('getTimeUntilRetry returns 0 after recovery time', () => {
    jest.advanceTimersByTime(TEST_CONFIG.recoveryTimeMs + 1);
    canRequest('openmeteo', TEST_CONFIG); // transitions to half-open
    expect(getTimeUntilRetry('openmeteo', TEST_CONFIG)).toBe(0);
  });
});

// ─── Half-Open State ─────────────────────────────────────────────────────────

describe('half-open state', () => {
  beforeEach(() => {
    // Open the circuit then advance to recovery
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    jest.advanceTimersByTime(TEST_CONFIG.recoveryTimeMs + 1);
    canRequest('openmeteo', TEST_CONFIG); // triggers half-open
    expect(getCircuitState('openmeteo')).toBe('half_open');
  });

  it('allows request in half-open state', () => {
    expect(canRequest('openmeteo', TEST_CONFIG)).toBe(true);
  });

  it('transitions to closed on success', () => {
    recordSuccess('openmeteo', TEST_CONFIG);
    expect(getCircuitState('openmeteo')).toBe('closed');
  });

  it('transitions back to open on failure', () => {
    recordFailure('openmeteo', TEST_CONFIG);
    expect(getCircuitState('openmeteo')).toBe('open');
  });

  it('allows fresh requests after recovering to closed', () => {
    recordSuccess('openmeteo', TEST_CONFIG);
    expect(canRequest('openmeteo', TEST_CONFIG)).toBe(true);
  });

  it('blocks requests again after half-open failure', () => {
    recordFailure('openmeteo', TEST_CONFIG);
    expect(canRequest('openmeteo', TEST_CONFIG)).toBe(false);
  });

  it('getTimeUntilRetry returns 0 in half-open state', () => {
    expect(getTimeUntilRetry('openmeteo', TEST_CONFIG)).toBe(0);
  });
});

// ─── getTimeUntilRetry ───────────────────────────────────────────────────────

describe('getTimeUntilRetry', () => {
  it('returns 0 for closed state', () => {
    expect(getTimeUntilRetry('openmeteo', TEST_CONFIG)).toBe(0);
  });

  it('returns 0 for closed state even after failures below threshold', () => {
    recordFailure('openmeteo', TEST_CONFIG);
    expect(getTimeUntilRetry('openmeteo', TEST_CONFIG)).toBe(0);
  });
});

// ─── Reset Functions ─────────────────────────────────────────────────────────

describe('resetCircuit', () => {
  it('resets an open circuit back to closed', () => {
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    expect(getCircuitState('openmeteo')).toBe('open');

    resetCircuit('openmeteo');
    expect(getCircuitState('openmeteo')).toBe('closed');
  });

  it('allows requests again after reset', () => {
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    resetCircuit('openmeteo');
    expect(canRequest('openmeteo', TEST_CONFIG)).toBe(true);
  });

  it('does not affect other providers', () => {
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('tomorrow', TEST_CONFIG);
    recordFailure('tomorrow', TEST_CONFIG);
    recordFailure('tomorrow', TEST_CONFIG);

    resetCircuit('openmeteo');
    expect(getCircuitState('openmeteo')).toBe('closed');
    expect(getCircuitState('tomorrow')).toBe('open'); // unaffected
  });
});

describe('resetAllCircuits', () => {
  it('resets all providers to closed', () => {
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('tomorrow', TEST_CONFIG);
    recordFailure('tomorrow', TEST_CONFIG);
    recordFailure('tomorrow', TEST_CONFIG);

    resetAllCircuits();
    expect(getCircuitState('openmeteo')).toBe('closed');
    expect(getCircuitState('tomorrow')).toBe('closed');
  });

  it('allows requests for all providers after reset', () => {
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    resetAllCircuits();
    expect(canRequest('openmeteo', TEST_CONFIG)).toBe(true);
    expect(canRequest('tomorrow', TEST_CONFIG)).toBe(true);
  });
});

// ─── Default Config ───────────────────────────────────────────────────────────

describe('default config', () => {
  it('uses default config when none provided (threshold=3)', () => {
    recordFailure('openmeteo');
    recordFailure('openmeteo');
    expect(getCircuitState('openmeteo')).toBe('closed');
    recordFailure('openmeteo');
    expect(getCircuitState('openmeteo')).toBe('open');
  });

  it('canRequest uses default config', () => {
    expect(canRequest('openmeteo')).toBe(true);
  });
});

// ─── Multiple Open/Close Cycles ──────────────────────────────────────────────

describe('multiple cycles', () => {
  it('handles repeated open/close cycles correctly', () => {
    for (let cycle = 0; cycle < 3; cycle++) {
      // Trigger open
      recordFailure('openmeteo', TEST_CONFIG);
      recordFailure('openmeteo', TEST_CONFIG);
      recordFailure('openmeteo', TEST_CONFIG);
      expect(getCircuitState('openmeteo')).toBe('open');

      // Wait for half-open
      jest.advanceTimersByTime(TEST_CONFIG.recoveryTimeMs + 1);
      canRequest('openmeteo', TEST_CONFIG);
      expect(getCircuitState('openmeteo')).toBe('half_open');

      // Recover
      recordSuccess('openmeteo', TEST_CONFIG);
      expect(getCircuitState('openmeteo')).toBe('closed');
    }
  });

  it('handles yo-yo between half-open and open', () => {
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);
    recordFailure('openmeteo', TEST_CONFIG);

    for (let i = 0; i < 3; i++) {
      jest.advanceTimersByTime(TEST_CONFIG.recoveryTimeMs + 1);
      canRequest('openmeteo', TEST_CONFIG);
      expect(getCircuitState('openmeteo')).toBe('half_open');
      recordFailure('openmeteo', TEST_CONFIG);
      expect(getCircuitState('openmeteo')).toBe('open');
    }

    // Eventually recovers
    jest.advanceTimersByTime(TEST_CONFIG.recoveryTimeMs + 1);
    canRequest('openmeteo', TEST_CONFIG);
    recordSuccess('openmeteo', TEST_CONFIG);
    expect(getCircuitState('openmeteo')).toBe('closed');
  });
});
