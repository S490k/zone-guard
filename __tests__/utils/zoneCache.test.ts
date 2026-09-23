import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheZones, readCachedZones, getCachedZones, clearCachedZones } from '../../app/utils/zoneCache';
import { DISASTER_ZONES, DisasterZone } from '../../app/constants/zones';

const zone = (overrides: Partial<DisasterZone> = {}): DisasterZone => ({
  id: 'zone-test',
  name: 'Test Zone',
  latitude: 30.6987,
  longitude: 70.8503,
  radiusKm: 15,
  severity: 'high',
  description: 'A test zone',
  createdAt: new Date('2026-09-01T00:00:00Z'),
  ...overrides,
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('zoneCache', () => {
  it('round-trips zones through storage', async () => {
    await cacheZones([zone()]);
    const { zones, isFallback } = await readCachedZones();

    expect(isFallback).toBe(false);
    expect(zones).toHaveLength(1);
    expect(zones[0].name).toBe('Test Zone');
  });

  it('restores dates as Date instances, not strings', async () => {
    const expiresAt = new Date(Date.now() + 86_400_000);
    await cacheZones([zone({ expiresAt })]);

    const { zones } = await readCachedZones();
    expect(zones[0].createdAt).toBeInstanceOf(Date);
    expect(zones[0].expiresAt).toBeInstanceOf(Date);
    expect(zones[0].expiresAt?.getTime()).toBe(expiresAt.getTime());
  });

  it('falls back to bundled zones when nothing has ever synced', async () => {
    const { zones, isFallback } = await readCachedZones();

    expect(isFallback).toBe(true);
    expect(zones).toEqual(DISASTER_ZONES);
  });

  // The defect that had the geofence layer monitoring three zones while the
  // UI reported none: an authoritative empty result must not fall back.
  it('honours an empty result from a completed sync', async () => {
    await cacheZones([]);
    const { zones, isFallback } = await readCachedZones();

    expect(isFallback).toBe(false);
    expect(zones).toEqual([]);
  });

  it('treats a payload without syncedAt as no information', async () => {
    // Shape written before syncedAt existed.
    await AsyncStorage.setItem('zoneguard:cachedZones', JSON.stringify([{ id: 'legacy' }]));

    const { zones, isFallback } = await readCachedZones();
    expect(isFallback).toBe(true);
    expect(zones).toEqual(DISASTER_ZONES);
  });

  it('falls back when stored JSON is corrupt', async () => {
    await AsyncStorage.setItem('zoneguard:cachedZones', 'not json at all');

    const { zones, isFallback } = await readCachedZones();
    expect(isFallback).toBe(true);
    expect(zones).toEqual(DISASTER_ZONES);
  });

  it('drops zones whose expiry has passed', async () => {
    await cacheZones([
      zone({ id: 'expired', expiresAt: new Date(Date.now() - 1000) }),
      zone({ id: 'current', expiresAt: new Date(Date.now() + 86_400_000) }),
    ]);

    const { zones } = await readCachedZones();
    expect(zones.map((z) => z.id)).toEqual(['current']);
  });

  it('keeps zones with no expiry', async () => {
    await cacheZones([zone({ id: 'permanent', expiresAt: undefined })]);

    const { zones } = await readCachedZones();
    expect(zones.map((z) => z.id)).toEqual(['permanent']);
  });

  it('getCachedZones returns zones without provenance', async () => {
    await cacheZones([zone()]);
    expect(await getCachedZones()).toHaveLength(1);
  });

  it('clearing returns the cache to the fallback state', async () => {
    await cacheZones([zone()]);
    await clearCachedZones();

    const { isFallback } = await readCachedZones();
    expect(isFallback).toBe(true);
  });
});
