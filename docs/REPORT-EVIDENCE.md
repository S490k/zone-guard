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

### D4 — Zones mirrored to device storage
The same context boundary means a live Firestore listener is invisible to the background task — this is why the original task still read the hardcoded `DISASTER_ZONES`. Zones are now cached to `AsyncStorage` (`app/utils/zoneCache.ts`) whenever the listener fires, with the bundled list as fallback. This doubles as the offline source.

---

## 4. Measurements

To be completed as phases close.

| Measurement | Baseline | Final | Target | Method |
|---|---|---|---|---|
| Statement coverage | 33.12% | _pending_ | >70% | `npx jest --coverage` |
| Alert latency (mean) | not measured | _pending_ | <500ms | instrumented harness |
| Alert latency (p95) | not measured | _pending_ | <500ms | instrumented harness |
| Battery drain (iOS) | not measured | _pending_ | ≤5%/hr | Xcode Instruments, Energy Impact |
| Battery drain (Android) | not measured | _pending_ | ≤5%/hr | `adb bugreport` → Battery Historian |

---

## 5. Limitations

Each entry requires a technical justification, not a scheduling one.

| # | Limitation | Technical cause |
|---|---|---|
| L1 | No server-initiated push; alerts are generated on-device | Firebase Spark plan cannot deploy Cloud Functions (see D1). Server pipeline validated in the emulator only. |

---

## 6. Change log

| Phase | Commit | Summary |
|---|---|---|
| 0 | `122f2fd` | Baseline commit of as-received project; git initialised. |
| 1 | _pending_ | All five blocking defects (B1–B5) resolved. See below. |

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
