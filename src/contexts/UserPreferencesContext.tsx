import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WeatherProviderOption = 'tomorrow' | 'openmeteo';

export interface WeatherProviderSettings {
  enableMultiProvider: boolean;
  primaryProvider: WeatherProviderOption;
  fallbackOrder: WeatherProviderOption[];
}

export interface UserPreferences {
  distanceUnit: 'yards' | 'meters';
  temperatureUnit: 'fahrenheit' | 'celsius';
  windSpeedUnit: 'mph' | 'kmh';
  handPreference: 'right' | 'left';
  isPremium: boolean;
  // Weather provider settings (opt-in feature)
  weatherProvider: WeatherProviderSettings;
}

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  isLoading: boolean;
}

const defaultPreferences: UserPreferences = {
  distanceUnit: 'yards',
  temperatureUnit: 'fahrenheit',
  windSpeedUnit: 'mph',
  handPreference: 'right',
  isPremium: false,
  weatherProvider: {
    enableMultiProvider: false,  // Opt-in: use Tomorrow.io → Open-Meteo fallback
    primaryProvider: 'openmeteo',
    fallbackOrder: ['tomorrow', 'openmeteo'],
  },
};

const STORAGE_KEY = 'user_preferences';

const UserPreferencesContext = React.createContext<UserPreferencesContextType>({
  preferences: defaultPreferences,
  updatePreferences: async () => {},
  isLoading: true,
});

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = React.useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPreferences({ ...defaultPreferences, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      const newPreferences = { ...preferences, ...updates };
      setPreferences(newPreferences);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const value = React.useMemo(() => ({
    preferences,
    updatePreferences,
    isLoading,
  }), [preferences, isLoading]);

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = React.useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  }
  return context;
}
