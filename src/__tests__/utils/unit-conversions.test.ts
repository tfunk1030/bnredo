/**
 * Unit Conversion Utilities Tests
 * Tests all conversion functions and format helpers
 */

import {
  yardsToMeters,
  metersToYards,
  fahrenheitToCelsius,
  celsiusToFahrenheit,
  mphToKmh,
  kmhToMph,
  feetToMeters,
  metersToFeet,
  formatDistance,
  formatTemperature,
  formatWindSpeed,
  formatAltitude,
} from '@/src/utils/unit-conversions';

describe('Unit Conversions', () => {

  describe('yardsToMeters', () => {
    it('converts 100 yards to 91 meters', () => {
      expect(yardsToMeters(100)).toBe(91);
    });

    it('converts 0 yards to 0 meters', () => {
      expect(yardsToMeters(0)).toBe(0);
    });

    it('converts 150 yards to 137 meters', () => {
      expect(yardsToMeters(150)).toBe(137);
    });

    it('converts 200 yards to 183 meters', () => {
      expect(yardsToMeters(200)).toBe(183);
    });

    it('rounds to nearest integer', () => {
      // 1 yard = 0.9144 meters → rounds to 1
      expect(yardsToMeters(1)).toBe(1);
    });
  });

  describe('metersToYards', () => {
    it('converts 91 meters to ~100 yards', () => {
      expect(metersToYards(91)).toBe(100);
    });

    it('converts 0 meters to 0 yards', () => {
      expect(metersToYards(0)).toBe(0);
    });

    it('converts 200 meters to ~219 yards', () => {
      expect(metersToYards(200)).toBe(219);
    });

    it('is the inverse of yardsToMeters (within rounding)', () => {
      const yards = 150;
      const roundTrip = metersToYards(yardsToMeters(yards));
      expect(Math.abs(roundTrip - yards)).toBeLessThanOrEqual(1);
    });
  });

  describe('fahrenheitToCelsius', () => {
    it('converts freezing point (32°F → 0°C)', () => {
      expect(fahrenheitToCelsius(32)).toBe(0);
    });

    it('converts boiling point (212°F → 100°C)', () => {
      expect(fahrenheitToCelsius(212)).toBe(100);
    });

    it('converts body temperature (98.6°F → 37°C)', () => {
      expect(fahrenheitToCelsius(98.6)).toBe(37);
    });

    it('converts 72°F (typical golf weather)', () => {
      expect(fahrenheitToCelsius(72)).toBe(22);
    });

    it('handles negative fahrenheit', () => {
      expect(fahrenheitToCelsius(-40)).toBe(-40); // -40 is same in both scales
    });
  });

  describe('celsiusToFahrenheit', () => {
    it('converts 0°C to 32°F', () => {
      expect(celsiusToFahrenheit(0)).toBe(32);
    });

    it('converts 100°C to 212°F', () => {
      expect(celsiusToFahrenheit(100)).toBe(212);
    });

    it('converts 20°C to 68°F', () => {
      expect(celsiusToFahrenheit(20)).toBe(68);
    });

    it('is the inverse of fahrenheitToCelsius (within rounding)', () => {
      const fahrenheit = 75;
      const roundTrip = celsiusToFahrenheit(fahrenheitToCelsius(fahrenheit));
      expect(Math.abs(roundTrip - fahrenheit)).toBeLessThanOrEqual(1);
    });
  });

  describe('mphToKmh', () => {
    it('converts 0 mph to 0 km/h', () => {
      expect(mphToKmh(0)).toBe(0);
    });

    it('converts 10 mph to 16 km/h', () => {
      expect(mphToKmh(10)).toBe(16);
    });

    it('converts 60 mph to 97 km/h', () => {
      expect(mphToKmh(60)).toBe(97);
    });

    it('converts 100 mph to 161 km/h', () => {
      expect(mphToKmh(100)).toBe(161);
    });
  });

  describe('kmhToMph', () => {
    it('converts 0 km/h to 0 mph', () => {
      expect(kmhToMph(0)).toBe(0);
    });

    it('converts 16 km/h to ~10 mph', () => {
      expect(kmhToMph(16)).toBe(10);
    });

    it('converts 100 km/h to ~62 mph', () => {
      expect(kmhToMph(100)).toBe(62);
    });

    it('is the inverse of mphToKmh (within rounding)', () => {
      const mph = 25;
      const roundTrip = kmhToMph(mphToKmh(mph));
      expect(Math.abs(roundTrip - mph)).toBeLessThanOrEqual(1);
    });
  });

  describe('feetToMeters', () => {
    it('converts 0 feet to 0 meters', () => {
      expect(feetToMeters(0)).toBe(0);
    });

    it('converts 1000 feet to 305 meters', () => {
      expect(feetToMeters(1000)).toBe(305);
    });

    it('converts 5280 feet (1 mile) to 1609 meters', () => {
      expect(feetToMeters(5280)).toBe(1609);
    });
  });

  describe('metersToFeet', () => {
    it('converts 0 meters to 0 feet', () => {
      expect(metersToFeet(0)).toBe(0);
    });

    it('converts 305 meters to ~1001 feet', () => {
      // 305 / 0.3048 = 1000.656... → rounds to 1001
      expect(metersToFeet(305)).toBe(1001);
    });

    it('converts 100 meters to 328 feet', () => {
      expect(metersToFeet(100)).toBe(328);
    });

    it('is the inverse of feetToMeters (within rounding)', () => {
      const feet = 1000;
      const roundTrip = metersToFeet(feetToMeters(feet));
      expect(Math.abs(roundTrip - feet)).toBeLessThanOrEqual(1);
    });
  });

  // ─── Format Helpers ─────────────────────────────────────────────────────────

  describe('formatDistance', () => {
    it('returns yards format when unit is yards', () => {
      const result = formatDistance(150, 'yards');
      expect(result.value).toBe(150);
      expect(result.label).toBe('yards');
      expect(result.shortLabel).toBe('yds');
    });

    it('converts and returns meters format when unit is meters', () => {
      const result = formatDistance(150, 'meters');
      expect(result.value).toBe(137); // yardsToMeters(150)
      expect(result.label).toBe('meters');
      expect(result.shortLabel).toBe('m');
    });

    it('handles 0 yards', () => {
      const result = formatDistance(0, 'yards');
      expect(result.value).toBe(0);
    });

    it('handles 0 in meters mode', () => {
      const result = formatDistance(0, 'meters');
      expect(result.value).toBe(0);
    });
  });

  describe('formatTemperature', () => {
    it('returns fahrenheit format when unit is fahrenheit', () => {
      const result = formatTemperature(72, 'fahrenheit');
      expect(result.value).toBe(72);
      expect(result.label).toBe('degrees Fahrenheit');
      expect(result.shortLabel).toBe('°F');
    });

    it('converts and returns celsius format when unit is celsius', () => {
      const result = formatTemperature(32, 'celsius');
      expect(result.value).toBe(0); // 32°F = 0°C
      expect(result.label).toBe('degrees Celsius');
      expect(result.shortLabel).toBe('°C');
    });

    it('handles hot golf weather (95°F) in celsius', () => {
      const result = formatTemperature(95, 'celsius');
      expect(result.value).toBe(35);
    });
  });

  describe('formatWindSpeed', () => {
    it('returns mph format when unit is mph', () => {
      const result = formatWindSpeed(15, 'mph');
      expect(result.value).toBe(15);
      expect(result.label).toBe('miles per hour');
      expect(result.shortLabel).toBe('mph');
    });

    it('converts and returns km/h format when unit is kmh', () => {
      const result = formatWindSpeed(10, 'kmh');
      expect(result.value).toBe(16); // mphToKmh(10)
      expect(result.label).toBe('kilometers per hour');
      expect(result.shortLabel).toBe('km/h');
    });

    it('handles 0 wind speed', () => {
      const result = formatWindSpeed(0, 'mph');
      expect(result.value).toBe(0);
    });
  });

  describe('formatAltitude', () => {
    it('returns feet format when distance unit is yards', () => {
      const result = formatAltitude(1000, 'yards');
      expect(result.value).toBe(1000);
      expect(result.label).toBe('feet');
      expect(result.shortLabel).toBe('ft');
    });

    it('converts to meters when distance unit is meters', () => {
      const result = formatAltitude(1000, 'meters');
      expect(result.value).toBe(305); // feetToMeters(1000)
      expect(result.label).toBe('meters');
      expect(result.shortLabel).toBe('m');
    });

    it('handles sea level (0 feet)', () => {
      const result = formatAltitude(0, 'yards');
      expect(result.value).toBe(0);
    });

    it('handles high altitude in meters mode (Denver ~5280ft)', () => {
      const result = formatAltitude(5280, 'meters');
      expect(result.value).toBe(1609);
    });
  });
});
