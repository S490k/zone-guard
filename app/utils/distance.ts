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

// Haversine models the Earth as a sphere of radius 6371 km. Against WGS-84 the
// residual is systematic rather than random: it scales with distance and its sign
// depends on bearing, because the ellipsoid's radius of curvature is smaller along
// a meridian than along a parallel. Measured against Vincenty over 96 boundary
// cases at the three Pakistan zones, the worst case was 105 m on a 30 km radius —
// about 0.35% of the distance, reported high on north–south approaches and low on
// east–west ones.
//
// That matters only at the boundary itself, where it decides the comparison. An
// exact-radius north–south approach was classified as outside the zone, so the
// alert did not fire. For a hazard warning the model error must not fall on that
// side, so the containment test carries a tolerance sized above the measured
// bound. The reported distance is left untouched; only the in/out decision is
// widened.
//
// Native OS geofencing — the primary alerting mechanism — uses the platform's own
// ellipsoidal region math and is unaffected. This tolerance governs the in-app
// proximity detector and the dashboard's zone classification.
export const BOUNDARY_TOLERANCE = 0.005; // 0.5% of the zone radius

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
      const containmentRadius = zone.radiusKm * (1 + BOUNDARY_TOLERANCE);
      const isInZone = distance <= containmentRadius;
      const isNearZone = distance <= containmentRadius + alertThresholdKm && !isInZone;

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
