import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DisasterZone } from '@constants/zones';
import { startZonesSync, alertToZone } from '@utils/zonesSync';
import { cacheZones, getCachedZones } from '@utils/zoneCache';
import { refreshGeofences } from '@tasks/backgroundLocationTask';

export interface ZonesContextValue {
  zones: DisasterZone[];
  isLoading: boolean;
  /** False once the listener errors — the UI is then showing cached data. */
  isLive: boolean;
  error: Error | null;
}

const ZonesContext = createContext<ZonesContextValue>({
  zones: [],
  isLoading: true,
  isLive: false,
  error: null,
});

export function ZonesProvider({ children }: { children: React.ReactNode }) {
  const [zones, setZones] = useState<DisasterZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // Paint from cache first so the UI is populated before the network settles,
    // and stays populated when there is no network at all.
    (async () => {
      const cached = await getCachedZones();
      if (cancelled || hydratedRef.current) return;
      setZones(cached);
      setIsLoading(false);
    })();

    const unsubscribe = startZonesSync(
      async (alerts) => {
        if (cancelled) return;
        hydratedRef.current = true;

        const nextZones = alerts.map(alertToZone);
        setZones(nextZones);
        setIsLive(true);
        setError(null);
        setIsLoading(false);

        console.log(`[Zones] ${nextZones.length} active from Firestore`);

        // Persist for the background task, which cannot see this listener.
        await cacheZones(nextZones);
        await refreshGeofences();
      },
      (syncError) => {
        if (cancelled) return;
        console.error('[Zones] Listener error, continuing on cached data:', syncError.message);
        setError(syncError);
        setIsLive(false);
        setIsLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ zones, isLoading, isLive, error }),
    [zones, isLoading, isLive, error]
  );

  return <ZonesContext.Provider value={value}>{children}</ZonesContext.Provider>;
}

export function useZones(): ZonesContextValue {
  return useContext(ZonesContext);
}

export default ZonesProvider;
