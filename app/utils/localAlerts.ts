import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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

export const ZONE_CHANNEL_ID = 'zone-alerts';

/**
 * Creates the Android channel if it does not exist.
 *
 * Android assigns a notification with no channel to a default one of DEFAULT
 * importance, which shows no heads-up banner and makes no sound — so a zone
 * warning arrives silently in the shade. A disaster alert has to interrupt.
 *
 * Done here rather than only at startup because a geofence can wake a killed
 * app straight into this code path, before any startup effect has run.
 * setNotificationChannelAsync is idempotent, so calling it per alert is safe.
 */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(ZONE_CHANNEL_ID, {
      name: 'Zone alerts',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  } catch (error) {
    console.error('[LocalAlerts] Failed to create channel:', error);
  }
}

/**
 * One notification per zone. Reusing the id means a repeat alert *replaces*
 * the previous one instead of stacking a second copy in Notification Centre,
 * and it gives us a handle to dismiss with when the zone stops applying.
 */
function notificationId(zoneId: string, isTest: boolean): string {
  return isTest ? `zoneguard:test:${zoneId}` : `zoneguard:zone:${zoneId}`;
}

/** Removes a delivered zone alert — used when the user leaves the zone. */
export async function dismissZoneAlert(zoneId: string): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(notificationId(zoneId, false));
  } catch (error) {
    console.error('[LocalAlerts] Failed to dismiss alert:', error);
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
    await ensureAndroidChannel();

    await Notifications.scheduleNotificationAsync({
      identifier: notificationId(zone.id, isTest),
      content: {
        title,
        body: `${zone.description}${proximity}`,
        sound: true,
        // Without the channel the alert lands on Android's default one and
        // never surfaces as a banner.
        ...(Platform.OS === 'android'
          ? {
              channelId: ZONE_CHANNEL_ID,
              priority: Notifications.AndroidNotificationPriority.MAX,
            }
          : {}),
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
