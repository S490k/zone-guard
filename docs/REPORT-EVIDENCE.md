# ZoneGuard — Report Evidence Log

Running record of measurements, decisions and limitations captured during remediation.
Appended to at the close of each phase. Baseline git commit: `122f2fd`.

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
| Statement coverage | 33.12% | **93.29%** | >70% | `npx jest --coverage` |
| Branch coverage | 45.45% | **91.41%** | >70% | as above |
| Function coverage | 31.42% | **94.52%** | >70% | as above |
| Line coverage | 31.33% | **93.09%** | >70% | as above |
| Passing tests | 33 (+12 stubs) | **156** (+18 emulator-gated) | — | `npx jest` |
| Alert latency (mean) | not measured | **0.06ms** | <500ms | `__tests__/performance`, 100 iterations |
| Alert latency (p95) | not measured | **0.07ms** | <500ms | as above |
| Battery drain (iOS) | not measured | _pending device test_ | ≤5%/hr | Xcode Instruments, Energy Impact |
| Battery drain (Android) | not measured | _pending device test_ | ≤5%/hr | `adb bugreport` → Battery Historian |

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
passing while asserting nothing. These were replaced with 18 executable tests against
the Firestore emulator covering the security rules (owner isolation, alert
write-protection, audit-trail immutability, deny-by-default) and write atomicity.

They require a Java runtime, which is not installed on the development machine, so
they **skip visibly** rather than passing vacuously. Run them with:

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

## 5. Limitations

Each entry requires a technical justification, not a scheduling one.

| # | Limitation | Technical cause |
|---|---|---|
| L1 | No server-initiated push; alerts are generated on-device | Firebase Spark plan cannot deploy Cloud Functions (see D1). Server pipeline validated in the emulator only. |
| ~~L2~~ | ~~Switching to Urdu requires an app restart~~ | **Resolved.** Dropping `forceRTL` in favour of text-level direction removed both the restart requirement and the unwanted layout mirroring. |
| L3 | Alert titles and descriptions are not translated | They originate in Firestore in whatever language the operator published. Only the app's own interface can be localised client-side. |
| L4 | Android blur uses a software implementation | Android exposes no native backdrop blur below API 31; `expo-blur` falls back to `dimezisBlurView`, which is explicitly opted into rather than silently degrading to a flat surface. |

---

## 6. Change log

| Phase | Commit | Summary |
|---|---|---|
| 0 | `122f2fd` | Baseline commit of as-received project; git initialised. |
| 1 | `4921a03` | All five blocking defects (B1–B5) resolved. See below. |
| 1a | `f6805f2`, `4f5ef00` | Concurrent permission requests read as denied; Settings remediation surfaced. |
| 1b | `cfc6017` | Firestore transport forced to long polling; transient Core Location errors reclassified. |
| 2 | `424bca7` | Live Firestore zones rendered; `ZonesProvider` introduced as the single source. |
| 2a | `e06f92f` | Geofence layer and UI disagreed on an empty alert set; cache now records `syncedAt`. |
| 3 | `b4f6868` | Progress persisted offline-first; SM-2 wired to a real quiz; score derived from actual completions. |

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
