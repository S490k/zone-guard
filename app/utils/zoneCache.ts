import AsyncStorage from '@react-native-async-storage/async-storage';
import { DisasterZone, DISASTER_ZONES } from '@constants/zones';

const ZONES_KEY = 'zoneguard:cachedZones';

type SerializedZone = Omit<DisasterZone, 'createdAt' | 'expiresAt'> & {
  createdAt: string;
  expiresAt?: string;
};

/**
 * Zones are cached so the background task can reach them: it runs in a separate
 * JS context where the live Firestore listener does not exist. Also serves as
 * the offline source when the network is unavailable.
 */
export async function cacheZones(zones: DisasterZone[]): Promise<void> {
  try {
    const serialized: SerializedZone[] = zones.map((zone) => ({
      ...zone,
      createdAt: zone.createdAt.toISOString(),
      expiresAt: zone.expiresAt?.toISOString(),
    }));
    await AsyncStorage.setItem(ZONES_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.error('[ZoneCache] Failed to cache zones:', error);
  }
}

/** Returns cached zones, falling back to the bundled list when none are stored. */
export async function getCachedZones(): Promise<DisasterZone[]> {
  try {
    const raw = await AsyncStorage.getItem(ZONES_KEY);
    if (!raw) return DISASTER_ZONES;

    const parsed: SerializedZone[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DISASTER_ZONES;

    const now = Date.now();
    const zones = parsed
      .map((zone) => ({
        ...zone,
        createdAt: new Date(zone.createdAt),
        expiresAt: zone.expiresAt ? new Date(zone.expiresAt) : undefined,
      }))
      .filter((zone) => !zone.expiresAt || zone.expiresAt.getTime() > now);

    return zones.length > 0 ? zones : DISASTER_ZONES;
  } catch (error) {
    console.error('[ZoneCache] Failed to read zones, using bundled list:', error);
    return DISASTER_ZONES;
  }
}

export async function clearCachedZones(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ZONES_KEY);
  } catch (error) {
    console.error('[ZoneCache] Failed to clear zones:', error);
  }
}
