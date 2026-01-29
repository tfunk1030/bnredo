# Security Assessment: AICaddyPro UI Security Review
Generated: 2026-01-29T05:48:51Z

## Executive Summary
- **Risk Level:** HIGH
- **Findings:** 1 critical, 2 high, 3 medium
- **Immediate Actions Required:** Yes

## Threat Model
- **Attackers:** Malicious users, script kiddies, premium bypass attempts
- **Assets:** Premium features, user preferences, location data
- **Attack Vectors:** Client-side premium bypass, AsyncStorage manipulation, input abuse

---

## Findings

### CRITICAL: Premium Feature Gate Bypassed Entirely Client-Side

**Location:** `/home/tfunk1030/bnredo/src/contexts/UserPreferencesContext.tsx:17,70-77`
**Vulnerability:** Broken Access Control
**Risk:** Premium status (`isPremium: boolean`) is stored client-side in AsyncStorage with no server validation. Any user can bypass premium features by:
1. Modifying AsyncStorage directly
2. Using React DevTools to call `updatePreferences({ isPremium: true })`
3. Using the UI toggle in settings (currently labeled as "dev toggle")

**Evidence:**
```typescript
// UserPreferencesContext.tsx:17
export interface UserPreferences {
  // ...
  isPremium: boolean;  // Client-side only!
}

// UserPreferencesContext.tsx:70-77
const updatePreferences = async (updates: Partial<UserPreferences>) => {
  try {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
};
```

**Also in wind.tsx:96-98:**
```typescript
const handleUpgrade = () => {
  updatePreferences({ isPremium: true });  // Instant "premium" with no payment!
};
```

**Impact:**
- Complete loss of revenue from premium features
- Wind Calculator accessible to all users for free

**Remediation:**
1. **IMMEDIATE:** Remove `handleUpgrade` button from production builds
2. Implement server-side premium verification via Supabase
3. Store subscription status in Supabase user profile
4. Validate premium status on each protected action:
```typescript
// Server-side check
const { data: profile } = await supabase
  .from('user_profiles')
  .select('subscription_tier')
  .single();
if (profile?.subscription_tier !== 'premium') {
  throw new Error('Premium required');
}
```
5. Use short-lived tokens/sessions that include subscription claims

---

### HIGH: Unvalidated Club Distance Input

**Location:** `/home/tfunk1030/bnredo/app/(tabs)/settings.tsx:58-64`
**Vulnerability:** Insufficient Input Validation
**Risk:** Club distance input accepts any integer between 1-400 but has no protection against:
- Non-numeric input causing NaN propagation
- Extremely rapid input changes (no debounce)
- Values that break physics calculations

**Evidence:**
```typescript
// settings.tsx:58-64
const handleDistanceSubmit = (clubKey: string) => {
  const distance = parseInt(editDistance, 10);
  if (!isNaN(distance) && distance > 0 && distance <= 400) {
    updateClub(clubKey, { customDistance: distance });
  }
  setEditingClub(null);
  setEditDistance('');
};

// TextInput at line 244-254
<TextInput
  style={styles.distanceTextInput}
  value={editDistance}
  onChangeText={setEditDistance}  // No sanitization
  keyboardType="number-pad"
  autoFocus
  selectTextOnFocus
  maxLength={3}  // Allows "999"
  // ...
/>
```

**Issues:**
1. `maxLength={3}` allows 999, but validation caps at 400
2. No real-time validation feedback
3. Invalid input silently rejected (no error message)
4. Copy-paste could bypass number-pad keyboard

**Remediation:**
1. Add real-time validation with visual feedback:
```typescript
const validateDistance = (text: string) => {
  const num = parseInt(text, 10);
  if (isNaN(num)) return { valid: false, error: 'Enter a number' };
  if (num < 1 || num > 400) return { valid: false, error: 'Must be 1-400' };
  return { valid: true };
};
```
2. Change `maxLength` to 3 with proper bounds validation
3. Show inline error state when invalid
4. Consider using `accessibilityInvalid` state for screen readers

---

### HIGH: Location Data Stored Without Encryption

**Location:** `/home/tfunk1030/bnredo/src/services/weather-service.ts:124-129`
**Vulnerability:** Sensitive Data Exposure
**Risk:** User's precise GPS coordinates (latitude, longitude) are cached in AsyncStorage without encryption. This data could be accessed by:
- Other apps with AsyncStorage access (on rooted/jailbroken devices)
- Physical device access
- Backup extraction

**Evidence:**
```typescript
// weather-service.ts:124-129
async function cacheWeather(weather: WeatherData): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(weather));
    // Stores: { latitude: 37.7749, longitude: -122.4194, ... }
  } catch (error) {
    console.error('Failed to cache weather:', error);
  }
}

// WeatherContext.tsx:102-111
try {
  const manualOverride = await AsyncStorage.getItem(MANUAL_OVERRIDE_KEY);
  if (manualOverride) {
    const parsed = JSON.parse(manualOverride);  // Also contains coords
    // ...
  }
}
```

**AsyncStorage Keys with Sensitive Data:**
| Key | Contains | Sensitive |
|-----|----------|-----------|
| `weather_cache` | lat, lon, location name | YES |
| `weather_manual_override` | lat, lon, location name | YES |
| `user_preferences` | Unit preferences | LOW |
| `club_bag` | Club distances | LOW |

**Remediation:**
1. For production: Use `expo-secure-store` for sensitive data:
```typescript
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('weather_cache', JSON.stringify(weather));
```
2. Reduce coordinate precision (2-3 decimal places is sufficient for weather)
3. Add data retention policy (clear old cached locations)
4. Document data storage in privacy policy

---

### MEDIUM: Slider Bounds Allow Extreme Physics Values

**Location:** `/home/tfunk1030/bnredo/app/(tabs)/index.tsx:91-113`, `/home/tfunk1030/bnredo/app/(tabs)/wind.tsx:243-262`
**Vulnerability:** Edge Case Input
**Risk:** Slider bounds (50-350 yards) are enforced at UI level but edge values could cause:
- Physics calculation edge cases
- Potential overflow in adjusted yardage calculations
- Unexpected behavior with extreme environmental conditions

**Evidence:**
```typescript
// index.tsx:91-113
<Slider
  minimumValue={50}
  maximumValue={350}
  step={1}
  value={targetYardage}
  onValueChange={(value) => {
    onSliderHaptic(value);
    setTargetYardage(value);  // Direct state update, no validation
  }}
  // ...
/>

// index.tsx:67-69
const handleIncrement = (amount: number) => {
  setTargetYardage(prev => Math.min(350, Math.max(50, prev + amount)));
  // Bounds enforced only here
};
```

**Issue:** `setTargetYardage(value)` from slider has no bounds check. While the slider UI constrains the value, a compromised slider component could pass any value.

**Also in calculations (index.tsx:52):**
```typescript
const adjustedYardage = Math.round(targetYardage * (1 - totalAdjustmentPercent / 100));
// With extreme adjustments, could produce negative or very large values
```

**Remediation:**
1. Add defensive bounds checking in state setter:
```typescript
const setValidatedYardage = (value: number) => {
  const bounded = Math.max(50, Math.min(350, Math.round(value)));
  setTargetYardage(bounded);
};
```
2. Validate calculated values before display:
```typescript
const safeAdjustedYardage = Math.max(0, Math.min(500, calculations.adjustedYardage));
```

---

### MEDIUM: AsyncStorage JSON Parsing Without Try-Catch

**Location:** `/home/tfunk1030/bnredo/src/contexts/ClubBagContext.tsx:43-56`
**Vulnerability:** Exception Handling
**Risk:** `JSON.parse()` can throw on malformed data. While there's a try-catch, corrupted data could cause repeated crashes on app launch.

**Evidence:**
```typescript
// ClubBagContext.tsx:43-56
const loadClubs = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);  // Could throw
      if (Array.isArray(parsed) && parsed.length > 0) {
        setClubs(parsed);  // No schema validation
      }
    }
  } catch (error) {
    console.error('Failed to load clubs:', error);
    // Falls through to finally, but state remains default
  } finally {
    setIsLoading(false);
  }
};
```

**Issues:**
1. Malformed JSON crashes silently, logs to console
2. No integrity check on parsed data shape
3. No automatic recovery or data migration

**Same pattern in:**
- `UserPreferencesContext.tsx:57-67`
- `WeatherContext.tsx:102-114`

**Remediation:**
1. Add schema validation:
```typescript
const isValidClub = (obj: unknown): obj is Club => {
  return typeof obj === 'object' && obj !== null &&
    typeof (obj as Club).key === 'string' &&
    typeof (obj as Club).customDistance === 'number';
};
```
2. Implement data recovery:
```typescript
if (stored) {
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.every(isValidClub)) {
      setClubs(parsed);
    } else {
      console.warn('Invalid club data, resetting to defaults');
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY); // Clear corrupted data
  }
}
```

---

### MEDIUM: Dev Toggle Exposed in Production UI

**Location:** `/home/tfunk1030/bnredo/app/(tabs)/settings.tsx:128-149`
**Vulnerability:** Exposed Debug Functionality
**Risk:** Premium toggle marked as "(Dev toggle for testing)" is visible in production builds, allowing easy premium bypass.

**Evidence:**
```typescript
// settings.tsx:128-149
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
  <Text ...>
    {preferences.isPremium ? 'Downgrade' : 'Upgrade'}
  </Text>
</TouchableOpacity>

// Line 150
<Text style={styles.devNote}>(Dev toggle for testing)</Text>
```

**Also in wind.tsx:169-171:**
```typescript
<TouchableOpacity ... onPress={handleUpgrade}>
  <Text style={styles.upgradeButtonText}>Unlock Premium</Text>
</TouchableOpacity>
<Text style={styles.devNote}>(Dev: Tap to simulate premium)</Text>
```

**Remediation:**
1. Wrap dev controls in `__DEV__` check:
```typescript
{__DEV__ && (
  <TouchableOpacity onPress={() => updatePreferences({ isPremium: !preferences.isPremium })}>
    <Text>[DEV] Toggle Premium</Text>
  </TouchableOpacity>
)}
```
2. In production, replace with actual IAP flow:
```typescript
{!__DEV__ && (
  <TouchableOpacity onPress={initiateInAppPurchase}>
    <Text>Upgrade to Premium</Text>
  </TouchableOpacity>
)}
```

---

## AsyncStorage Usage Summary

| Storage Key | Data Stored | Sensitive | Encrypted |
|-------------|-------------|-----------|-----------|
| `user_preferences` | Units, hand pref, isPremium | LOW | NO |
| `club_bag` | Club names, distances | LOW | NO |
| `weather_cache` | Lat/lon, weather data | HIGH | NO |
| `weather_manual_override` | Lat/lon, weather data | HIGH | NO |

**Recommendations:**
1. Move location data to `expo-secure-store`
2. Consider encrypting all AsyncStorage values
3. Add data expiration/cleanup routines

---

## Input Validation Summary

| Input | Location | Bounds | Validated | Issues |
|-------|----------|--------|-----------|--------|
| Target yardage (slider) | index.tsx:91 | 50-350 | UI only | No state validation |
| Target yardage (buttons) | index.tsx:67 | 50-350 | YES | Proper bounds |
| Target yardage (wind) | wind.tsx:243 | 50-350 | UI only | No state validation |
| Club distance (text) | settings.tsx:244 | 1-400 | Partial | Silent failure |

---

## Premium Gate Analysis

**Current Implementation:**
```
User clicks "Unlock Premium"
  -> updatePreferences({ isPremium: true })
  -> AsyncStorage.setItem('user_preferences', {..., isPremium: true})
  -> Wind Calculator unlocked
```

**No server-side verification exists.**

**Attack Scenario:**
1. User inspects React DevTools or AsyncStorage
2. Finds `user_preferences` key
3. Sets `isPremium: true`
4. Full premium access granted

**Required Architecture:**
```
User clicks "Purchase Premium"
  -> App Store / Play Store IAP
  -> Server receives purchase verification
  -> Server updates user's Supabase profile
  -> App queries profile on each premium feature access
  -> Token contains subscription claim (short-lived)
```

---

## Recommendations

### Immediate (Critical/High)
1. **Remove dev premium toggles** from production builds using `__DEV__` guards
2. **Implement server-side premium verification** via Supabase before launch
3. **Move location data to expo-secure-store**
4. **Add bounds validation** on slider state updates

### Short-term (Medium)
1. Add schema validation for all AsyncStorage reads
2. Add inline validation feedback for text inputs
3. Implement data corruption recovery
4. Reduce location precision in cached data

### Long-term (Hardening)
1. Integrate with App Store/Play Store IAP
2. Use short-lived JWTs with subscription claims
3. Add rate limiting on preference updates
4. Implement data encryption for all local storage
5. Add telemetry for suspicious premium bypass attempts
