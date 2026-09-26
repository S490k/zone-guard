# Physical device test protocol

Four behaviours cannot be observed on a simulator, and they are the only
outstanding gaps in the evidence log. This protocol produces them.

| # | What only a device can show | Why the simulator cannot |
|---|---|---|
| 1 | Background survival after force-quit | Simulator does not suspend and relaunch apps the way iOS does |
| 2 | The blue location indicator | Drawn by iOS on real hardware only |
| 3 | Expo push token registration | `Device.isDevice` is false; there is no APNs registration |
| 4 | Battery drain | No battery to drain |

Record results in the table at the end and paste it back.

---

## Getting the build onto the iPhone

Connect the iPhone by USB, unlock it, and tap **Trust** if prompted. Then:

```bash
npx expo run:ios --device
```

Xcode will ask which device and which signing team.

**On signing.** A free Apple ID works and installs a build that stops launching
after **7 days** — fine for this protocol, which takes about 90 minutes. A paid
Apple Developer account ($99/year) is only needed for TestFlight distribution in
Step 7. Do not pay for it just to run these tests.

First build takes 10–15 minutes. After that, `npx expo start --dev-client` reloads
in seconds.

Once installed, grant **Always** when asked for location and **Allow** for
notifications. If the "Always" prompt does not appear:
**Settings → Privacy & Security → Location Services → ZoneGuard → Always**.

---

## Test 1 — Push token registration

The simulator has always logged `Push tokens are only available on physical
devices`. This confirms the path works when one is available.

1. Launch the app and watch the Metro console.
2. **Expected:** the simulator-only message is **absent**.
3. Firebase console → Firestore → `users/{your-uid}` → an `expoPushToken` field
   starting `ExponentPushToken[`.

> If `eas init` has not been run there is no EAS `projectId`, and the app logs
> `No EAS projectId yet` and skips the token. That is the guard working, not a
> failure — run `eas init` first if you want this test to produce a token.

**Records:** push registration works on hardware.

---

## Test 2 — Foreground tracking baseline

1. With the app open, watch the console for `[BackgroundLocation] Position:`.
2. Walk a short distance, or drive if convenient.
3. **Expected:** position lines appear as you move. Updates are throttled to a
   50m distance interval, so standing still produces few or none — that is the
   battery optimisation working, not a fault.

**Records:** the foreground path functions on hardware.

---

## Test 3 — The blue location indicator

1. With the app open and tracking started, press the **home gesture** to
   background it — do not swipe it away.
2. Look at the status bar.
3. **Expected:** a blue pill or arrow indicating background location use.

This is iOS confirming the app holds an active background location session. Its
presence is the OS's own evidence that background tracking is live.

**Screenshot this** — it is direct evidence for the report.

---

## Test 4 — Background survival after force-quit

The roadmap predicted iOS kills background location on termination. Geofencing
was chosen partly because the OS relaunches the app for a region crossing. This
test decides which is true in practice.

1. Set a zone you can physically reach. Easiest route: in the Firebase console
   create an `alerts` document centred on **your current location** with
   `radiusKm: 1`, `isActive: true`, and a future `expiresAt`. See
   [SEED-ALERTS.md](SEED-ALERTS.md) for the field list.
2. Confirm the app logs `[Geofencing] Re-registered N regions`.
3. Walk **outside** the 1km radius and wait for the exit event.
4. **Force-quit the app** — swipe up from the app switcher.
5. Walk back **inside** the radius.
6. **Expected:** a notification arrives despite the app being terminated.

**If no notification arrives**, that is a genuine finding, not a failure of the
protocol: it means iOS did not relaunch the app for the region crossing. Record
it either way — a negative result here is legitimate evidence and belongs in the
limitations table.

**Records:** whether alerting survives termination.

---

## Test 5 — Battery drain (the headline number)

Target: **≤5% per hour**. Budget 60 minutes.

**Method A — Settings (simplest, and sufficient)**

1. Charge to 100%, then unplug.
2. Note the exact battery percentage and the time.
3. Launch ZoneGuard, confirm tracking started, background the app.
4. Leave the phone **stationary, screen off**, for 60 minutes. Do not use it —
   any other app contaminates the measurement.
5. Note the percentage and time again.
6. **Settings → Battery → last 24 hours** → tap ZoneGuard for its share.

Drain rate = (start% − end%) over the elapsed hour.

**Method B — Xcode Instruments (more precise, better for the report)**

1. Keep the iPhone connected.
2. Xcode → **Product → Profile** → choose **Energy Log**.
3. Record for 60 minutes with the app backgrounded.
4. Read the average Energy Impact.

**Interpreting the result.** Geofencing replaced continuous polling specifically
to protect this budget, since the OS wakes the app on a boundary crossing rather
than the app waking itself every 30 seconds. If drain still exceeds 5%/hour, the
next lever is raising `timeInterval` in `startBackgroundLocationTracking`, or
dropping the location-updates task and relying on geofencing alone.

A measurement above budget is a valid result. Record it rather than retrying
until it passes.

---

## Test 6 — Zone entry end to end

1. With the 1km test zone from Test 4 still active, start outside it.
2. Walk in.
3. **Expected:** notification titled with the zone name, within roughly a minute
   of crossing.
4. Re-enter within 60 seconds — **expected:** no second notification (cooldown).
5. Wait past 60 seconds and re-enter — **expected:** it fires again.

**Records:** the alerting chain and its deduplication, on hardware, in the field.

---

## Test 7 — No repeated alerts while staying inside

The first field run produced a second alert three minutes after the first while
the user was still inside the zone. The location task alerted on *presence*; it now
alerts on *entry* (evidence log 4i). This test confirms the fix on hardware, and
needs a release APK built from `368063d` or later.

1. Start outside the test zone, then walk in. **Expected:** one notification.
2. Keep walking around **inside** the zone for at least five minutes, staying more
   than 100 m inside the boundary. **Expected:** no further notification.
3. Walk out until you are more than 100 m beyond the boundary.
   **Expected:** the notification is cleared from the shade.
4. Walk back in. **Expected:** one new notification.

**Records:** whether a stay produces exactly one alert on hardware.

---

## Results

Fill in and return. Blank or negative entries are fine — an untested or failed
item is recorded as a limitation, not hidden.

Completed on Android, 2026-09-25. Samsung handset, EAS release APK.

| Test | Result | Notes |
|---|---|---|
| 1. Push token registered | not tested | `expoPushToken` absent; remote push unused — alerting is on-device (D1) |
| 2. Foreground tracking | **pass** | positions written to Firestore while moving |
| 3. Background service running | **pass** | Android foreground-service notification held for the full hour |
| 4. Survives force-quit | **pass** | zone entry recorded 23s after crossing with the app killed; reproduced twice |
| 5. Battery drain | **1%/hour** | 90% → 89% over 60 min, stationary, screen off. Best case — see the caveat in the evidence log |
| 6. Zone entry notification | **pass, after a fix** | detected on the first attempt but delivered silently; alerts had no Android channel. Fixed in `ec309d4` and re-verified |
| 7. No repeat while inside | **pending** | repeat alert observed in the first run; fixed in `368063d` and covered by tests, not yet re-run on hardware |

**iOS device testing not performed.** The available iPhone runs iOS 27 and the
installed Xcode (26.6, iOS 26.5 SDK) cannot deploy to it. iOS was verified on
simulator against a production build artifact instead. Recorded as L7.
