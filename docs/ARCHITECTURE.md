# Architecture

How ZoneGuard is put together, and why it is put together that way. Decisions
that were forced by a constraint say so, because the constraint is usually the
more useful half of the explanation.

---

## The shape of the problem

A disaster app has an unusual requirement profile. It must keep working when the
network is gone, when the battery is low, and when the user has force-quit it —
because those are precisely the conditions a disaster produces. Most of the
design below follows from taking that seriously.

---

## Alerting runs on the device

The obvious design is a server watching user positions and pushing alerts. That
was the original plan, and it is not what this app does.

**The constraint:** the Firebase project runs on the Spark (free) plan, and
Cloud Functions have required a billing account since 2022. There is no server.

**The design:** the device evaluates its own position against cached zones and
raises a local notification. Nothing is pushed. There is no round trip.

This turned out to be better than a workaround. On-device alerting works with no
connectivity at all, has no server latency, and cannot fail because a backend is
down. Measured latency for the full path — cache read, zone detection,
notification dispatch — is **0.06ms mean**, against a 500ms budget.

The server-side `checkZoneProximity` function is retained in `functions/` and
validated against the Firestore emulator, so the pipeline is proven and
deploy-ready if the plan ever changes.

**Deduplication** moves to the device with it. A 60-second per-zone cooldown in
`AsyncStorage` replaces what the server's `alertLog` collection would have done.

---

## Two location mechanisms, doing different jobs

```
                    ┌──────────────────────────┐
  boundary crossing │   Geofencing task        │  → notification
  (OS-evaluated) ──▶│   startGeofencingAsync   │  → lastZoneEntry to Firestore
                    └──────────────────────────┘

                    ┌──────────────────────────┐
  position updates  │   Location task          │  → position history
  (app-scheduled) ─▶│   startLocationUpdates   │  → zone proximity for the UI
                    └──────────────────────────┘
```

**Geofencing is the alerting mechanism.** The OS evaluates regions against
hardware it is already running, so it costs the app almost nothing, and it wakes
a terminated app for a crossing. Verified on Android: a zone entry was recorded
23 seconds after a crossing with the app force-quit.

**Location updates maintain position history** and feed the dashboard. This is
the expensive one, and the only one that throttles under battery pressure.

The split is what makes the battery policy safe. In the most conservative mode,
position history degrades to a 5-minute interval while **zone alerting keeps
working at full fidelity**, because geofencing never throttles. A power-saving
mode that quietly stopped raising alerts would be worse than no power saving.

---

## Background tasks run in a separate JS context

This single fact drives several decisions that otherwise look redundant.

When the OS wakes the app for a geofence event, the task runs in a fresh
JavaScript context. React has not mounted. Contexts do not exist. Firebase Auth
has not rehydrated from storage. Anything held in memory is gone.

So the background task cannot read React state, and `auth.currentUser` is `null`
on a cold start. Two mirrors exist to bridge this:

| Mirror | File | Why |
|---|---|---|
| **uid** | `utils/session.ts` | `auth.currentUser` is unreliable in a fresh context |
| **zones** | `utils/zoneCache.ts` | The live Firestore listener is invisible to the task |

Both are written whenever the foreground app learns something, and read by
background code. The zone cache doubles as the offline source.

The same reasoning explains why the notification channel is created at alert
time rather than only at startup: a geofence can wake a killed app straight into
that path before any startup effect has run.

---

## State: four contexts, each owning one thing

```
LanguageProvider          locale, translation lookup, text direction
└── ZonesProvider         zones from Firestore, cached, with provenance
    └── ProgressProvider  tasks, kit, quiz state, preparedness score
        └── AchievementsProvider   badges, tiers, celebration queue
```

Nesting order is a dependency order. Achievements are derived from progress;
progress needs a locale for reminder text; everything needs zones to be a single
source rather than several components each opening their own listener.

**`ZonesProvider` exposes provenance, not just data.** A `source` of
`firestore`, `cache` or `bundled` lets the interface say which it is showing.
Presenting month-old cached alerts as current would be actively dangerous, so
the distinction is surfaced rather than hidden.

---

## Offline-first, by hand

The Firestore JS SDK has **no offline persistence under React Native** —
`persistentLocalCache` depends on IndexedDB, which RN does not provide. The
usual advice to "enable offline persistence" is unavailable.

So each cached domain mirrors to `AsyncStorage` explicitly:

| Cache | Holds | Fallback when empty |
|---|---|---|
| `zoneCache` | Zones, with a `syncedAt` marker | Bundled zones |
| `progressStore` | Tasks, kit, quiz state | Empty progress |
| `disasterNews` | Last successful feed fetch | Empty list |

The `syncedAt` marker matters more than it looks. Without it, "never reached
Firestore" and "reached Firestore, and the answer was genuinely zero" are
indistinguishable — and an early version fell back to bundled zones on both.
That produced a state where the geofence layer monitored three zones while the
dashboard reported none. An authoritative empty result must be honoured.

**Writes go local first**, then sync, so the interface never waits on the
network. A `pendingWrite` guard stops the listener's own echo from overwriting an
edit made since.

---

## Security model

Firestore rules are deny-by-default. Three collections are named.

| Collection | Read | Write |
|---|---|---|
| `users/{uid}` | owner only | owner only, no deletes |
| `users/{uid}/alertLog` | owner only | nobody (Admin SDK bypasses rules) |
| `alerts` | any signed-in user | nobody — operator-curated |
| `leaderboard/{uid}` | any signed-in user | owner only, shape-pinned |

**The leaderboard exists as a separate collection for a specific reason.** The
obvious implementation ranks users by querying `users`, ordered by score. That
document holds **location history**, and ranking over it would have opened every
user's movements to every other user. Scores therefore live apart, carrying only
a score, a derived handle and a timestamp — never location. Rules pin the shape
with `hasOnly` so a client cannot smuggle extra fields into a world-readable
document.

Identity is a **stable handle derived from the uid** (`Guardian A3F2`). Accounts
are anonymous, so there is no name to show, and publishing the raw uid would
expose the key to the owner-only user document.

Authentication is **anonymous**: the app has no account feature, and a sign-up
wall would obstruct the alerting flow.

---

## Testing strategy

Coverage concentrates on **decision logic** rather than I/O wrappers. Pure
functions — distance, SM-2, scoring, achievements, battery profile, severity
mapping, message composition — are separated from their side-effecting callers
precisely so they can be verified against fixtures.

Feed mappers use fixtures **copied from live responses** rather than invented, so
an upstream contract change fails a test instead of silently emptying a list on
device.

Security rules and write atomicity are tested against the Firestore emulator.
Those 27 tests **skip visibly** when no emulator is present rather than passing
vacuously — the suite arrived with twelve `it.todo()` placeholders that reported
as passing while asserting nothing, and that failure mode is worth avoiding.

Two tests in this suite initially passed on the author's machine and would have
failed elsewhere: one built fixtures in UTC against logic that normalises to a
local hour, another used the current time of day against logic that normalises to
09:00. Both are now pinned to fixed points. Time and timezone are the usual
culprits in a suite that passes locally and fails in CI.

---

## Internationalisation

UI copy lives in `i18n/translations.ts`; subject matter — tasks, kit items, quiz
questions, response guides — lives in `i18n/content.ts`. The constants in
`constants/preparedness.ts` hold **structure only**: id, priority, topic, correct
answer. Adding a language touches neither a constant nor a screen.

A test asserts **key parity** between locales, including that interpolation
placeholders match, because a missing key falls back to English silently and
reads as a bug rather than an omission.

**Direction is applied at the text level**, not through `I18nManager.forceRTL`.
Forcing RTL mirrors the entire layout tree — it reordered the tab bar and every
icon row — and requires an app restart. Scoping direction to text keeps
navigation where the user expects it and makes the switch immediate.

---

## Accessibility

Contrast was **measured, not estimated**. Every text and surface pair clears WCAG
AA: body text at 4.60:1 or better on both the canvas and white cards, and white
text on every severity fill at 4.92:1 or better.

The source design's own orange and yellow measured 2.70:1 and 1.97:1 against
white text. Darker equivalents preserve the visual hierarchy while remaining
legible, so the design was followed in intent rather than literally.

Live regions are graded by urgency. Zone entry is announced **assertively**;
achievement celebrations are **polite**, because a celebration must never
interrupt a warning.
