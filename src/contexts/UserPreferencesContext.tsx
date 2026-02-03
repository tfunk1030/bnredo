import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from './AuthContext';

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
  const { user } = useAuth();
  const [preferences, setPreferences] = React.useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      // If logged in, try Supabase first
      if (user) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data && !error) {
          const cloudPrefs: UserPreferences = {
            distanceUnit: data.distance_unit,
            temperatureUnit: data.temperature_unit,
            windSpeedUnit: data.wind_speed_unit,
            handPreference: data.hand_preference,
            isPremium: data.is_premium,
            weatherProvider: defaultPreferences.weatherProvider, // Not stored in DB
          };
          // Merge with local for weatherProvider settings
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored) {
            const local = JSON.parse(stored);
            cloudPrefs.weatherProvider = local.weatherProvider || defaultPreferences.weatherProvider;
          }
          setPreferences(cloudPrefs);
          // Also save to local storage as cache
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cloudPrefs));
          return;
        }
      }

      // Fall back to local storage
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
      
      // Always save to local storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));

      // If logged in, sync to Supabase
      if (user) {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            distance_unit: newPreferences.distanceUnit,
            temperature_unit: newPreferences.temperatureUnit,
            wind_speed_unit: newPreferences.windSpeedUnit,
            hand_preference: newPreferences.handPreference,
            is_premium: newPreferences.isPremium,
          }, { onConflict: 'user_id' });

        if (error) {
          console.error('Failed to sync preferences to cloud:', error);
        }
      }
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
