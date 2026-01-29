/**
 * Tiered Cache Manager
 * Manages weather data cache with freshness levels
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NormalizedWeather,
  CacheFreshness,
  CachedWeather,
  WeatherProvider,
} from './types';

// Re-export CachedWeather for convenience
export type { CachedWeather } from './types';

// Cache timing thresholds (ms)
const FRESH_THRESHOLD_MS = 5 * 60 * 1000;        // 5 minutes
const STALE_THRESHOLD_MS = 30 * 60 * 1000;       // 30 minutes
const EMERGENCY_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

const CACHE_KEY_PREFIX = 'weather_cache_';
const PRIMARY_CACHE_KEY = 'weather_cache_primary';
const LEGACY_CACHE_KEY = 'weather_cache';  // Old key for migration

/**
 * Calculate cache freshness based on age
 */
export function calculateFreshness(cachedAt: string): CacheFreshness {
  const ageMs = Date.now() - new Date(cachedAt).getTime();

  if (ageMs < FRESH_THRESHOLD_MS) {
    return 'fresh';
  } else if (ageMs < STALE_THRESHOLD_MS) {
    return 'stale';
  } else if (ageMs < EMERGENCY_THRESHOLD_MS) {
    return 'emergency';
  } else {
    return 'expired';
  }
}

/**
 * Calculate distance between two coordinates (km)
 */
function getDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Cache weather data with timestamp
 */
export async function cacheWeather(weather: NormalizedWeather): Promise<void> {
  try {
    const cached: CachedWeather = {
      ...weather,
      cachedAt: new Date().toISOString(),
      freshness: 'fresh',
    };

    // Store in primary cache
    await AsyncStorage.setItem(PRIMARY_CACHE_KEY, JSON.stringify(cached));

    // Also store per-provider for debugging
    const providerKey = `${CACHE_KEY_PREFIX}${weather.source}`;
    await AsyncStorage.setItem(providerKey, JSON.stringify(cached));
  } catch (error) {
    console.error('Failed to cache weather:', error);
  }
}

/**
 * Get cached weather data
 * @param latitude Current latitude (optional, for location validation)
 * @param longitude Current longitude (optional, for location validation)
 * @param maxDistance Max distance in km to consider cache valid (default: 5)
 */
export async function getCachedWeather(
  latitude?: number,
  longitude?: number,
  maxDistance: number = 5
): Promise<CachedWeather | null> {
  try {
    let stored = await AsyncStorage.getItem(PRIMARY_CACHE_KEY);

    // Migration: Check legacy cache key if new one is empty
    if (!stored) {
      const legacyStored = await AsyncStorage.getItem(LEGACY_CACHE_KEY);
      if (legacyStored) {
        const legacyData = JSON.parse(legacyStored);
        // Migrate to new format
        const migrated: CachedWeather = {
          ...legacyData,
          cachedAt: legacyData.observationTime,
          freshness: calculateFreshness(legacyData.observationTime),
          source: 'openmeteo' as const,  // Old system only used Open-Meteo
        };
        await AsyncStorage.setItem(PRIMARY_CACHE_KEY, JSON.stringify(migrated));
        await AsyncStorage.removeItem(LEGACY_CACHE_KEY);  // Clean up legacy key
        stored = JSON.stringify(migrated);
      }
    }

    if (!stored) {
      return null;
    }

    const cached: CachedWeather = JSON.parse(stored);

    // Update freshness
    cached.freshness = calculateFreshness(cached.cachedAt);

    // If location provided, check distance
    if (latitude !== undefined && longitude !== undefined) {
      const distance = getDistanceKm(
        latitude,
        longitude,
        cached.latitude,
        cached.longitude
      );
      if (distance > maxDistance) {
        // Location too far, cache is invalid
        return null;
      }
    }

    return cached;
  } catch (error) {
    console.error('Failed to get cached weather:', error);
    return null;
  }
}

/**
 * Check if we should use cached data based on freshness
 */
export function shouldUseCache(freshness: CacheFreshness): boolean {
  return freshness !== 'expired';
}

/**
 * Check if we should refresh in background
 */
export function shouldRefreshInBackground(freshness: CacheFreshness): boolean {
  return freshness === 'stale' || freshness === 'emergency';
}

/**
 * Get user-friendly message for cache freshness
 */
export function getFreshnessMessage(freshness: CacheFreshness): string | null {
  switch (freshness) {
    case 'fresh':
      return null;
    case 'stale':
      return 'Weather data is slightly outdated. Refreshing...';
    case 'emergency':
      return 'Using older weather data. Please refresh when possible.';
    case 'expired':
      return 'Weather data has expired. Please refresh.';
  }
}

/**
 * Get cache for specific provider (for debugging)
 */
export async function getProviderCache(
  provider: WeatherProvider
): Promise<CachedWeather | null> {
  try {
    const key = `${CACHE_KEY_PREFIX}${provider}`;
    const stored = await AsyncStorage.getItem(key);
    if (!stored) {
      return null;
    }
    const cached: CachedWeather = JSON.parse(stored);
    cached.freshness = calculateFreshness(cached.cachedAt);
    return cached;
  } catch (error) {
    console.error(`Failed to get ${provider} cache:`, error);
    return null;
  }
}

/**
 * Clear all weather caches
 */
export async function clearWeatherCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const weatherKeys = keys.filter(k => k.startsWith(CACHE_KEY_PREFIX) || k === PRIMARY_CACHE_KEY);
    await AsyncStorage.multiRemove(weatherKeys);
  } catch (error) {
    console.error('Failed to clear weather cache:', error);
  }
}

/**
 * Get cache age in minutes
 */
export function getCacheAgeMinutes(cachedAt: string): number {
  const ageMs = Date.now() - new Date(cachedAt).getTime();
  return Math.floor(ageMs / 60000);
}
