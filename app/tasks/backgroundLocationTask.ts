import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@config/firebase';
import { detectActiveZones } from '@utils/distance';
import { getCachedZones } from '@utils/zoneCache';
import { getPersistedUid } from '@utils/session';
import { presentZoneAlert } from '@utils/localAlerts';
import { ensureForegroundPermission, ensureBackgroundPermission } from '@utils/permissions';
import { DisasterZone } from '@constants/zones';

export const BACKGROUND_LOCATION_TASK_NAME = 'background-location-task';
export const GEOFENCING_TASK_NAME = 'zone-geofencing-task';

const FIRESTORE_WRITE_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * kCLErrorLocationUnknown (code 0) means Core Location has no fix at this
 * instant but is still trying. Apple's guidance is to ignore it — surfacing it
 * as an error misrepresents a condition that resolves on its own.
 */
function isTransientLocationError(error: { message?: string }): boolean {
  return Boolean(error.message?.includes('kCLErrorDomain Code=0'));
}

/**
 * Firestore writes from a background task routinely land with no connectivity.
 * Retries with a fixed backoff, then gives up quietly rather than throwing —
 * an unhandled rejection here would tear down the task registration.
 */
async function writeUserDocWithRetry(
  uid: string,
  data: Record<string, unknown>
): Promise<boolean> {
  if (!db) return false;

  for (let attempt = 1; attempt <= FIRESTORE_WRITE_RETRIES; attempt++) {
    try {
      await setDoc(doc(db, 'users', uid), data, { merge: true });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[BackgroundLocation] Firestore write ${attempt}/${FIRESTORE_WRITE_RETRIES} failed: ${message}`
      );
      if (attempt < FIRESTORE_WRITE_RETRIES) await delay(RETRY_DELAY_MS);
    }
  }

  console.error('[BackgroundLocation] All Firestore write attempts failed');
  return false;
}

// ---------------------------------------------------------------------------
// Location updates: maintains the user's last known position and raises alerts
// for any zone the position falls inside.
// ---------------------------------------------------------------------------
TaskManager.defineTask(BACKGROUND_LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    if (isTransientLocationError(error)) {
      console.log('[BackgroundLocation] No fix available yet; awaiting next update');
    } else {
      console.error('[BackgroundLocation] Task error:', error.message);
    }
    return;
  }
  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations?.length) return;

  const { coords } = locations[locations.length - 1];
  const { latitude, longitude, accuracy } = coords;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    console.warn('[BackgroundLocation] Discarding non-finite coordinates');
    return;
  }

  console.log(
    `[BackgroundLocation] Position: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (±${Math.round(accuracy ?? 0)}m)`
  );

  try {
    const zones = await getCachedZones();
    const proximities = detectActiveZones(latitude, longitude, zones);
    const insideZones = proximities.filter((p) => p.isInZone);

    const uid = await getPersistedUid();
    if (uid) {
      await writeUserDocWithRetry(uid, {
        lastKnownLocation: { latitude, longitude, accuracy: accuracy ?? null, timestamp: new Date() },
        lastBackgroundLocationUpdate: new Date(),
        activeZones: proximities.map((p) => ({
          zoneId: p.zoneId,
          distance: p.distance,
          isInZone: p.isInZone,
        })),
      });
    } else {
      console.log('[BackgroundLocation] No signed-in user; skipping Firestore sync');
    }

    for (const proximity of insideZones) {
      const zone = zones.find((z) => z.id === proximity.zoneId);
      if (zone) await presentZoneAlert(zone, { distanceKm: proximity.distance });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[BackgroundLocation] Update failed:', message);
  }
});

// ---------------------------------------------------------------------------
// Geofencing: the OS wakes the app on a boundary crossing, including after
// termination, which plain location updates do not survive on iOS.
// ---------------------------------------------------------------------------
TaskManager.defineTask(GEOFENCING_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[Geofencing] Task error:', error.message);
    return;
  }
  if (!data) return;

  const { eventType, region } = data as {
    eventType: Location.GeofencingEventType;
    region: Location.LocationRegion;
  };

  if (eventType !== Location.GeofencingEventType.Enter) {
    console.log(`[Geofencing] Exited region ${region.identifier}`);
    return;
  }

  console.log(`[Geofencing] Entered region ${region.identifier}`);

  try {
    const zones = await getCachedZones();
    const zone = zones.find((z) => z.id === region.identifier);
    if (!zone) {
      console.warn(`[Geofencing] No cached zone matching ${region.identifier}`);
      return;
    }

    await presentZoneAlert(zone);

    const uid = await getPersistedUid();
    if (uid) {
      await writeUserDocWithRetry(uid, {
        lastZoneEntry: { zoneId: zone.id, zoneName: zone.name, timestamp: new Date() },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Geofencing] Enter handling failed:', message);
  }
});

function toRegions(zones: DisasterZone[]): Location.LocationRegion[] {
  // iOS caps monitored regions at 20; nearest-first keeps the most relevant.
  return zones.slice(0, 20).map((zone) => ({
    identifier: zone.id,
    latitude: zone.latitude,
    longitude: zone.longitude,
    radius: zone.radiusKm * 1000,
    notifyOnEnter: true,
    notifyOnExit: true,
  }));
}

export interface TrackingStartResult {
  locationUpdates: boolean;
  geofencing: boolean;
  backgroundGranted: boolean;
}

/**
 * Starts background monitoring. Foreground permission is required; without
 * background permission the app still runs in a degraded foreground-only mode
 * rather than failing outright.
 */
export async function startBackgroundLocationTracking(): Promise<TrackingStartResult> {
  const result: TrackingStartResult = {
    locationUpdates: false,
    geofencing: false,
    backgroundGranted: false,
  };

  try {
    if (!(await ensureForegroundPermission())) {
      console.warn('[BackgroundLocation] Foreground permission denied');
      return result;
    }

    result.backgroundGranted = await ensureBackgroundPermission();
    if (!result.backgroundGranted) {
      console.warn('[BackgroundLocation] Background permission denied — degraded mode');
      return result;
    }

    const alreadyTracking = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK_NAME
    );
    if (!alreadyTracking) {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
        timeInterval: 30000,
        distanceInterval: 50,
        foregroundService: {
          notificationTitle: 'ZoneGuard active',
          notificationBody: 'Monitoring disaster zones in the background',
          notificationColor: '#00D4FF',
        },
      });
    }
    result.locationUpdates = true;

    const zones = await getCachedZones();
    const alreadyGeofencing = await Location.hasStartedGeofencingAsync(GEOFENCING_TASK_NAME);
    if (alreadyGeofencing) {
      await Location.stopGeofencingAsync(GEOFENCING_TASK_NAME);
    }
    if (zones.length > 0) {
      await Location.startGeofencingAsync(GEOFENCING_TASK_NAME, toRegions(zones));
      result.geofencing = true;
    }

    console.log(
      `[BackgroundLocation] Tracking started (updates=${result.locationUpdates}, geofences=${zones.length})`
    );
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[BackgroundLocation] Start failed:', message);
    return result;
  }
}

export async function stopBackgroundLocationTracking(): Promise<boolean> {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME)) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
    }
    if (await Location.hasStartedGeofencingAsync(GEOFENCING_TASK_NAME)) {
      await Location.stopGeofencingAsync(GEOFENCING_TASK_NAME);
    }
    console.log('[BackgroundLocation] Tracking stopped');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[BackgroundLocation] Stop failed:', message);
    return false;
  }
}

/** Re-registers geofences after the zone list changes. No-op when not tracking. */
export async function refreshGeofences(): Promise<boolean> {
  try {
    if (!(await Location.hasStartedGeofencingAsync(GEOFENCING_TASK_NAME))) return false;

    const zones = await getCachedZones();
    await Location.stopGeofencingAsync(GEOFENCING_TASK_NAME);
    if (zones.length === 0) return false;

    await Location.startGeofencingAsync(GEOFENCING_TASK_NAME, toRegions(zones));
    console.log(`[Geofencing] Re-registered ${zones.length} regions`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Geofencing] Refresh failed:', message);
    return false;
  }
}

export async function isBackgroundLocationTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
  } catch (error) {
    console.error('[BackgroundLocation] Status check failed:', error);
    return false;
  }
}
