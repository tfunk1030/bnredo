import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { UserPreferencesProvider } from '@/src/contexts/UserPreferencesContext';
import { ClubBagProvider } from '@/src/contexts/ClubBagContext';
import { WeatherProvider } from '@/src/contexts/WeatherContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <UserPreferencesProvider>
        <ClubBagProvider>
          <WeatherProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="light" />
          </WeatherProvider>
        </ClubBagProvider>
      </UserPreferencesProvider>
    </AuthProvider>
  );
}
