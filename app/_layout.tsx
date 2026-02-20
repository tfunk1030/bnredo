import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { UserPreferencesProvider } from '@/src/contexts/UserPreferencesContext';
import { ClubBagProvider } from '@/src/contexts/ClubBagContext';
import { WeatherProvider } from '@/src/contexts/WeatherContext';
import { colors } from '@/src/constants/theme';

function AppContent() {
  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </View>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <UserPreferencesProvider>
        <ClubBagProvider>
          <WeatherProvider>
            <AppContent />
          </WeatherProvider>
        </ClubBagProvider>
      </UserPreferencesProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
