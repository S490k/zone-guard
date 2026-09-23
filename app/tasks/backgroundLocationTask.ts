import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@config/firebase';
import { detectActiveZones } from '@utils/distance';
import { DISASTER_ZONES } from '@constants/zones';

const BACKGROUND_LOCATION_TASK_NAME = 'background-location-task';

// Define the background task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations.length > 0) {
      const location = locations[locations.length - 1];
      const { latitude, longitude } = location.coords;

      console.log('Background location update:', { latitude, longitude });

      try {
        // Detect active zones
        const zones = detectActiveZones(latitude, longitude, DISASTER_ZONES);

        // Update user location in Firestore (for server-side Cloud Function)
        if (db && auth?.currentUser) {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, {
            lastKnownLocation: {
              latitude,
              longitude,
              timestamp: new Date(),
            },
            activeZones: zones.map((z) => ({
              zoneId: z.zoneId,
              distance: z.distance,
              isInZone: z.isInZone,
            })),
          });
        }
      } catch (error) {
        console.error('Error updating background location:', error);
      }
    }
  }
});

// Start background location tracking
export async function startBackgroundLocationTracking(): Promise<boolean> {
  try {
    // Request permissions
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.error('Foreground location permission not granted');
      return false;
    }

    const { status: backgroundStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.error('Background location permission not granted');
      return false;
    }

    // Start background location updates
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
      timeInterval: 30000, // 30 seconds
      distanceInterval: 50, // 50 meters
      foregroundService: {
        notificationTitle: 'ZoneGuard Active',
        notificationBody: 'Monitoring disaster zones in background',
        notificationColor: '#0A0E27',
      },
    });

    console.log('Background location tracking started');
    return true;
  } catch (error) {
    console.error('Error starting background location tracking:', error);
    return false;
  }
}

// Stop background location tracking
export async function stopBackgroundLocationTracking(): Promise<boolean> {
  try {
    const isTaskDefined = TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK_NAME);
    if (!isTaskDefined) {
      console.warn('Background location task not defined');
      return false;
    }

    const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
    if (running) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
    }
    console.log('Background location tracking stopped');
    return true;
  } catch (error) {
    console.error('Error stopping background location tracking:', error);
    return false;
  }
}

// Check if background location tracking is active
export async function isBackgroundLocationTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
  } catch (error) {
    console.error('Error checking background location tracking status:', error);
    return false;
  }
}

export default {
  BACKGROUND_LOCATION_TASK_NAME,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  isBackgroundLocationTrackingActive,
};
