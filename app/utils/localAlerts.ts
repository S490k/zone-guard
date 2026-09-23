import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DisasterZone, ZONE_ALERT_CONFIG } from '@constants/zones';

const DEDUP_KEY = 'zoneguard:lastAlertAt';

type DedupMap = Record<string, number>;

async function readDedupMap(): Promise<DedupMap> {
  try {
    const raw = await AsyncStorage.getItem(DEDUP_KEY);
    return raw ? (JSON.parse(raw) as DedupMap) : {};
  } catch {
    return {};
  }
}

/**
 * True when this zone was alerted within the cooldown window. Replaces the
 * server-side alertLog dedup, which is unavailable without Cloud Functions.
 */
export async function shouldSuppressAlert(zoneId: string): Promise<boolean> {
  const map = await readDedupMap();
  const last = map[zoneId];
  if (!last) return false;
  return Date.now() - last < ZONE_ALERT_CONFIG.ALERT_DEDUP_WINDOW_S * 1000;
}

async function recordAlertSent(zoneId: string): Promise<void> {
  try {
    const map = await readDedupMap();
    map[zoneId] = Date.now();
    await AsyncStorage.setItem(DEDUP_KEY, JSON.stringify(map));
  } catch (error) {
    console.error('[LocalAlerts] Failed to record alert:', error);
  }
}

export interface ZoneAlertOptions {
  /** Prefixes the title so simulated alerts are never mistaken for real ones. */
  isTest?: boolean;
  /** Skips the cooldown check. Used by the manual test button. */
  bypassDedup?: boolean;
  distanceKm?: number;
}

/** Presents a zone-entry notification on-device. Returns false if suppressed. */
export async function presentZoneAlert(
  zone: DisasterZone,
  options: ZoneAlertOptions = {}
): Promise<boolean> {
  const { isTest = false, bypassDedup = false, distanceKm } = options;

  if (!bypassDedup && (await shouldSuppressAlert(zone.id))) {
    console.log(`[LocalAlerts] Suppressed duplicate alert for ${zone.id}`);
    return false;
  }

  const title = isTest ? `TEST ALERT - ${zone.name}` : `${zone.name}`;
  const proximity =
    distanceKm !== undefined
      ? ` You are ${distanceKm.toFixed(1)}km from the centre.`
      : '';

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: `${zone.description}${proximity}`,
        sound: true,
        data: {
          zoneId: zone.id,
          severity: zone.severity,
          isTest: String(isTest),
          type: 'zone_alert',
        },
      },
      trigger: null, // deliver immediately
    });

    if (!bypassDedup) await recordAlertSent(zone.id);
    console.log(`[LocalAlerts] Delivered alert for ${zone.id} (test=${isTest})`);
    return true;
  } catch (error) {
    console.error('[LocalAlerts] Failed to present alert:', error);
    return false;
  }
}

export async function clearAlertHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DEDUP_KEY);
  } catch (error) {
    console.error('[LocalAlerts] Failed to clear history:', error);
  }
}
