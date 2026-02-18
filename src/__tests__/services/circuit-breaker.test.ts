/**
 * Tests for weather circuit breaker
 *
 * Verifies state transitions: closed → open → half_open → closed/open
 */

import {
  canRequest,
  recordSuccess,
  recordFailure,
  getCircuitState,
  getTimeUntilRetry,
  resetCircuit,
  resetAllCircuits,
} from '@/src/services/weather/circuit-breaker';
import type { CircuitBreakerConfig } from '@/src/services/weather/circuit-breaker';

// Fast config so tests don't need to sleep
const TEST_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  failureWindowMs: 60_000,
  recoveryTimeMs: 30_000,
};

beforeEach(() => {
  resetAllCircuits();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('circuit-breaker', () => {
  // ── Closed state ──────────────────────────────────────────────────────────

  describe('closed state (default)', () => {
    it('allows requests when circuit is closed', () => {
      expect(canRequest('openmeteo', TEST_CONFIG)).toBe(true);
    });

    it('stays closed after fewer failures than threshold', () => {
      recordFailure('openmeteo', TEST_CONFIG);
      recordFailure('openmeteo', TEST_CONFIG);
      expect(getCircuitState('openmeteo')).toBe('closed');
      expect(canRequest('openmeteo', TEST_CONFIG)).toBe(true);
    });

    it('opens after reaching failure threshold', () => {
      recordFailure('openmeteo', TEST_CONFIG);
      recordFailure('openmeteo', TEST_CONFIG);
      recordFailure('openmeteo', TEST_CONFIG); // hits threshold
      expect(getCircuitState('openmeteo')).toBe('open');
    });

    it('successes in closed state prune old failures (sliding window)', () => {
      recordFailure('openmeteo', TEST_CONFIG);
      recordFailure('openmeteo', TEST_CONFIG);
      // Advance time past the failure window so old failures expire
      jest.advanceTimersByTime(TEST_CONFIG.failureWindowMs + 1);
      recordSuccess('openmeteo', TEST_CONFIG); // prunes expired failures
      // One more failure should not open: old two are gone
      recordFailure('openmeteo', TEST_CONFIG);
      expect(getCircuitState('openmeteo')).toBe('closed');
    });
  });

  // ── Open state ────────────────────────────────────────────────────────────

  describe('open state', () => {
    function openCircuit() {
      recordFailure('tomorrow', TEST_CONFIG);
      recordFailure('tomorrow', TEST_CONFIG);
      recordFailure('tomorrow', TEST_CONFIG);
    }

    it('blocks requests while circuit is open', () => {
      openCircuit();
      expect(canRequest('tomorrow', TEST_CONFIG)).toBe(false);
    });

    it('returns positive retry time while open', () => {
      openCircuit();
      const t = getTimeUntilRetry('tomorrow', TEST_CONFIG);
      expect(t).toBeGreaterThan(0);
      expect(t).toBeLessThanOrEqual(TEST_CONFIG.recoveryTimeMs);
    });

    it('transitions to half_open after recovery period', () => {
      openCircuit();
      jest.advanceTimersByTime(TEST_CONFIG.recoveryTimeMs + 1);
      // canRequest triggers the transition
      expect(canRequest('tomorrow', TEST_CONFIG)).toBe(true);
      expect(getCircuitState('tomorrow')).toBe('half_open');
    });

    it('getTimeUntilRetry returns 0 when not open', () => {
      expect(getTimeUntilRetry('openmeteo', TEST_CONFIG)).toBe(0);
    });
  });

  // ── Half-open state ───────────────────────────────────────────────────────

  describe('half_open state', () => {
    function halfOpenCircuit() {
      // Trip circuit
      recordFailure('openmeteo', TEST_CONFIG);
      recordFailure('openmeteo', TEST_CONFIG);
      recordFailure('openmeteo', TEST_CONFIG);
      // Wait for recovery window
      jest.advanceTimersByTime(TEST_CONFIG.recoveryTimeMs + 1);
      // Probe request transitions to half_open
      canRequest('openmeteo', TEST_CONFIG);
    }

    it('closes circuit on success in half_open', () => {
      halfOpenCircuit();
      expect(getCircuitState('openmeteo')).toBe('half_open');
      recordSuccess('openmeteo', TEST_CONFIG);
      expect(getCircuitState('openmeteo')).toBe('closed');
    });

    it('re-opens circuit on failure in half_open', () => {
      halfOpenCircuit();
      expect(getCircuitState('openmeteo')).toBe('half_open');
      recordFailure('openmeteo', TEST_CONFIG);
      expect(getCircuitState('openmeteo')).toBe('open');
    });
  });

  // ── Isolation between providers ───────────────────────────────────────────

  describe('provider isolation', () => {
    it('circuits are independent per provider', () => {
      recordFailure('tomorrow', TEST_CONFIG);
      recordFailure('tomorrow', TEST_CONFIG);
      recordFailure('tomorrow', TEST_CONFIG);

      expect(getCircuitState('tomorrow')).toBe('open');
      expect(getCircuitState('openmeteo')).toBe('closed');
      expect(canRequest('openmeteo', TEST_CONFIG)).toBe(true);
    });
  });

  // ── Reset helpers ─────────────────────────────────────────────────────────

  describe('reset', () => {
    it('resetCircuit restores closed state for one provider', () => {
      recordFailure('tomorrow', TEST_CONFIG);
      recordFailure('tomorrow', TEST_CONFIG);
      recordFailure('tomorrow', TEST_CONFIG);
      expect(getCircuitState('tomorrow')).toBe('open');

      resetCircuit('tomorrow');
      expect(getCircuitState('tomorrow')).toBe('closed');
    });

    it('resetAllCircuits clears all providers', () => {
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
  });
});
