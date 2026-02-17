/**
 * Tests for useReduceMotion hook
 *
 * Verifies system-level reduce motion preference detection
 * and AccessibilityInfo subscription lifecycle.
 */

import { renderHook, act } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { useReduceMotion } from '@/src/hooks/useReduceMotion';

// AccessibilityInfo is globally mocked in jest.setup.js
const mockIsReduceMotionEnabled = AccessibilityInfo.isReduceMotionEnabled as jest.Mock;
const mockAddEventListener = AccessibilityInfo.addEventListener as jest.Mock;

describe('useReduceMotion', () => {
  // Track the mock subscription remove function per test
  let mockRemove: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRemove = jest.fn();
    mockAddEventListener.mockReturnValue({ remove: mockRemove });
    mockIsReduceMotionEnabled.mockResolvedValue(false);
  });

  it('returns false initially before async check resolves', () => {
    // Never resolves — simulates pending async check
    mockIsReduceMotionEnabled.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useReduceMotion());
    expect(result.current).toBe(false);
  });

  it('returns false when reduce motion is disabled', async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(false);

    const { result } = renderHook(() => useReduceMotion());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBe(false);
  });

  it('returns true when reduce motion is enabled', async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(true);

    const { result } = renderHook(() => useReduceMotion());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBe(true);
  });

  it('registers a reduceMotionChanged event listener on mount', async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(false);

    renderHook(() => useReduceMotion());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockAddEventListener).toHaveBeenCalledWith(
      'reduceMotionChanged',
      expect.any(Function)
    );
  });

  it('updates state when system reduce motion preference changes', async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(false);

    let capturedHandler: ((value: boolean) => void) | null = null;
    mockAddEventListener.mockImplementation((_event: string, handler: (value: boolean) => void) => {
      capturedHandler = handler;
      return { remove: mockRemove };
    });

    const { result } = renderHook(() => useReduceMotion());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toBe(false);
    expect(capturedHandler).not.toBeNull();

    // Simulate user enabling reduce motion
    act(() => {
      capturedHandler!(true);
    });
    expect(result.current).toBe(true);

    // Simulate user disabling reduce motion again
    act(() => {
      capturedHandler!(false);
    });
    expect(result.current).toBe(false);
  });

  it('removes event listener on unmount', async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(false);

    const { unmount } = renderHook(() => useReduceMotion());

    await act(async () => {
      await Promise.resolve();
    });

    unmount();

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
