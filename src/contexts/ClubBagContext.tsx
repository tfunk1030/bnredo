import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from './AuthContext';
import { DEFAULT_CLUBS } from '@/src/features/settings/utils/club-mapping';

export interface Club {
  key: string;
  name: string;
  isEnabled: boolean;
  customDistance: number;
  sortOrder: number;
}

interface ClubBagContextType {
  clubs: Club[];
  updateClub: (clubKey: string, updates: Partial<Club>) => Promise<void>;
  getEnabledClubs: () => Club[];
  getRecommendedClub: (yardage: number) => Club | null;
  isLoading: boolean;
}

const STORAGE_KEY = 'club_bag';

const ClubBagContext = React.createContext<ClubBagContextType | null>(null);

function getDefaultClubs(): Club[] {
  return DEFAULT_CLUBS.map((club, index) => ({
    key: club.key,
    name: club.name,
    isEnabled: true,
    customDistance: club.defaultDistance,
    sortOrder: index,
  }));
}

export function ClubBagProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [clubs, setClubs] = React.useState<Club[]>(getDefaultClubs());
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadClubs();
  }, [user]);

  const loadClubs = async () => {
    setIsLoading(true);
    try {
      // If logged in, try Supabase first
      if (user) {
        const { data, error } = await supabase
          .from('user_clubs')
          .select('*')
          .eq('user_id', user.id)
          .order('sort_order', { ascending: true });

        if (data && data.length > 0 && !error) {
          const cloudClubs: Club[] = data.map(row => ({
            key: row.club_key,
            name: row.club_name,
            isEnabled: row.is_enabled,
            customDistance: row.custom_distance,
            sortOrder: row.sort_order,
          }));
          setClubs(cloudClubs);
          // Also save to local storage as cache
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cloudClubs));
          return;
        }
      }

      // Fall back to local storage
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setClubs(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load clubs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateClub = async (clubKey: string, updates: Partial<Club>) => {
    try {
      const newClubs = clubs.map(club =>
        club.key === clubKey ? { ...club, ...updates } : club
      );
      setClubs(newClubs);
      
      // Always save to local storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newClubs));

      // If logged in, sync to Supabase
      if (user) {
        const updatedClub = newClubs.find(c => c.key === clubKey);
        if (updatedClub) {
          const { error } = await supabase
            .from('user_clubs')
            .upsert({
              user_id: user.id,
              club_key: updatedClub.key,
              club_name: updatedClub.name,
              is_enabled: updatedClub.isEnabled,
              custom_distance: updatedClub.customDistance,
              sort_order: updatedClub.sortOrder,
            }, { onConflict: 'user_id,club_key' });

          if (error) {
            console.error('Failed to sync club to cloud:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to save club:', error);
    }
  };

  const getEnabledClubs = React.useCallback(() => {
    return clubs
      .filter(club => club.isEnabled)
      .sort((a, b) => b.customDistance - a.customDistance);
  }, [clubs]);

  const getRecommendedClub = React.useCallback((yardage: number): Club | null => {
    const enabled = getEnabledClubs();
    if (enabled.length === 0) return null;

    // enabled is sorted descending (longest first)
    // Start with longest club as default - if target is longer than all clubs,
    // recommend the longest one (not the shortest!)
    let bestClub = enabled[0];
    for (const club of enabled) {
      if (club.customDistance >= yardage) {
        bestClub = club;
      } else {
        break;
      }
    }
    return bestClub;
  }, [getEnabledClubs]);

  const value = React.useMemo(() => ({
    clubs,
    updateClub,
    getEnabledClubs,
    getRecommendedClub,
    isLoading,
  }), [clubs, isLoading, getEnabledClubs, getRecommendedClub]);

  return (
    <ClubBagContext.Provider value={value}>
      {children}
    </ClubBagContext.Provider>
  );
}

export function useClubBag() {
  const context = React.useContext(ClubBagContext);
  if (!context) {
    throw new Error('useClubBag must be used within ClubBagProvider');
  }
  return context;
}
