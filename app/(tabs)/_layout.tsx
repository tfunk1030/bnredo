import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { Flag, Wind, Settings, Lock } from 'lucide-react-native';
import { colors } from '@/src/constants/theme';
import { useUserPreferences } from '@/src/contexts/UserPreferencesContext';

export default function TabLayout() {
  const { preferences } = useUserPreferences();
  const isPremium = preferences.isPremium;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarAccessibilityLabel: 'Main navigation',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Shot',
          tabBarAccessibilityLabel: 'Shot Calculator tab',
          tabBarIcon: ({ color, size }) => (
            <Flag color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="wind"
        options={{
          title: 'Wind',
          tabBarAccessibilityLabel: isPremium
            ? 'Wind Calculator tab'
            : 'Wind Calculator tab, locked, premium feature',
          tabBarIcon: ({ color, size }) => (
            isPremium ? (
              <Wind color={color} size={size} strokeWidth={2} />
            ) : (
              <Lock
                color={color}
                size={size - 4}
                strokeWidth={2}
                accessibilityLabel="Locked"
              />
            )
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarAccessibilityLabel: 'Settings tab',
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background, // Pure black
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});
