import * as React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { UserPreferencesProvider, UserPreferences } from '@/src/contexts/UserPreferencesContext';
import { ClubBagProvider, Club } from '@/src/contexts/ClubBagContext';
import { WeatherProvider } from '@/src/contexts/WeatherContext';

/**
 * Default mock preferences for tests
 */
export const mockPreferences: UserPreferences = {
  distanceUnit: 'yards',
  temperatureUnit: 'fahrenheit',
  windSpeedUnit: 'mph',
  handPreference: 'right',
  isPremium: false,
  weatherProvider: {
    enableMultiProvider: false,
    primaryProvider: 'openmeteo',
    fallbackOrder: ['tomorrow', 'openmeteo'],
  },
};

/**
 * Default mock clubs for tests
 */
export const mockClubs: Club[] = [
  { key: 'driver', name: 'Driver', isEnabled: true, customDistance: 250, sortOrder: 0 },
  { key: '3wood', name: '3 Wood', isEnabled: true, customDistance: 230, sortOrder: 1 },
  { key: '5wood', name: '5 Wood', isEnabled: true, customDistance: 215, sortOrder: 2 },
  { key: '4iron', name: '4 Iron', isEnabled: true, customDistance: 200, sortOrder: 3 },
  { key: '5iron', name: '5 Iron', isEnabled: true, customDistance: 190, sortOrder: 4 },
  { key: '6iron', name: '6 Iron', isEnabled: true, customDistance: 180, sortOrder: 5 },
  { key: '7iron', name: '7 Iron', isEnabled: true, customDistance: 170, sortOrder: 6 },
  { key: '8iron', name: '8 Iron', isEnabled: true, customDistance: 160, sortOrder: 7 },
  { key: '9iron', name: '9 Iron', isEnabled: true, customDistance: 150, sortOrder: 8 },
  { key: 'pw', name: 'PW', isEnabled: true, customDistance: 140, sortOrder: 9 },
];

/**
 * Default mock weather for tests
 */
export const mockWeather = {
  temperature: 72,
  humidity: 50,
  windSpeed: 10,
  windDirection: 180,
  pressure: 1013,
  altitude: 0,
  observationTime: new Date().toISOString(),
  isManualOverride: false,
};

interface AllProvidersProps {
  children: React.ReactNode;
  initialPreferences?: Partial<UserPreferences>;
  premium?: boolean;
}

/**
 * Wrapper component that provides all app context providers
 * Matches the provider stack in app/_layout.tsx: UserPreferences > ClubBag > Weather
 */
export function AllProviders({
  children,
  initialPreferences,
  premium = false,
}: AllProvidersProps) {
  // Note: In tests, providers use their default state unless mocked
  return (
    <UserPreferencesProvider>
      <ClubBagProvider>
        <WeatherProvider>
          {children}
        </WeatherProvider>
      </ClubBagProvider>
    </UserPreferencesProvider>
  );
}

/**
 * Custom render function that wraps components with all providers
 * Use this instead of render() from @testing-library/react-native
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    initialPreferences?: Partial<UserPreferences>;
    premium?: boolean;
  }
) {
  const { initialPreferences, premium, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders
        initialPreferences={initialPreferences}
        premium={premium}
      >
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });
}

// Re-export everything from testing library
export * from '@testing-library/react-native';
export { renderWithProviders as render };
