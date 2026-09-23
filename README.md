# ZoneGuard - Disaster Preparedness Mobile App

A gamified disaster preparedness mobile application for Pakistan that helps users stay informed about disaster zones, prepare for emergencies, and track their household preparedness level.

## Features

- **Real-time Geofencing Alerts**: GPS-based monitoring of disaster-prone zones with instant notifications
- **SM-2 Spaced Repetition Quizzes**: Interactive knowledge checks with adaptive scheduling
- **Household Emergency Kit Audit**: Checklist for building family emergency kits
- **Offline Resource Hub**: Emergency procedures and safety guides (works offline)
- **Preparedness Score**: Gamified tracking of household preparedness level (0-100)
- **4-Tab Navigation**: Dashboard, Prepare, Alerts, Emergency Info
- **Dark Theme UI**: Glassmorphic design with high accessibility compliance

## Tech Stack

- **Frontend**: React Native + Expo SDK 57, TypeScript
- **Backend**: Firebase (Firestore, Auth, Cloud Messaging, Cloud Functions)
- **Location**: Expo Location + TaskManager (background tracking)
- **Navigation**: React Navigation v7 (bottom tabs)
- **Testing**: Jest + React Native Testing Library
- **Build**: EAS Build (production iOS/Android)

## Project Structure

```
zone-guard/
├── app/
│   ├── App.tsx                 # Main app entry with navigation
│   ├── screens/
│   │   ├── HomeScreen.tsx      # Dashboard (active zones, stress indicator)
│   │   ├── PrepareScreen.tsx   # Tasks and quizzes
│   │   ├── AlertsScreen.tsx    # Alert history and test alerts
│   │   ├── EmergencyInfoScreen.tsx # Offline resources and kit audit
│   │   └── OnboardingScreen.tsx    # First-run tutorial
│   ├── components/
│   │   ├── GlassmorphicCard.tsx    # Reusable card component
│   │   ├── TaskCard.tsx            # Task item with checkbox
│   │   ├── StressIndicator.tsx     # Preparedness meter
│   │   ├── GeofenceMap.tsx         # Map placeholder
│   │   └── ARScanButton.tsx        # AR scanner placeholder
│   ├── hooks/
│   │   └── useLocationMonitor.ts   # Foreground location hook
│   ├── utils/
│   │   ├── distance.ts            # Haversine algorithm + zone detection
│   │   ├── sm2.ts                 # SM-2 spaced repetition algorithm
│   │   ├── fcmSetup.ts            # Push notification setup
│   │   ├── zonesSync.ts           # Real-time Firestore listener
│   ├── tasks/
│   │   └── backgroundLocationTask.ts  # Background location tracking
│   ├── config/
│   │   └── firebase.ts            # Firebase initialization
│   ├── constants/
│   │   ├── zones.ts               # Disaster zones (3 hardcoded)
│   │   ├── colors.ts              # Color palette
│   │   └── navigation.ts          # Tab configuration
│   └── theme/
│       └── colors.ts              # Design system
├── __tests__/
│   ├── setup.ts                  # Jest configuration
│   ├── utils/
│   │   ├── distance.test.ts      # Haversine tests
│   │   └── sm2.test.ts           # SM-2 algorithm tests
│   ├── hooks/
│   │   └── useLocationMonitor.test.ts
│   └── integration/
│       └── firestore.test.ts
├── functions/
│   ├── src/
│   │   └── index.ts              # Cloud Functions
│   │       - checkZoneProximity (Firestore trigger)
│   │       - cleanupExpiredAlerts (scheduled)
│   │       - triggerZoneCheck (HTTP endpoint)
│   ├── package.json
│   └── tsconfig.json
├── app.json                       # Expo configuration
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── babel.config.js               # Babel config
├── eas.json                      # EAS Build config
├── firebase.json                 # Firebase emulator config
└── README.md                     # This file
```

## Setup & Installation

### Prerequisites

- Node.js 18+ and npm
- Xcode + CocoaPods (iOS) or Android Studio (Android)
- Firebase project (create at [firebase.google.com](https://firebase.google.com))
- iOS Simulator or Android Emulator (for testing)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Firestore, Authentication (Email + Anonymous), Messaging
3. Create a web app in Firebase console
4. Copy your Firebase config

Create `.env.local` file in project root:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Deploy Firebase Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 4. Run the App

**iOS Simulator (development build, not Expo Go):**
```bash
npm run ios   # npx expo run:ios
```

**Android Emulator:**
```bash
npm run android
```

**Web (development only):**
```bash
npm run web
```

## Core Algorithms

### 1. Haversine Distance (distance.ts)

Great-circle distance calculation for GPS-based geofencing:
- Precision: <5m accuracy
- 3 hardcoded disaster zones in Pakistan
- Real-time zone detection on location update

### 2. SM-2 Spaced Repetition (sm2.ts)

Adaptive learning algorithm:
- Quality scale: 0-5 (based on user response accuracy)
- Ease factor: 1.3-2.6 (learning difficulty)
- Interval scheduling: Dynamic based on performance
- Minimum review interval: 1 day (first review), 3 days (second)

### 3. FCM Alert Pipeline (Cloud Functions)

Server-side geofencing with Firebase:
1. User location updated in Firestore (`users/{uid}`)
2. Cloud Function triggered (`checkZoneProximity`)
3. Distance calculated to all active alerts
4. If in zone: FCM message sent to user
5. Alert logged with timestamp (60-second deduplication)
6. Expired alerts cleaned up (scheduled every 30 minutes)

## Disaster Zones

Three hardcoded zones for Pakistan:

1. **Taunsa Barrage** (30.6987°N, 70.8503°E)
   - Radius: 15 km
   - Severity: High
   - Focus: Flood risk

2. **Jacobabad** (27.2822°N, 68.4501°E)
   - Radius: 30 km
   - Severity: Critical
   - Focus: Extreme heat waves

3. **Muzaffarabad** (34.3590°N, 73.4713°E)
   - Radius: 20 km
   - Severity: Medium
   - Focus: Seismic activity

## Testing

### Run Tests
```bash
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

**Current Test Coverage:**
- ✅ Haversine distance calculations (5+ cases)
- ✅ Zone detection logic (overlap, precision)
- ✅ SM-2 algorithm state transitions
- ✅ Quality score calculations
- 🔲 Hook tests (stubs)
- 🔲 Firestore integration tests (stubs)

## Build & Deployment

### Development Build (APK/IPA via Simulator)

```bash
# iOS
npm run ios

# Android
npm run android
```

### Production Build (EAS Build)

```bash
# Build Android APK
npm run build:android

# Build iOS IPA (for TestFlight)
npm run build:ios

# Deploy Cloud Functions
firebase deploy --only functions
```

### Apple Developer Account

**Option 1**: Set up account BEFORE deploying
- Register at [developer.apple.com](https://developer.apple.com)
- Create provisioning profiles
- Configure in `app.json` bundleIdentifier

**Option 2**: Create account after app development
- EAS can help manage certificates and provisioning during build
- Build will guide you through account creation if needed

## Performance Targets

- **Battery**: ≤5% drain/hour for background location tracking
- **Alert Latency**: Mean <500ms, p95 <500ms
- **Offline Capability**: Full app functionality without network
- **Zone Precision**: <5m accuracy for geofencing
- **Quiz Performance**: SM-2 algorithm targets 80% recall after 3 reviews

## Accessibility

- WCAG AA compliance
- 4.5:1 contrast ratio (light text on dark background)
- 44×44pt minimum touch targets
- Screen reader labels for all interactive elements
- No reliance on color alone for status indication

## Security & Privacy

- Email + Anonymous Firebase Auth
- Offline data stored in IndexedDB (encrypted at rest)
- Location data never stored locally (only temporary)
- Push tokens stored for FCM only
- No third-party analytics

## Key Dependencies

- **expo**: ~57.0.24
- **react-native**: 0.86.3
- **firebase**: ^12.19.0
- **@react-navigation/native**: ^7.4.1
- **expo-location**: ^17.0.1
- **expo-task-manager**: ^11.7.0
- **typescript**: ^5.3.3
- **jest**: ^29.7.0

## Roadmap (Future Features)

- [ ] AR item scanner for emergency kit
- [ ] Community preparedness leaderboard
- [ ] SMS alerts (fallback if FCM unavailable)
- [ ] Offline maps
- [ ] Multi-language support
- [ ] Family group sharing
- [ ] Integration with NDMA alerts (official disaster agency)

## Troubleshooting

### App shows "PrepareNow" instead of "ZoneGuard"
```bash
# Regenerate native folders
npm run prebuild
```

### Location not working
1. Check iOS/Android permissions in phone settings
2. Use physical device (simulator location is simulated)
3. Ensure location services are enabled

### Firebase connection issues
1. Verify `.env.local` has correct config
2. Check Firebase project security rules allow read/write
3. Ensure internet connection is active

### Tests failing
```bash
# Clear cache and retry
rm -rf node_modules .jest-cache
npm install
npm test
```

## Contributing

This is a university project for CM3050 Mobile Development at University of London.

## License

This project is part of a BSc Computer Science degree program.

## Contact & Support

For questions about ZoneGuard, refer to the project documentation or reach out to the development team.

---

**Status**: Ready for Step 1 implementation (Background Location Monitoring)
**Last Updated**: September 22, 2026
