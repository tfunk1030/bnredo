/* eslint-disable no-undef */
/**
 * Jest setup for AICaddyPro
 * jest-expo handles most mocks via its preset, this file adds app-specific overrides
 */

// Mock Supabase client - prevents "supabaseUrl is required" error in tests
jest.mock('./src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-location with specific test values
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 0,
      accuracy: 100,
      altitudeAccuracy: 100,
      heading: 0,
      speed: 0,
    },
  }),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
}));

// Mock @shopify/react-native-skia
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: ({ children }) => children,
  Fill: ({ children }) => children,
  Shader: () => null,
  Skia: {
    RuntimeEffect: {
      Make: jest.fn().mockReturnValue({}),
    },
  },
  vec: jest.fn((x, y) => ({ x, y })),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children(inset),
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    initialWindowMetrics: {
      insets: inset,
      frame: { x: 0, y: 0, width: 390, height: 844 },
    },
  };
});

// Mock AccessibilityInfo for reduce motion tests
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.AccessibilityInfo = {
    isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    announceForAccessibility: jest.fn(),
    isBoldTextEnabled: jest.fn().mockResolvedValue(false),
    isGrayscaleEnabled: jest.fn().mockResolvedValue(false),
    isInvertColorsEnabled: jest.fn().mockResolvedValue(false),
    isScreenReaderEnabled: jest.fn().mockResolvedValue(false),
    setAccessibilityFocus: jest.fn(),
  };
  return RN;
});

// Mock fetch for weather API tests - return valid weather response
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({
    current: {
      temperature_2m: 72,
      relative_humidity_2m: 50,
      wind_speed_10m: 10,
      wind_direction_10m: 180,
      surface_pressure: 1013,
    },
    elevation: 0,
  }),
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
