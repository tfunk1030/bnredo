/**
 * WindResultsModal component tests
 * Tests wind calculation display, accessibility, and user interactions
 */
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@/src/test-utils';
import { WindResultsModal } from '@/src/components/WindResultsModal';

// Mock the contexts
const mockGetRecommendedClub = jest.fn();

jest.mock('@/src/contexts/WeatherContext', () => ({
  useWeather: jest.fn(),
  WeatherProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/src/contexts/ClubBagContext', () => ({
  useClubBag: jest.fn(),
  ClubBagProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the wind calculator
jest.mock('@/src/core/services/wind-calculator', () => ({
  calculateWindEffect: jest.fn(),
}));

// Mock the environmental calculator
jest.mock('@/src/core/services/environmental-calculations', () => ({
  EnvironmentalCalculator: {
    calculateAirDensity: jest.fn().mockReturnValue(1.225),
  },
}));

const { useWeather } = require('@/src/contexts/WeatherContext');
const { useClubBag } = require('@/src/contexts/ClubBagContext');
const { calculateWindEffect } = require('@/src/core/services/wind-calculator');

// Increase timeout for React Native component tests
jest.setTimeout(15000);

describe('WindResultsModal', () => {
  const mockWeather = {
    temperature: 72,
    humidity: 50,
    pressure: 1013,
    altitude: 500,
    windSpeed: 15,
    windDirection: 180,
    windGust: 25,
    locationName: 'Test Course',
    observationTime: new Date().toISOString(),
    isManualOverride: false,
  };

  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    targetYardage: 150,
    windAngle: 45,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useWeather.mockReturnValue({
      weather: mockWeather,
      isLoading: false,
      error: null,
      isOffline: false,
    });

    mockGetRecommendedClub.mockReturnValue({
      key: '7iron',
      name: '7 Iron',
      customDistance: 160,
    });

    useClubBag.mockReturnValue({
      getRecommendedClub: mockGetRecommendedClub,
    });

    calculateWindEffect.mockReturnValue({
      totalDistance: 158,
      lateralEffect: 5,
      windEffect: 8,
      environmentalEffect: 2,
    });
  });

  describe('Rendering', () => {
    it('renders modal when visible is true', async () => {
      render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Wind Calculation')).toBeTruthy();
      });
    });

    it('does not render when calculations are null (no weather)', async () => {
      useWeather.mockReturnValue({
        weather: null,
        isLoading: false,
        error: null,
        isOffline: false,
      });

      const { toJSON } = render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        // Modal should return null when no weather data
        expect(toJSON()).toBeNull();
      });
    });

    it('displays target yardage', async () => {
      render(<WindResultsModal {...defaultProps} targetYardage={175} />);

      await waitFor(() => {
        expect(screen.getByText('175 yards')).toBeTruthy();
      });
    });

    it('displays sustained wind speed', async () => {
      render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('15 mph')).toBeTruthy();
      });
    });

    it('displays gust wind speed', async () => {
      render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('25 mph')).toBeTruthy();
      });
    });

    it('displays recommended club', async () => {
      render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        // Club name appears in both sustained and gust sections
        const clubNames = screen.getAllByText('7 Iron');
        expect(clubNames.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Calculations', () => {
    it('calls calculateWindEffect with correct parameters', async () => {
      render(<WindResultsModal {...defaultProps} targetYardage={160} windAngle={90} />);

      await waitFor(() => {
        expect(calculateWindEffect).toHaveBeenCalledWith(
          expect.objectContaining({
            targetYardage: 160,
            windAngle: 90,
            windSpeed: 15,
            clubName: '7iron',
          })
        );
      });
    });

    it('calculates for both sustained and gust conditions', async () => {
      render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        // Should be called twice - once for sustained, once for gust
        expect(calculateWindEffect).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when close button is pressed', async () => {
      const onClose = jest.fn();
      render(<WindResultsModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close wind calculation');
        fireEvent.press(closeButton);
      });

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when recalculate button is pressed', async () => {
      const onClose = jest.fn();
      render(<WindResultsModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        const recalcButton = screen.getByLabelText('Recalculate wind effect');
        fireEvent.press(recalcButton);
      });

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when done button is pressed', async () => {
      const onClose = jest.fn();
      render(<WindResultsModal {...defaultProps} onClose={onClose} />);

      await waitFor(() => {
        const doneButton = screen.getByLabelText('Back to compass');
        fireEvent.press(doneButton);
      });

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has accessible header', async () => {
      render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        const header = screen.getByRole('header');
        expect(header).toBeTruthy();
        expect(header.props.children).toBe('Wind Calculation');
      });
    });

    it('close button has accessibility label', async () => {
      render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close wind calculation');
        expect(closeButton.props.accessibilityRole).toBe('button');
      });
    });

    it('recalculate button has accessibility label', async () => {
      render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        const recalcButton = screen.getByLabelText('Recalculate wind effect');
        expect(recalcButton.props.accessibilityRole).toBe('button');
      });
    });

    it('done button has accessibility label and hint', async () => {
      render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        const doneButton = screen.getByLabelText('Back to compass');
        expect(doneButton.props.accessibilityRole).toBe('button');
        expect(doneButton.props.accessibilityHint).toContain('return to the wind calculator');
      });
    });

    it('sustained wind card has comprehensive accessibility label', async () => {
      calculateWindEffect.mockReturnValue({
        totalDistance: 162,
        lateralEffect: 8,
        windEffect: 12,
        environmentalEffect: 2,
      });

      render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        const sustainedCard = screen.getByLabelText(/Sustained wind at 15 miles per hour/);
        expect(sustainedCard).toBeTruthy();
        expect(sustainedCard.props.accessibilityLabel).toContain('Plays like');
        expect(sustainedCard.props.accessibilityLabel).toContain('Aim');
      });
    });

    it('gust card has comprehensive accessibility label', async () => {
      render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        const gustCard = screen.getByLabelText(/With gusts at 25 miles per hour/);
        expect(gustCard).toBeTruthy();
      });
    });
  });

  describe('Aim Direction', () => {
    it('shows "On target" when lateral offset is minimal', async () => {
      calculateWindEffect.mockReturnValue({
        totalDistance: 158,
        lateralEffect: 0,
        windEffect: 8,
        environmentalEffect: 2,
      });

      render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        const onTargetTexts = screen.getAllByText('On target');
        expect(onTargetTexts.length).toBeGreaterThan(0);
      });
    });

    it('shows aim RIGHT when lateral offset is positive', async () => {
      calculateWindEffect.mockReturnValue({
        totalDistance: 158,
        lateralEffect: 10,
        windEffect: 8,
        environmentalEffect: 2,
      });

      render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        const aimRightTexts = screen.getAllByText(/Aim.*RIGHT/);
        expect(aimRightTexts.length).toBeGreaterThan(0);
      });
    });

    it('shows aim LEFT when lateral offset is negative', async () => {
      calculateWindEffect.mockReturnValue({
        totalDistance: 158,
        lateralEffect: -7,
        windEffect: 8,
        environmentalEffect: 2,
      });

      render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        const aimLeftTexts = screen.getAllByText(/Aim.*LEFT/);
        expect(aimLeftTexts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Effect Breakdown', () => {
    it('displays environmental effect', async () => {
      calculateWindEffect.mockReturnValue({
        totalDistance: 158,
        lateralEffect: 0,
        windEffect: 8,
        environmentalEffect: 3.5,
      });

      render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Environmental')).toBeTruthy();
        expect(screen.getByText('+3.5 yds')).toBeTruthy();
      });
    });

    it('displays sustained wind effect', async () => {
      render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Wind (sustained)')).toBeTruthy();
      });
    });

    it('displays gust wind effect', async () => {
      render(<WindResultsModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Wind (gusts)')).toBeTruthy();
      });
    });
  });
});
