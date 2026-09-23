import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import cors from 'cors';

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();
const corsHandler = cors({ origin: true });

// Haversine distance calculation (same as client-side)
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Cloud Function: Check zone proximity and send FCM alerts
export const checkZoneProximity = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const userId = context.params.userId;
    const newData = change.after.data();
    const previousData = change.before.data();

    // Extract location from user doc
    const location = newData.lastKnownLocation;
    if (!location || !location.latitude || !location.longitude) {
      console.log('No valid location for user:', userId);
      return;
    }

    const userLat = location.latitude;
    const userLon = location.longitude;

    try {
      // Get all active alerts from Firestore
      const alertsSnapshot = await db
        .collection('alerts')
        .where('isActive', '==', true)
        .where('expiresAt', '>', new Date())
        .get();

      console.log(`Found ${alertsSnapshot.docs.length} active alerts`);

      // Get user's alert log for deduplication
      const alertLogRef = db.collection('users').doc(userId).collection('alertLog');
      const recentAlertsSnapshot = await alertLogRef
        .where('sentAt', '>', new Date(Date.now() - 60 * 1000)) // Last 60 seconds
        .get();

      const recentAlertIds = new Set(
        recentAlertsSnapshot.docs.map((doc) => doc.data().alertId)
      );

      // Check each alert
      for (const alertDoc of alertsSnapshot.docs) {
        const alert = alertDoc.data();
        const alertId = alertDoc.id;

        // Skip if already sent recently (deduplication)
        if (recentAlertIds.has(alertId)) {
          console.log(`Skipping duplicate alert: ${alertId}`);
          continue;
        }

        // Calculate distance from user to alert zone
        const distance = haversineDistance(
          userLat,
          userLon,
          alert.latitude,
          alert.longitude
        );

        console.log(`Alert ${alertId}: distance = ${distance.toFixed(2)} km, radius = ${alert.radiusKm} km`);

        // Check if user is in zone
        if (distance <= alert.radiusKm) {
          console.log(`User ${userId} is IN zone for alert ${alertId}`);

          // Get user's push token
          const userDoc = await db.collection('users').doc(userId).get();
          const expoPushToken = userDoc.data()?.expoPushToken;

          if (expoPushToken) {
            // Send FCM message
            try {
              const messageId = await messaging.send({
                token: expoPushToken,
                notification: {
                  title: alert.title,
                  body: alert.description,
                },
                data: {
                  alertId: alertId,
                  zoneId: alert.zoneId,
                  severity: alert.severity,
                  distance: distance.toFixed(2),
                  type: 'zone_alert',
                },
              });

              console.log(`FCM sent successfully: ${messageId}`);

              // Log alert in alertLog for deduplication
              await alertLogRef.add({
                alertId: alertId,
                sentAt: new Date(),
                distance: distance,
                severity: alert.severity,
              });

              // Update user's last alert timestamp
              await db.collection('users').doc(userId).update({
                lastAlertAt: new Date(),
              });
            } catch (error) {
              console.error(`Error sending FCM for alert ${alertId}:`, error);

              // If token is invalid, remove it
              if (
                error instanceof Error &&
                error.message?.includes('invalid-registration-token')
              ) {
                await db.collection('users').doc(userId).update({
                  expoPushToken: admin.firestore.FieldValue.delete(),
                });
              }
            }
          } else {
            console.warn(`No push token for user ${userId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking zone proximity:', error);
      throw error;
    }
  });

// Cloud Function: Cleanup expired alerts
export const cleanupExpiredAlerts = functions.pubsub
  .schedule('every 30 minutes')
  .onRun(async (context) => {
    try {
      const expiredAlertsSnapshot = await db
        .collection('alerts')
        .where('isActive', '==', true)
        .where('expiresAt', '<', new Date())
        .get();

      console.log(`Found ${expiredAlertsSnapshot.docs.length} expired alerts`);

      const batch = db.batch();
      expiredAlertsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isActive: false });
      });

      await batch.commit();
      console.log('Expired alerts cleanup completed');
    } catch (error) {
      console.error('Error cleaning up expired alerts:', error);
      throw error;
    }
  });

// HTTP endpoint to trigger zone check manually (for testing)
export const triggerZoneCheck = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Manually trigger the checkZoneProximity logic
      // by updating the user doc
      await db.collection('users').doc(userId).update({
        lastCheckedAt: new Date(),
      });

      res.json({ success: true, message: 'Zone check triggered' });
    } catch (error) {
      console.error('Error triggering zone check:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});
