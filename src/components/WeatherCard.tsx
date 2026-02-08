import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MapPin, RefreshCw, Thermometer, Droplets, Wind, Gauge } from 'lucide-react-native';
import {
  materialColors,
  spacing,
  typography,
} from '@/src/constants/material-system';
// Semantic colors (warning, error, etc.) not yet in material system
import { colors, hitSlop } from '@/src/constants/theme';
import { RenderCard } from '@/src/components/ui';
import { useWeather } from '@/src/contexts/WeatherContext';
import { useUserPreferences } from '@/src/contexts/UserPreferencesContext';
import { getWindDirectionLabel } from '@/src/services/weather-service';
import { formatTemperature, formatWindSpeed, formatAltitude } from '@/src/utils/unit-conversions';

export const WeatherCard = React.memo(function WeatherCard() {
  const { weather, isLoading, error, isOffline, refreshWeather } = useWeather();
  const { preferences } = useUserPreferences();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Format values based on user preferences
  const tempFormat = weather ? formatTemperature(weather.temperature, preferences.temperatureUnit) : null;
  const windFormat = weather ? formatWindSpeed(weather.windSpeed, preferences.windSpeedUnit) : null;
  const altFormat = weather ? formatAltitude(weather.altitude, preferences.distanceUnit) : null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshWeather();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <RenderCard containerStyle={styles.cardPosition} padding={spacing.md}>
        <View style={styles.loadingContainer} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <ActivityIndicator color={materialColors.primaryMuted} size="small" accessibilityLabel="Loading" />
          <Text style={styles.loadingText}>Loading weather...</Text>
        </View>
      </RenderCard>
    );
  }

  if (!weather) {
    return (
      <RenderCard containerStyle={styles.cardPosition} padding={spacing.md}>
        <View accessibilityRole="alert">
          <Text style={styles.errorText}>Unable to load weather</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            accessibilityRole="button"
            accessibilityLabel="Retry loading weather"
            hitSlop={hitSlop.medium}
          >
            <RefreshCw color={materialColors.primaryMuted} size={16} />
            <Text style={styles.refreshText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </RenderCard>
    );
  }

  return (
    <RenderCard containerStyle={styles.cardPosition} padding={spacing.md}>
      <View style={styles.header}>
        <View style={styles.locationRow}>
          <MapPin color={typography.label.color} size={14} />
          <Text style={styles.locationText} numberOfLines={1}>
            {weather.locationName}
          </Text>
          {isOffline && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>Cached</Text>
            </View>
          )}
          {weather.isManualOverride && (
            <View style={styles.manualBadge}>
              <Text style={styles.manualBadgeText}>Manual</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={isRefreshing}
          accessibilityRole="button"
          accessibilityLabel={isRefreshing ? "Refreshing weather" : "Refresh weather data"}
          accessibilityState={{ busy: isRefreshing }}
          hitSlop={hitSlop.medium}
        >
          <RefreshCw
            color={isRefreshing ? typography.label.color : typography.unit.color}
            size={16}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.grid} accessibilityRole="summary">
        <View style={styles.gridItem} accessible accessibilityLabel={`Temperature: ${tempFormat?.value} ${tempFormat?.label}`}>
          <Thermometer color={materialColors.primaryMuted} size={16} strokeWidth={1.5} />
          <Text style={styles.gridValue}>{tempFormat?.value}{tempFormat?.shortLabel}</Text>
          <Text style={styles.gridLabel}>Temp</Text>
        </View>
        <View style={styles.gridItem} accessible accessibilityLabel={`Humidity: ${weather.humidity} percent`}>
          <Droplets color={typography.unit.color} size={16} strokeWidth={1.5} />
          <Text style={styles.gridValue}>{weather.humidity}%</Text>
          <Text style={styles.gridLabel}>Humidity</Text>
        </View>
        <View style={styles.gridItem} accessible accessibilityLabel={`Wind: ${windFormat?.value} ${windFormat?.label} from ${getWindDirectionLabel(weather.windDirection)}`}>
          <Wind color={materialColors.primaryMuted} size={16} strokeWidth={1.5} />
          <Text style={styles.gridValue}>
            {windFormat?.value}
            <Text style={styles.gridUnit}> {windFormat?.shortLabel}</Text>
          </Text>
          <Text style={styles.gridLabel}>{getWindDirectionLabel(weather.windDirection)}</Text>
        </View>
        <View style={styles.gridItem} accessible accessibilityLabel={`Altitude: ${altFormat?.value} ${altFormat?.label}`}>
          <Gauge color={typography.unit.color} size={16} strokeWidth={1.5} />
          <Text style={styles.gridValue}>{altFormat?.value}</Text>
          <Text style={styles.gridLabel}>Alt ({altFormat?.shortLabel})</Text>
        </View>
      </View>

      {error && !isOffline && (
        <Text style={styles.errorBanner}>{error}</Text>
      )}
    </RenderCard>
  );
});

const styles = StyleSheet.create({
  // Positioning only — RenderCard handles surface/shadow/border
  cardPosition: {
    marginHorizontal: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  loadingText: {
    ...typography.label,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    flex: 1,
  },
  locationText: {
    ...typography.label,
    fontSize: 13,
    flex: 1,
  },
  offlineBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.xxs,
    paddingVertical: 2,
    borderRadius: 6,
  },
  offlineBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '600',
  },
  manualBadge: {
    backgroundColor: materialColors.primaryMuted,
    paddingHorizontal: spacing.xxs,
    paddingVertical: 2,
    borderRadius: 6,
  },
  manualBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    padding: spacing.xs,
    backgroundColor: 'rgba(40, 40, 42, 0.85)',
    borderRadius: 6,
  },
  refreshText: {
    color: materialColors.primaryMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridItem: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  gridValue: {
    ...typography.medium,
    fontSize: 15,
  },
  gridUnit: {
    ...typography.label,
    fontSize: 13,
  },
  gridLabel: {
    ...typography.label,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  errorBanner: {
    color: colors.warning,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
