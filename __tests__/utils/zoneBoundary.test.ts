import { haversineDistance, detectActiveZones, BOUNDARY_TOLERANCE } from '../../app/utils/distance';
import { DISASTER_ZONES } from '../../app/constants/zones';
import { geodesicPoint, geodesicDistance, BEARINGS } from '../helpers/geodesy';

// The existing distance tests probe 500 m either side of a zone boundary, which is
// far enough out that the spherical model error cannot change the verdict. These
// tests approach the boundary *exactly*, from every bearing, which is where the
// error decides the comparison — and where an untested implementation classified a
// north–south approach as outside the zone and raised no alert.

const FRACTIONS = [0.9, 1.0, 1.05, 1.1];

describe('Haversine model error against WGS-84', () => {
  it('stays within 0.4% of the geodesic distance across bearings and zones', () => {
    let worstRelative = 0;

    for (const zone of DISASTER_ZONES) {
      for (const bearing of BEARINGS) {
        const target = zone.radiusKm * 1000;
        const point = geodesicPoint(zone.latitude, zone.longitude, bearing, target);
        const reference = geodesicDistance(zone.latitude, zone.longitude, point.lat, point.lon);
        const measured = haversineDistance(point.lat, point.lon, zone.latitude, zone.longitude);
        worstRelative = Math.max(worstRelative, Math.abs(measured * 1000 - reference) / reference);
      }
    }

    // Measured worst case is ~0.35%. The tolerance applied to zone containment must
    // exceed this bound, or an exact-boundary approach can fall the wrong side of it.
    expect(worstRelative).toBeLessThan(0.004);
    expect(BOUNDARY_TOLERANCE).toBeGreaterThan(worstRelative);
  });

  it('reports high on north–south approaches and low on east–west ones', () => {
    const zone = DISASTER_ZONES[1]; // Jacobabad, 30 km — the largest radius, worst error
    const at = (bearing: number) => {
      const p = geodesicPoint(zone.latitude, zone.longitude, bearing, zone.radiusKm * 1000);
      return haversineDistance(p.lat, p.lon, zone.latitude, zone.longitude) - zone.radiusKm;
    };

    // The sign is a property of the ellipsoid, not of the input data: the meridional
    // radius of curvature is smaller than 6371 km at these latitudes, the radius of
    // a parallel larger.
    expect(at(0)).toBeGreaterThan(0);
    expect(at(180)).toBeGreaterThan(0);
    expect(at(90)).toBeLessThan(0);
    expect(at(270)).toBeLessThan(0);
  });
});

describe('Zone containment at the boundary', () => {
  it.each(FRACTIONS)('classifies a %s-radius approach consistently from every bearing', (fraction) => {
    const expected = fraction <= 1.0;

    for (const zone of DISASTER_ZONES) {
      for (const bearing of BEARINGS) {
        const point = geodesicPoint(
          zone.latitude,
          zone.longitude,
          bearing,
          zone.radiusKm * fraction * 1000
        );
        const proximity = detectActiveZones(point.lat, point.lon, DISASTER_ZONES).find(
          (p) => p.zoneId === zone.id
        );

        expect(proximity).toBeDefined();
        // A bearing-dependent verdict at the boundary is the defect these tests exist
        // to catch, so the assertion names the bearing that failed.
        expect({ zone: zone.id, bearing, inZone: proximity!.isInZone }).toEqual({
          zone: zone.id,
          bearing,
          inZone: expected,
        });
      }
    }
  });

  it('does not let the tolerance swallow a point meaningfully outside the zone', () => {
    const zone = DISASTER_ZONES[0]; // Taunsa, 15 km — tolerance is 75 m here
    const justOutside = geodesicPoint(zone.latitude, zone.longitude, 0, 15_200); // 200 m out
    const proximity = detectActiveZones(justOutside.lat, justOutside.lon, DISASTER_ZONES).find(
      (p) => p.zoneId === zone.id
    );

    expect(proximity?.isInZone).toBe(false);
    expect(proximity?.isNearZone).toBe(true);
  });

  it('reports the true distance rather than the tolerated one', () => {
    const zone = DISASTER_ZONES[2]; // Muzaffarabad, 20 km
    const onBoundary = geodesicPoint(zone.latitude, zone.longitude, 0, zone.radiusKm * 1000);
    const proximity = detectActiveZones(onBoundary.lat, onBoundary.lon, DISASTER_ZONES).find(
      (p) => p.zoneId === zone.id
    );

    // The tolerance widens the in/out decision only. A user standing on the boundary
    // is told the measured distance — the radius plus the model error, ~50 m here —
    // and not the widened containment radius of 20.1 km.
    const containmentRadius = zone.radiusKm * (1 + BOUNDARY_TOLERANCE);
    expect(proximity?.isInZone).toBe(true);
    expect(proximity!.distance).toBeLessThan(containmentRadius);
    expect(Math.abs(proximity!.distance - zone.radiusKm)).toBeLessThan(0.1);
  });
});
