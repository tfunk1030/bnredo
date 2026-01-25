// src/services/calculations/wind-calculator.ts

import { YardageModelEnhanced, SkillLevel } from '@/src/core/models/yardagemodel';
import { normalizeClubName } from '@/src/features/settings/utils/club-mapping';
import { EnvironmentalConditions } from '@/src/core/services/environmental-calculations';

// Import the new error handling system
import {
  WindError,
  WindErrorFactory,
  WindErrorHandler,
  WindErrorType
} from '@/src/features/wind/utils/wind-error-handler';

// Re-export for backward compatibility
export { WindErrorType as WindCalculationErrorType } from '@/src/features/wind/utils/wind-error-handler';
export { WindError as WindCalculationError } from '@/src/features/wind/utils/wind-error-handler';

/** Log data type - allows structured objects for type safety */
type LogData = Record<string, unknown> | undefined;

/**
 * Logger interface for wind calculator
 */
export interface WindCalculatorLogger {
  debug: (message: string, data?: LogData) => void;
  info: (message: string, data?: LogData) => void;
  warn: (message: string, data?: LogData) => void;
  error: (message: string, error?: LogData) => void;
}

/**
 * Default logger implementation using console
 */
export const defaultLogger: WindCalculatorLogger = {
  debug: (message: string, data?: LogData) => {
    if (__DEV__) console.debug(`[WindCalculator] ${message}`, data || '');
  },
  info: (message: string, data?: LogData) => {
    if (__DEV__) console.info(`[WindCalculator] ${message}`, data || '');
  },
  warn: (message: string, data?: LogData) => {
    console.warn(`[WindCalculator] ${message}`, data || '');
  },
  error: (message: string, error?: LogData) => {
    console.error(`[WindCalculator] ${message}`, error || '');
  }
};

/**
 * Parameters for wind effect calculation
 */
export interface WindCalculationParams {
  targetYardage: number;
  windSpeed: number;
  windAngle: number;
  clubName: string;
  conditions: EnvironmentalConditions;
  logger?: WindCalculatorLogger;
}

/**
 * Result of wind effect calculation
 */
export interface WindCalculationResult {
  environmentalEffect: number;
  windEffect: number;
  lateralEffect: number;
  totalDistance: number;
  carryDistance: number;
}

/**
 * Result with additional recursive calculation data
 */
export interface RecursiveWindCalculationResult extends WindCalculationResult {
  initialClub: string;
  finalClub: string;
  iterations: number;
  effectivePlayingDistance: number;
  iterationDetails?: Array<{
    iteration: number;
    club: string;
    playingDistance: number;
    environmentalEffect: number;
    windEffect: number;
    convergenceDelta: number;
  }>;
  convergedReason: string;
}

/**
 * Options for recursive wind calculation
 */
export interface RecursiveWindCalculationOptions {
  maxIterations?: number;
  convergenceThreshold?: number | ((distance: number) => number);
  includeIterationDetails?: boolean;
  logger?: WindCalculatorLogger;
}

/**
 * Club recommendation function type
 */
export type ClubRecommendationFunction = (yards: number) => {
  name: string;
  normalYardage: number;
} | null;

/**
 * Calculate wind effect with a specific club
 */
export function calculateWindEffect(params: WindCalculationParams): WindCalculationResult | null {
  const { targetYardage, windSpeed, windAngle, clubName, conditions, logger = defaultLogger } = params;

  // Validate input parameters
  if (!targetYardage || targetYardage <= 0) {
    logger.error('Invalid target yardage', { targetYardage });
    return null;
  }

  if (windSpeed < 0) {
    logger.error('Invalid wind speed', { windSpeed });
    return null;
  }

  // Create model instance
  const yardageModel = new YardageModelEnhanced();

  try {
    const clubKey = normalizeClubName(clubName);
    if (!clubKey || !yardageModel.clubExists(clubKey)) {
      logger.error('Invalid club name or club does not exist', { clubName, clubKey });
      return null;
    }

    // Set up model
    yardageModel.setBallModel('tour_premium');

    // Calculate environmental effect without wind
    yardageModel.setConditions(
      conditions.temperature,
      conditions.altitude,
      0, // No wind
      0, // No wind direction
      conditions.pressure,
      conditions.humidity
    );

    const envResult = yardageModel.calculateAdjustedYardage(
      targetYardage,
      SkillLevel.PROFESSIONAL,
      clubKey
    );

    if (!envResult) {
      logger.error('Environmental calculation failed', { clubKey, targetYardage });
      return null;
    }

    // Calculate with wind using relative angle
    const normalizedWindAngle = (windAngle + 360) % 360;

    yardageModel.setConditions(
      conditions.temperature,
      conditions.altitude,
      windSpeed,
      normalizedWindAngle,
      conditions.pressure,
      conditions.humidity
    );

    const windResult = yardageModel.calculateAdjustedYardage(
      targetYardage,
      SkillLevel.PROFESSIONAL,
      clubKey
    );

    if (!windResult) {
      logger.error('Wind calculation failed', { clubKey, targetYardage, windSpeed, windAngle });
      return null;
    }

    const envEffect = -(envResult.carryDistance - targetYardage);
    const windCarryChange = windResult.carryDistance - envResult.carryDistance;
    const windEffect = -windCarryChange;
    const lateralEffect = windResult.lateralMovement;

    // Plays like distance includes BOTH environmental and wind adjustments
    const playsLikeDistance = targetYardage + envEffect + windEffect;

    logger.debug('Wind calculation completed', {
      club: clubName,
      targetYardage,
      envEffect,
      windEffect,
      windCarryChange,
      lateralEffect,
      totalDistance: playsLikeDistance,
      carryDistance: windResult.carryDistance
    });

    return {
      environmentalEffect: envEffect,
      windEffect: windEffect,
      lateralEffect: lateralEffect,
      totalDistance: playsLikeDistance,
      carryDistance: windResult.carryDistance,
    };
  } catch (error) {
    const errorInfo = error instanceof Error ? { message: error.message, name: error.name } : { error: String(error) };
    logger.error('Error in wind effect calculation', errorInfo);
    return null;
  }
}

/**
 * Get adaptive convergence threshold based on distance
 * Shorter distances require tighter convergence
 */
function getAdaptiveConvergenceThreshold(distance: number): number {
  if (distance < 100) return 1; // 1 yard for short shots
  if (distance < 200) return 2; // 2 yards for mid-range shots
  return 3; // 3 yards for long shots
}

/**
 * Calculate wind effect with recursive club selection
 * This iteratively selects clubs based on effective playing distance
 */
export function calculateWindEffectRecursive(
  params: WindCalculationParams,
  getRecommendedClub: ClubRecommendationFunction,
  options: RecursiveWindCalculationOptions = {}
): RecursiveWindCalculationResult | null {
  const {
    targetYardage,
    windSpeed,
    windAngle,
    clubName: initialClubName,
    conditions,
    logger = defaultLogger
  } = params;

  const {
    maxIterations = 3,
    convergenceThreshold = getAdaptiveConvergenceThreshold,
    includeIterationDetails = false
  } = options;

  // Validate input parameters
  if (!targetYardage || targetYardage <= 0) {
    throw WindErrorFactory.invalidInput(
      'Invalid target yardage',
      'targetYardage',
      targetYardage
    );
  }

  if (windSpeed < 0) {
    throw WindErrorFactory.invalidInput(
      'Invalid wind speed',
      'windSpeed',
      windSpeed
    );
  }

  if (!initialClubName) {
    throw WindErrorFactory.invalidClub(
      initialClubName || 'undefined',
      { message: 'Club name is required' }
    );
  }

  if (!getRecommendedClub || typeof getRecommendedClub !== 'function') {
    throw WindErrorFactory.invalidParameters(
      'Valid club recommendation function is required',
      { functionType: typeof getRecommendedClub }
    );
  }

  let iterations = 0;
  let currentClubName = initialClubName;
  let previousPlayingDistance = targetYardage;
  let currentPlayingDistance = targetYardage;
  let finalResult: WindCalculationResult | null = null;
  let convergedReason = 'unknown';

  // Store iteration details if requested
  const iterationDetails: Array<{
    iteration: number;
    club: string;
    playingDistance: number;
    environmentalEffect: number;
    windEffect: number;
    convergenceDelta: number;
  }> = [];

  logger.info(
    `Starting recursive wind calculation for ${targetYardage} yards with ${windSpeed}mph wind at ${windAngle}°`,
    { initialClub: initialClubName }
  );

  // Recursive calculation loop
  while (iterations < maxIterations) {
    iterations++;

    // Calculate with current club
    const result = calculateWindEffect({
      targetYardage,
      windSpeed,
      windAngle,
      clubName: currentClubName,
      conditions,
      logger
    });

    if (!result) {
      logger.error(`Club calculation failed for ${currentClubName}`);
      throw WindErrorFactory.calculationFailed(
        `Calculation failed for club ${currentClubName}`,
        { iteration: iterations, club: currentClubName }
      );
    }

    // Store the result of the last calculation
    finalResult = result;

    // Calculate effective playing distance
    currentPlayingDistance = targetYardage + result.environmentalEffect + result.windEffect;
    const convergenceDelta = Math.abs(currentPlayingDistance - previousPlayingDistance);

    // Store iteration details if requested
    if (includeIterationDetails) {
      iterationDetails.push({
        iteration: iterations,
        club: currentClubName,
        playingDistance: currentPlayingDistance,
        environmentalEffect: result.environmentalEffect,
        windEffect: result.windEffect,
        convergenceDelta
      });
    }

    logger.info(
      `Iteration ${iterations}: ${targetYardage} yards plays like ${Math.round(
        currentPlayingDistance
      )} yards with ${currentClubName}`,
      {
        delta: convergenceDelta,
        environmentalEffect: result.environmentalEffect,
        windEffect: result.windEffect
      }
    );

    // Determine convergence threshold (either fixed or adaptive)
    const threshold = typeof convergenceThreshold === 'function'
      ? convergenceThreshold(targetYardage)
      : convergenceThreshold;

    // If the change is minimal, we've converged on a solution
    if (convergenceDelta < threshold) {
      logger.info(`Converged - distance change under threshold (${threshold} yards)`);
      convergedReason = 'distance_threshold';
      break;
    }

    // Get new recommended club based on effective playing distance
    const newRecommendedClub = getRecommendedClub(currentPlayingDistance);
    if (!newRecommendedClub) {
      logger.warn(`No recommended club for ${currentPlayingDistance} yards`);
      convergedReason = 'no_club_recommendation';
      break;
    }

    // If club hasn't changed, we're done
    if (newRecommendedClub.name === currentClubName) {
      logger.info(`Club selection stable at ${currentClubName}`);
      convergedReason = 'club_stable';
      break;
    }

    // Update for next iteration
    previousPlayingDistance = currentPlayingDistance;
    currentClubName = newRecommendedClub.name;

    logger.info(`Switching to ${currentClubName} for next iteration`);
  }

  // If we reached max iterations without converging
  if (iterations >= maxIterations) {
    logger.warn(`Reached maximum iterations (${maxIterations}) without convergence`);
    convergedReason = 'max_iterations';
  }

  if (!finalResult) {
    throw WindErrorFactory.calculationFailed(
      'Recursive calculation failed to produce a result'
    );
  }

  return {
    ...finalResult,
    initialClub: initialClubName,
    finalClub: currentClubName,
    iterations,
    effectivePlayingDistance: currentPlayingDistance,
    iterationDetails: includeIterationDetails ? iterationDetails : undefined,
    convergedReason
  };
}
