import {
  getWindDirectionLabel,
  getDistanceKm,
} from '@/src/services/weather/utils';

describe('getWindDirectionLabel', () => {
  // 16 compass points, each spanning 22.5°
  const cases: [number, string][] = [
    [0,     'N'],
    [11,    'N'],    // 11 / 22.5 = 0.489 → rounds to 0 → N
    [12,    'NNE'],  // 12 / 22.5 = 0.533 → rounds to 1 → NNE
    [22,    'NNE'],
    [34,    'NE'],   // 34 / 22.5 = 1.511 → rounds to 2 → NE (midpoint is 33.75)
    [45,    'NE'],
    [67,    'ENE'],
    [90,    'E'],
    [112,   'ESE'],
    [135,   'SE'],
    [157,   'SSE'],
    [180,   'S'],
    [202,   'SSW'],
    [225,   'SW'],
    [247,   'WSW'],
    [270,   'W'],
    [292,   'WNW'],
    [315,   'NW'],
    [337,   'NNW'],
    [360,   'N'],    // 360/22.5=16, 16%16=0 → N
  ];

  it.each(cases)('should return %s for %d°', (degrees, expected) => {
    expect(getWindDirectionLabel(degrees)).toBe(expected);
  });

  it('should handle all 16 compass points exactly on their boundaries', () => {
    const expected = [
      'N', 'NNE', 'NE', 'ENE',
      'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW',
      'W', 'WNW', 'NW', 'NNW'
    ];
    expected.forEach((direction, i) => {
      expect(getWindDirectionLabel(i * 22.5)).toBe(direction);
    });
  });

  it('should handle 360° wrapping back to N', () => {
    expect(getWindDirectionLabel(360)).toBe('N');
  });
});

describe('getDistanceKm', () => {
  it('should return 0 for same coordinates', () => {
    expect(getDistanceKm(30, -97, 30, -97)).toBe(0);
  });

  it('should calculate Austin to Houston correctly (~246 km)', () => {
    // Austin: 30.2672, -97.7431 | Houston: 29.7604, -95.3698
    const dist = getDistanceKm(30.2672, -97.7431, 29.7604, -95.3698);
    expect(dist).toBeGreaterThan(235);
    expect(dist).toBeLessThan(260);
  });

  it('should calculate NYC to LA correctly (~3940 km)', () => {
    // New York: 40.7128, -74.0060 | Los Angeles: 34.0522, -118.2437
    const dist = getDistanceKm(40.7128, -74.0060, 34.0522, -118.2437);
    expect(dist).toBeGreaterThan(3900);
    expect(dist).toBeLessThan(4000);
  });

  it('should be symmetric (A→B = B→A)', () => {
    const ab = getDistanceKm(30.2672, -97.7431, 29.7604, -95.3698);
    const ba = getDistanceKm(29.7604, -95.3698, 30.2672, -97.7431);
    expect(ab).toBeCloseTo(ba, 5);
  });

  it('should handle north-south movement (pure latitude change)', () => {
    // 1° of latitude ≈ 111 km
    const dist = getDistanceKm(0, 0, 1, 0);
    expect(dist).toBeGreaterThan(110);
    expect(dist).toBeLessThan(112);
  });

  it('should handle east-west movement at equator', () => {
    // 1° of longitude at equator ≈ 111 km
    const dist = getDistanceKm(0, 0, 0, 1);
    expect(dist).toBeGreaterThan(110);
    expect(dist).toBeLessThan(112);
  });

  it('should return smaller distance for nearby points (< 5 km)', () => {
    // Two points ~1km apart in Austin
    const dist = getDistanceKm(30.2672, -97.7431, 30.2762, -97.7431);
    expect(dist).toBeLessThan(5);
    expect(dist).toBeGreaterThan(0);
  });

  it('should handle negative latitudes (southern hemisphere)', () => {
    // Rio de Janeiro: -22.9068, -43.1729 | São Paulo: -23.5505, -46.6333
    const dist = getDistanceKm(-22.9068, -43.1729, -23.5505, -46.6333);
    expect(dist).toBeGreaterThan(350);
    expect(dist).toBeLessThan(420);
  });

  it('should handle antipodal points (opposite sides of earth ~20015 km)', () => {
    const dist = getDistanceKm(0, 0, 0, 180);
    expect(dist).toBeGreaterThan(19000);
    expect(dist).toBeLessThan(21000);
  });
});
