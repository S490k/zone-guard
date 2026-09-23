import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
// @ts-ignore - getReactNativePersistence is exported from the RN bundle of firebase/auth
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** True when .env.local has been filled in. The app still runs without it (local-only mode). */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // initializeAuth throws if called twice (e.g. fast refresh) – reuse existing instance
    auth = getAuth(app);
  }
  try {
    // React Native's XHR shim does not sustain Firestore's WebChannel
    // transport: streams error out every few minutes and silently reconnect,
    // dropping listener updates in between. Long polling is stable here.
    db = initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch {
    // initializeFirestore throws if already called (e.g. fast refresh)
    db = getFirestore(app);
  }
} else {
  console.warn(
    '[ZoneGuard] Firebase not configured – copy .env.example to .env.local and fill it in. Running in local-only mode.'
  );
}

export { app, auth, db };
