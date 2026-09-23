import AsyncStorage from '@react-native-async-storage/async-storage';
import { DisasterZone, DISASTER_ZONES } from '@constants/zones';

const ZONES_KEY = 'zoneguard:cachedZones';

type SerializedZone = Omit<DisasterZone, 'createdAt' | 'expiresAt'> & {
  createdAt: string;
  expiresAt?: string;
};

/**
 * `syncedAt` distinguishes "never reached Firestore, so fall back to the
 * bundled zones" from "reached Firestore and the answer was genuinely zero".
 * Without it an empty result is indistinguishable from no result, and the
 * geofence layer ends up monitoring zones the UI reports as absent.
 */
interface CachePayload {
  syncedAt: string;
  zones: SerializedZone[];
}

/**
 * Zones are cached so the background task can reach them: it runs in a separate
 * JS context where the live Firestore listener does not exist. Also serves as
 * the offline source when the network is unavailable.
 */
export async function cacheZones(zones: DisasterZone[]): Promise<void> {
  try {
    const payload: CachePayload = {
      syncedAt: new Date().toISOString(),
      zones: zones.map((zone) => ({
        ...zone,
        createdAt: zone.createdAt.toISOString(),
        expiresAt: zone.expiresAt?.toISOString(),
      })),
    };
    await AsyncStorage.setItem(ZONES_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('[ZoneCache] Failed to cache zones:', error);
  }
}

export interface CachedZonesResult {
  zones: DisasterZone[];
  /** True when these are the bundled zones because Firestore was never reached. */
  isFallback: boolean;
}

/**
 * Returns the last synced zones, honouring an authoritative empty result. Falls
 * back to the bundled list only when no successful sync has ever completed.
 */
export async function readCachedZones(): Promise<CachedZonesResult> {
  try {
    const raw = await AsyncStorage.getItem(ZONES_KEY);
    if (!raw) return { zones: DISASTER_ZONES, isFallback: true };

    const parsed = JSON.parse(raw) as CachePayload;
    if (!parsed?.syncedAt || !Array.isArray(parsed.zones)) {
      // Unrecognised or pre-`syncedAt` payload: treat as no information.
      return { zones: DISASTER_ZONES, isFallback: true };
    }

    const now = Date.now();
    const zones = parsed.zones
      .map((zone) => ({
        ...zone,
        createdAt: new Date(zone.createdAt),
        expiresAt: zone.expiresAt ? new Date(zone.expiresAt) : undefined,
      }))
      .filter((zone) => !zone.expiresAt || zone.expiresAt.getTime() > now);

    return { zones, isFallback: false };
  } catch (error) {
    console.error('[ZoneCache] Failed to read zones, using bundled list:', error);
    return { zones: DISASTER_ZONES, isFallback: true };
  }
}

/** Zones only, for callers with nothing to decide on provenance. */
export async function getCachedZones(): Promise<DisasterZone[]> {
  const { zones } = await readCachedZones();
  return zones;
}

export async function clearCachedZones(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ZONES_KEY);
  } catch (error) {
    console.error('[ZoneCache] Failed to clear zones:', error);
  }
}
