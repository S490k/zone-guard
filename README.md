# ZoneGuard

A disaster preparedness app for Pakistan. It watches your location against
published disaster zones, warns you the moment you enter one, and helps you get
your household ready before anything happens.

Built with React Native and Expo, targeting iOS and Android.

---

## What it does

**Warns you when you enter a disaster zone.** Native geofencing wakes the app on
a boundary crossing — including after the app has been force-quit — and raises
an on-device notification. Verified on hardware: a zone entry was recorded 23
seconds after the crossing with the app killed.

**Works without a server, and without a network.** Alerts are generated on the
device rather than pushed from a backend, so they still fire with no
connectivity. Zones, progress and news are cached locally and the interface says
plainly when it is showing cached data rather than live.

**Helps you prepare.** A preparedness score across three weighted components —
five preparation tasks, a ten-item emergency kit, and nine quiz questions driven
by the SM-2 spaced repetition algorithm, which schedules a reminder when recall
is due.

**Adapts to battery pressure.** Location polling widens as the battery falls.
Geofencing is deliberately exempt, so zone alerting keeps working at full
fidelity even in the most conservative mode — only position history degrades.

**Bilingual.** English and Urdu, switchable from the dashboard, with no restart.

**Shows wider disaster news.** Live feeds from USGS and GDACS, each item
annotated with its distance from you.

| Tab | Contents |
|---|---|
| Dashboard | Preparedness score, map, active zone warnings |
| Prepare | Preparation tasks and spaced-repetition quizzes |
| Alerts | Active zones and live disaster news |
| Emergency | SMS fallback, kit audit, response guides |
| Ranking | Achievements, tier, and the leaderboard |

---

## Quick start

Requires Node 18+, Xcode with a simulator (for iOS) and a Firebase project.

```bash
npm install
cp .env.example .env.local     # fill in your Firebase config
npm run ios                    # builds a dev client and launches
```

`npx expo start` with Expo Go is **not** enough: background location, geofencing
and notifications need a development build.

See **[DEVELOPMENT.md](DEVELOPMENT.md)** for full setup, including Firebase
configuration, alert seeding and running against the emulator.

---

## Documentation

| Document | Contents |
|---|---|
| [DEVELOPMENT.md](DEVELOPMENT.md) | Setup, running, building, seeding data |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the app is put together and why |
| [docs/REPORT-EVIDENCE.md](docs/REPORT-EVIDENCE.md) | Measurements, decisions and limitations |
| [docs/SEED-ALERTS.md](docs/SEED-ALERTS.md) | Populating the `alerts` collection |
| [docs/DEVICE-TEST-PROTOCOL.md](docs/DEVICE-TEST-PROTOCOL.md) | Physical device test procedure and results |

---

## Tech stack

- **React Native 0.86 / Expo SDK 57**, TypeScript in strict mode
- **Firebase** — Firestore for zones and progress, anonymous Auth
- **expo-location** — background location updates and native geofencing
- **expo-notifications** — on-device alerting and review reminders
- **React Navigation v7** — bottom tabs
- **Jest** — 273 tests, coverage threshold enforced at 70%
- **EAS Build** — Android APK and iOS simulator artifacts

---

## Testing

```bash
npm test              # 273 tests
npm run typecheck     # tsc --noEmit
npm run test:rules    # Firestore security rules (needs Java + emulator)
```

Coverage sits at **89.3% statements** across the logic modules, with the
threshold enforced in `package.json` so the suite fails rather than drifting.

`test:rules` runs 27 tests against the Firestore emulator, covering owner
isolation, alert write-protection and audit-trail immutability. They skip
visibly when no emulator is running rather than passing vacuously.

---

## Project structure

```
app/
├── App.tsx              Navigation, providers, startup sequencing
├── screens/             One per tab, plus onboarding
├── components/          Presentational units
├── context/             Zones, progress, language, achievements
├── hooks/               Auth, location monitoring, battery mode
├── utils/               Domain logic — pure where possible, and tested
├── tasks/               Background location and geofencing tasks
├── i18n/                English and Urdu, UI copy and content
└── constants/           Zones, colours, preparedness definitions

functions/               Cloud Functions, plus the alert seeding script
docs/                    Architecture, evidence, test protocols
__tests__/               Unit, integration and performance suites
```

---

## Known limitations

Each is documented with its technical cause in
[docs/REPORT-EVIDENCE.md](docs/REPORT-EVIDENCE.md).

- **No server-initiated push.** Cloud Functions require Firebase's paid plan, so
  alerting is on-device. The Cloud Function source is retained and validated
  against the emulator.
- **No map on Android** without a Google Maps API key; position and zone count
  are shown as text instead. Monitoring is unaffected.
- **Alert content is not translated** — it arrives from Firestore in whatever
  language the operator published.
- **Leaderboard scores are self-reported.** Rules bound the range but cannot
  verify a score without server-side recomputation.
- **No iOS device build.** Apple gates device distribution behind the paid
  Developer Program; iOS is verified on simulator against a production artifact.
