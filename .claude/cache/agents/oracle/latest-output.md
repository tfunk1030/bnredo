# Research Report: Multi-Provider Weather API Fallback Systems for Mobile Apps
Generated: 2026-01-28

## Summary

Implementing a robust multi-provider weather API fallback system requires five key components: (1) exponential backoff with jitter for retry strategies, (2) circuit breaker pattern to prevent cascade failures, (3) stale-while-revalidate caching for offline support, (4) proper error classification to distinguish retryable from fatal errors, and (5) battery-conscious location and fetch strategies for mobile. The current bnredo implementation is missing most of these patterns and would benefit significantly from the structured approach outlined below.

---

## Questions Answered

### Q1: What are best practices for retry strategies and timeouts?
**Answer:** Use exponential backoff with jitter. Start at 1 second, double each attempt, cap at 30-60 seconds. Add random jitter (0-1000ms) to prevent thundering herd. Set request timeouts at 6-10 seconds for weather APIs.
**Source:** [AWS Retry with Backoff Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html), [Better Stack Exponential Backoff Guide](https://betterstack.com/community/guides/monitoring/exponential-backoff/)
**Confidence:** High

### Q2: What caching strategies work best for weather data?
**Answer:** Use stale-while-revalidate with tiered freshness: 5-minute fresh window, 30-minute stale-but-usable window, 2-hour emergency fallback. Separate cache entries per location with distance-based invalidation.
**Source:** [web.dev Stale-While-Revalidate](https://web.dev/articles/stale-while-revalidate), [MDN PWA Caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching)
**Confidence:** High

### Q3: How should rate limiting be handled?
**Answer:** Implement circuit breaker pattern with three states (closed, open, half-open). After 3-5 consecutive failures, open the circuit for 30-60 seconds. Check for `Retry-After` header and `X-RateLimit-*` headers. Track rate limits per provider separately.
**Source:** [Microservices Circuit Breaker Pattern](https://microservices.io/patterns/reliability/circuit-breaker.html), [Medium: API Circuit Breaker in iOS](https://medium.com/@adarsh.ranjan/api-circuit-breaker-in-ios-a-beginners-comprehensive-guide-7973e6d3ebd5)
**Confidence:** High

### Q4: How to classify errors as retryable vs fatal?
**Answer:** Retryable: 408, 429, 500, 502, 503, 504, network timeouts. Fatal: 400, 401, 403, 404, 405, 422. Special case: 409 (conflict) may be retryable after delay.
**Source:** [Baeldung: HTTP Error Status Codes Retry](https://www.baeldung.com/cs/http-error-status-codes-retry), [REST API Tutorial: HTTP Status Codes and Retry](https://www.restapitutorial.com/advanced/responses/retries)
**Confidence:** High

### Q5: What offline support patterns work best?
**Answer:** Three-tier fallback: (1) Fresh cache (< 5 min), (2) Stale cache with "last updated" indicator, (3) Default/reasonable values with clear UI indication. Always show data age to user.
**Source:** [PWA Offline Functionality Checklist](https://www.zeepalm.com/blog/pwa-offline-functionality-caching-strategies-checklist)
**Confidence:** High

### Q6: How to optimize battery for location/weather updates?
**Answer:** Use adaptive intervals based on app state (foreground: 5 min, background: 15-30 min). Implement geofencing to trigger updates only on significant location change (> 2km for weather). Respect Low Power Mode by reducing/stopping background fetches.
**Source:** [DEV: React Native Background Tasks 2026](https://dev.to/eira-wexford/run-react-native-background-tasks-2026-for-optimal-performance-d26), [Medium: Track User Location Without Killing Battery](https://medium.com/@mohantaankit2002/track-user-location-without-killing-their-battery-a-react-native-guide-d57f29fd2ebe)
**Confidence:** High

---

## Detailed Findings

### Finding 1: Exponential Backoff with Jitter

**Source:** [Better Stack: Mastering Exponential Backoff](https://betterstack.com/community/guides/monitoring/exponential-backoff/)

**Key Points:**
- Base formula: `delay = min(cap, base * 2^attempt)`
- Add jitter: `delay = delay + random(0, 1000ms)`
- Prevents synchronized retry waves from multiple clients
- Recommended cap: 30-60 seconds for weather APIs

**Code Example:**
```typescript
// src/services/weather/retry-strategy.ts
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterMs: 1000,
};

export function calculateBackoff(attempt: number, config: RetryConfig): number {
  const exponentialDelay = Math.min(
    config.maxDelayMs,
    config.baseDelayMs * Math.pow(2, attempt)
  );
  const jitter = Math.random() * config.jitterMs;
  return exponentialDelay + jitter;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  isRetryable: (error: unknown) => boolean = defaultIsRetryable
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (!isRetryable(error) || attempt === config.maxAttempts - 1) {
        throw error;
      }
      
      const delay = calculateBackoff(attempt, config);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
```

### Finding 2: Circuit Breaker Pattern

**Source:** [Microservices.io: Circuit Breaker](https://microservices.io/patterns/reliability/circuit-breaker.html)

**Key Points:**
- Three states: Closed (normal), Open (failing fast), Half-Open (testing recovery)
- Track failure rate per provider independently
- Open circuit after threshold (e.g., 3 failures in 60 seconds)
- Half-open after cooldown period (30-60 seconds)
- Critical for multi-provider systems to avoid cascading failures

**Code Example:**
```typescript
// src/services/weather/circuit-breaker.ts
export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;    // failures before opening
  resetTimeoutMs: number;      // time before half-open
  halfOpenMaxAttempts: number; // test requests in half-open
}

export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 30000,
  halfOpenMaxAttempts: 1,
};

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
  ) {}

  canAttempt(): boolean {
    if (this.state === 'closed') return true;
    
    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.resetTimeoutMs) {
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
        return true;
      }
      return false;
    }
    
    // half-open: allow limited attempts
    return this.halfOpenAttempts < this.config.halfOpenMaxAttempts;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        this.state = 'open';
      }
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
```

### Finding 3: Error Classification

**Source:** [Baeldung: HTTP Error Status Codes Retry](https://www.baeldung.com/cs/http-error-status-codes-retry)

**Key Points:**
- 4xx errors generally NOT retryable (client error)
- 5xx errors generally retryable (server error)
- Special handling for 429 (rate limit) - use Retry-After header
- Network errors (timeout, DNS) are retryable
- Parse error should be treated as fatal for that provider

**Code Example:**
```typescript
// src/services/weather/error-classifier.ts
export type ErrorType = 'retryable' | 'fatal' | 'rate-limited';

export interface ClassifiedError {
  type: ErrorType;
  retryAfterMs?: number;
  message: string;
  originalError: unknown;
}

export function classifyError(error: unknown): ClassifiedError {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return { type: 'retryable', message: 'Network error', originalError: error };
  }
  
  // Timeout errors
  if (error instanceof Error && error.name === 'AbortError') {
    return { type: 'retryable', message: 'Request timeout', originalError: error };
  }
  
  // HTTP errors
  if (error instanceof Response || (error as any)?.status) {
    const status = (error as any).status;
    const retryAfter = parseRetryAfter((error as any).headers);
    
    // Rate limited
    if (status === 429) {
      return { 
        type: 'rate-limited', 
        retryAfterMs: retryAfter || 60000,
        message: 'Rate limited',
        originalError: error 
      };
    }
    
    // Retryable server errors
    if ([500, 502, 503, 504, 408].includes(status)) {
      return { 
        type: 'retryable', 
        retryAfterMs: retryAfter,
        message: `Server error: ${status}`,
        originalError: error 
      };
    }
    
    // Fatal client errors
    if (status >= 400 && status < 500) {
      return { type: 'fatal', message: `Client error: ${status}`, originalError: error };
    }
  }
  
  // Unknown errors - treat as retryable once
  return { type: 'retryable', message: 'Unknown error', originalError: error };
}

function parseRetryAfter(headers: Headers | undefined): number | undefined {
  if (!headers) return undefined;
  
  const retryAfter = headers.get('Retry-After');
  if (!retryAfter) return undefined;
  
  // Could be seconds or HTTP-date
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }
  
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }
  
  return undefined;
}
```

### Finding 4: Tiered Caching Strategy

**Source:** [web.dev: Stale-While-Revalidate](https://web.dev/articles/stale-while-revalidate)

**Key Points:**
- Fresh window: 5 minutes - serve immediately, no revalidation
- Stale window: 5-30 minutes - serve immediately, revalidate in background
- Emergency window: 30 min - 2 hours - serve with strong warning, revalidate
- Expired: > 2 hours - must fetch fresh, show loading state
- Include data age in UI for transparency

**Code Example:**
```typescript
// src/services/weather/cache-manager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CachedWeather {
  data: NormalizedWeather;
  timestamp: number;
  location: { lat: number; lon: number };
}

export type CacheFreshness = 'fresh' | 'stale' | 'emergency' | 'expired';

export const CACHE_WINDOWS = {
  fresh: 5 * 60 * 1000,        // 5 minutes
  stale: 30 * 60 * 1000,       // 30 minutes
  emergency: 2 * 60 * 60 * 1000, // 2 hours
};

export class WeatherCacheManager {
  private readonly cacheKey = 'weather_cache_v2';
  private memoryCache: CachedWeather | null = null;

  async get(lat: number, lon: number): Promise<{ data: NormalizedWeather; freshness: CacheFreshness } | null> {
    // Check memory first
    let cached = this.memoryCache;
    
    // Fall back to persistent storage
    if (!cached) {
      try {
        const stored = await AsyncStorage.getItem(this.cacheKey);
        if (stored) {
          cached = JSON.parse(stored);
          this.memoryCache = cached;
        }
      } catch {
        return null;
      }
    }
    
    if (!cached) return null;
    
    // Check location distance (invalidate if > 5km)
    const distance = this.getDistanceKm(lat, lon, cached.location.lat, cached.location.lon);
    if (distance > 5) return null;
    
    // Determine freshness
    const age = Date.now() - cached.timestamp;
    const freshness = this.getFreshness(age);
    
    if (freshness === 'expired') return null;
    
    return { data: cached.data, freshness };
  }

  private getFreshness(ageMs: number): CacheFreshness {
    if (ageMs < CACHE_WINDOWS.fresh) return 'fresh';
    if (ageMs < CACHE_WINDOWS.stale) return 'stale';
    if (ageMs < CACHE_WINDOWS.emergency) return 'emergency';
    return 'expired';
  }

  async set(data: NormalizedWeather, lat: number, lon: number): Promise<void> {
    const cached: CachedWeather = {
      data,
      timestamp: Date.now(),
      location: { lat, lon },
    };
    
    this.memoryCache = cached;
    
    try {
      await AsyncStorage.setItem(this.cacheKey, JSON.stringify(cached));
    } catch (error) {
      console.warn('Failed to persist weather cache:', error);
    }
  }

  private getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
```

### Finding 5: Battery-Optimized Location Updates

**Source:** [DEV: React Native Background Geolocation 2026](https://dev.to/sherry_walker_bba406fb339/react-native-background-geolocation-for-mobile-apps-2026-2ibd)

**Key Points:**
- iOS 18+ and Android 15 have aggressive battery optimization
- Use adaptive intervals: foreground (5 min), background (15-30 min)
- Implement significant location change detection (2km threshold for weather)
- Respect Low Power Mode - reduce or stop background fetches
- Use `react-native-background-fetch` for scheduled updates
- WorkManager on Android, BGTaskScheduler on iOS

**Code Example:**
```typescript
// src/services/weather/location-manager.ts
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';

export interface LocationConfig {
  foregroundIntervalMs: number;
  backgroundIntervalMs: number;
  significantChangeThresholdKm: number;
  lowPowerIntervalMs: number;
}

export const DEFAULT_LOCATION_CONFIG: LocationConfig = {
  foregroundIntervalMs: 5 * 60 * 1000,       // 5 minutes
  backgroundIntervalMs: 30 * 60 * 1000,      // 30 minutes
  significantChangeThresholdKm: 2,            // 2 km movement triggers update
  lowPowerIntervalMs: 60 * 60 * 1000,        // 1 hour in low power mode
};

export class LocationManager {
  private lastLocation: { lat: number; lon: number } | null = null;
  private lastUpdateTime = 0;
  private isLowPowerMode = false;
  private appState: 'foreground' | 'background' = 'foreground';

  async shouldFetchWeather(): Promise<{ shouldFetch: boolean; location: { lat: number; lon: number } | null }> {
    // Check battery state
    const batteryLevel = await Battery.getBatteryLevelAsync();
    const batteryState = await Battery.getBatteryStateAsync();
    this.isLowPowerMode = batteryLevel < 0.2 || batteryState === Battery.BatteryState.UNPLUGGED && batteryLevel < 0.3;

    // Get current interval based on state
    const interval = this.getCurrentInterval();
    const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
    
    // Time-based check
    if (timeSinceLastUpdate < interval) {
      return { shouldFetch: false, location: this.lastLocation };
    }

    // Get current location
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { shouldFetch: false, location: this.lastLocation };
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: this.isLowPowerMode 
          ? Location.Accuracy.Low 
          : Location.Accuracy.Balanced,
      });

      const currentLocation = {
        lat: location.coords.latitude,
        lon: location.coords.longitude,
      };

      // Check significant location change
      if (this.lastLocation) {
        const distance = this.getDistanceKm(
          this.lastLocation.lat, this.lastLocation.lon,
          currentLocation.lat, currentLocation.lon
        );
        
        if (distance < DEFAULT_LOCATION_CONFIG.significantChangeThresholdKm && 
            timeSinceLastUpdate < interval) {
          return { shouldFetch: false, location: currentLocation };
        }
      }

      this.lastLocation = currentLocation;
      this.lastUpdateTime = Date.now();
      return { shouldFetch: true, location: currentLocation };

    } catch (error) {
      return { shouldFetch: false, location: this.lastLocation };
    }
  }

  private getCurrentInterval(): number {
    if (this.isLowPowerMode) {
      return DEFAULT_LOCATION_CONFIG.lowPowerIntervalMs;
    }
    return this.appState === 'foreground' 
      ? DEFAULT_LOCATION_CONFIG.foregroundIntervalMs
      : DEFAULT_LOCATION_CONFIG.backgroundIntervalMs;
  }

  setAppState(state: 'foreground' | 'background'): void {
    this.appState = state;
  }

  private getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
```

### Finding 6: Provider Orchestrator with Fallback

**Source:** [Medium: Resilient APIs](https://medium.com/@fahimad/resilient-apis-retry-logic-circuit-breakers-and-fallback-mechanisms-cfd37f523f43)

**Key Points:**
- Each provider gets its own circuit breaker
- Try providers in priority order
- Skip providers with open circuits
- Track provider health metrics for adaptive ordering
- Return source information with data for transparency

**Code Example:**
```typescript
// src/services/weather/provider-orchestrator.ts
import { CircuitBreaker } from './circuit-breaker';
import { withRetry, DEFAULT_RETRY_CONFIG } from './retry-strategy';
import { classifyError } from './error-classifier';
import { WeatherCacheManager, CacheFreshness } from './cache-manager';

export type WeatherProvider = 'tomorrow' | 'meteoblue' | 'openmeteo';

export interface ProviderResult {
  data: NormalizedWeather;
  source: WeatherProvider;
  freshness: CacheFreshness;
  fromCache: boolean;
}

export class WeatherOrchestrator {
  private circuitBreakers: Map<WeatherProvider, CircuitBreaker> = new Map();
  private cache: WeatherCacheManager;
  private providerOrder: WeatherProvider[] = ['tomorrow', 'meteoblue', 'openmeteo'];

  constructor() {
    this.cache = new WeatherCacheManager();
    
    for (const provider of this.providerOrder) {
      this.circuitBreakers.set(provider, new CircuitBreaker(provider));
    }
  }

  async fetchWeather(
    lat: number, 
    lon: number, 
    elevation: number
  ): Promise<ProviderResult> {
    // Check cache first
    const cached = await this.cache.get(lat, lon);
    if (cached?.freshness === 'fresh') {
      return {
        data: cached.data,
        source: cached.data.source as WeatherProvider,
        freshness: 'fresh',
        fromCache: true,
      };
    }

    // Try providers in order
    let lastError: unknown;
    
    for (const provider of this.providerOrder) {
      const breaker = this.circuitBreakers.get(provider)!;
      
      if (!breaker.canAttempt()) {
        console.log(`Skipping ${provider}: circuit open`);
        continue;
      }

      try {
        const data = await withRetry(
          () => this.fetchFromProvider(provider, lat, lon, elevation),
          {
            ...DEFAULT_RETRY_CONFIG,
            maxAttempts: 2, // Less retries per provider in fallback chain
          }
        );

        breaker.recordSuccess();
        await this.cache.set(data, lat, lon);
        
        return {
          data,
          source: provider,
          freshness: 'fresh',
          fromCache: false,
        };

      } catch (error) {
        lastError = error;
        const classified = classifyError(error);
        
        if (classified.type === 'fatal') {
          console.error(`Fatal error from ${provider}:`, classified.message);
        } else {
          breaker.recordFailure();
        }
      }
    }

    // All providers failed - try stale cache
    if (cached) {
      console.warn('All providers failed, using stale cache');
      return {
        data: cached.data,
        source: cached.data.source as WeatherProvider,
        freshness: cached.freshness,
        fromCache: true,
      };
    }

    throw new Error(`All weather providers failed: ${lastError}`);
  }

  private async fetchFromProvider(
    provider: WeatherProvider,
    lat: number,
    lon: number,
    elevation: number
  ): Promise<NormalizedWeather> {
    // Implementation delegates to individual adapters
    switch (provider) {
      case 'tomorrow':
        return fetchTomorrowWeather(lat, lon, elevation);
      case 'meteoblue':
        return fetchMeteoblueWeather(lat, lon, elevation);
      case 'openmeteo':
        return fetchOpenMeteoWeather(lat, lon, elevation);
    }
  }

  getProviderHealth(): Record<WeatherProvider, { state: string; canAttempt: boolean }> {
    const health: Record<string, any> = {};
    for (const [provider, breaker] of this.circuitBreakers) {
      health[provider] = {
        state: breaker.getState(),
        canAttempt: breaker.canAttempt(),
      };
    }
    return health;
  }
}
```

---

## Comparison Matrix

| Strategy | Complexity | Reliability | Battery Impact | Recommendation |
|----------|------------|-------------|----------------|----------------|
| Simple retry (current) | Low | Low | None | Upgrade needed |
| Exponential backoff | Medium | Medium | Low | Must have |
| Circuit breaker | Medium | High | None | Must have |
| Multi-provider fallback | High | Very High | Low | Must have |
| Stale-while-revalidate | Medium | High | Low | Must have |
| Background fetch | High | High | Medium | Optional |

---

## Recommendations

### For bnredo Codebase

1. **Immediate (P0):** Add error classification and basic retry logic
   - Current code has no retry mechanism at all
   - Add `classifyError()` and single retry with backoff for 5xx errors

2. **Short-term (P1):** Implement tiered caching
   - Current 5-minute flat cache is too simple
   - Add freshness indicators to UI
   - Allow stale data during outages

3. **Medium-term (P2):** Add circuit breaker pattern
   - Essential before adding multiple providers
   - Prevents cascade failures during provider outages

4. **Long-term (P3):** Full multi-provider implementation
   - Add Tomorrow.io as primary (better accuracy)
   - Keep Open-Meteo as free fallback
   - Consider Meteoblue for wind accuracy (1.36 m/s MAE)

### Implementation Notes

1. **Request Timeout:** Set 8-second timeout for weather requests. Mobile networks are variable; too short causes false failures, too long degrades UX.

2. **Jitter is Critical:** Without jitter, retry storms can occur when many users experience the same outage simultaneously.

3. **Circuit Breaker Per Provider:** Do NOT use a single global circuit breaker. Each provider should have independent health tracking.

4. **Cache Location Separately:** Store lat/lon with cached data. Golf courses are stationary, so location rarely changes during a session.

5. **Show Data Freshness:** Always display when weather was last updated. Users need to know if they are seeing stale data.

6. **Graceful Degradation:** When all providers fail and cache is stale, still show the data with clear warning rather than blocking the app.

---

## Files to Add/Modify in bnredo

### New Files
```
src/services/weather/
  retry-strategy.ts      # Exponential backoff with jitter
  circuit-breaker.ts     # Circuit breaker implementation
  error-classifier.ts    # HTTP error classification
  cache-manager.ts       # Tiered caching with freshness
  provider-orchestrator.ts # Multi-provider coordination
  tomorrow-adapter.ts    # Tomorrow.io API adapter
  meteoblue-adapter.ts   # Meteoblue API adapter
  openmeteo-adapter.ts   # Refactored from weather-service.ts
  location-manager.ts    # Battery-optimized location
  types.ts               # Shared types
```

### Files to Modify
```
src/services/weather-service.ts  # Refactor to use orchestrator
src/contexts/WeatherContext.tsx  # Add freshness state, error handling
app/(tabs)/index.tsx             # Show data freshness indicator
app/(tabs)/wind.tsx              # Show data freshness indicator
```

---

## Sources

1. [AWS Retry with Backoff Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html) - AWS official guidance on retry patterns
2. [Better Stack: Exponential Backoff](https://betterstack.com/community/guides/monitoring/exponential-backoff/) - Comprehensive guide to backoff strategies
3. [Microservices.io: Circuit Breaker](https://microservices.io/patterns/reliability/circuit-breaker.html) - Pattern definition and use cases
4. [web.dev: Stale-While-Revalidate](https://web.dev/articles/stale-while-revalidate) - Google caching strategy guide
5. [MDN: PWA Caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching) - Service worker caching strategies
6. [DEV: React Native Background Tasks 2026](https://dev.to/eira-wexford/run-react-native-background-tasks-2026-for-optimal-performance-d26) - Current best practices for RN background tasks
7. [Medium: API Circuit Breaker in iOS](https://medium.com/@adarsh.ranjan/api-circuit-breaker-in-ios-a-beginners-comprehensive-guide-7973e6d3ebd5) - Mobile-specific circuit breaker guidance
8. [Baeldung: HTTP Error Status Codes Retry](https://www.baeldung.com/cs/http-error-status-codes-retry) - Error classification reference
9. [Xweather: Top Weather APIs 2026](https://www.xweather.com/blog/article/top-weather-apis-for-production-2026) - API comparison and selection criteria
10. [Medium: Track User Location Without Killing Battery](https://medium.com/@mohantaankit2002/track-user-location-without-killing-their-battery-a-react-native-guide-d57f29fd2ebe) - Battery optimization strategies

---

## Open Questions

1. Should rate limit state persist across app restarts? (Probably yes for 24-hour limits)
2. Should circuit breaker state sync across devices via Supabase? (Probably no - per-device is fine)
3. What is the acceptable staleness for wind data specifically? (Wind changes faster than temperature)
4. Should premium users get different provider priority? (Tomorrow.io is paid, could reserve for premium)
