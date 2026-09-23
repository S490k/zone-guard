import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import cors from 'cors';

admin.initializeApp();

const db = admin.firestore();
const corsHandler = cors({ origin: true });

const REGION = 'asia-south1';
const DEDUP_WINDOW_MS = 60 * 1000;
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

interface UserLocation {
  latitude: number;
  longitude: number;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isUsableLocation(location: unknown): location is UserLocation {
  if (!location || typeof location !== 'object') return false;
  const { latitude, longitude } = location as Partial<UserLocation>;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  // Null Island is the signature of an uninitialised GPS fix, not a real position.
  if (latitude === 0 && longitude === 0) return false;
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

function locationsMatch(a: unknown, b: unknown): boolean {
  if (!isUsableLocation(a) || !isUsableLocation(b)) return false;
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

function toMillis(value: unknown): number | null {
  if (value instanceof admin.firestore.Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return null;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Delivers through Expo's push service rather than admin.messaging(). The client
 * registers an Expo token (ExponentPushToken[...]), which the FCM Admin SDK
 * rejects outright — it accepts only native FCM registration tokens.
 */
async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<ExpoPushTicket> {
  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, title, body, data, sound: 'default', priority: 'high' }),
  });

  if (!response.ok) {
    throw new Error(`Expo push HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { data: ExpoPushTicket };
  return payload.data;
}

export const checkZoneProximity = functions
  .region(REGION)
  .firestore.document('users/{userId}')
  .onUpdate(async (change, context) => {
    const { userId } = context.params;
    const after = change.after.data();
    const before = change.before.data();

    // This handler writes back to the same document, which retriggers it. Bailing
    // out when the position is unchanged stops that second pass immediately.
    const forceRequested = toMillis(after.forceCheckAt) !== toMillis(before.forceCheckAt);
    if (!forceRequested && locationsMatch(before.lastKnownLocation, after.lastKnownLocation)) {
      return;
    }

    const location = after.lastKnownLocation;
    if (!isUsableLocation(location)) {
      console.log(`[checkZoneProximity] No usable location for ${userId}`);
      return;
    }

    const pushToken: string | undefined = after.expoPushToken;
    if (!pushToken) {
      console.log(`[checkZoneProximity] No push token for ${userId}`);
      return;
    }

    const { latitude, longitude } = location;

    try {
      const now = new Date();
      const alertsSnapshot = await db
        .collection('alerts')
        .where('isActive', '==', true)
        .where('expiresAt', '>', now)
        .get();

      console.log(`[checkZoneProximity] ${alertsSnapshot.size} active alerts`);

      const alertLogRef = db.collection('users').doc(userId).collection('alertLog');
      const recentSnapshot = await alertLogRef
        .where('sentAt', '>', new Date(Date.now() - DEDUP_WINDOW_MS))
        .get();
      const recentAlertIds = new Set(recentSnapshot.docs.map((d) => d.data().alertId));

      for (const alertDoc of alertsSnapshot.docs) {
        const alert = alertDoc.data();
        const alertId = alertDoc.id;

        if (recentAlertIds.has(alertId)) {
          console.log(`[checkZoneProximity] ${alertId} sent <60s ago, skipping`);
          continue;
        }

        if (typeof alert.latitude !== 'number' || typeof alert.radiusKm !== 'number') {
          console.warn(`[checkZoneProximity] Alert ${alertId} is malformed, skipping`);
          continue;
        }

        const distance = haversineDistance(latitude, longitude, alert.latitude, alert.longitude);
        console.log(
          `[checkZoneProximity] ${alertId}: ${distance.toFixed(2)}km vs ${alert.radiusKm}km radius`
        );

        if (distance > alert.radiusKm) continue;

        try {
          const ticket = await sendExpoPush(
            pushToken,
            alert.title,
            `${alert.description} You are ${distance.toFixed(1)}km from the centre.`,
            {
              alertId,
              zoneId: alert.zoneId ?? '',
              severity: alert.severity ?? 'high',
              distance: distance.toFixed(2),
              type: 'zone_alert',
            }
          );

          if (ticket.status === 'error') {
            console.error(`[checkZoneProximity] Expo rejected push: ${ticket.message}`);
            if (ticket.details?.error === 'DeviceNotRegistered') {
              await change.after.ref.update({
                expoPushToken: admin.firestore.FieldValue.delete(),
              });
            }
            continue;
          }

          console.log(`[checkZoneProximity] Push accepted, ticket ${ticket.id}`);

          await alertLogRef.add({
            alertId,
            alertTitle: alert.title ?? null,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            distance,
            severity: alert.severity ?? 'high',
            pushTicketId: ticket.id ?? null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[checkZoneProximity] Push failed for ${alertId}: ${message}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[checkZoneProximity] Zone check failed: ${message}`);
      throw error;
    }
  });

export const cleanupExpiredAlerts = functions
  .region(REGION)
  .pubsub.schedule('every 30 minutes')
  .onRun(async () => {
    try {
      const expired = await db
        .collection('alerts')
        .where('isActive', '==', true)
        .where('expiresAt', '<', new Date())
        .get();

      if (expired.empty) {
        console.log('[cleanupExpiredAlerts] Nothing to expire');
        return;
      }

      const batch = db.batch();
      expired.docs.forEach((doc) => batch.update(doc.ref, { isActive: false }));
      await batch.commit();

      console.log(`[cleanupExpiredAlerts] Deactivated ${expired.size} alerts`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[cleanupExpiredAlerts] Failed: ${message}`);
      throw error;
    }
  });

/** Test-only hook: nudges a user document so checkZoneProximity re-evaluates. */
export const triggerZoneCheck = functions.region(REGION).https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { userId } = req.body ?? {};
      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const location = userDoc.data()?.lastKnownLocation;
      if (!isUsableLocation(location)) {
        res.status(409).json({ error: 'User has no usable location yet' });
        return;
      }

      // forceCheckAt is what defeats the unchanged-location guard in
      // checkZoneProximity; bumping the location alone would be ignored.
      await userRef.update({ forceCheckAt: new Date(), lastCheckedAt: new Date() });

      res.json({ success: true, message: 'Zone check triggered' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[triggerZoneCheck] Failed: ${message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});
