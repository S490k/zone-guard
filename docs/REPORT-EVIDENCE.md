# ZoneGuard — Report Evidence Log

Running record of measurements, decisions and limitations captured during remediation.
Appended to at the close of each phase. Baseline git commit: `b443075`.

---

## 1. Baseline state (2026-09-23)

Measured on the as-received codebase before any changes.

| Metric | Value | Target |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 |
| Jest suites | 4 passed | — |
| Jest tests | 33 passed, **12 `it.todo()` stubs** | — |
| Statement coverage | **33.12%** | >70% |
| Branch coverage | 45.45% | >70% |
| Function coverage | 31.42% | >70% |
| Line coverage | 31.33% | >70% |

Coverage was scoped to `app/utils/**` and `app/hooks/**` only. Files at 0%: `useLocationMonitor.ts`, `fcmSetup.ts`, `zonesSync.ts`. At 100%: `distance.ts`, `sm2.ts`.

Stack: Expo SDK 57, React Native 0.86.3, React 19.2.3, Firebase JS SDK 12.19, firebase-functions 4.4 (v1 API), TypeScript 5.9.

> Note: the governing roadmap specified Expo SDK 51. The delivered project is on SDK 57, so several roadmap code samples are stale (e.g. the `locationAlwaysUsageDescription` plugin key, and the `location.lat/lon` Firestore schema). Where roadmap and code disagreed, the code was treated as authoritative.

---

## 2. Audit findings

Found by static review, typechecking and test execution — no runtime debugging required.

### Blocking defects

| # | Defect | Location | Consequence |
|---|---|---|---|
| B1 | `startBackgroundLocationTracking()` has zero call sites | `app/tasks/backgroundLocationTask.ts:53` | Background tracking never starts. Entire feature is dead code. |
| B2 | No authentication flow exists | `backgroundLocationTask.ts:30`, `fcmSetup.ts:52` | `auth.currentUser` is permanently `null`; every Firestore write silently no-ops with no error or log. |
| B3 | Expo push token passed to FCM Admin SDK | `functions/src/index.ts:104` | `admin.messaging().send()` requires a native FCM registration token, not `ExponentPushToken[…]`. Always throws `invalid-registration-token`; the handler then deletes the valid token. |
| B4 | No `firestore.rules`, no `firestore.indexes.json`, no `firestore` block in `firebase.json` | repo root | No access control. Both `isActive == true` + `expiresAt > now` queries are composite and fail at runtime without a deployed index. |
| B5 | Cloud Function retriggers itself | `functions/src/index.ts:130` | `onUpdate` handler writes `lastAlertAt` back to the same document. Bounded by the 60s dedup window but doubles invocations; `triggerZoneCheck` does the same via `lastCheckedAt`. |

### Non-blocking defects

- **Accessibility: zero labels.** No `accessibilityLabel` / `accessibilityRole` / `accessible` props anywhere in `app/`.
- **Contrast failure.** `textTertiary` `#6B7489` on background `#0A0E27` computes to **4.06:1**, below the WCAG AA 4.5:1 threshold for normal text. Used for alert metadata.
- **Touch target.** `TaskCard` checkbox is 24×24pt, below the 44×44pt minimum.
- **No persistence.** Every screen holds state in `useState` with hardcoded seed data. Tasks, kit items and quiz results do not survive a reload. `preparednessScore` is hardcoded to `45`.
- **`sm2.ts` is unreferenced.** The spaced-repetition implementation is never imported by any screen; quizzes have no questions and no scoring.
- **"Send Test Alert" sends nothing.** Appends to a local array; issues no notification.
- **Dynamic zones unused.** `zonesSync.ts` works but its result is only `console.log`ged in `App.tsx`. Both `useLocationMonitor` and the background task still read hardcoded `DISASTER_ZONES`.
- **Onboarding dots desync.** No `onScroll` handler, so manual swiping does not update the pagination dots or the button label.
- **No version control.** Project arrived with no git repository.

---

## 3. Decisions

### D1 — Client-side alerting replaces the Cloud Function pipeline
**Constraint:** Firebase project is on the Spark (free) plan. Cloud Functions have required a billing account since 2022 (Cloud Build + Artifact Registry); Cloud Scheduler is likewise unavailable. The roadmap's server-initiated push design cannot be deployed.

**Resolution, three parts:**
1. Zone entry fires a **local** notification from the background task via `Notifications.scheduleNotificationAsync()`. No server dependency; functions offline.
2. **Native geofencing** (`Location.startGeofencingAsync`) replaces the 30-second continuous polling loop. The OS wakes the app on region crossing — materially better for the ≤5%/hr battery target.
3. Cloud Function source is **retained and validated against the Firebase Emulator Suite** (free; already configured in `firebase.json` at ports 5001/8080/9099), giving pipeline evidence without a paid plan and remaining deploy-ready.

This also sidesteps B3 entirely, which would have failed even on a paid plan.

---

### D2 — Anonymous authentication
Every Firestore write was gated behind `auth.currentUser`, which was permanently `null` (B2). Anonymous sign-in was chosen over email/password because the app has no user-account feature in its requirements and a sign-up wall would obstruct the alerting flow. It is available on the Spark plan and gives each device a stable uid for per-user rules.

**Consequence:** Anonymous sign-in must be enabled in the Firebase console (Authentication → Sign-in method). Without it the app logs an explicit error and runs unauthenticated rather than failing silently, which was the prior behaviour.

### D3 — uid mirrored to device storage
Background tasks execute in a separate JS context where Firebase Auth has not rehydrated from `AsyncStorage`, so `auth.currentUser` is `null` on cold start. The uid is mirrored to `AsyncStorage` at sign-in (`app/utils/session.ts`) and read from there by background code. Reading `auth.currentUser` directly in a background task is unreliable by construction.

### D5 — Single zone source via React context
Zones were being fetched by `zonesSync` and cached, but nothing rendered them: screens and `useLocationMonitor` read the hardcoded `DISASTER_ZONES` regardless, so a Firestore alert could never reach the UI. A `ZonesProvider` context now owns the listener and is the single source for every consumer.

The provider hydrates from cache *before* the listener resolves, so the UI is populated on launch and stays populated with no network. It exposes `isLive`, which turns false when the listener errors — letting screens state plainly that they are showing cached data rather than silently presenting stale alerts as current. On a listener error the cached zones are retained rather than cleared, satisfying the roadmap's requirement that sync failures degrade rather than blank the screen.

`useLocationMonitor` now takes zones as an argument instead of importing them. This removes the hidden dependency and makes the hook testable with fixture zones — relevant to the Phase 5 coverage target, since the hook was previously untestable without mocking a module-level constant. Zones are read through a ref inside the position watcher so a zone update does not tear down and re-establish the subscription.

`DISASTER_ZONES` remains reachable only as `zoneCache`'s fallback when Firestore has returned nothing and no cache exists.

### D6 — Offline-first progress persistence written by hand
Task, kit and quiz state lived in `useState` with hardcoded seed data and was lost on every reload; the preparedness score was hardcoded to `45` behind a `TODO`.

The Firestore JS SDK offers no offline cache under React Native — `persistentLocalCache` depends on IndexedDB, which RN does not provide — so the usual answer of "enable offline persistence" is unavailable. Progress is therefore mirrored to `AsyncStorage` explicitly: local writes happen first so the UI never waits on the network, and a Firestore listener reconciles across launches. A `pendingWrite` guard stops the listener's own echo from overwriting an edit made since the write was issued.

Scoring lives in `app/utils/preparednessScore.ts` as a pure function over a progress snapshot, deliberately separated from storage so it can be verified against fixtures. Weighting is 40% tasks, 40% kit, 20% quiz mastery.

**Mastery is defined as two successful SM-2 repetitions, not one correct answer.** A single correct response demonstrates recognition; recall across separate sessions is what spaced repetition actually measures, and scoring a first-attempt answer as mastery would have made the quiz component trivially maximisable.

### D7 — SM-2 connected to a real quiz
`sm2.ts` was fully implemented and unit-tested but imported by nothing: the quizzes were three hardcoded cards with `questions: 5` and no questions. A `QuizRunner` now drives nine questions across the three existing topics, and answer **latency** feeds `calculateQualityScore`, so a slow correct answer schedules a sooner review than an immediate one — the graded-recall behaviour SM-2 is designed around, which a simple correct/incorrect flag would discard.

**Self-review finding.** The first implementation of the progress provider called `setProgress` from inside a `setProgress` updater, running storage and network writes during React's render phase. Restructured so mutations only compute the next state and a dedicated effect performs persistence after commit, with a ref distinguishing a local edit from a remote snapshot or the initial load.

### D4 — Zones mirrored to device storage
The same context boundary means a live Firestore listener is invisible to the background task — this is why the original task still read the hardcoded `DISASTER_ZONES`. Zones are now cached to `AsyncStorage` (`app/utils/zoneCache.ts`) whenever the listener fires, with the bundled list as fallback. This doubles as the offline source.

---

## 4. Measurements

To be completed as phases close.

| Measurement | Baseline | Final | Target | Method |
|---|---|---|---|---|
| Statement coverage | 33.12% | **90.23%** | >70% | `npx jest --coverage` |
| Branch coverage | 45.45% | **85.09%** | >70% | as above |
| Function coverage | 31.42% | **92.19%** | >70% | as above |
| Line coverage | 31.33% | **90.89%** | >70% | as above |
| Passing tests | 33 (+12 stubs) | **289** | — | `npx jest` |
| Alerts per stay inside a zone | one per fix after cooldown (3 over 6 min in test) | **1** | 1 | `__tests__/tasks/backgroundLocationTask.test.ts` (4i) |
| Security-rule tests | 12 stubs, never run | **26/26 pass** against the emulator | all pass | `npm run test:rules`, 2026-09-26 |
| Rule mutations detected | not measured | **3/3** | all detected | Deliberately weakened rules, each caught by the expected test (4h) |

> Coverage fell from a 93% peak as the feature set grew — news, achievements,
> battery policy, SMS and review scheduling each added modules. It remains well
> clear of the 70% threshold, which is enforced in `package.json` so the suite
> fails rather than drifting below it.
| Alert latency (mean) | not measured | **0.06ms** | <500ms | `__tests__/performance`, 100 iterations |
| Alert latency (p95) | not measured | **0.07ms** | <500ms | as above |
| Battery drain (Android) | not measured | **1%/hr** stationary | ≤5%/hr | 60-minute observation, 2026-09-25 |
| Battery drain (iOS) | not measured | not measured | ≤5%/hr | Blocked: device on iOS 27, Xcode 26.6 cannot deploy (L7) |
| Boundary classification | not measured | **96/96** (was 78/96) | 96/96 | 3 zones × 4 radius fractions × 8 bearings, geodesic reference |
| Haversine model error (mean) | not measured | **33.4m** | — | as above, against Vincenty on WGS-84 |
| Haversine model error (max) | not measured | **115.9m** | — | as above; 0.35% of distance |

### Coverage scope

Measured over `app/utils/**`, `app/hooks/**` and `app/i18n/rtl.ts`. Translation
data files are **deliberately excluded**: they are object literals that register
as fully covered the moment they are imported, which would inflate the figure
without testing anything. A 70% threshold is enforced in `package.json`, so the
suite fails rather than silently regressing.

### Latency method and its caveat

Measured over 100 iterations of the path that actually ships — cache read, zone
detection, notification dispatch — at both a realistic three zones and the
twenty-region iOS geofence ceiling.

**These figures come from Node on a development machine, not from the device.**
A phone would be slower. The margin is roughly four orders of magnitude below
budget, so the conclusion holds, but the number should be reported as an
algorithmic bound rather than a device measurement.

Network latency is excluded by design: with Cloud Functions unavailable (D1),
no alert depends on a round-trip. The delivery path is entirely on-device, which
is why it is fast and why it works offline.

### D11 — Leaderboard kept out of the user document
Step 6 asks for a top-ten ranking, and the roadmap's sketch queries the `users` collection ordered by score. That is not safe here: `users/{uid}` holds **location history**, and the rules restrict it to its owner precisely for that reason. Ranking over it would have required opening every user's movements to every other user. The roadmap also suggests displaying email addresses, which would place personal data in a world-readable document.

Scores therefore live in a separate `leaderboard/{uid}` collection containing only a score, a derived handle and a timestamp — never location. Rules pin the shape with `hasOnly`, so a client cannot smuggle extra fields into a document everyone can read, and constrain the score to an integer in 0–100.

Identity is a **stable non-identifying handle derived from the uid** (`Guardian A3F2`). Accounts are anonymous so there is no name to show, and publishing the raw uid would expose the key used for the owner-only user document.

**Limitation:** scores are client-authored. The rules bound the range but cannot verify a score reflects real progress — that needs a server-side recomputation, which the Spark plan rules out. Recorded as L5.

---

## 4a. Device verification — Phase 1

**Environment:** iPhone 17 Pro simulator, iOS 26.2, development build (`npm run ios`). Firebase project `zoneguard-a3c6b`, Spark plan, anonymous auth enabled, rules and composite index deployed.

**Method.** Simulated position was driven from the command line rather than the Simulator GUI, giving a repeatable procedure:

```bash
xcrun simctl location booted set 30.9500,70.8503   # ~28km north, outside the zone
xcrun simctl location booted set 30.6987,70.8503   # Taunsa Barrage centre, inside
```

Approaching from outside and crossing the boundary was chosen over teleporting to the centre, because iOS raises `Enter` reliably on a crossing but not always on a jump.

**Result — the full alerting chain fired end to end:**

```
[Geofencing] Entered region zone-taunsa-barrage
Notification received: Taunsa Barrage Flood Risk
[LocalAlerts] Delivered alert for zone-taunsa-barrage (test=false)
[LocalAlerts] Suppressed duplicate alert for zone-taunsa-barrage
```

| Criterion | Evidence | Status |
|---|---|---|
| Background tracking starts | `Tracking started (updates=true, geofences=3)` | ✅ |
| Geofences registered | 3 regions, re-registered on zone-cache update | ✅ |
| Zone entry detected | `Entered region zone-taunsa-barrage` | ✅ |
| Alert delivered on entry | Notification received by the app's own listener | ✅ |
| **Duplicate suppression** | Second detection, from the location-updates task, suppressed by the 60s cooldown | ✅ |
| Haversine accuracy | San Francisco → Pakistan zones reported 11,827–12,692km, consistent with true great-circle distances | ✅ |
| Firestore query after index deploy | `0 active alerts` — query resolves, collection genuinely empty | ✅ |

The duplicate suppression is notable: the geofence task and the location-updates task detected the same entry independently, and the cooldown collapsed them into a single notification. This is the idempotency requirement, demonstrated without a server.

**Two defects surfaced by this run, both fixed:**

- `WebChannelConnection RPC 'Listen' stream transport errored`, recurring every 15–20 minutes. React Native's XHR shim does not sustain Firestore's WebChannel transport; streams error and silently reconnect, dropping listener updates in the gap. Resolved by forcing long polling in `initializeFirestore`. For an alerts listener this is a functional concern, not cosmetic.
- `kCLErrorDomain Code=0` logged at error severity. This is `kCLErrorLocationUnknown` — Core Location has no fix at that instant but continues trying, and Apple's guidance is to ignore it. Now classified as transient and logged accordingly.

Per-fix location logging was also removed: a position arrived every few seconds, burying the zone-transition events. The monitor now logs only on a change of zone membership, satisfying the roadmap's requirement that logs be diagnostic rather than exhaustive.

**Not verifiable on simulator** — deferred to physical device: background survival after app termination, the iOS blue location indicator, Expo push-token registration (`Device.isDevice` is false), and battery drain.

---

### D8 — Accessibility annotations and the one real contrast failure
The app had **zero** accessibility props, so a screen reader announced raw text with no roles, states or grouping. All interactive elements now carry roles, labels and states; 30 annotations across the app.

Every text/background pair was measured against WCAG 2.1 AA rather than assumed. Only one failed: `textTertiary` `#6B7489` on `#0A0E27` at **4.06:1**, under the 4.5:1 floor for normal text. Replaced with `#737C97` at **4.58:1**, which passes while remaining visually subordinate. Verified as already passing and left unchanged: `textSecondary` 9.01:1, `accent` 10.74:1, and all four severity colours (5.16:1 to 11.66:1).

`TaskCard` was a 24×24 checkbox nested inside a card touchable — below the 44×44 minimum, two overlapping targets for one action, and the card itself inert whenever only `onToggle` was supplied. It is now a single row-sized target with `checkbox` role and `checked` state.

Zone entry is announced **assertively** rather than politely. It is the most consequential state the app reports, and a sighted user perceives it immediately from the colour change; a polite announcement would queue behind whatever else is speaking.

### D9 — Stubs replaced with working implementations
`GlassmorphicCard` and `GeofenceMap` were placeholders — a plain `View` and a text label reading "Map Component". Now `expo-blur` and `react-native-maps` respectively, with zone circles coloured by severity and an animated pulse on the user's position. The map frames itself around the widest active zone rather than using a fixed span.

Offline state is surfaced by a banner driven by `NetInfo`, keyed on `isInternetReachable` rather than `isConnected` alone, so a connected-but-captive network is reported as offline rather than working.

### D10 — Bilingual support and its RTL constraint
English and Urdu translations cover the app's own interface. Locale is persisted and defaults to the device language when it is one of the two.

**Revised after user testing.** The first implementation used `I18nManager.forceRTL`, which mirrors the entire layout tree. On device this reordered the bottom tab bar and every icon row, so navigation moved when only the language should have. It also required an app restart to take effect.

`forceRTL` was removed entirely. Direction is applied at the text level instead (`textAlign` plus `writingDirection`), with row direction flipped only where an icon leads a line of text. Navigation and controls therefore stay where the user expects, and the language switch is immediate with no restart — which removes the restart limitation rather than documenting it.

The same round of testing showed tasks, kit items and quiz questions still rendering in English. The cause was structural: that copy was hardcoded in `constants/preparedness.ts`, so only the chrome had ever been translatable. The constants now hold **structure only** — id, priority, topic, correct answer — and all display text moved to `app/i18n/content.ts`, keyed by id. Adding a third language now touches no constant and no screen.

**Remaining limitation.** Alert titles and descriptions come from Firestore in whatever language the operator published. The app cannot translate operator content, only its own copy.

---

## 4b. Testing approach

**Integration tests are real, and gated rather than stubbed.** The suite arrived with
12 `it.todo()` placeholders — including every integration test — which report as
passing while asserting nothing. These were replaced with 26 executable tests against
the Firestore emulator covering the security rules (owner isolation, alert
write-protection, audit-trail immutability, deny-by-default) and write atomicity.

When no emulator is running they **skip visibly** rather than passing vacuously. They
were not executed until 2026-09-26 — see 4h, which also records why they could not
have passed as originally configured. Run them with:

```bash
npm run test:rules
```

**Two defects were found by writing the tests**, which is itself worth recording:

1. `permissions.ts` cached a granted result at module scope for the session. A
   permission revoked from Settings mid-session would never have been noticed. The
   shared promise now collapses only *concurrent* requests and clears once settled,
   so status is re-read each call — the same single-dialog behaviour, without the
   stale grant.
2. The first attempt at isolating that cache in tests called the hook factory inside
   the render callback, creating a new hook identity per render. Caught immediately
   by the failing suite; the production fix above removed the need for isolation
   entirely.

---

### D12 — Android map crash and its fix
The first Android build terminated the moment location permission was granted. The cause was platform-divergent behaviour in a single component: `GeofenceMap` renders `MapView` with `PROVIDER_DEFAULT`, which resolves to **Apple Maps on iOS and Google Maps on Android**. Google Maps aborts the process natively when no API key is configured, and a native abort cannot be intercepted by a JavaScript error boundary.

The sequence explains why it looked like a permission bug: the app started correctly and displayed the map's "waiting for location" placeholder. Granting permission produced a fix, which swapped the placeholder for a real `MapView`, which mounted Google Maps, which aborted. The crash followed the permission grant but was not caused by it.

Resolved by checking for an API key at module scope and refusing to mount the map without one, falling back to a textual position and zone count. This is a guard rather than a workaround: a native crash has to be prevented, not caught.

Recorded as L6.

---

## 4c. Android device verification (2026-09-24)

**Environment:** Samsung Android handset, release APK built by EAS (`preview` profile, commit `46f7af2`), installed directly rather than through a store.

| Criterion | Result |
|---|---|
| APK installs and launches | ✅ |
| Onboarding shown on first run | ✅ |
| Survives the location permission grant | ✅ (regression fixed — see D12) |
| Position displayed where the map would be | ✅ textual fallback (L6) |
| All five tab labels legible, none truncated | ✅ |
| Leaderboard loads | ✅ |
| **Foreground service notification appears** | ✅ "Monitoring disaster zones in the background" |

The foreground-service notification is the load-bearing result. Android requires a
visible, persistent notification for any app holding a location foreground service,
so the OS displaying it is the system's own confirmation that
`startLocationUpdatesAsync` registered successfully with `FOREGROUND_SERVICE_LOCATION`
and that background tracking is genuinely running — not merely reported as started by
the app's own logging.

This also confirms the EAS environment variables reached the cloud build: the
leaderboard requires Firestore, and `.env.local` is gitignored and never uploaded.
Had the variables not been registered, the app would have launched into local-only
mode with an empty board.

**Still outstanding on Android:** battery drain measurement, and alert delivery on a
real zone crossing.

---

## 4d. iOS build verification (2026-09-24)

**Artifact:** EAS cloud build, `preview` profile, simulator target. Queued and built
**without any Apple Developer credentials being requested**, confirming that an
unsigned simulator build needs no paid account.

Verified by installing the downloaded artifact into a clean simulator and launching
it — the built `.app`, not a development bundle served by Metro.

| Check | Result |
|---|---|
| Artifact downloads and extracts | ✅ 20MB `ZoneGuard.app` |
| Bundle identifier | ✅ `com.zoneguard.app` |
| Version | ✅ 1.0.0 |
| `UIBackgroundModes` | ✅ `location`, `fetch`, `remote-notification` |
| `NSLocationWhenInUseUsageDescription` | ✅ present |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | ✅ present |
| Installs into simulator | ✅ |
| Launches and stays running | ✅ process alive after launch |
| Renders dashboard, score, map | ✅ (screenshot captured) |

The Info.plist checks matter more than they appear. Step 1.1 of the roadmap required
those keys, and they have until now only been verified in `app.json` — the source
config. Reading them out of the compiled bundle confirms Expo's config plugins
actually applied them during a production build, which is the claim that was
previously untested.

The map renders here through **Apple Maps**, requiring no credentials. This is the
same component and the same code path that aborted on Android for want of a Google
Maps key, and is direct evidence for the platform divergence described in D12 and L6.

---

### D13 — Tab bar collapse from an undefined style override
The Android release showed truncated tab labels clipping against the gesture bar. The fix set an explicit height and padding for Android and left iOS on its defaults, expressed as `Platform.OS === 'android' ? 68 : undefined`.

That broke iOS entirely: the tab bar disappeared.

React Navigation composes the bar's style as `[computedLayout, tabBarStyle]`, with the caller's style **last**. React Native's flattening lets a later `undefined` *override* an earlier real value rather than defer to it, so `height: undefined` erased the computed height — roughly 83pt including the 34pt home-indicator inset — and `paddingBottom: undefined` erased the inset padding. The bar collapsed to auto height with nothing to size it. Android was unaffected only because its branch supplied a literal `68`.

Resolved by spreading the overrides conditionally, so iOS receives no size keys at all and the navigator's own inset handling stands.

**Two process failures worth recording**, since both are more instructive than the bug:
1. A layout change driven by an Android screenshot was shipped without testing iOS, and rode into the same commit as the Android crash fix — so a verified fix carried an unverified one.
2. The first response to the report was a guess (Simulator window taller than the display) rather than an inspection. The user's screenshot showed the full device bezel and disproved it immediately. The actual cause was found by reading the library's style composition, not by reasoning about symptoms.

Verified on the simulator after the fix: all five tabs render, and the offline banner sits correctly above the bar — the first visual confirmation of the Step 4.11 indicator and of its clearance calculation.

---

## 4e. Dynamic zone verification (2026-09-24)

Roadmap Step 3 required zones to be served from Firestore rather than hardcoded.
That was implemented in Phase 2 but never verified with real data, because the
`alerts` collection stayed empty.

Seeded through an Admin SDK script rather than the console: security rules deny
client writes to `alerts`, and hand-entering roughly thirty typed fields per run
is both slow and error-prone when the expire and deactivate tests need repeating.

| Check | Result |
|---|---|
| Alerts reach the app from Firestore | ✅ `[Zones] 4 active from Firestore` |
| Geofences re-register on zone change | ✅ `[Geofencing] Re-registered 4 regions` |
| Zone entry detected at a seeded location | ✅ inside Taunsa, 0.0km from centre |
| Severity drives banner colour | ✅ `high` → URGENT in orange |
| Bell badge counts containing zones | ✅ badge showed 1 |

**A failure mode worth recording.** Before this ran, the app reported `0 active`
for several minutes *while Firestore held four matching documents*. The listener
had not errored — the custom error handler never fired — and the composite index
was deployed. The cause was a run of WebChannel transport failures during a
network interruption: `onSnapshot` kept serving an **empty local cache** and,
because Firestore does not treat a cache-only read as an error, nothing surfaced
the staleness. A restart reconnected it and the documents arrived immediately.

The diagnostic lesson is that "listener alive, no error raised, zero results" is
not proof that the collection is empty. Confirming the documents existed server
side, via the Admin SDK, is what separated a data problem from a transport one.

---

### D14 — Adaptive monitoring under battery pressure
Continuous location polling is the largest single contributor to the ≤5%/hour budget. Rather than choose one interval and hope it holds, the polling rate widens as the battery falls: 30s above half charge, 120s below it, 300s below a fifth, and back to 30s whenever charging.

**Geofencing is deliberately exempt.** It is evaluated by the OS against hardware the device already runs, so it costs the app almost nothing. Zone alerting therefore keeps working at full fidelity in the most conservative mode, and only position history degrades. That asymmetry is what makes the tradeoff defensible in a disaster app — a power-saving mode that quietly stopped raising alerts would be worse than no power saving at all.

An unreadable battery level — reported as `-1` by simulators and some Android devices — takes the **normal** profile rather than the cautious one. Failing toward less monitoring because a reading was unavailable is the wrong direction.

### D15 — SMS fallback without a contact store
Cellular SMS routinely survives when data networks are saturated or down, which is precisely the condition this app exists for. The fallback opens the **system composer** pre-filled with coordinates, a map link and the zones the user is currently inside.

The app sends nothing itself and passes **no recipients**: the user chooses them in the composer. This means no contact list is stored, no contacts permission is requested, and no message leaves the device without an explicit action — a meaningful boundary for an app that already holds location history.

### D16 — Disaster news, and a source that had to be dropped
Two public feeds are used, both keyless: **USGS** for earthquakes and **GDACS** (EU/UN) for cyclones, floods, droughts, wildfires and volcanoes.

**ReliefWeb was planned and then removed.** It was the obvious source for Pakistan-specific humanitarian reporting, and was initially described as free and keyless. Probing it before writing any code showed the v1 API decommissioned and v2 rejecting unregistered callers (`You are not using an approved appname`). Verifying an integration point before building on it cost minutes; discovering it after the feature was written would have cost the feature.

Both remaining feeds carry coordinates, so each item is annotated with its distance using the existing Haversine. **Distance informs but does not reorder** — sorting by proximity would bury a magnitude 7 across the world beneath a magnitude 2.6 nearby. Ordering remains by recency.

Mappers are covered by fixtures **copied from live responses** rather than invented, so an upstream contract change fails a test rather than silently emptying the list on device.

---

## 4f. Physical device measurements (2026-09-25)

**Device:** Samsung Android handset. Release APK built by EAS, installed directly.

### Battery drain — 1% per hour

| | |
|---|---|
| Window | 07:41 – 08:41 local, 60 minutes |
| Battery | 90% → 89% |
| **Drain** | **1%/hour** against a ≤5%/hour target |

Conditions: app opened and backgrounded, foreground-service notification visible throughout — Android's own confirmation that the location service held a wake commitment for the full hour. Screen off, device stationary.

**Qualified as a best case, not an unconditional figure.** The device did not move, and the polling profile applies a 50-metre distance filter, so almost no position fixes were computed. The result demonstrates that a stationary device costs very little, which is the common case; it is not evidence of drain while travelling, which would be higher. It should be reported as *1%/hour stationary* rather than *1%/hour*.

An earlier reading was nearly discarded as invalid, because Firestore showed no background location writes during the measurement window. That turned out to be the distance filter working exactly as designed — a stationary device produces no updates to write. The absence of writes was evidence of efficiency, not of a stopped service.

### Geofencing survives process termination — pass

The roadmap anticipated that terminating the app would end background location monitoring, and geofencing was chosen partly on the expectation that the OS would relaunch the app for a region crossing. That expectation is now tested rather than assumed.

**Method:** the app was force-quit from the task switcher, then the tester walked back into a 500-metre zone centred on their own position.

**Result:** `lastZoneEntry` was written to Firestore **23 seconds after the crossing**, with the app killed. That field is written by the geofencing task, so Android relaunched the terminated process to deliver the region event and the full detection chain ran.

Reproduced twice, at 07:41:13Z and 11:17:05Z.

This is evidence independent of the interface: the timestamps come from the background task writing to a server, not from anything displayed on screen.

### A defect this testing exposed

Both crossings were detected, recorded, and produced **no visible notification** — which initially read as a geofencing failure.

Firestore disproved that. `lastZoneEntry` is written *after* `presentZoneAlert()` in the same function, so the alert had definitely been raised. The fault was narrower: alerts carried **no Android notification channel**, so the OS filed them under its default channel at DEFAULT importance — no heads-up banner, no sound. The warnings were being delivered silently into the notification shade, which for a disaster alert is indistinguishable from never arriving.

A MAX-importance channel with sound, vibration and lockscreen visibility had been created at startup and never referenced. Alerts now carry it, and the channel is created at alert time rather than only during startup, because a geofence can wake a killed app directly into that path before any startup effect has run — precisely the cold-relaunch case where the alert matters most.

**Verified fixed on device.** This defect was invisible on the simulator, where iOS shows local notifications without a channel concept, and would not have been found without testing on Android hardware.

---

## 4g. Boundary accuracy re-measured, and a defect it exposed (2026-09-25)

The draft report stated that *"boundary detection at exactly 100% radius correctly
triggered an alert without requiring a buffer zone, confirming that the Haversine
implementation handles boundary cases with sufficient precision."* That claim was
tested again before being carried into the final report, and it does not hold.

**Method.** Test points were placed at 90%, 100%, 105% and 110% of each zone's
radius, from **eight bearings** rather than one, using the Vincenty direct solution
on the WGS-84 ellipsoid. The distance the app computes was then compared against the
Vincenty inverse solution between the same two points. 3 zones × 4 fractions × 8
bearings = 96 cases. The reference implementation lives in
`__tests__/helpers/geodesy.ts`, deliberately in the test tree: the app does not need
ellipsoidal accuracy, but checking the app's boundary behaviour needs a reference it
cannot mark its own homework against.

**Result before the fix — 78 of 96 cases correct.** Every failure sat at exactly
100% of the radius, and every one was a **missed alert**:

| Approach bearing | Haversine error at the boundary | Verdict at exactly 100% radius |
|---|---|---|
| 0° / 180° (north–south) | **+45 to +105 m** (reads long) | outside the zone — **no alert** |
| 45° / 135° / 225° / 315° | +2 to +26 m (reads long) | outside the zone — **no alert** |
| 90° / 270° (east–west) | −30 to −55 m (reads short) | inside the zone — alert |

18 of the 24 exact-boundary cases raised no alert.

**Cause — model, not arithmetic.** Haversine treats the Earth as a sphere of radius
6371 km. Against WGS-84 the residual is *systematic*: it scales with distance and its
sign depends on bearing, because the ellipsoid's meridional radius of curvature at
these latitudes is smaller than 6371 km while the radius of a parallel is larger. The
error is therefore about 0.35% of the distance travelled — 45 m on a 15 km radius,
105 m on a 30 km one — and it always points the same way for a given bearing. Away
from the boundary this is immaterial. At the boundary it decides the comparison.

**Why the existing tests missed it.** `distance.test.ts` probes 500 m either side of
a 20 km radius. 500 m comfortably exceeds a 48 m model error, so the assertion passes
whichever side of the model the implementation lands on. The draft's own field test
had the same blind spot from the opposite direction: it sampled one approach, and a
single approach has a 2-in-8 chance of being east–west, where the error happens to
fall the safe way.

**The fix.** `BOUNDARY_TOLERANCE = 0.005` — containment is tested against
`radiusKm × 1.005` rather than `radiusKm`. The constant is sized from the measured
bound (0.35%) with margin, not chosen by feel, and the direction is deliberate: for a
hazard warning a false positive at the boundary costs a redundant notification,
whereas a false negative is a missed evacuation cue. The **reported** distance is left
untouched, so a user standing on the boundary is still told 20.05 km and not the
widened 20.1 km containment radius.

**Result after the fix — 96 of 96 correct**, with the 105% and 110% cases still
correctly declining to alert, so the tolerance has not simply swallowed the boundary.
A regression test asserts that a point 200 m outside a 15 km zone — beyond the 75 m
tolerance there — is still classified as outside.

**Scope of the defect, stated precisely.** Native OS geofencing is the primary
alerting mechanism and uses the platform's own ellipsoidal region math, so it was
never affected. What was affected is the in-app proximity detector — the
location-updates path, the dashboard's in-zone classification, and the zone list the
emergency SMS composer attaches. On an exact-boundary north–south approach the OS
geofence would still have fired while the dashboard reported the user outside. That
disagreement between the two mechanisms is the same class of fault as the
`syncedAt` bug in D4, and it is the reason both paths are now tested against a
reference rather than against each other.

**Honest reading of the magnitude.** 105 m on a 30 km zone is 0.35%, and consumer GPS
horizontal error is of the same order or larger — Van Diggelen and Enge's 3–50 m
under open sky, worse in urban settings. This defect was not going to be the dominant
error term in the field. It mattered because it was *systematic and directional*:
random GPS noise cancels over repeated fixes, while a model error that always reads
long on a northward approach does not.

Recorded as D18.

---

### D18 — Boundary tolerance sized from a measured model error
See 4g. Containment uses `radiusKm × (1 + BOUNDARY_TOLERANCE)` with
`BOUNDARY_TOLERANCE = 0.005`. Two alternatives were considered and rejected:
replacing Haversine with a full Vincenty implementation (accurate, but ellipsoidal
precision is not what a 15 km hazard radius needs, and it adds an iterative solver to
a path that runs on every location fix), and re-deriving the sphere's radius per
latitude (reduces the error but cannot remove its bearing dependence, since a single
radius cannot be correct along both a meridian and a parallel at once). A tolerance
sized from the measured bound is smaller, auditable, and fails in the safe direction.

---

## 4h. Security-rule tests executed for the first time (2026-09-26)

The final report's first correction pass found that it described these tests as
"executed against the Firestore emulator". They had never run. Establishing why
turned up more than a missing dependency.

**Three separate obstacles, the last of them fatal.**

1. No Java runtime on the development machine. The Firestore emulator needs one;
   current `firebase-tools` requires Java 21. Installed with
   `brew install openjdk@21`.
2. No Firebase CLI. `test:rules` invoked `firebase`, which was never installed
   globally. The script now uses `npx --yes firebase-tools`, so it runs on a clean
   checkout.
3. **The tests could not pass under the main Jest configuration even with an
   emulator running.** `__tests__/setup.ts` mocks `firebase/app` and
   `firebase/firestore` for the unit suite — and those are precisely the modules
   these tests use to reach the emulator. Separately, the jest-expo preset replaces
   Node's `fetch`, which the rules-testing library uses to discover the emulator:
   the first execution failed all 26 with `HTTP Error undefined when attempting to
   reach Emulator Hub at undefined`. They now run under `jest.rules.config.js` —
   plain Node, the genuine SDK, no unit-suite mocks — and the unit suite no longer
   collects them.

The project ID moved to `demo-zoneguard`. A `demo-` project is emulator-only by
definition, so the CLI refuses to reach production for it; the previous ID
resolved to the real project via `.firebaserc`.

**One test was passing vacuously in waiting.** `denies deletion even by the owner`
loaded `deleteDoc` through a dynamic `import()`, which throws inside Jest's VM
without `--experimental-vm-modules`. The delete therefore never reached the
emulator. `assertFails` rejected the resulting `TypeError` because it was not
`PERMISSION_DENIED` — and that strictness is the only reason the gap surfaced. A
looser "expect any rejection" assertion would have reported a pass without the rule
ever being evaluated. `deleteDoc` is now imported statically.

**Result: 26/26 pass.** Earlier documentation said 27: Jest listed a 27th skipped
entry, which is the notice test pointing at `npm run test:rules`, not a rule test.

**The tests were mutation-checked, because a suite that cannot fail proves nothing.**
Three rules were weakened in turn and the suite re-run; the committed rules file was
restored and confirmed byte-identical afterwards.

| Mutation | Caught by | Result |
|---|---|---|
| Clients may write `alerts` | `denies a client writing an alert`, `denies modifying an existing alert` | 2 failed |
| Owners may delete their user document | `denies deletion even by the owner` | 1 failed |
| Any signed-in user may read any user document | `denies reading another user document` | 1 failed |

The third mutation is the one the privacy requirement depends on: exposing every
user's document — which holds location history — is caught immediately. R8 moves
from met-by-design to measured.

---

## 4i. Alerts fire on entry, not presence (2026-09-26)

**How it was found.** During the report review, one of the Android field-test
screenshots showed a second alert at 12:17, three minutes after the first, while the
dashboard still showed the user inside the zone. Reading the code confirmed the
cause: the location-updates task called `presentZoneAlert` for **every zone
containing the current position on every fix**. The only brake was the 60-second
cooldown, so a user who stayed inside a zone while moving was re-alerted roughly
once a minute. This is the "false alert" category the tutor feedback asked to be
recorded — an alert that is technically about a real hazard but repeats a warning
already given.

**Reproduced before fixing.** A task-level test drives the registered background
callbacks directly, with fixes spaced minutes apart so the cooldown cannot mask the
behaviour. Against the unchanged code it failed four ways:

| Scenario | Expected | Before the fix |
|---|---|---|
| Three fixes over six minutes, all inside | 1 alert | **3 alerts** |
| Inside → 50 m outside the radius → inside | 1 alert | **2 alerts** |
| Geofence Enter, then a location fix inside | 1 alert | **2 alerts** |
| Leaving the zone | alert dismissed | **left in Notification Centre** |

The four scenarios that already behaved correctly — re-entry after a genuine exit,
retry after a failed delivery, re-entry after a geofence Exit, and a geofence Enter
over a stale recorded stay — were kept as tests so the fix could not regress them.

**The design** (`app/utils/zoneTransitions.ts`):

- **Transitions, not presence.** The set of occupied zones is persisted between
  fixes, and only additions to it alert. It lives in `AsyncStorage` because each
  background invocation runs in a fresh JavaScript context.
- **Exit hysteresis of 100 m.** A stay ends only 100 m beyond the containment
  radius. Fixes come from the Balanced accuracy profile, roughly 100 m on Android,
  so without the margin a user standing on the boundary would read in and out
  between fixes and be re-alerted on every flicker. Entry still uses the
  containment radius, so the margin never delays a first alert.
- **Geofence Enter stays authoritative.** An OS-reported Enter is a real crossing,
  so it alerts unconditionally and then records the stay. Consulting the record
  first would suppress a genuine re-entry whenever the record was stale — for
  example after an exit event missed while the process was dead. That is the unsafe
  direction, so it was rejected.
- **Failed deliveries are retried.** A zone whose alert fails to deliver is left out
  of the recorded set, so the next fix tries again instead of the entry being lost.
  A zone already alerted within the cooldown — typically by the geofence task for
  the same crossing — counts as delivered.
- **Leaving dismisses.** A location-detected exit now clears the notification, as a
  geofence Exit already did, so a stale warning does not read as current.
- **Alerting before the network write.** The task previously wrote to Firestore
  before alerting; offline, that write retries for up to about two seconds. Alerts
  now go first.

**Result.** All eight task-level scenarios pass, with eight further unit tests on
the transition rules and their persistence. The suite is 289 tests; coverage is
90.23% statements, 85.09% branches.

**Not yet re-verified on hardware.** This is unit- and task-level evidence against
the real alert module with mocked platform APIs. Confirming it in the field needs a
new release APK and a walk through a seeded zone: one alert on entry, none while
walking inside, one again after leaving and returning. Until then the claim is
"fixed and tested", not "verified on device". Recorded as D19.

---

### D19 — Alerting on transition, with exit hysteresis
See 4i. Two alternatives were rejected. Lengthening the cooldown would reduce
repeats but also delay a genuine re-entry, and would still repeat during any stay
longer than the cooldown. Making the geofence the only alert source would remove the
repeats but lose the location path's role as a second detector, which is what caught
entries the OS delivered late. A persisted occupancy record addresses the cause —
alerting on presence — rather than rate-limiting its symptom.

---

### D17 — AR scanner removed rather than left as a placeholder
The roadmap's Step 4.8 asked for an AR scanner button, explicitly as a
placeholder. The component existed in the delivered codebase and was referenced
by no screen, so it rendered nowhere and delivered nothing.

It has been deleted rather than wired up. A button leading to an unimplemented
feature is worse than its absence — the same reasoning already applied to the
mockup's quick-action tiles. Recorded as L9.

---

## 5. Limitations

Each entry requires a technical justification, not a scheduling one.

| # | Limitation | Technical cause |
|---|---|---|
| L1 | No server-initiated push; alerts are generated on-device | Firebase Spark plan cannot deploy Cloud Functions (see D1). Server pipeline validated in the emulator only. |
| L9 | No AR scanning | The roadmap specified a placeholder button rather than a feature. AR capture would need `expo-camera` plus a recognition model, neither of which was in scope. The dead placeholder was removed rather than left rendering nowhere (D17). |
| L7 | iOS physical-device testing not performed | The available iPhone runs iOS 27; the installed Xcode is 26.6 with the iOS 26.5 SDK, which cannot build to it. Distribution via TestFlight would require the paid Apple Developer Program (L8). iOS was verified on simulator against a production build artifact instead. |
| L8 | No iOS distribution build | Apple gates every form of device distribution — TestFlight, ad-hoc, App Store — behind the paid Developer Program. A free Apple ID permits only a cable-installed 7-day build. Android distribution is unaffected and required no paid account. |
| ~~L2~~ | ~~Switching to Urdu requires an app restart~~ | **Resolved.** Dropping `forceRTL` in favour of text-level direction removed both the restart requirement and the unwanted layout mirroring. |
| L3 | Alert titles and descriptions are not translated | They originate in Firestore in whatever language the operator published. Only the app's own interface can be localised client-side. |
| L6 | Map view is unavailable on Android | `react-native-maps` renders Google Maps on Android, which requires a billed Google Cloud API key. iOS uses Apple Maps and needs none. The Android build shows position and zone count as text instead; **zone monitoring and alerting are unaffected**, since the map only ever visualised them. Adding a key to `app.json` restores the map with no code change. |
| L5 | Leaderboard scores are self-reported and not server-verified | Rules constrain the value to an integer in 0–100, but confirming it matches real progress requires recomputation in a Cloud Function, which the Spark plan cannot deploy (see D1). |
| L4 | Android blur uses a software implementation | Android exposes no native backdrop blur below API 31; `expo-blur` falls back to `dimezisBlurView`, which is explicitly opted into rather than silently degrading to a flat surface. |

---

## 6. Change log

| Phase | Commit | Summary |
|---|---|---|
| 0 | `b443075` | Baseline commit of as-received project; git initialised. |
| 1 | `9eb2b03` | All five blocking defects (B1–B5) resolved. See below. |
| 1a | `a19df04`, `d81eb81` | Concurrent permission requests read as denied; Settings remediation surfaced. |
| 1b | `d6abed8` | Firestore transport forced to long polling; transient Core Location errors reclassified. |
| 2 | `15be698` | Live Firestore zones rendered; `ZonesProvider` introduced as the single source. |
| 2a | `8e6c438` | Geofence layer and UI disagreed on an empty alert set; cache now records `syncedAt`. |
| 3 | `7c71b0e` | Progress persisted offline-first; SM-2 wired to a real quiz; score derived from actual completions. |
| 4a | `fafbc16` | Accessibility annotations, measured contrast fix, 44pt touch targets. |
| 4b | `8f2bd67` | Real blur and map, offline indicator, English/Urdu. |
| 4c | `27d98bc` | RTL scoped to text after device testing; preparedness copy moved into translations. |
| 5 | `5ecc559` | Coverage 18.8% → 93%; stub tests replaced; latency measured. |
| 7 | `c84b244` | Boundary misclassification found by geodesic re-measurement and fixed (4g, D18); stale doc figures corrected. |

### Phase 1 detail — blocking defects resolved

| Defect | Resolution |
|---|---|
| B1 | `startBackgroundLocationTracking()` now invoked from `App.tsx`, gated on an authenticated session *and* completed onboarding so permission prompts do not interrupt the tutorial. Returns a structured result distinguishing foreground-denied, background-denied and success. |
| B2 | Anonymous auth added via `app/hooks/useAuth.ts`. uid mirrored to storage for background contexts (D3). |
| B3 | Replaced `admin.messaging().send()` with a direct POST to Expo's push service (`https://exp.host/--/api/v2/push/send`), which accepts the `ExponentPushToken[…]` format the client actually registers. `DeviceNotRegistered` responses clear the stored token. |
| B4 | Added `firestore.rules` (deny-by-default; users reach only their own document; `alerts` read-only to clients; `alertLog` client-writable never) and `firestore.indexes.json` with the composite `isActive + expiresAt` index both queries require. Registered both in `firebase.json`. |
| B5 | Added an unchanged-location guard so the `onUpdate` handler's own write-back terminates the retrigger immediately. A `forceCheckAt` sentinel lets `triggerZoneCheck` defeat the guard deliberately. |

**Self-review finding.** The first version of the B5 guard broke `triggerZoneCheck`: that endpoint rewrote `lastKnownLocation` with an unchanged latitude/longitude, so the new guard suppressed exactly the invocation the endpoint existed to force. Resolved with the explicit `forceCheckAt` sentinel rather than by weakening the guard.

**Alerting now functions without a server.** Zone entry raises an on-device notification through `app/utils/localAlerts.ts`, with a 60-second per-zone cooldown held in `AsyncStorage` — replicating the server-side `alertLog` dedup that Cloud Functions would have provided (D1). Geofencing (`Location.startGeofencingAsync`) supplements location polling because the OS wakes the app on a boundary crossing even after termination, which plain background location updates do not survive on iOS.

**Verification at this phase:** `tsc --noEmit` clean for both the app and `functions/`; `jest` 4 suites / 33 passing, unchanged from baseline (no regressions).
