import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Crown, Check, Cloud, AlertCircle, User, LogOut } from 'lucide-react-native';
import { getProviderStatus } from '@/src/services/weather';
import { colors, spacing, borderRadius, typography, touchTargets, animation, glass } from '@/src/constants/theme';
import { AnimatedCollapsible } from '@/src/components/ui';
import { useReduceMotion } from '@/src/hooks/useReduceMotion';
import { useAuth } from '@/src/contexts/AuthContext';
import { useUserPreferences } from '@/src/contexts/UserPreferencesContext';
import { useClubBag } from '@/src/contexts/ClubBagContext';

type OptionValue = string;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signIn, signUp, signOut, isLoading: authLoading } = useAuth();
  const { preferences, updatePreferences } = useUserPreferences();
  const { clubs, updateClub } = useClubBag();
  const [showClubBag, setShowClubBag] = React.useState(false);
  const [editingClub, setEditingClub] = React.useState<string | null>(null);
  const [editDistance, setEditDistance] = React.useState('');
  const reduceMotion = useReduceMotion();

  // Auth form state
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [authMode, setAuthMode] = React.useState<'signin' | 'signup'>('signin');
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = React.useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      setAuthError('Please enter email and password');
      return;
    }
    setAuthError(null);
    setAuthSubmitting(true);
    
    const result = authMode === 'signin' 
      ? await signIn(email, password)
      : await signUp(email, password);
    
    setAuthSubmitting(false);
    
    if (result.error) {
      setAuthError(result.error);
    } else {
      setEmail('');
      setPassword('');
      if (authMode === 'signup') {
        setAuthError('Check your email to confirm your account');
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Animated chevron rotation
  const chevronRotation = useSharedValue(0);

  const toggleClubBag = () => {
    const newState = !showClubBag;
    setShowClubBag(newState);

    const targetRotation = newState ? 90 : 0;
    if (reduceMotion) {
      chevronRotation.value = targetRotation;
    } else {
      chevronRotation.value = withTiming(targetRotation, {
        duration: animation.duration.normal,
        easing: Easing.out(Easing.cubic),
      });
    }
  };

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const handleDistanceSubmit = (clubKey: string) => {
    const distance = parseInt(editDistance, 10);
    if (!isNaN(distance) && distance > 0 && distance <= 400) {
      updateClub(clubKey, { customDistance: distance });
    }
    setEditingClub(null);
    setEditDistance('');
  };

  const renderOption = (
    label: string,
    value: OptionValue,
    options: Array<{ label: string; value: OptionValue }>,
    onSelect: (value: OptionValue) => void
  ) => (
    <View style={styles.optionRow} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.optionButtons}>
        {options.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              value === option.value && styles.optionButtonActive,
            ]}
            onPress={() => onSelect(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${option.label}`}
            accessibilityState={{ checked: value === option.value }}
          >
            <Text
              style={[
                styles.optionButtonText,
                value === option.value && styles.optionButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['rgba(35, 134, 54, 0.08)', 'transparent']}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Account Section */}
        <View style={[styles.section, { marginTop: spacing.lg }]}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {authLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : user ? (
            <View style={styles.accountInfo}>
              <View style={styles.accountHeader}>
                <User color={colors.primary} size={20} />
                <View style={styles.accountDetails}>
                  <Text style={styles.accountEmail}>{user.email}</Text>
                  <Text style={styles.accountHint}>Data synced to cloud</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.signOutButton}
                onPress={handleSignOut}
                accessibilityRole="button"
                accessibilityLabel="Sign out"
              >
                <LogOut color={colors.error} size={18} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.authForm}>
              <TextInput
                style={styles.authInput}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                accessibilityLabel="Email address"
              />
              <TextInput
                style={styles.authInput}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                accessibilityLabel="Password"
              />
              
              {authError && (
                <Text style={styles.authError}>{authError}</Text>
              )}
              
              <TouchableOpacity
                style={[styles.authButton, authSubmitting && styles.authButtonDisabled]}
                onPress={handleAuth}
                disabled={authSubmitting}
                accessibilityRole="button"
                accessibilityLabel={authMode === 'signin' ? 'Sign in' : 'Sign up'}
              >
                {authSubmitting ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.authButtonText}>
                    {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                  </Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.authToggle}
                onPress={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                  setAuthError(null);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.authToggleText}>
                  {authMode === 'signin' 
                    ? "Don't have an account? Sign Up" 
                    : 'Already have an account? Sign In'}
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.hint}>
                Sign in to sync your settings across devices
              </Text>
            </View>
          )}
        </View>

        <View style={[
          styles.section,
          preferences.isPremium && { backgroundColor: glass.cardTint.premiumActive }
        ]}>
          <View style={styles.premiumBanner}>
            <View style={styles.premiumHeader}>
              <Crown
                color={preferences.isPremium ? colors.accent : colors.textSecondary}
                size={24}
              />
              <View style={styles.premiumInfo}>
                <Text style={styles.premiumTitle}>
                  {preferences.isPremium ? 'Premium Active' : 'Free Plan'}
                </Text>
                <Text style={styles.premiumSubtitle}>
                  {preferences.isPremium
                    ? 'All features unlocked'
                    : 'Wind Calculator locked'}
                </Text>
              </View>
            </View>
            {__DEV__ && (
              <TouchableOpacity
                style={[
                  styles.premiumToggle,
                  preferences.isPremium && styles.premiumToggleActive,
                ]}
                onPress={() => updatePreferences({ isPremium: !preferences.isPremium })}
                accessibilityRole="button"
                accessibilityLabel={preferences.isPremium ? 'Downgrade to free plan' : 'Upgrade to premium'}
                accessibilityState={{ selected: preferences.isPremium }}
              >
                <Text
                  style={[
                    styles.premiumToggleText,
                    preferences.isPremium
                      ? styles.premiumToggleTextActive
                      : styles.premiumToggleTextInactive,
                  ]}
                >
                  {preferences.isPremium ? 'Downgrade' : 'Upgrade'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {__DEV__ && (
            <Text style={styles.devNote}>(Dev toggle for testing)</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Units</Text>

          {renderOption(
            'Distance',
            preferences.distanceUnit,
            [
              { label: 'Yards', value: 'yards' },
              { label: 'Meters', value: 'meters' },
            ],
            value => updatePreferences({ distanceUnit: value as 'yards' | 'meters' })
          )}

          {renderOption(
            'Temperature',
            preferences.temperatureUnit,
            [
              { label: '°F', value: 'fahrenheit' },
              { label: '°C', value: 'celsius' },
            ],
            value => updatePreferences({ temperatureUnit: value as 'fahrenheit' | 'celsius' })
          )}

          {renderOption(
            'Wind Speed',
            preferences.windSpeedUnit,
            [
              { label: 'mph', value: 'mph' },
              { label: 'km/h', value: 'kmh' },
            ],
            value => updatePreferences({ windSpeedUnit: value as 'mph' | 'kmh' })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hand Preference</Text>

          {renderOption(
            'Dominant Hand',
            preferences.handPreference,
            [
              { label: 'Left', value: 'left' },
              { label: 'Right', value: 'right' },
            ],
            value => updatePreferences({ handPreference: value as 'right' | 'left' })
          )}
          <Text style={styles.hint}>
            Affects lock button placement in Wind Calculator
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weather Data</Text>

          {(() => {
            try {
              const status = getProviderStatus();
              const isTomorrowConfigured = status.tomorrow.configured;
              
              return (
                <>
                  {/* Primary Provider Selection */}
                  {renderOption(
                    'Primary Provider',
                    preferences.weatherProvider?.primaryProvider ?? 'openmeteo',
                    [
                      { label: 'Open-Meteo', value: 'openmeteo' },
                      { label: 'Tomorrow.io', value: 'tomorrow' },
                    ].filter(opt => opt.value === 'openmeteo' || isTomorrowConfigured),
                    value => updatePreferences({
                      weatherProvider: {
                        ...preferences.weatherProvider,
                        primaryProvider: value as 'openmeteo' | 'tomorrow',
                      }
                    })
                  )}
                  <Text style={styles.hint}>
                    {preferences.weatherProvider?.primaryProvider === 'tomorrow' 
                      ? 'Using Tomorrow.io for hyperlocal weather data'
                      : 'Using Open-Meteo (free, no API key required)'}
                  </Text>

                  {/* Backup Provider Toggle */}
                  <View style={[styles.optionRow, { marginTop: spacing.md }]}>
                    <View style={styles.weatherProviderInfo}>
                      <Cloud color={colors.textSecondary} size={18} />
                      <Text style={styles.optionLabel}>Enable Fallback</Text>
                    </View>
                    <Switch
                      value={preferences.weatherProvider?.enableMultiProvider ?? false}
                      onValueChange={(value) => updatePreferences({
                        weatherProvider: {
                          ...preferences.weatherProvider,
                          enableMultiProvider: value,
                        }
                      })}
                      trackColor={{ false: colors.border, true: colors.primaryDark }}
                      thumbColor={preferences.weatherProvider?.enableMultiProvider ? colors.primary : colors.textMuted}
                      accessibilityRole="switch"
                      accessibilityLabel="Enable fallback weather provider"
                      accessibilityState={{ checked: preferences.weatherProvider?.enableMultiProvider ?? false }}
                    />
                  </View>
                  <Text style={styles.hint}>
                    Automatically use backup provider if primary fails
                  </Text>

                  {/* Provider Status */}
                  <View style={styles.providerStatus}>
                    <View style={styles.providerRow}>
                      <View style={[
                        styles.statusDot, 
                        { backgroundColor: preferences.weatherProvider?.primaryProvider === 'openmeteo' ? colors.primary : colors.textSecondary }
                      ]} />
                      <Text style={styles.providerName}>Open-Meteo</Text>
                      <Text style={styles.providerLabel}>Free • Always Available</Text>
                    </View>
                    <View style={styles.providerRow}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: isTomorrowConfigured 
                          ? (preferences.weatherProvider?.primaryProvider === 'tomorrow' ? colors.accent : colors.textSecondary)
                          : colors.textMuted 
                        }
                      ]} />
                      <Text style={styles.providerName}>Tomorrow.io</Text>
                      <Text style={styles.providerLabel}>
                        {isTomorrowConfigured ? 'Configured' : 'Not Configured'}
                      </Text>
                    </View>
                    {!isTomorrowConfigured && (
                      <View style={styles.configHint}>
                        <AlertCircle color={colors.textMuted} size={12} />
                        <Text style={styles.configHintText}>
                          Add EXPO_PUBLIC_TOMORROW_IO_API_KEY to enable
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              );
            } catch {
              return (
                <Text style={styles.hint}>Unable to load provider status</Text>
              );
            }
          })()}
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={toggleClubBag}
            accessibilityRole="button"
            accessibilityLabel="My Clubs"
            accessibilityHint={showClubBag ? 'Double tap to collapse' : 'Double tap to expand'}
            accessibilityState={{ expanded: showClubBag }}
          >
            <Text style={styles.sectionTitleNoMargin}>My Clubs</Text>
            <Animated.View style={chevronAnimatedStyle}>
              <ChevronRight color={colors.textSecondary} size={20} />
            </Animated.View>
          </TouchableOpacity>

          <AnimatedCollapsible expanded={showClubBag}>
            <View style={styles.clubList}>
              {clubs.map(club => (
                <View key={club.key} style={styles.clubRow}>
                  <Switch
                    value={club.isEnabled}
                    onValueChange={value => updateClub(club.key, { isEnabled: value })}
                    trackColor={{ false: colors.border, true: colors.primaryDark }}
                    thumbColor={club.isEnabled ? colors.primary : colors.textMuted}
                    accessibilityRole="switch"
                    accessibilityLabel={`${club.name} club`}
                    accessibilityState={{ checked: club.isEnabled }}
                    accessibilityHint={`Double tap to ${club.isEnabled ? 'disable' : 'enable'} this club`}
                  />
                  <Text
                    style={[
                      styles.clubName,
                      !club.isEnabled && styles.clubNameDisabled,
                    ]}
                  >
                    {club.name}
                  </Text>

                  {editingClub === club.key ? (
                    <View style={styles.distanceInput}>
                      <TextInput
                        style={styles.distanceTextInput}
                        value={editDistance}
                        onChangeText={setEditDistance}
                        keyboardType="number-pad"
                        autoFocus
                        selectTextOnFocus
                        maxLength={3}
                        accessibilityLabel={`${club.name} distance in yards`}
                        accessibilityHint="Enter distance between 1 and 400 yards"
                      />
                      <TouchableOpacity
                        style={styles.distanceSave}
                        onPress={() => handleDistanceSubmit(club.key)}
                        accessibilityRole="button"
                        accessibilityLabel={`Save ${club.name} distance`}
                      >
                        <Check color={colors.primary} size={18} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.distanceButton}
                      onPress={() => {
                        setEditingClub(club.key);
                        setEditDistance(String(club.customDistance));
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${club.name} distance, currently ${club.customDistance} yards`}
                    >
                      <Text style={styles.distanceText}>
                        {club.customDistance} yds
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </AnimatedCollapsible>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>AICaddy Pro v1.0.0</Text>
          <Text style={styles.footerSubtext}>
            PGA Tour average distances used as defaults
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  sectionTitleNoMargin: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  premiumInfo: {
    gap: 2,
  },
  premiumTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  premiumSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  premiumToggle: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  premiumToggleActive: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  premiumToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  premiumToggleTextActive: {
    color: colors.text,
  },
  premiumToggleTextInactive: {
    color: colors.black,
  },
  devNote: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  optionLabel: {
    color: colors.text,
    fontSize: 15,
  },
  optionButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  optionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
    minWidth: 64,
    minHeight: touchTargets.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
  },
  optionButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  optionButtonTextActive: {
    color: colors.white,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  clubList: {
    marginTop: spacing.sm,
  },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  clubName: {
    color: colors.text,
    fontSize: 15,
    flex: 1,
    marginLeft: spacing.md,
  },
  clubNameDisabled: {
    color: colors.textMuted,
  },
  distanceButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
  },
  distanceText: {
    color: colors.text,
    fontSize: 14,
  },
  distanceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  distanceTextInput: {
    backgroundColor: colors.surfaceElevated,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    width: 60,
    textAlign: 'center',
    fontSize: 14,
  },
  distanceSave: {
    padding: spacing.xs,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  footerSubtext: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  weatherProviderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  providerStatus: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  providerName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  providerLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginLeft: 'auto',
  },
  configHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingLeft: spacing.md,
  },
  configHintText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  // Auth styles
  accountInfo: {
    gap: spacing.md,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  accountDetails: {
    flex: 1,
  },
  accountEmail: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  accountHint: {
    color: colors.textMuted,
    fontSize: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  signOutText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '500',
  },
  authForm: {
    gap: spacing.sm,
  },
  authInput: {
    backgroundColor: colors.surfaceElevated,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    fontSize: 15,
  },
  authButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  authToggle: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  authToggleText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  authError: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
  },
});
