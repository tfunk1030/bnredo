/**
 * Tests for useHapticSlider hook
 */

import { renderHook, act } from '@testing-library/react-native';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useHapticSlider } from '@/src/hooks/useHapticSlider';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
}));

describe('useHapticSlider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('interval-based haptics', () => {
    it('triggers haptic when crossing interval boundary (default: 5)', () => {
      const { result } = renderHook(() => useHapticSlider());

      act(() => {
        result.current.onValueChange(0);
      });
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();

      act(() => {
        result.current.onValueChange(4);
      });
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();

      act(() => {
        result.current.onValueChange(5);
      });
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    });

    it('triggers haptic on each interval crossing', () => {
      const { result } = renderHook(() => useHapticSlider({ interval: 10 }));

      act(() => {
        result.current.onValueChange(0);
        result.current.onValueChange(9);
      });
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();

      act(() => {
        result.current.onValueChange(10);
      });
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.onValueChange(15);
      });
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1); // Still in bucket 1

      act(() => {
        result.current.onValueChange(20);
      });
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(2); // Crossed to bucket 2
    });

    it('works with custom intervals', () => {
      const { result } = renderHook(() => useHapticSlider({ interval: 20 }));

      act(() => {
        result.current.onValueChange(0);
        result.current.onValueChange(19);
      });
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();

      act(() => {
        result.current.onValueChange(20);
      });
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset functionality', () => {
    it('allows haptic to trigger again after reset', () => {
      const { result } = renderHook(() => useHapticSlider({ interval: 5 }));

      act(() => {
        result.current.onValueChange(0);
        result.current.onValueChange(5);
      });
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.onValueChange(7);
      });
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1); // Same bucket

      act(() => {
        result.current.reset();
        result.current.onValueChange(7);
      });
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1); // First value after reset doesn't trigger

      act(() => {
        result.current.onValueChange(10);
      });
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(2); // Crossed bucket after reset
    });
  });

  describe('enabled/disabled', () => {
    it('does not trigger haptics when disabled', () => {
      const { result } = renderHook(() => useHapticSlider({ enabled: false }));

      act(() => {
        result.current.onValueChange(0);
        result.current.onValueChange(5);
        result.current.onValueChange(10);
      });

      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    });
  });

  describe('manual trigger', () => {
    it('allows manual haptic trigger', () => {
      const { result } = renderHook(() => useHapticSlider());

      act(() => {
        result.current.triggerHaptic();
      });

      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('platform behavior', () => {
    it('skips haptics on web platform', () => {
      const originalOS = Platform.OS;
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });

      const { result } = renderHook(() => useHapticSlider());

      act(() => {
        result.current.triggerHaptic();
      });

      expect(Haptics.selectionAsync).not.toHaveBeenCalled();

      Object.defineProperty(Platform, 'OS', { value: originalOS, writable: true });
    });
  });

  describe('bucket calculation', () => {
    it('handles negative values correctly', () => {
      const { result } = renderHook(() => useHapticSlider({ interval: 5 }));

      act(() => {
        result.current.onValueChange(-10);
        result.current.onValueChange(-6);
      });
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();

      act(() => {
        result.current.onValueChange(-5);
      });
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    });

    it('handles decimal values correctly', () => {
      const { result } = renderHook(() => useHapticSlider({ interval: 5 }));

      act(() => {
        result.current.onValueChange(4.9);
      });
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();

      act(() => {
        result.current.onValueChange(5.1);
      });
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    });
  });
});
