/**
 * Tests for useCompassHeading hook
 *
 * NOTE: jest.setup.js mocks expo-location but doesn't include watchHeadingAsync.
 * We override the entire module here so all needed methods are jest.fn().
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useCompassHeading } from '@/src/hooks/useCompassHeading';

// ─── Module Mock ───────────────────────────────────────────────────────────────
// Must be declared before any imports that use expo-location so Jest hoists it.
// This overrides the partial mock in jest.setup.js for this test file only.

const mockRemove = jest.fn();
let capturedCallback: ((data: { trueHeading: number; magHeading: number; accuracy: number }) => void) | null = null;

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  watchHeadingAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Highest: 6 },
}));

// Lazy-require so we get the mocked version after hoisting
import * as Location from 'expo-location';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const simulateHeading = (trueHeading: number, magHeading = trueHeading + 2) => {
  act(() => {
    capturedCallback?.({ trueHeading, magHeading, accuracy: 5 });
  });
};

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  capturedCallback = null;

  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (Location.watchHeadingAsync as jest.Mock).mockImplementation((cb: typeof capturedCallback) => {
    capturedCallback = cb;
    return Promise.resolve({ remove: mockRemove });
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useCompassHeading', () => {
  // --- Initial State ---

  describe('initial state', () => {
    it('heading starts at 0 and hasPermission is false before async resolves', () => {
      // Use web to suppress async setup
      const originalOS = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });

      const { result } = renderHook(() => useCompassHeading());

      expect(result.current.heading).toBe(0);
      expect(result.current.hasPermission).toBe(false);

      Object.defineProperty(Platform, 'OS', { value: originalOS, writable: true });
    });
  });

  // --- Web Platform ---

  describe('web platform', () => {
    it('skips location setup and stays at defaults', () => {
      const originalOS = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });

      const { result } = renderHook(() => useCompassHeading());

      expect(result.current.heading).toBe(0);
      expect(result.current.hasPermission).toBe(false);
      expect(Location.watchHeadingAsync).not.toHaveBeenCalled();

      Object.defineProperty(Platform, 'OS', { value: originalOS, writable: true });
    });
  });

  // --- Permission Handling ---

  describe('permission handling', () => {
    it('sets hasPermission true after permission granted', async () => {
      const { result } = renderHook(() => useCompassHeading());

      await waitFor(() => expect(result.current.hasPermission).toBe(true));
      expect(Location.watchHeadingAsync).toHaveBeenCalledTimes(1);
    });

    it('sets hasPermission false and skips watch when permission denied', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

      const { result } = renderHook(() => useCompassHeading());

      await waitFor(() => expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled());
      await act(async () => {});

      expect(result.current.hasPermission).toBe(false);
      expect(Location.watchHeadingAsync).not.toHaveBeenCalled();
    });

    it('sets hasPermission false when permission request throws', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockRejectedValue(new Error('OS error'));

      const { result } = renderHook(() => useCompassHeading());

      await waitFor(() => expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled());
      await act(async () => {});

      expect(result.current.hasPermission).toBe(false);
    });
  });

  // --- Heading Updates ---

  describe('heading updates', () => {
    it('uses trueHeading when valid (>= 0)', async () => {
      const { result } = renderHook(() => useCompassHeading());
      await waitFor(() => expect(result.current.hasPermission).toBe(true));

      simulateHeading(180);
      expect(result.current.heading).toBe(180);
    });

    it('treats trueHeading of exactly 0 (North) as valid', async () => {
      const { result } = renderHook(() => useCompassHeading());
      await waitFor(() => expect(result.current.hasPermission).toBe(true));

      simulateHeading(0, 2);
      expect(result.current.heading).toBe(0);
    });

    it('falls back to magHeading when trueHeading is -1 (uncalibrated)', async () => {
      const { result } = renderHook(() => useCompassHeading());
      await waitFor(() => expect(result.current.hasPermission).toBe(true));

      act(() => {
        capturedCallback?.({ trueHeading: -1, magHeading: 270, accuracy: 5 });
      });

      expect(result.current.heading).toBe(270);
    });

    it('keeps previous heading when both trueHeading and magHeading are -1', async () => {
      const { result } = renderHook(() => useCompassHeading());
      await waitFor(() => expect(result.current.hasPermission).toBe(true));

      simulateHeading(90);
      expect(result.current.heading).toBe(90);

      act(() => {
        capturedCallback?.({ trueHeading: -1, magHeading: -1, accuracy: 0 });
      });

      expect(result.current.heading).toBe(90); // unchanged
    });

    it('handles sequential heading updates', async () => {
      const { result } = renderHook(() => useCompassHeading());
      await waitFor(() => expect(result.current.hasPermission).toBe(true));

      simulateHeading(45);
      expect(result.current.heading).toBe(45);

      simulateHeading(135);
      expect(result.current.heading).toBe(135);

      simulateHeading(315);
      expect(result.current.heading).toBe(315);
    });
  });

  // --- Cleanup ---

  describe('cleanup', () => {
    it('calls subscription.remove() on unmount', async () => {
      const { result, unmount } = renderHook(() => useCompassHeading());
      await waitFor(() => expect(result.current.hasPermission).toBe(true));

      unmount();

      expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    it('does not update state after unmount (isMounted guard)', async () => {
      const { result, unmount } = renderHook(() => useCompassHeading());
      await waitFor(() => expect(result.current.hasPermission).toBe(true));

      const headingBeforeUnmount = result.current.heading;
      unmount();

      // Fire callback after unmount — isMounted guard should block the state update
      act(() => {
        capturedCallback?.({ trueHeading: 359, magHeading: 357, accuracy: 5 });
      });

      // heading didn't change because isMounted prevented setState
      expect(result.current.heading).toBe(headingBeforeUnmount);
    });
  });
});
