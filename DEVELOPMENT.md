# ZoneGuard Development Guide

Complete step-by-step instructions for setting up and running ZoneGuard locally.

## Quick Start

This project uses **Expo SDK 57** (React Native 0.86, React 19), which supports
Xcode 26 and matches the current Expo Go app. Minimum iOS version: 16.4.

- **Quick UI check:** `npx expo start`, then scan the QR code with Expo Go.
- **Background location / push notifications:** need a development build (`npm run ios`),
  because Expo Go can't run background tasks.

Requirements on your Mac: Node 18+, Xcode (with an iOS simulator), CocoaPods.

```bash
npm install                  # installs cleanly, no --legacy-peer-deps needed
cp .env.example .env.local   # optional for now – app runs in local-only mode without it
npm run ios                  # = npx expo run:ios  (prebuilds ios/, pod install, launches simulator)
```

First build takes ~5–10 minutes. After that, `npx expo start` + pressing `i` reloads quickly.

Other checks:

```bash
npm test            # 33 passing, 12 todo
npm run typecheck   # tsc --noEmit, 0 errors
```

## Detailed Setup

### Firebase Project Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click "Create Project" and name it "ZoneGuard"
3. Enable Google Analytics (optional)
4. In the project dashboard:
   - **Firestore**: Create a database (Start in test mode for development)
   - **Authentication**: Enable "Email/Password" and "Anonymous" sign-in methods
   - **Cloud Messaging**: Note the Sender ID (in project settings)
   - **Cloud Functions**: Enable for deployment

### Get Firebase Credentials

1. Click "Project Settings" (gear icon)
2. Scroll down to "Your apps"
3. Click "Create app" and select Web
4. Copy the config object
5. Add these environment variables to `.env.local`:

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

### Deploy Cloud Functions (Optional for Testing)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy functions to your project
firebase deploy --only functions
```

## Running the App

### iOS Simulator

```bash
npm run ios
```

**Expected behavior:**
- App launches showing "ZoneGuard" in the status bar
- First screen shows Onboarding (4 slides)
- After onboarding, shows Dashboard with 4 tabs
- Prompts for location permission
- Map shows current location

### Android Emulator

```bash
npm run android
```

Requires Android Studio with emulator running.

### Development Web (Browser)

```bash
npm run web
```

Note: Web is for development only. Push notifications and background location don't work in the browser.

## File Structure Reference

### Core App Files

| File | Purpose |
|------|---------|
| `index.tsx` | Entry point, registers root component |
| `app/App.tsx` | Main app component, navigation setup, Firebase initialization |
| `app/screens/HomeScreen.tsx` | Dashboard: active zones, stress indicator, location display |
| `app/screens/PrepareScreen.tsx` | Tasks & quizzes interface |
| `app/screens/AlertsScreen.tsx` | Alert history, test alert button |
| `app/screens/EmergencyInfoScreen.tsx` | Emergency kit audit, offline guides |
| `app/screens/OnboardingScreen.tsx` | First-run tutorial (swipeable slides) |

### Components

| File | Purpose |
|------|---------|
| `app/components/GlassmorphicCard.tsx` | Reusable card with glassmorphic style |
| `app/components/TaskCard.tsx` | Checkbox task item with priority color |
| `app/components/StressIndicator.tsx` | Circular preparedness score meter |
| `app/components/GeofenceMap.tsx` | Map placeholder for zone visualization |
| `app/components/ARScanButton.tsx` | Button for future AR scanner |

### Utilities & Hooks

| File | Purpose |
|------|---------|
| `app/utils/distance.ts` | Haversine algorithm, zone detection |
| `app/utils/sm2.ts` | SM-2 spaced repetition algorithm |
| `app/utils/fcmSetup.ts` | Push notification initialization |
| `app/utils/zonesSync.ts` | Real-time Firestore listener for alerts |
| `app/hooks/useLocationMonitor.ts` | Foreground GPS location tracking hook |
| `app/tasks/backgroundLocationTask.ts` | Background location monitoring |

### Configuration

| File | Purpose |
|------|---------|
| `app/config/firebase.ts` | Firebase SDK initialization |
| `app/constants/zones.ts` | 3 hardcoded disaster zones |
| `app/constants/colors.ts` | Color palette (dark theme) |
| `app/constants/navigation.ts` | Tab navigation configuration |
| `app/theme/colors.ts` | Design system (spacing, shadows, etc) |

### Testing

| File | Purpose |
|------|---------|
| `__tests__/setup.ts` | Jest mocking configuration |
| `__tests__/utils/distance.test.ts` | Haversine & zone detection tests |
| `__tests__/utils/sm2.test.ts` | SM-2 algorithm tests |
| `__tests__/hooks/useLocationMonitor.test.ts` | Location hook tests (stubs) |
| `__tests__/integration/firestore.test.ts` | Firestore integration tests (stubs) |

### Cloud Functions

| File | Purpose |
|------|---------|
| `functions/src/index.ts` | Cloud Functions for server-side geofencing |
| `functions/package.json` | Firebase Functions dependencies |

### Configuration Files

| File | Purpose |
|------|---------|
| `app.json` | Expo app configuration (ZoneGuard, iOS/Android settings) |
| `package.json` | Project dependencies |
| `tsconfig.json` | TypeScript configuration |
| `babel.config.js` | Babel configuration for Expo |
| `eas.json` | EAS Build configuration |
| `firebase.json` | Firebase emulator configuration |
| `.gitignore` | Git ignore patterns |
| `.env.example` | Environment variables template |

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test File
```bash
npm test -- __tests__/utils/distance.test.ts
```

### Watch Mode (re-run on file change)
```bash
npm run test:watch
```

### With Coverage
```bash
npm run test:coverage
```

**Test Summary:**
- ✅ 20+ Haversine & zone detection tests
- ✅ 15+ SM-2 algorithm tests
- 🔲 Hook tests (stubs)
- 🔲 Firestore integration (stubs)
- **Target Coverage**: >70%

## Debugging

### Console Logs
```bash
# Watch app logs while running
expo logs
```

### Network Inspector
1. Shake device or `Cmd+D` (iOS simulator)
2. Select "Debug Remote JS"
3. Opens Chrome DevTools for inspection

### Location Testing
The app uses real GPS. To test with mock locations:

**iOS Simulator:**
- Run app
- Open Xcode: `Window → Devices and Simulators`
- Select simulator → Features tab
- Location: Set custom coordinates or "City Walk, San Francisco"

**Android Emulator:**
- Open Android emulator controls (3-dot menu on right)
- Extended controls → Location
- Enter latitude/longitude and send

### Firebase Emulator (Optional)
```bash
firebase emulators:start
```

This runs Firestore, Auth, and Functions locally for testing without hitting live Firebase.

## Building for Production

### Create Signed Build for Deployment

```bash
# Build for Android (APK)
eas build --platform android --auto-submit false

# Build for iOS (IPA for TestFlight)
eas build --platform ios --auto-submit false
```

Requires EAS account (create at [expo.dev](https://expo.dev)) and credentials set up.

### Deploy Cloud Functions
```bash
firebase deploy --only functions
```

## Common Issues

### "ZoneGuard" shows as "PrepareNow"
The iOS native folder still has old naming. Fix:
```bash
npm run prebuild
# Or manually:
rm -rf ios/ && npx expo prebuild
```

### Location not updating
1. Verify location permissions granted in iOS Settings → ZoneGuard
2. Make sure device/simulator has location services enabled
3. On simulator, set a custom location (see Debugging section)

### Firebase connection fails
1. Verify `.env.local` has correct credentials
2. Check Firebase project allows anonymous auth (Security Rules)
3. Ensure internet connection is active
4. Clear app cache: `npm run prebuild`

### Tests fail with "Cannot find module"
```bash
rm -rf node_modules .jest-cache
npm install
npm test
```

### App crashes on startup
Check console logs:
```bash
expo logs
```

Common causes:
- Missing `.env.local` file
- Outdated Expo SDK (run `expo doctor`)
- Missing native dependencies (run `npm install` again)

## Performance Profiling

### Measure Frame Rate
1. Run app
2. Shake device → "Show Perf Monitor"
3. Watch frame rate (should be 60 fps)

### Memory Profiling
- Use Chrome DevTools while debugging
- Check Xcode Instruments for native memory usage
- Background location tracking: target ≤5% battery drain/hour

## Environment Variables

Always create `.env.local` (never commit):

```
EXPO_PUBLIC_FIREBASE_API_KEY=xxxxx
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=xxxxx
EXPO_PUBLIC_FIREBASE_PROJECT_ID=xxxxx
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=xxxxx
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxxxx
EXPO_PUBLIC_FIREBASE_APP_ID=xxxxx
```

Variables prefixed with `EXPO_PUBLIC_` are baked into the build. Keep sensitive keys in `.env.local`.

## Next Steps

1. ✅ Install dependencies and run on simulator
2. ✅ Verify app displays "ZoneGuard" and 4 tabs
3. ✅ Test location permission prompt
4. ⬜ Implement Step 1: Background Location Monitoring
5. ⬜ Implement Step 2: FCM Alert Pipeline
6. ⬜ Continue with remaining steps

---

For production deployment, refer to:
- [EAS Build Documentation](https://docs.expo.dev/build/)
- [Firebase Deployment Guide](https://firebase.google.com/docs/hosting/github-integration)
- [University of London Submission Requirements](README.md)
