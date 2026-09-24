/**
 * Jest environment for ZoneGuard.
 *
 * AsyncStorage is backed by a real in-memory map rather than bare jest.fn()s,
 * because the cache and progress modules depend on reading back what they
 * wrote — stubs that always resolve undefined would make those tests vacuous.
 */

// Must be `mock`-prefixed: jest hoists jest.mock() above this declaration and
// only permits factories to close over names matching that prefix.
const mockStorage = new Map<string, string>();

export const __resetStorage = () => mockStorage.clear();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => (mockStorage.has(key) ? mockStorage.get(key)! : null)),
  setItem: jest.fn(async (key: string, value: string) => {
    mockStorage.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    mockStorage.delete(key);
  }),
  clear: jest.fn(async () => mockStorage.clear()),
  getAllKeys: jest.fn(async () => Array.from(mockStorage.keys())),
}));

jest.mock('expo-location', () => ({
  Accuracy: { Lowest: 1, Low: 2, Balanced: 3, High: 4, Highest: 5, BestForNavigation: 6 },
  GeofencingEventType: { Enter: 1, Exit: 2 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getBackgroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  hasStartedLocationUpdatesAsync: jest.fn(async () => false),
  startGeofencingAsync: jest.fn(),
  stopGeofencingAsync: jest.fn(),
  hasStartedGeofencingAsync: jest.fn(async () => false),
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskDefined: jest.fn(() => true),
  isTaskRegisteredAsync: jest.fn(async () => true),
  getRegisteredTasksAsync: jest.fn(async () => []),
}));

jest.mock('expo-notifications', () => ({
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(async () => 'notification-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  dismissNotificationAsync: jest.fn(async () => undefined),
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval', DAILY: 'daily' },
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('expo-device', () => ({ isDevice: true }));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
}));

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
}));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase/auth', () => ({
  initializeAuth: jest.fn(() => ({ currentUser: null })),
  getAuth: jest.fn(() => ({ currentUser: null })),
  getReactNativePersistence: jest.fn(),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  signInAnonymously: jest.fn(async () => ({ user: { uid: 'test-uid' } })),
}));

jest.mock('firebase/firestore', () => ({
  initializeFirestore: jest.fn(() => ({})),
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  onSnapshot: jest.fn(() => jest.fn()),
  doc: jest.fn(() => ({})),
  setDoc: jest.fn(async () => undefined),
  updateDoc: jest.fn(async () => undefined),
  getDoc: jest.fn(async () => ({ exists: () => false, data: () => undefined })),
  getDocs: jest.fn(async () => ({ docs: [] })),
  deleteDoc: jest.fn(async () => undefined),
  orderBy: jest.fn(() => ({})),
  limit: jest.fn(() => ({})),
  writeBatch: jest.fn(() => ({ set: jest.fn(), update: jest.fn(), commit: jest.fn(async () => undefined) })),
  Timestamp: { now: jest.fn(() => ({ toMillis: () => Date.now() })) },
}));
