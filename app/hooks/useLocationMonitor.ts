import { useEffect, useRef, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { detectActiveZones, ZoneProximity } from '@utils/distance';
import { ensureForegroundPermission } from '@utils/permissions';
import { DisasterZone } from '@constants/zones';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface UseLocationMonitorReturn {
  location: LocationData | null;
  activeZones: ZoneProximity[];
  isLoading: boolean;
  error: Error | null;
  requestPermissions: () => Promise<boolean>;
}

export function useLocationMonitor(zones: DisasterZone[]): UseLocationMonitorReturn {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [activeZones, setActiveZones] = useState<ZoneProximity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const watchSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const inZoneKeyRef = useRef<string>('');

  // Read through a ref so a zone update does not tear down and re-establish the
  // position watcher, which would drop the subscription mid-flight.
  const zonesRef = useRef(zones);
  useEffect(() => {
    zonesRef.current = zones;
  }, [zones]);

  // Delegates to the shared gate so this does not race the background task's
  // own request — iOS treats a concurrent second request as denied.
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      return await ensureForegroundPermission();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start watching location
  const startWatching = useCallback(async () => {
    try {
      const granted = await requestPermissions();
      if (!granted) {
        setError(new Error('Location permission denied'));
        return;
      }

      // Start watching position
      watchSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // 5 seconds
          distanceInterval: 10, // 10 meters
        },
        (location) => {
          const coords = location.coords;
          const locationData: LocationData = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy || 0,
            timestamp: location.timestamp,
          };

          setLocation(locationData);

          const proximities = detectActiveZones(
            coords.latitude,
            coords.longitude,
            zonesRef.current
          );
          setActiveZones(proximities);

          // A position arrives every few seconds; logging each one buries the
          // events that matter. Only membership changes are worth a line.
          const inZoneKey = proximities
            .filter((proximity) => proximity.isInZone)
            .map((proximity) => proximity.zoneId)
            .sort()
            .join(',');

          if (inZoneKey !== inZoneKeyRef.current) {
            inZoneKeyRef.current = inZoneKey;
            console.log(
              `[LocationMonitor] Zones entered: ${inZoneKey || 'none'} ` +
                `(at ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`
            );
          }
        }
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('Error starting location watch:', error);
    }
  }, [requestPermissions]);

  // Stop watching location
  const stopWatching = useCallback(() => {
    if (watchSubscriptionRef.current) {
      watchSubscriptionRef.current.remove();
      watchSubscriptionRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  // Auto-start watching on mount
  useEffect(() => {
    startWatching();
  }, [startWatching]);

  return {
    location,
    activeZones,
    isLoading,
    error,
    requestPermissions,
  };
}

export default useLocationMonitor;
