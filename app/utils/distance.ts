import { DisasterZone } from '@constants/zones';

// Haversine formula for great-circle distance between two points
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

// Interface for zone detection result
export interface ZoneProximity {
  zoneId: string;
  distance: number;
  isInZone: boolean;
  isNearZone: boolean;
  estimatedTimeToZone?: number; // minutes, assuming 50 km/h
}

// Detect if user is in or near active zones
export function detectActiveZones(
  userLat: number,
  userLon: number,
  zones: DisasterZone[],
  alertThresholdKm: number = 5
): ZoneProximity[] {
  return zones
    .map((zone) => {
      const distance = haversineDistance(userLat, userLon, zone.latitude, zone.longitude);
      const isInZone = distance <= zone.radiusKm;
      const isNearZone = distance <= zone.radiusKm + alertThresholdKm && !isInZone;

      return {
        zoneId: zone.id,
        distance: Math.round(distance * 100) / 100, // Round to 2 decimals
        isInZone,
        isNearZone,
        estimatedTimeToZone: isNearZone
          ? Math.ceil((distance - zone.radiusKm) / 0.833) // 50 km/h = 0.833 km/min
          : undefined,
      };
    })
    .sort((a, b) => a.distance - b.distance); // Sort by distance
}

// Check if user is in critical zone
export function isInCriticalZone(proximities: ZoneProximity[], zones: DisasterZone[]): boolean {
  return proximities.some((p) => {
    const zone = zones.find((z) => z.id === p.zoneId);
    return p.isInZone && zone?.severity === 'critical';
  });
}

export default { haversineDistance, detectActiveZones, isInCriticalZone };
