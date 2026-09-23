import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@config/firebase';

export interface Alert {
  id: string;
  zoneId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  latitude: number;
  longitude: number;
  radiusKm: number;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

// Setup real-time listener for active disaster alerts
export function startZonesSync(
  onUpdate: (alerts: Alert[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!db) {
    onUpdate([]);
    return () => {};
  }
  try {
    const q = query(
      collection(db, 'alerts'),
      where('isActive', '==', true),
      where('expiresAt', '>', new Date())
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const alerts: Alert[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          alerts.push({
            id: doc.id,
            zoneId: data.zoneId,
            title: data.title,
            description: data.description,
            severity: data.severity,
            latitude: data.latitude,
            longitude: data.longitude,
            radiusKm: data.radiusKm,
            createdAt: data.createdAt?.toDate() || new Date(),
            expiresAt: data.expiresAt?.toDate() || new Date(),
            isActive: data.isActive,
          });
        });
        onUpdate(alerts);
      },
      (error) => {
        if (onError) {
          onError(error as Error);
        } else {
          console.error('Error syncing zones:', error);
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up zones sync:', error);
    if (onError) {
      onError(error as Error);
    }
    return () => {}; // No-op unsubscribe
  }
}

// Stop zones sync (calls the unsubscribe function)
export function stopZonesSync(unsubscribe: Unsubscribe): void {
  if (unsubscribe) {
    unsubscribe();
  }
}

export default {
  startZonesSync,
  stopZonesSync,
};
