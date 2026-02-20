import {
  normalizeClubName,
  getDisplayName,
  DEFAULT_CLUBS,
} from '@/src/features/settings/utils/club-mapping';

describe('normalizeClubName', () => {
  it('should return null for empty string', () => {
    expect(normalizeClubName('')).toBeNull();
  });

  it('should return null for unrecognized club', () => {
    expect(normalizeClubName('putter')).toBeNull();
    expect(normalizeClubName('2-iron')).toBeNull();
    expect(normalizeClubName('chipper')).toBeNull();
  });

  it('should normalize driver variants', () => {
    expect(normalizeClubName('driver')).toBe('driver');
    expect(normalizeClubName('DR')).toBe('driver');
    expect(normalizeClubName('1w')).toBe('driver');
    expect(normalizeClubName('Driver')).toBe('driver');
    expect(normalizeClubName('  DRIVER  ')).toBe('driver');
  });

  it('should normalize wood variants', () => {
    expect(normalizeClubName('3-wood')).toBe('3-wood');
    expect(normalizeClubName('3w')).toBe('3-wood');
    expect(normalizeClubName('3 wood')).toBe('3-wood');
    expect(normalizeClubName('three wood')).toBe('3-wood');
    expect(normalizeClubName('5-wood')).toBe('5-wood');
    expect(normalizeClubName('5w')).toBe('5-wood');
    expect(normalizeClubName('5 wood')).toBe('5-wood');
    expect(normalizeClubName('five wood')).toBe('5-wood');
  });

  it('should normalize hybrid', () => {
    expect(normalizeClubName('hybrid')).toBe('hybrid');
    expect(normalizeClubName('4-hybrid')).toBe('hybrid');
    expect(normalizeClubName('4h')).toBe('hybrid');
  });

  it('should normalize iron variants', () => {
    expect(normalizeClubName('3-iron')).toBe('3-iron');
    expect(normalizeClubName('3i')).toBe('3-iron');
    expect(normalizeClubName('3 iron')).toBe('3-iron');
    expect(normalizeClubName('7-iron')).toBe('7-iron');
    expect(normalizeClubName('7i')).toBe('7-iron');
    expect(normalizeClubName('7 iron')).toBe('7-iron');
    expect(normalizeClubName('9-iron')).toBe('9-iron');
    expect(normalizeClubName('9i')).toBe('9-iron');
  });

  it('should normalize all iron numbers (3-9)', () => {
    for (let i = 3; i <= 9; i++) {
      expect(normalizeClubName(`${i}-iron`)).toBe(`${i}-iron`);
      expect(normalizeClubName(`${i}i`)).toBe(`${i}-iron`);
      expect(normalizeClubName(`${i} iron`)).toBe(`${i}-iron`);
    }
  });

  it('should normalize wedge variants', () => {
    expect(normalizeClubName('pitching-wedge')).toBe('pitching-wedge');
    expect(normalizeClubName('pitching wedge')).toBe('pitching-wedge');
    expect(normalizeClubName('pw')).toBe('pitching-wedge');
    expect(normalizeClubName('p')).toBe('pitching-wedge');

    expect(normalizeClubName('gap-wedge')).toBe('gap-wedge');
    expect(normalizeClubName('gap wedge')).toBe('gap-wedge');
    expect(normalizeClubName('gw')).toBe('gap-wedge');
    expect(normalizeClubName('aw')).toBe('gap-wedge');
    expect(normalizeClubName('approach wedge')).toBe('gap-wedge');

    expect(normalizeClubName('sand-wedge')).toBe('sand-wedge');
    expect(normalizeClubName('sand wedge')).toBe('sand-wedge');
    expect(normalizeClubName('sw')).toBe('sand-wedge');

    expect(normalizeClubName('lob-wedge')).toBe('lob-wedge');
    expect(normalizeClubName('lob wedge')).toBe('lob-wedge');
    expect(normalizeClubName('lw')).toBe('lob-wedge');
  });

  it('should be case insensitive', () => {
    expect(normalizeClubName('DRIVER')).toBe('driver');
    expect(normalizeClubName('Pitching-Wedge')).toBe('pitching-wedge');
    expect(normalizeClubName('PW')).toBe('pitching-wedge');
    expect(normalizeClubName('SW')).toBe('sand-wedge');
  });

  it('should trim whitespace', () => {
    expect(normalizeClubName('  driver  ')).toBe('driver');
    expect(normalizeClubName('\t7-iron\n')).toBe('7-iron');
  });
});

describe('getDisplayName', () => {
  it('should return proper display names for all standard clubs', () => {
    expect(getDisplayName('driver')).toBe('Driver');
    expect(getDisplayName('3-wood')).toBe('3-Wood');
    expect(getDisplayName('5-wood')).toBe('5-Wood');
    expect(getDisplayName('hybrid')).toBe('Hybrid');
  });

  it('should return abbreviated names for wedges', () => {
    expect(getDisplayName('pitching-wedge')).toBe('PW');
    expect(getDisplayName('gap-wedge')).toBe('GW');
    expect(getDisplayName('sand-wedge')).toBe('SW');
    expect(getDisplayName('lob-wedge')).toBe('LW');
  });

  it('should return Iron names for numbered irons', () => {
    expect(getDisplayName('3-iron')).toBe('3-Iron');
    expect(getDisplayName('7-iron')).toBe('7-Iron');
    expect(getDisplayName('9-iron')).toBe('9-Iron');
  });

  it('should return input key for unknown clubs', () => {
    expect(getDisplayName('putter')).toBe('putter');
    expect(getDisplayName('unknown-club')).toBe('unknown-club');
  });
});

describe('DEFAULT_CLUBS', () => {
  it('should have 14 clubs', () => {
    expect(DEFAULT_CLUBS).toHaveLength(14);
  });

  it('should start with driver and end with lob wedge', () => {
    expect(DEFAULT_CLUBS[0].key).toBe('driver');
    expect(DEFAULT_CLUBS[DEFAULT_CLUBS.length - 1].key).toBe('lob-wedge');
  });

  it('should have decreasing distances (bag order)', () => {
    for (let i = 1; i < DEFAULT_CLUBS.length; i++) {
      expect(DEFAULT_CLUBS[i].defaultDistance).toBeLessThan(DEFAULT_CLUBS[i - 1].defaultDistance);
    }
  });

  it('should have unique keys', () => {
    const keys = DEFAULT_CLUBS.map(c => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('each club should have required properties', () => {
    DEFAULT_CLUBS.forEach(club => {
      expect(typeof club.key).toBe('string');
      expect(typeof club.name).toBe('string');
      expect(typeof club.defaultDistance).toBe('number');
      expect(club.defaultDistance).toBeGreaterThan(0);
    });
  });

  it('driver distance should be approximately tour average', () => {
    const driver = DEFAULT_CLUBS.find(c => c.key === 'driver');
    expect(driver).toBeDefined();
    expect(driver!.defaultDistance).toBe(300);
  });
});
