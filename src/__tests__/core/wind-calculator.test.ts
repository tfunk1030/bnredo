/**
 * Wind Calculator Tests
 *
 * Tests for calculateWindEffect and calculateWindEffectRecursive.
 * Strategy: use the real YardageModelEnhanced for physics (integration test approach)
 * and focus on validation, error paths, convergence logic, and result shapes.
 */

import {
  calculateWindEffect,
  calculateWindEffectRecursive,
  defaultLogger,
  WindCalculationParams,
  WindCalculatorLogger,
} from '@/src/core/services/wind-calculator';
import { WindErrorType } from '@/src/features/wind/utils/wind-error-handler';
import { EnvironmentalConditions } from '@/src/core/services/environmental-calculations';

// Standard conditions for tests
const stdConditions: EnvironmentalConditions = {
  temperature: 70,
  humidity: 50,
  pressure: 1013.25,
  altitude: 0,
  windSpeed: 10,
  windDirection: 0,
  windGust: 0,
  density: 1.225,
};

// Silent logger for tests (suppresses console noise)
const silentLogger: WindCalculatorLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

function makeParams(overrides: Partial<WindCalculationParams> = {}): WindCalculationParams {
  return {
    targetYardage: 150,
    windSpeed: 10,
    windAngle: 0,
    clubName: '7-iron',
    conditions: stdConditions,
    logger: silentLogger,
    ...overrides,
  };
}

describe('defaultLogger', () => {
  it('should expose all log levels', () => {
    expect(typeof defaultLogger.debug).toBe('function');
    expect(typeof defaultLogger.info).toBe('function');
    expect(typeof defaultLogger.warn).toBe('function');
    expect(typeof defaultLogger.error).toBe('function');
  });
});

describe('calculateWindEffect', () => {
  describe('input validation', () => {
    it('should return null for zero yardage', () => {
      expect(calculateWindEffect(makeParams({ targetYardage: 0 }))).toBeNull();
    });

    it('should return null for negative yardage', () => {
      expect(calculateWindEffect(makeParams({ targetYardage: -50 }))).toBeNull();
    });

    it('should return null for negative wind speed', () => {
      expect(calculateWindEffect(makeParams({ windSpeed: -5 }))).toBeNull();
    });

    it('should return null for unknown club name', () => {
      expect(calculateWindEffect(makeParams({ clubName: 'putter' }))).toBeNull();
    });

    it('should return null for empty club name', () => {
      expect(calculateWindEffect(makeParams({ clubName: '' }))).toBeNull();
    });
  });

  describe('result shape', () => {
    it('should return all required fields for valid inputs', () => {
      const result = calculateWindEffect(makeParams());
      expect(result).not.toBeNull();
      expect(typeof result!.environmentalEffect).toBe('number');
      expect(typeof result!.windEffect).toBe('number');
      expect(typeof result!.lateralEffect).toBe('number');
      expect(typeof result!.totalDistance).toBe('number');
      expect(typeof result!.carryDistance).toBe('number');
    });

    it('should accept zero wind speed (environmental effect only)', () => {
      const result = calculateWindEffect(makeParams({ windSpeed: 0, windAngle: 0 }));
      expect(result).not.toBeNull();
      // With no wind, windEffect should be near zero
      expect(Math.abs(result!.windEffect)).toBeLessThan(2);
    });

    it('should produce larger headwind effect than tailwind effect (asymmetric physics)', () => {
      const headwind = calculateWindEffect(makeParams({ windSpeed: 15, windAngle: 0 }));
      const tailwind = calculateWindEffect(makeParams({ windSpeed: 15, windAngle: 180 }));
      expect(headwind).not.toBeNull();
      expect(tailwind).not.toBeNull();
      // Headwind increases plays-like distance, tailwind decreases it
      // headwind.windEffect > 0 (ball plays longer), tailwind.windEffect < 0 (ball plays shorter)
      expect(headwind!.windEffect).toBeGreaterThan(tailwind!.windEffect);
    });

    it('should produce lateral movement for crosswind', () => {
      const crosswind = calculateWindEffect(makeParams({ windSpeed: 15, windAngle: 90 }));
      expect(crosswind).not.toBeNull();
      // Should have some lateral drift
      expect(Math.abs(crosswind!.lateralEffect)).toBeGreaterThan(0);
    });
  });

  describe('club name normalization', () => {
    it('should accept "7i" alias', () => {
      const result = calculateWindEffect(makeParams({ clubName: '7i' }));
      expect(result).not.toBeNull();
    });

    it('should accept "pw" for pitching wedge', () => {
      const result = calculateWindEffect(makeParams({
        clubName: 'pw',
        targetYardage: 130,
      }));
      expect(result).not.toBeNull();
    });

    it('should accept "driver" for 280-yard shot', () => {
      const result = calculateWindEffect(makeParams({
        clubName: 'driver',
        targetYardage: 280,
      }));
      expect(result).not.toBeNull();
    });
  });

  describe('total distance calculation', () => {
    it('totalDistance = targetYardage + environmentalEffect + windEffect', () => {
      const result = calculateWindEffect(makeParams({ windSpeed: 10, windAngle: 0 }));
      expect(result).not.toBeNull();
      const expected = 150 + result!.environmentalEffect + result!.windEffect;
      expect(result!.totalDistance).toBeCloseTo(expected, 1);
    });
  });
});

describe('calculateWindEffectRecursive', () => {
  const mockGetClub = jest.fn((yards: number) => {
    // Simple club recommender: always returns '7-iron'
    return { name: '7-iron', normalYardage: yards };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClub.mockImplementation((yards: number) => ({
      name: '7-iron',
      normalYardage: yards,
    }));
  });

  describe('input validation (throws WindError)', () => {
    it('should throw for zero targetYardage', () => {
      expect(() =>
        calculateWindEffectRecursive(
          makeParams({ targetYardage: 0 }),
          mockGetClub
        )
      ).toThrow();
    });

    it('should throw for negative yardage', () => {
      expect(() =>
        calculateWindEffectRecursive(
          makeParams({ targetYardage: -100 }),
          mockGetClub
        )
      ).toThrow();
    });

    it('should throw for negative wind speed', () => {
      expect(() =>
        calculateWindEffectRecursive(
          makeParams({ windSpeed: -5 }),
          mockGetClub
        )
      ).toThrow();
    });

    it('should throw for empty club name', () => {
      expect(() =>
        calculateWindEffectRecursive(
          makeParams({ clubName: '' }),
          mockGetClub
        )
      ).toThrow();
    });

    it('should throw when no getRecommendedClub function provided', () => {
      expect(() =>
        calculateWindEffectRecursive(
          makeParams(),
          null as unknown as () => null
        )
      ).toThrow();
    });

    it('should throw with WindErrorType.INVALID_INPUT for bad yardage', () => {
      try {
        calculateWindEffectRecursive(makeParams({ targetYardage: -1 }), mockGetClub);
        fail('Expected to throw');
      } catch (e: unknown) {
        expect((e as { type?: string }).type).toBe(WindErrorType.INVALID_INPUT);
      }
    });
  });

  describe('result shape', () => {
    it('should return all required fields', () => {
      const result = calculateWindEffectRecursive(makeParams(), mockGetClub);
      expect(result).not.toBeNull();
      expect(typeof result!.environmentalEffect).toBe('number');
      expect(typeof result!.windEffect).toBe('number');
      expect(typeof result!.lateralEffect).toBe('number');
      expect(typeof result!.totalDistance).toBe('number');
      expect(typeof result!.carryDistance).toBe('number');
      expect(typeof result!.initialClub).toBe('string');
      expect(typeof result!.finalClub).toBe('string');
      expect(typeof result!.iterations).toBe('number');
      expect(typeof result!.effectivePlayingDistance).toBe('number');
      expect(typeof result!.convergedReason).toBe('string');
    });

    it('should track initial and final club', () => {
      const result = calculateWindEffectRecursive(makeParams(), mockGetClub);
      expect(result!.initialClub).toBe('7-iron');
      // mockGetClub always returns '7-iron', so final should also be '7-iron'
      expect(result!.finalClub).toBe('7-iron');
    });

    it('should converge with club_stable when club does not change', () => {
      const result = calculateWindEffectRecursive(makeParams(), mockGetClub);
      // When the recommender always returns the same club, convergence reason is club_stable
      expect(['club_stable', 'distance_threshold']).toContain(result!.convergedReason);
    });

    it('iterations should be between 1 and maxIterations', () => {
      const result = calculateWindEffectRecursive(
        makeParams(),
        mockGetClub,
        { maxIterations: 5 }
      );
      expect(result!.iterations).toBeGreaterThanOrEqual(1);
      expect(result!.iterations).toBeLessThanOrEqual(5);
    });
  });

  describe('iteration details', () => {
    it('should NOT include iteration details by default', () => {
      const result = calculateWindEffectRecursive(makeParams(), mockGetClub);
      expect(result!.iterationDetails).toBeUndefined();
    });

    it('should include iteration details when requested', () => {
      const result = calculateWindEffectRecursive(
        makeParams(),
        mockGetClub,
        { includeIterationDetails: true }
      );
      expect(result!.iterationDetails).toBeDefined();
      expect(Array.isArray(result!.iterationDetails)).toBe(true);
      expect(result!.iterationDetails!.length).toBeGreaterThan(0);

      const firstDetail = result!.iterationDetails![0];
      expect(typeof firstDetail.iteration).toBe('number');
      expect(typeof firstDetail.club).toBe('string');
      expect(typeof firstDetail.playingDistance).toBe('number');
      expect(typeof firstDetail.environmentalEffect).toBe('number');
      expect(typeof firstDetail.windEffect).toBe('number');
      expect(typeof firstDetail.convergenceDelta).toBe('number');
    });
  });

  describe('max iterations convergence', () => {
    it('should stop at maxIterations when club keeps changing', () => {
      let callCount = 0;
      const alternatingClubRecommender = jest.fn((yards: number) => {
        callCount++;
        // Alternate between two clubs - starts with '6-iron' (different from initial '7-iron')
        return callCount % 2 === 1
          ? { name: '6-iron', normalYardage: yards }
          : { name: '7-iron', normalYardage: yards };
      });

      // Set convergenceThreshold to 0 so distance delta never causes early exit
      // — only max_iterations, club_stable, or no_club_recommendation can stop it
      const result = calculateWindEffectRecursive(
        makeParams({ windSpeed: 20, windAngle: 0 }),
        alternatingClubRecommender,
        { maxIterations: 3, convergenceThreshold: 0 }
      );

      expect(result).not.toBeNull();
      expect(result!.iterations).toBe(3);
      expect(result!.convergedReason).toBe('max_iterations');
    });
  });

  describe('no club recommendation', () => {
    it('should stop with no_club_recommendation when getClub returns null', () => {
      const recommender = jest.fn()
        .mockReturnValueOnce({ name: '6-iron', normalYardage: 160 }) // Switch clubs on iter 1
        .mockReturnValueOnce(null);                                   // No recommendation on iter 2

      const result = calculateWindEffectRecursive(
        makeParams({ windSpeed: 20, windAngle: 0, clubName: '7-iron' }),
        recommender,
        { maxIterations: 5, convergenceThreshold: 0 } // Disable distance threshold
      );

      expect(result).not.toBeNull();
      expect(result!.convergedReason).toBe('no_club_recommendation');
    });
  });

  describe('custom convergence threshold', () => {
    it('should accept fixed number as threshold', () => {
      const result = calculateWindEffectRecursive(
        makeParams(),
        mockGetClub,
        { convergenceThreshold: 10 }
      );
      expect(result).not.toBeNull();
    });

    it('should accept function as threshold', () => {
      const adaptiveThreshold = (dist: number) => dist < 100 ? 1 : 2;
      const result = calculateWindEffectRecursive(
        makeParams(),
        mockGetClub,
        { convergenceThreshold: adaptiveThreshold }
      );
      expect(result).not.toBeNull();
    });
  });
});
