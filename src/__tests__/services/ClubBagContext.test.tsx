/**
 * Tests for ClubBagContext (ClubBagProvider + useClubBag)
 *
 * Key logic under test:
 *   - Default club initialization (14 clubs, all enabled, sortOrder = index)
 *   - loadClubs: Supabase-first, AsyncStorage fallback, corrupt data
 *   - updateClub: optimistic state + AsyncStorage persistence + Supabase sync
 *   - getEnabledClubs: filter + descending distance sort
 *   - getRecommendedClub: pick shortest club that can still reach the target
 *
 * MOCKING:
 *   - @react-native-async-storage/async-storage
 *   - @/src/lib/supabase (null = no Supabase configured)
 *   - @/src/contexts/AuthContext (useAuth)
 *   - @/src/features/settings/utils/club-mapping (DEFAULT_CLUBS)
 */

import * as React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Default: no Supabase (null) — most tests use offline path
jest.mock('@/src/lib/supabase', () => ({
  supabase: null,
}));

jest.mock('@/src/contexts/AuthContext', () => ({
  useAuth: jest.fn().mockReturnValue({ user: null }),
}));

jest.mock('@/src/features/settings/utils/club-mapping', () => ({
  DEFAULT_CLUBS: [
    { key: 'driver',          name: 'Driver', defaultDistance: 300 },
    { key: '7-iron',          name: '7-Iron', defaultDistance: 185 },
    { key: 'pitching-wedge',  name: 'PW',     defaultDistance: 145 },
    { key: 'lob-wedge',       name: 'LW',     defaultDistance: 120 },
  ],
}));

import { ClubBagProvider, useClubBag } from '@/src/contexts/ClubBagContext';
import { useAuth } from '@/src/contexts/AuthContext';

// ─── Helpers ───────────────────────────────────────────────────────────────

const mockUseAuth = useAuth as jest.Mock;
const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ClubBagProvider>{children}</ClubBagProvider>
);

// Build a stored Club array matching our mocked DEFAULT_CLUBS
const storedClubs = [
  { key: 'driver',         name: 'Driver', isEnabled: true,  customDistance: 300, sortOrder: 0 },
  { key: '7-iron',         name: '7-Iron', isEnabled: true,  customDistance: 185, sortOrder: 1 },
  { key: 'pitching-wedge', name: 'PW',     isEnabled: false, customDistance: 145, sortOrder: 2 },
  { key: 'lob-wedge',      name: 'LW',     isEnabled: true,  customDistance: 120, sortOrder: 3 },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: null });
  mockGetItem.mockResolvedValue(null);   // default: no stored data
  mockSetItem.mockResolvedValue(undefined);
});

// ═══════════════════════════════════════════════════════════════════════════
// Default club initialization
// ═══════════════════════════════════════════════════════════════════════════
describe('default club initialization', () => {
  test('initializes all DEFAULT_CLUBS when no storage data exists', async () => {
    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.clubs).toHaveLength(4);
  });

  test('all default clubs are enabled', async () => {
    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.clubs.every(c => c.isEnabled)).toBe(true);
  });

  test('default club sortOrder follows DEFAULT_CLUBS index order', async () => {
    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const orders = result.current.clubs.map(c => c.sortOrder);
    expect(orders).toEqual([0, 1, 2, 3]);
  });

  test('default club customDistance matches defaultDistance from DEFAULT_CLUBS', async () => {
    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const driver = result.current.clubs.find(c => c.key === 'driver');
    expect(driver?.customDistance).toBe(300);

    const lw = result.current.clubs.find(c => c.key === 'lob-wedge');
    expect(lw?.customDistance).toBe(120);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// loadClubs — AsyncStorage paths
// ═══════════════════════════════════════════════════════════════════════════
describe('loadClubs — AsyncStorage', () => {
  test('loads clubs from AsyncStorage when storage has valid data', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(storedClubs));

    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.clubs).toHaveLength(4);
    const pw = result.current.clubs.find(c => c.key === 'pitching-wedge');
    expect(pw?.isEnabled).toBe(false);  // disabled in stored data
  });

  test('falls back to defaults when AsyncStorage has empty array', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify([]));

    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Empty array → falls back to defaults (all enabled)
    expect(result.current.clubs.every(c => c.isEnabled)).toBe(true);
  });

  test('falls back to defaults when AsyncStorage has null', async () => {
    mockGetItem.mockResolvedValue(null);

    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.clubs).toHaveLength(4);
    expect(result.current.clubs[0].customDistance).toBe(300); // driver default
  });

  test('falls back to defaults when AsyncStorage contains invalid JSON', async () => {
    mockGetItem.mockResolvedValue('{invalid json{{{');

    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should not throw — falls back to defaults
    expect(result.current.clubs).toHaveLength(4);
  });

  test('isLoading starts true and becomes false after load', async () => {
    let resolveStorage: (v: string | null) => void;
    mockGetItem.mockReturnValue(new Promise(r => { resolveStorage = r; }));

    const { result } = renderHook(() => useClubBag(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveStorage!(null);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateClub
// ═══════════════════════════════════════════════════════════════════════════
describe('updateClub', () => {
  test('updates club state optimistically', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(storedClubs));

    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateClub('driver', { customDistance: 280 });
    });

    const driver = result.current.clubs.find(c => c.key === 'driver');
    expect(driver?.customDistance).toBe(280);
  });

  test('persists update to AsyncStorage', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(storedClubs));

    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateClub('7-iron', { isEnabled: false });
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      'club_bag',
      expect.stringContaining('"key":"7-iron"')
    );
  });

  test('does not modify other clubs when updating one', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(storedClubs));

    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const originalDriver = result.current.clubs.find(c => c.key === 'driver');

    await act(async () => {
      await result.current.updateClub('7-iron', { customDistance: 175 });
    });

    const driver = result.current.clubs.find(c => c.key === 'driver');
    expect(driver?.customDistance).toBe(originalDriver?.customDistance);
  });

  test('updateClub with no-op update does not crash', async () => {
    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Updating a non-existent club key — should silently no-op
    await expect(
      act(async () => {
        await result.current.updateClub('magic-club', { customDistance: 999 });
      })
    ).resolves.not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getEnabledClubs
// ═══════════════════════════════════════════════════════════════════════════
describe('getEnabledClubs', () => {
  test('returns only enabled clubs', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(storedClubs));

    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const enabled = result.current.getEnabledClubs();
    expect(enabled.every(c => c.isEnabled)).toBe(true);
    expect(enabled.find(c => c.key === 'pitching-wedge')).toBeUndefined();
  });

  test('returns clubs sorted descending by customDistance', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(storedClubs));

    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const enabled = result.current.getEnabledClubs();
    const distances = enabled.map(c => c.customDistance);

    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeLessThanOrEqual(distances[i - 1]);
    }
  });

  test('returns empty array when all clubs are disabled', async () => {
    const allDisabled = storedClubs.map(c => ({ ...c, isEnabled: false }));
    mockGetItem.mockResolvedValue(JSON.stringify(allDisabled));

    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getEnabledClubs()).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getRecommendedClub — core algorithm
//
// Algorithm: enabled clubs sorted descending. Iterate and keep updating
// bestClub while club.customDistance >= yardage. Break on first club that
// can't reach. Result = shortest club that can still reach the target.
// If no club can reach, returns the longest club as best available.
// ═══════════════════════════════════════════════════════════════════════════
describe('getRecommendedClub', () => {
  // storedClubs (enabled): driver=300, 7-iron=185, lob-wedge=120
  // pitching-wedge is disabled

  test('returns null when no clubs are enabled', async () => {
    const allDisabled = storedClubs.map(c => ({ ...c, isEnabled: false }));
    mockGetItem.mockResolvedValue(JSON.stringify(allDisabled));

    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.getRecommendedClub(150)).toBeNull();
  });

  test('returns exact match club when distance matches exactly', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(storedClubs));

    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const club = result.current.getRecommendedClub(185);
    expect(club?.key).toBe('7-iron');
  });

  test('returns shortest club that can reach the target distance', async () => {
    // Target 150y — enabled clubs sorted: [driver=300, 7-iron=185, lob-wedge=120]
    // 300 >= 150 ✓, 185 >= 150 ✓, 120 >= 150? No → break
    // Result: 7-iron (185y) — closest without going under
    mockGetItem.mockResolvedValue(JSON.stringify(storedClubs));

    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const club = result.current.getRecommendedClub(150);
    expect(club?.key).toBe('7-iron');
    expect(club?.customDistance).toBe(185);
  });

  test('returns longest club when target exceeds all club distances', async () => {
    // Target 400y — no club can reach it, returns driver (longest, first in list)
    mockGetItem.mockResolvedValue(JSON.stringify(storedClubs));

    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const club = result.current.getRecommendedClub(400);
    expect(club?.key).toBe('driver');
    expect(club?.customDistance).toBe(300);
  });

  test('returns shortest club (lob-wedge) when target is below all distances', async () => {
    // Target 50y — all clubs can reach it; algorithm picks last club that satisfies >= 50
    // driver=300 >= 50, 7-iron=185 >= 50, lob-wedge=120 >= 50 → bestClub = lob-wedge
    mockGetItem.mockResolvedValue(JSON.stringify(storedClubs));

    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const club = result.current.getRecommendedClub(50);
    expect(club?.key).toBe('lob-wedge');
  });

  test('returns driver for exactly 300y target', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(storedClubs));

    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const club = result.current.getRecommendedClub(300);
    expect(club?.key).toBe('driver');
  });

  test('updates recommendation after updateClub changes distance', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(storedClubs));

    const { result } = renderHook(() => useClubBag(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Before: 7-iron at 185y → recommended for 186y target would be driver (longest reachable)
    const before = result.current.getRecommendedClub(186);
    expect(before?.key).toBe('driver');

    // After updating 7-iron to 200y, it can now reach 186y
    await act(async () => {
      await result.current.updateClub('7-iron', { customDistance: 200 });
    });

    const after = result.current.getRecommendedClub(186);
    expect(after?.key).toBe('7-iron');
    expect(after?.customDistance).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// useClubBag outside provider
// ═══════════════════════════════════════════════════════════════════════════
describe('useClubBag outside provider', () => {
  test('throws when used outside ClubBagProvider', () => {
    // Suppress expected console.error from React
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useClubBag());
    }).toThrow('useClubBag must be used within ClubBagProvider');

    (console.error as jest.Mock).mockRestore?.();
  });
});
