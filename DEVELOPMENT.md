# Development

Setup, running, testing and building ZoneGuard.

---

## Prerequisites

- **Node 18+**
- **Xcode** with an iOS simulator (macOS only, for iOS)
- **Android Studio** or a physical Android device
- A **Firebase project** with Firestore enabled
- **Java** — only for the Firestore rules tests

---

## 1. Firebase

### Configuration

Copy the template and fill it in from your Firebase project settings:

```bash
cp .env.example .env.local
```

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

Use `.env.local`, **not** `.env` — only the former is gitignored.

Environment variables are inlined at bundle time, so restart with
`npx expo start --clear` after changing them. Without a valid config the app
logs a warning and runs in local-only mode rather than crashing.

### Enable anonymous sign-in

Firebase console → **Authentication** → Sign-in method → **Anonymous** → Enable.

Every Firestore write is gated on a session. Without this the app logs an
explicit error and runs unauthenticated.

### Deploy rules and indexes

```bash
npm install -g firebase-tools    # the CLI is firebase-tools, not firebase
firebase login
firebase deploy --only firestore:rules,firestore:indexes
```

Both are free on the Spark plan. Only `--only functions` requires Blaze.

The composite index on `alerts` (`isActive` + `expiresAt`) is **required** — the
zone query fails without it. It takes a few minutes to build after deploying,
during which the app reports the index as still building.

---

## 2. Running

```bash
npm run ios          # dev client on the iOS simulator
npm run android      # dev client on Android
```

**Expo Go is not sufficient.** Background location, geofencing and push tokens
need native modules that Expo Go does not include. `npx expo start` alone will
run the interface but not the monitoring.

After the first build, `npx expo start --dev-client` reloads JavaScript in
seconds.

---

## 3. Seeding alerts

The app reads zones from the Firestore `alerts` collection. Empty means no
zones — correctly, since an authoritative empty result is honoured rather than
falling back to the bundled list.

Security rules deny client writes to `alerts` (a forged alert could trigger a
false evacuation), so seeding goes through the Admin SDK.

**One-time:** Firebase console → Project settings → **Service accounts** →
Generate new private key → save as `functions/service-account.json`. It is
gitignored; it grants full project admin and must never be committed.

```bash
node functions/scripts/seed-alerts.js                        # three sample zones
node functions/scripts/seed-alerts.js --at 31.52,74.35 --radius 0.5
node functions/scripts/seed-alerts.js --expire alert-taunsa-2026
node functions/scripts/seed-alerts.js --deactivate alert-taunsa-2026
```

`--at` places a small zone on a given position, for walking in and out of during
device testing. `--expire` and `--deactivate` exercise the live-update path: the
zone should disappear from the app within about five seconds, with no restart.

See [docs/SEED-ALERTS.md](docs/SEED-ALERTS.md) for the document shapes and the
full verification matrix.

---

## 4. Testing

```bash
npm test                  # 273 tests
npm test -- --coverage    # coverage report
npm run typecheck         # tsc --noEmit
npm run test:rules        # Firestore rules, needs Java
```

Coverage is enforced at **70%**; the suite fails rather than drifting below it.
It is scoped to `app/utils`, `app/hooks` and `app/i18n/rtl.ts` — translation data
is excluded deliberately, since object literals register as covered on import and
would inflate the figure without testing anything.

`test:rules` starts the Firestore emulator, runs 27 rule and atomicity tests
against the real `firestore.rules`, and shuts down. Without Java they skip
**visibly** rather than passing vacuously.

---

## 5. Simulating location

```bash
xcrun simctl location booted set 30.6987,70.8503     # inside Taunsa
xcrun simctl location booted set 31.5204,74.3587     # Lahore, outside every zone
```

More reliable than the Simulator's *Features → Location* menu, and scriptable.
Approach a zone from outside rather than teleporting to its centre: iOS raises
`Enter` reliably on a crossing, less so on a jump.

---

## 6. Building

```bash
eas login
eas init                 # writes a projectId into app.json

eas build --platform android --profile preview    # installable APK
eas build --platform ios --profile preview        # simulator .app, no signing
```

| Profile | Produces |
|---|---|
| `development` | Dev client |
| `preview` | Android APK, iOS simulator build — **neither needs a paid Apple account** |
| `production` | Release APK; the iOS half needs the Apple Developer Program |

**EAS uploads via git, so `.gitignore` decides what is sent.** `.env.local` is
gitignored and therefore never uploaded — register the values as EAS environment
variables instead, or the build ships with no Firebase config and silently runs
in local-only mode:

```bash
eas env:set --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY \
  --value "..." --type string --visibility plaintext \
  --environment preview --environment production
```

`eas init` also writes the `projectId` that push-token registration needs.

---

## Troubleshooting

**`npx firebase` says "could not determine executable"**
The CLI is `firebase-tools`; `firebase` is the JS SDK in `node_modules` and has
no binary. Use `npx firebase-tools` or install the CLI globally.

**"The query requires an index"**
Deploy `firestore:indexes` and wait a few minutes for it to build.

**App reports zero zones while Firestore holds documents**
A run of transport failures can leave `onSnapshot` serving an empty local cache
without raising an error. Restart the app. To confirm the data really is there,
read it server-side with the Admin SDK — "listener alive, no error, zero results"
is not proof a collection is empty.

**No map on Android**
`react-native-maps` renders Google Maps on Android and needs an API key. Add it
under `android.config.googleMaps.apiKey` in `app.json`. Without one the app shows
position and zone count as text; monitoring is unaffected.

**Location permission reported as denied despite being granted**
iOS presents one dialog at a time; concurrent requests resolve against the
undetermined state. All permission requests go through `utils/permissions.ts`,
which shares a single in-flight promise. Do not call
`requestForegroundPermissionsAsync` directly.

**Notifications arrive silently on Android**
They need a channel with MAX importance. `utils/localAlerts.ts` creates and
assigns one at alert time — a notification with no channel is filed at default
importance, with no banner and no sound.

**Tests pass locally, fail elsewhere**
Usually time or timezone. Build date fixtures from fixed points rather than
`new Date()`, and in local time where the code under test normalises to a local
hour.
