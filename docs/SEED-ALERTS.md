# Seeding the `alerts` collection

The app reads live zones from the Firestore `alerts` collection. Until it contains
documents, `getCachedZones()` falls back to the three zones bundled in
`app/constants/zones.ts`, so the app still works — but nothing exercises the
dynamic path.

These documents must be created in the **Firebase console**, not from the app.
`firestore.rules` grants clients read-only access to `alerts` (`allow write: if false`),
because alerts are operator-curated and a client must never be able to forge one.

## The query these must satisfy

```
where('isActive', '==', true)
where('expiresAt', '>', <now>)
```

**`expiresAt` must be in the future or the document will not appear.** That is the
single most common reason a seeded alert never shows up.

## Creating a document

Firebase console → Firestore Database → Start collection → collection ID `alerts`.
For each document, set the Document ID as given and add every field below with its
exact type — the console requires you to pick the type per field.

### Document 1 — ID: `alert-taunsa-2026`

| Field | Type | Value |
|---|---|---|
| `zoneId` | string | `zone-taunsa-barrage` |
| `title` | string | `Taunsa Barrage Flood Warning` |
| `description` | string | `Heavy monsoon discharge expected. Prepare to move to higher ground.` |
| `severity` | string | `high` |
| `latitude` | number | `30.6987` |
| `longitude` | number | `70.8503` |
| `radiusKm` | number | `15` |
| `isActive` | boolean | `true` |
| `createdAt` | timestamp | today |
| `expiresAt` | timestamp | **any future date** |

### Document 2 — ID: `alert-jacobabad-2026`

| Field | Type | Value |
|---|---|---|
| `zoneId` | string | `zone-jacobabad` |
| `title` | string | `Jacobabad Extreme Heat Warning` |
| `description` | string | `Temperatures above 50°C forecast. Avoid outdoor exposure.` |
| `severity` | string | `critical` |
| `latitude` | number | `27.2822` |
| `longitude` | number | `68.4501` |
| `radiusKm` | number | `30` |
| `isActive` | boolean | `true` |
| `createdAt` | timestamp | today |
| `expiresAt` | timestamp | **any future date** |

### Document 3 — ID: `alert-muzaffarabad-2026`

| Field | Type | Value |
|---|---|---|
| `zoneId` | string | `zone-muzaffarabad` |
| `title` | string | `Muzaffarabad Aftershock Advisory` |
| `description` | string | `Continued seismic activity. Avoid damaged structures.` |
| `severity` | string | `medium` |
| `latitude` | number | `34.3590` |
| `longitude` | number | `73.4713` |
| `radiusKm` | number | `20` |
| `isActive` | boolean | `true` |
| `createdAt` | timestamp | today |
| `expiresAt` | timestamp | **any future date** |

`severity` must be exactly one of `low`, `medium`, `high`, `critical` — it indexes
into the colour map, and an unrecognised value renders with no severity colour.

## Verifying the dynamic path

Each of these should hold **without restarting the app**.

| Test | Action | Expected |
|---|---|---|
| Live addition | Create a 4th document with `isActive: true` and a future `expiresAt` | Appears on Dashboard and Alerts within ~5s; console logs `[Zones] 4 active from Firestore` and `[Geofencing] Re-registered 4 regions` |
| Deactivation | Set `isActive` to `false` | Disappears within ~5s |
| Reactivation | Set `isActive` back to `true` | Reappears |
| Expiry | Set `expiresAt` to a past date | Disappears — the listener query excludes it |
| Modification | Change `radiusKm` from `15` to `25` | New radius applies immediately; geofences re-register at the new size |
| Offline fallback | Turn off the network | Zones remain visible; header switches to "Offline — showing cached alerts" |

To drive the device into a zone for any of these:

```bash
xcrun simctl location booted set 30.6987,70.8503
```
