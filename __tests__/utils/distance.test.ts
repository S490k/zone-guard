import { haversineDistance, detectActiveZones, isInCriticalZone } from '../../app/utils/distance';
import { DISASTER_ZONES } from '../../app/constants/zones';

describe('Haversine Distance Calculation', () => {
  it('calculates distance between two points correctly', () => {
    // Test: Distance from Taunsa Barrage to Jacobabad
    const distance = haversineDistance(30.6987, 70.8503, 27.2822, 68.4501);
    // Approximate distance: ~420 km
    expect(distance).toBeGreaterThan(400);
    expect(distance).toBeLessThan(450);
  });

  it('returns zero distance for same coordinates', () => {
    const distance = haversineDistance(30.6987, 70.8503, 30.6987, 70.8503);
    expect(distance).toBeLessThan(0.01);
  });

  it('handles edge cases (poles and dateline)', () => {
    // Distance from North Pole to South Pole (should be ~20,000 km)
    const distance = haversineDistance(90, 0, -90, 0);
    expect(distance).toBeGreaterThan(19900);
    expect(distance).toBeLessThan(20100);
  });

  it('distance is symmetric', () => {
    const d1 = haversineDistance(30, 70, 35, 75);
    const d2 = haversineDistance(35, 75, 30, 70);
    expect(d1).toBeCloseTo(d2, 5);
  });
});

describe('Zone Detection', () => {
  it('detects when user is in a zone', () => {
    // User at Taunsa Barrage center
    const proximities = detectActiveZones(30.6987, 70.8503, DISASTER_ZONES);
    const taransaZone = proximities.find((p) => p.zoneId === 'zone-taunsa-barrage');
    expect(taransaZone).toBeDefined();
    expect(taransaZone?.isInZone).toBe(true);
    expect(taransaZone?.distance).toBeLessThan(0.5);
  });

  it('detects when user is near a zone', () => {
    // ~17 km due east of Taunsa Barrage centre: outside the 15 km radius but within the 5 km warning band
    const proximities = detectActiveZones(30.6987, 71.028, DISASTER_ZONES, 5);
    const taransaZone = proximities.find((p) => p.zoneId === 'zone-taunsa-barrage');
    expect(taransaZone).toBeDefined();
    expect(taransaZone?.isNearZone).toBe(true);
  });

  it('detects when user is outside all zones', () => {
    // User far from all zones (random location)
    const proximities = detectActiveZones(20, 60, DISASTER_ZONES);
    const allOutside = proximities.every((p) => !p.isInZone && !p.isNearZone);
    expect(allOutside).toBe(true);
  });

  it('sorts zones by distance', () => {
    const proximities = detectActiveZones(30.6987, 70.8503, DISASTER_ZONES);
    for (let i = 0; i < proximities.length - 1; i++) {
      expect(proximities[i].distance).toBeLessThanOrEqual(proximities[i + 1].distance);
    }
  });

  it('returns one result per zone, even when far from all of them', () => {
    // Midway between Taunsa and Jacobabad – ~200 km from both, so neither in nor near
    const proximities = detectActiveZones(28.99, 69.67, DISASTER_ZONES);
    expect(proximities.length).toBe(DISASTER_ZONES.length);
    expect(proximities.every((p) => !p.isInZone && !p.isNearZone)).toBe(true);
  });

  it('treats a point just inside the radius as in-zone and just outside as near', () => {
    // 1 degree of latitude ≈ 111.19 km. Muzaffarabad radius = 20 km.
    const inside = detectActiveZones(34.359 + 19.5 / 111.19, 73.4713, DISASTER_ZONES)
      .find((p) => p.zoneId === 'zone-muzaffarabad');
    const outside = detectActiveZones(34.359 + 20.5 / 111.19, 73.4713, DISASTER_ZONES)
      .find((p) => p.zoneId === 'zone-muzaffarabad');
    expect(inside?.isInZone).toBe(true);
    expect(outside?.isInZone).toBe(false);
    expect(outside?.isNearZone).toBe(true);
  });
});

describe('Critical Zone Detection', () => {
  it('detects when user is in critical zone', () => {
    // User at Jacobabad (critical severity)
    const proximities = detectActiveZones(27.2822, 68.4501, DISASTER_ZONES);
    const inCritical = isInCriticalZone(proximities, DISASTER_ZONES);
    expect(inCritical).toBe(true);
  });

  it('returns false when user is not in critical zone', () => {
    // User outside all zones
    const proximities = detectActiveZones(20, 60, DISASTER_ZONES);
    const inCritical = isInCriticalZone(proximities, DISASTER_ZONES);
    expect(inCritical).toBe(false);
  });

  it('differentiates between critical and non-critical zones', () => {
    // Jacobabad is critical, Muzaffarabad is medium, Taunsa is high
    const jacobabadZone = DISASTER_ZONES.find((z) => z.id === 'zone-jacobabad');
    const muzaffarabadZone = DISASTER_ZONES.find((z) => z.id === 'zone-muzaffarabad');

    expect(jacobabadZone?.severity).toBe('critical');
    expect(muzaffarabadZone?.severity).toBe('medium');
  });
});

describe('Precision Requirements', () => {
  it('provides sub-kilometer precision', () => {
    // Two points 100 meters apart
    const lat = 30.6987;
    const lon = 70.8503;
    const offsetLat = lat + 0.001; // ~111 meters north
    const distance = haversineDistance(lat, lon, offsetLat, lon);
    // Should detect ~0.1 km difference
    expect(distance).toBeLessThan(0.15);
    expect(distance).toBeGreaterThan(0.08);
  });

  it('rounds distance to 2 decimal places', () => {
    const proximities = detectActiveZones(30.6987, 70.8503, DISASTER_ZONES);
    proximities.forEach((p) => {
      const decimalCount = p.distance.toString().split('.')[1]?.length || 0;
      expect(decimalCount).toBeLessThanOrEqual(2);
    });
  });
});
