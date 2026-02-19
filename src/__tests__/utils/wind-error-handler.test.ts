import {
  WindErrorType,
  WindError,
  WindErrorFactory,
  WindErrorHandler,
} from '@/src/features/wind/utils/wind-error-handler';

describe('WindError', () => {
  it('should create error with correct type and message', () => {
    const error = new WindError(WindErrorType.INVALID_INPUT, 'bad value');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(WindError);
    expect(error.name).toBe('WindError');
    expect(error.type).toBe(WindErrorType.INVALID_INPUT);
    expect(error.message).toBe('bad value');
    expect(error.context).toBeUndefined();
  });

  it('should store context when provided', () => {
    const ctx = { field: 'windSpeed', value: -5 };
    const error = new WindError(WindErrorType.INVALID_INPUT, 'negative', ctx);
    expect(error.context).toEqual(ctx);
  });
});

describe('WindErrorFactory', () => {
  describe('invalidInput', () => {
    it('should create INVALID_INPUT error with field and value in context', () => {
      const err = WindErrorFactory.invalidInput('bad yardage', 'targetYardage', -10);
      expect(err.type).toBe(WindErrorType.INVALID_INPUT);
      expect(err.message).toBe('bad yardage');
      expect(err.context).toEqual({ field: 'targetYardage', value: -10 });
    });
  });

  describe('invalidClub', () => {
    it('should create INVALID_CLUB error with clubName in context', () => {
      const err = WindErrorFactory.invalidClub('putter');
      expect(err.type).toBe(WindErrorType.INVALID_CLUB);
      expect(err.message).toBe('Invalid or unknown club: putter');
      expect(err.context).toEqual({ clubName: 'putter' });
    });

    it('should merge additional context', () => {
      const err = WindErrorFactory.invalidClub('putter', { message: 'not in bag' });
      expect(err.context).toEqual({ clubName: 'putter', message: 'not in bag' });
    });
  });

  describe('invalidParameters', () => {
    it('should create INVALID_PARAMETERS error', () => {
      const err = WindErrorFactory.invalidParameters('missing func', { functionType: 'undefined' });
      expect(err.type).toBe(WindErrorType.INVALID_PARAMETERS);
      expect(err.message).toBe('missing func');
      expect(err.context).toEqual({ functionType: 'undefined' });
    });

    it('should handle no context', () => {
      const err = WindErrorFactory.invalidParameters('bad params');
      expect(err.context).toBeUndefined();
    });
  });

  describe('calculationFailed', () => {
    it('should create CALCULATION_FAILED error', () => {
      const err = WindErrorFactory.calculationFailed('model returned null', { club: '7-iron' });
      expect(err.type).toBe(WindErrorType.CALCULATION_FAILED);
      expect(err.message).toBe('model returned null');
      expect(err.context).toEqual({ club: '7-iron' });
    });
  });

  describe('sensorUnavailable', () => {
    it('should create SENSOR_UNAVAILABLE error with sensor in message and context', () => {
      const err = WindErrorFactory.sensorUnavailable('compass');
      expect(err.type).toBe(WindErrorType.SENSOR_UNAVAILABLE);
      expect(err.message).toBe('compass sensor is not available on this device');
      expect(err.context).toEqual({ sensor: 'compass' });
    });

    it('should merge additional context', () => {
      const err = WindErrorFactory.sensorUnavailable('gps', { platform: 'web' });
      expect(err.context).toEqual({ sensor: 'gps', platform: 'web' });
    });
  });

  describe('networkError', () => {
    it('should create NETWORK_ERROR error', () => {
      const err = WindErrorFactory.networkError('fetch failed', { url: 'https://api.weather.com' });
      expect(err.type).toBe(WindErrorType.NETWORK_ERROR);
      expect(err.message).toBe('fetch failed');
      expect(err.context).toEqual({ url: 'https://api.weather.com' });
    });
  });
});

describe('WindErrorHandler', () => {
  describe('isWindError', () => {
    it('should return true for WindError instances', () => {
      const err = new WindError(WindErrorType.INVALID_INPUT, 'test');
      expect(WindErrorHandler.isWindError(err)).toBe(true);
    });

    it('should return false for plain Error', () => {
      expect(WindErrorHandler.isWindError(new Error('test'))).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(WindErrorHandler.isWindError('string')).toBe(false);
      expect(WindErrorHandler.isWindError(null)).toBe(false);
      expect(WindErrorHandler.isWindError(undefined)).toBe(false);
      expect(WindErrorHandler.isWindError(42)).toBe(false);
    });

    it('should return false for object with same shape but not instanceof', () => {
      const fake = { name: 'WindError', type: WindErrorType.INVALID_INPUT, message: 'test' };
      expect(WindErrorHandler.isWindError(fake)).toBe(false);
    });
  });

  describe('getUserMessage', () => {
    it('should return correct message for INVALID_INPUT', () => {
      const err = new WindError(WindErrorType.INVALID_INPUT, 'internal detail');
      expect(WindErrorHandler.getUserMessage(err)).toBe('Please check your input values and try again.');
    });

    it('should return correct message for INVALID_CLUB', () => {
      const err = new WindError(WindErrorType.INVALID_CLUB, 'internal detail');
      expect(WindErrorHandler.getUserMessage(err)).toBe(
        'The selected club is not recognized. Please select a different club.'
      );
    });

    it('should return correct message for INVALID_PARAMETERS', () => {
      const err = new WindError(WindErrorType.INVALID_PARAMETERS, 'internal detail');
      expect(WindErrorHandler.getUserMessage(err)).toBe('Invalid calculation parameters. Please try again.');
    });

    it('should return correct message for CALCULATION_FAILED', () => {
      const err = new WindError(WindErrorType.CALCULATION_FAILED, 'internal detail');
      expect(WindErrorHandler.getUserMessage(err)).toBe('Unable to calculate wind effect. Please try again.');
    });

    it('should return correct message for SENSOR_UNAVAILABLE', () => {
      const err = new WindError(WindErrorType.SENSOR_UNAVAILABLE, 'internal detail');
      expect(WindErrorHandler.getUserMessage(err)).toBe('Required sensor is not available on this device.');
    });

    it('should return correct message for NETWORK_ERROR', () => {
      const err = new WindError(WindErrorType.NETWORK_ERROR, 'internal detail');
      expect(WindErrorHandler.getUserMessage(err)).toBe(
        'Network error. Please check your connection and try again.'
      );
    });

    it('should return fallback for unknown error type', () => {
      const err = new WindError('UNKNOWN_TYPE' as WindErrorType, 'weird');
      expect(WindErrorHandler.getUserMessage(err)).toBe('An unexpected error occurred. Please try again.');
    });
  });
});
