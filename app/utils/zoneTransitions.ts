import AsyncStorage from '@react-native-async-storage/async-storage';
import { DisasterZone } from '@constants/zones';
import { BOUNDARY_TOLERANCE, detectActiveZones, ZoneProximity } from '@utils/distance';
import { dismissZoneAlert, presentZoneAlert, shouldSuppressAlert } from '@utils/localAlerts';

/**
 * Zone alerts fire on *entering* a zone, not on being inside one.
 *
 * The location-updates task used to alert for every zone containing the current
 * position, held back only by the 60-second cooldown. A user who stayed inside a
 * zone while moving was re-alerted each time the cooldown lapsed — observed in
 * the Android field test. Alerting now depends on a transition: the set of zones
 * the user is inside is persisted between fixes, and only additions to it alert.
 *
 * The set lives in AsyncStorage because both background tasks run in a fresh
 * JavaScript context with no memory of earlier invocations.
 */

const MEMBERSHIP_KEY = 'zoneguard:insideZones';

/**
 * How far beyond the containment radius a stay continues before it ends.
 *
 * Fixes come from the Balanced accuracy profile, roughly 100 m on Android, so a
 * user standing on a boundary can read in and out between consecutive fixes.
 * Without this margin every flicker would count as a fresh entry and re-alert.
 * Entry still uses the containment radius, so the margin never delays an alert.
 */
export const EXIT_HYSTERESIS_KM = 0.1;

export interface MembershipChange {
  /** Zones the user was not inside before and is now. These alert. */
  entered: string[];
  /** Zones the user was inside and has now left, or that no longer exist. */
  exited: string[];
  /** Zones the user is inside after this fix. */
  current: string[];
}

/**
 * Compares the zones recorded as occupied with a new set of proximities.
 * Pure, so the transition rules can be verified against fixtures.
 */
export function reconcileMembership(
  previous: readonly string[],
  proximities: readonly ZoneProximity[],
  zones: readonly DisasterZone[]
): MembershipChange {
  const wasInside = new Set(previous);
  const radiusById = new Map(zones.map((zone) => [zone.id, zone.radiusKm]));
  const seen = new Set<string>();
  const change: MembershipChange = { entered: [], exited: [], current: [] };

  for (const proximity of proximities) {
    const radiusKm = radiusById.get(proximity.zoneId);
    if (radiusKm === undefined) continue;
    seen.add(proximity.zoneId);

    if (proximity.isInZone) {
      if (!wasInside.has(proximity.zoneId)) change.entered.push(proximity.zoneId);
      change.current.push(proximity.zoneId);
    } else if (wasInside.has(proximity.zoneId)) {
      const exitDistance = radiusKm * (1 + BOUNDARY_TOLERANCE) + EXIT_HYSTERESIS_KM;
      if (proximity.distance <= exitDistance) change.current.push(proximity.zoneId);
      else change.exited.push(proximity.zoneId);
    }
  }

  // A zone that has expired or been withdrawn cannot still be occupied.
  for (const zoneId of wasInside) {
    if (!seen.has(zoneId)) change.exited.push(zoneId);
  }

  return change;
}

/**
 * The zones currently recorded as occupied. An unreadable record is treated as
 * empty: every occupied zone then looks newly entered, which can at worst repeat
 * an alert — the safe direction, where the alternative could suppress one.
 */
export async function readMembership(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(MEMBERSHIP_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export async function writeMembership(zoneIds: readonly string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(MEMBERSHIP_KEY, JSON.stringify([...new Set(zoneIds)]));
  } catch (error) {
    console.error('[ZoneTransitions] Failed to persist zone membership:', error);
  }
}

/** Records an OS-reported geofence entry, so location fixes do not repeat it. */
export async function markEntered(zoneId: string): Promise<void> {
  const current = await readMembership();
  if (!current.includes(zoneId)) await writeMembership([...current, zoneId]);
}

/** Records an OS-reported geofence exit, so a later re-entry alerts again. */
export async function markExited(zoneId: string): Promise<void> {
  const current = await readMembership();
  if (current.includes(zoneId)) await writeMembership(current.filter((id) => id !== zoneId));
}

/**
 * Handles one location fix: alerts for zones newly entered, dismisses alerts
 * for zones left, and persists the result. Returns the proximities so the
 * caller can record them without recomputing.
 */
export async function handleLocationFix(
  latitude: number,
  longitude: number,
  zones: DisasterZone[]
): Promise<{ proximities: ZoneProximity[]; change: MembershipChange }> {
  const proximities = detectActiveZones(latitude, longitude, zones);
  const change = reconcileMembership(await readMembership(), proximities, zones);
  const undelivered = new Set<string>();

  for (const zoneId of change.entered) {
    const zone = zones.find((z) => z.id === zoneId);
    const proximity = proximities.find((p) => p.zoneId === zoneId);
    if (!zone || !proximity) continue;

    // A zone alerted within the cooldown — typically by the geofence task for
    // this same crossing — has already reached the user and counts as alerted.
    const alreadyAlerted = await shouldSuppressAlert(zoneId);
    const delivered =
      alreadyAlerted || (await presentZoneAlert(zone, { distanceKm: proximity.distance }));

    // Left out of the recorded set, so the next fix tries again rather than the
    // entry being silently lost.
    if (!delivered) undelivered.add(zoneId);
  }

  for (const zoneId of change.exited) {
    // The warning no longer applies and should not linger as if current.
    await dismissZoneAlert(zoneId);
  }

  await writeMembership(change.current.filter((zoneId) => !undelivered.has(zoneId)));
  return { proximities, change };
}
