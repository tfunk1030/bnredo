/**
 * Weather Service Types
 * Normalized interfaces for multi-provider weather data
 */

export type WeatherProvider = 'tomorrow' | 'openmeteo';

export type CacheFreshness =
  | 'fresh'      // < 5 min, serve immediately
  | 'stale'      // 5-30 min, serve + revalidate
  | 'emergency'  // 30 min - 2 hr, serve with warning
  | 'expired';   // > 2 hr, must fetch fresh

export interface NormalizedWeather {
  temperature: number;      // °F
  humidity: number;         // %
  pressure: number;         // hPa (station pressure)
  windSpeed: number;        // mph
  windDirection: number;    // degrees (0-360)
  windGust: number;         // mph
  altitude: number;         // feet
  locationName: string;
  latitude: number;
  longitude: number;
  observationTime: string;  // ISO timestamp
  source: WeatherProvider;
  isManualOverride: boolean;
}

export interface WeatherSettings {
  enableMultiProvider: boolean;
  primaryProvider: WeatherProvider;
  fallbackOrder: WeatherProvider[];
  timeout: number;  // ms per provider
}

export const DEFAULT_WEATHER_SETTINGS: WeatherSettings = {
  enableMultiProvider: false,
  primaryProvider: 'openmeteo',
  fallbackOrder: ['tomorrow', 'openmeteo'],
  timeout: 10000,
};

// Error classification for retry logic
export const RETRYABLE_HTTP_CODES = [408, 429, 500, 502, 503, 504];
export const FATAL_HTTP_CODES = [400, 401, 403, 404, 405, 422];

export type WeatherErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'API_ERROR'
  | 'PARSE_ERROR'
  | 'INVALID_RESPONSE'
  | 'PROVIDER_DOWN'
  | 'ALL_PROVIDERS_FAILED';

export class WeatherError extends Error {
  constructor(
    public readonly code: WeatherErrorCode,
    message: string,
    public readonly provider?: WeatherProvider,
    public readonly httpStatus?: number,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'WeatherError';
  }

  static fromHttpStatus(
    status: number,
    message: string,
    provider: WeatherProvider
  ): WeatherError {
    const isRetryable = RETRYABLE_HTTP_CODES.includes(status);

    let code: WeatherErrorCode;
    if (status === 429) {
      code = 'RATE_LIMITED';
    } else if (status >= 500) {
      code = 'PROVIDER_DOWN';
    } else {
      code = 'API_ERROR';
    }

    return new WeatherError(code, message, provider, status, isRetryable);
  }
}

export interface CachedWeather extends NormalizedWeather {
  cachedAt: string;  // ISO timestamp
  freshness: CacheFreshness;
}

export interface ProviderResult {
  success: boolean;
  data?: NormalizedWeather;
  error?: WeatherError;
  provider: WeatherProvider;
  durationMs: number;
}
