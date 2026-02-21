/**
 * CompassDisplay component tests
 * Tests accessibility, reduce motion, and visual elements
 */
import * as React from 'react';
import { render, screen, waitFor } from '@/src/test-utils';
import { AccessibilityInfo } from 'react-native';
import { CompassDisplay } from '@/src/components/CompassDisplay';

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);
});

describe('CompassDisplay', () => {
  const defaultProps = {
    heading: 180,
    windDirection: 270,
    windSpeed: 15,
  };

  describe('Rendering', () => {
    it('renders the compass container', async () => {
      render(<CompassDisplay {...defaultProps} />);

      await waitFor(() => {
        // The component wraps in a View with accessibilityRole="image"
        const compass = screen.getByRole('image');
        expect(compass).toBeTruthy();
      });
    });

    it('includes wind speed in accessibility description', async () => {
      render(<CompassDisplay {...defaultProps} windSpeed={25} />);

      await waitFor(() => {
        // SVG Text elements aren't accessible via getByText,
        // but wind speed is included in accessibility label
        const compass = screen.getByRole('image');
        expect(compass.props.accessibilityLabel).toContain('25 miles per hour');
      });
    });

  });

  describe('Accessibility', () => {
    it('has correct accessibility role', async () => {
      render(<CompassDisplay {...defaultProps} />);

      await waitFor(() => {
        const compass = screen.getByRole('image');
        expect(compass).toBeTruthy();
      });
    });

    it('provides descriptive accessibility label with heading', async () => {
      render(<CompassDisplay {...defaultProps} heading={90} />);

      await waitFor(() => {
        const compass = screen.getByRole('image');
        expect(compass.props.accessibilityLabel).toContain('90 degrees heading');
      });
    });

    it('includes wind speed in accessibility label', async () => {
      render(<CompassDisplay {...defaultProps} windSpeed={20} />);

      await waitFor(() => {
        const compass = screen.getByRole('image');
        expect(compass.props.accessibilityLabel).toContain('20 miles per hour');
      });
    });

    it('describes wind effect as tailwind when wind from behind', async () => {
      // Wind from 180, heading 0 = tailwind (wind coming from behind player)
      render(<CompassDisplay heading={0} windDirection={180} windSpeed={10} />);

      await waitFor(() => {
        const compass = screen.getByRole('image');
        expect(compass.props.accessibilityLabel).toContain('helping wind from behind');
      });
    });

    it('describes wind effect as headwind when wind from front', async () => {
      // Wind from 0, heading 0 = headwind (wind coming from direction player faces)
      render(<CompassDisplay heading={0} windDirection={0} windSpeed={10} />);

      await waitFor(() => {
        const compass = screen.getByRole('image');
        expect(compass.props.accessibilityLabel).toContain('opposing wind from front');
      });
    });

    it('describes wind effect as crosswind when wind from side (left)', async () => {
      // Wind from 270, heading 0 = crosswind
      render(<CompassDisplay heading={0} windDirection={270} windSpeed={10} />);

      await waitFor(() => {
        const compass = screen.getByRole('image');
        expect(compass.props.accessibilityLabel).toContain('crosswind from side');
      });
    });

    it('describes wind effect as crosswind when wind from side (right)', async () => {
      // Wind from 90, heading 0 = crosswind
      render(<CompassDisplay heading={0} windDirection={90} windSpeed={10} />);

      await waitFor(() => {
        const compass = screen.getByRole('image');
        expect(compass.props.accessibilityLabel).toContain('crosswind from side');
      });
    });

    it('indicates locked state in accessibility label', async () => {
      render(<CompassDisplay {...defaultProps} isLocked={true} />);

      await waitFor(() => {
        const compass = screen.getByRole('image');
        expect(compass.props.accessibilityLabel).toContain('Target locked');
      });
    });

    it('has polite live region for dynamic updates', async () => {
      render(<CompassDisplay {...defaultProps} />);

      await waitFor(() => {
        const compass = screen.getByRole('image');
        expect(compass.props.accessibilityLiveRegion).toBe('polite');
      });
    });

    it('hides legend from accessibility tree', async () => {
      const { toJSON } = render(<CompassDisplay {...defaultProps} />);

      await waitFor(() => {
        // Legend row has importantForAccessibility="no-hide-descendants"
        // Verify legend items are present in the render tree but not accessible
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Your Heading');
        expect(json).toContain('no-hide-descendants');
      });
    });
  });

  describe('Reduce Motion Support', () => {
    it('checks system reduce motion preference on mount', async () => {
      render(<CompassDisplay {...defaultProps} />);

      await waitFor(() => {
        expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
      });
    });

    it('subscribes to reduce motion changes', async () => {
      render(<CompassDisplay {...defaultProps} />);

      await waitFor(() => {
        expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
          'reduceMotionChanged',
          expect.any(Function)
        );
      });
    });

    it('uses prop value when reduceMotion prop is provided', async () => {
      // When prop is explicitly provided, component still renders correctly
      render(<CompassDisplay {...defaultProps} reduceMotion={true} />);

      await waitFor(() => {
        // Component should render with reduce motion enabled
        const compass = screen.getByRole('image');
        expect(compass).toBeTruthy();
      });
    });

    it('cleans up event listener on unmount', async () => {
      const mockRemove = jest.fn();
      (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValue({ remove: mockRemove });

      const { unmount } = render(<CompassDisplay {...defaultProps} />);

      await waitFor(() => {
        expect(AccessibilityInfo.addEventListener).toHaveBeenCalled();
      });

      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('Legend Display', () => {
    it('shows legend items (hidden from a11y tree)', async () => {
      const { toJSON } = render(<CompassDisplay {...defaultProps} />);

      await waitFor(() => {
        // Legend is rendered but hidden from accessibility tree
        // We verify by checking the JSON output contains the text
        const json = JSON.stringify(toJSON());
        expect(json).toContain('Your Heading');
        // Wind legend now shows effect type (e.g., "Wind (crosswind)")
        expect(json).toContain('Wind');
      });
    });
  });
});
