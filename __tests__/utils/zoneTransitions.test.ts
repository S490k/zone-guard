import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  reconcileMembership,
  readMembership,
  writeMembership,
  markEntered,
  markExited,
  EXIT_HYSTERESIS_KM,
} from '../../app/utils/zoneTransitions';
import { BOUNDARY_TOLERANCE, ZoneProximity } from '../../app/utils/distance';
import { DisasterZone } from '../../app/constants/zones';

const zone = (id: string, radiusKm: number): DisasterZone => ({
  id,
  name: id,
  latitude: 0,
  longitude: 0,
  radiusKm,
  severity: 'high',
  description: '',
  createdAt: new Date(),
});

const at = (zoneId: string, distance: number, isInZone: boolean): ZoneProximity => ({
  zoneId,
  distance,
  isInZone,
  isNearZone: false,
});

const ZONES = [zone('a', 10), zone('b', 20)];
const exitDistance = (radiusKm: number) => radiusKm * (1 + BOUNDARY_TOLERANCE) + EXIT_HYSTERESIS_KM;

describe('reconcileMembership', () => {
  it('reports a zone as entered only on the fix that first finds the user inside', () => {
    const first = reconcileMembership([], [at('a', 5, true)], ZONES);
    const second = reconcileMembership(first.current, [at('a', 4, true)], ZONES);

    expect(first.entered).toEqual(['a']);
    expect(second.entered).toEqual([]);
    expect(second.current).toEqual(['a']);
  });

  it('keeps a stay open within the exit margin and closes it beyond', () => {
    const justInsideMargin = reconcileMembership(['a'], [at('a', exitDistance(10), false)], ZONES);
    const beyondMargin = reconcileMembership(['a'], [at('a', exitDistance(10) + 0.01, false)], ZONES);

    expect(justInsideMargin.current).toEqual(['a']);
    expect(justInsideMargin.exited).toEqual([]);
    expect(beyondMargin.current).toEqual([]);
    expect(beyondMargin.exited).toEqual(['a']);
  });

  it('does not let the exit margin delay an entry', () => {
    // Just outside the radius and never inside: the margin applies only to a
    // stay already in progress, so this is neither an entry nor a stay.
    const change = reconcileMembership([], [at('a', 10.2, false)], ZONES);

    expect(change).toEqual({ entered: [], exited: [], current: [] });
  });

  it('closes the stay for a zone that has been withdrawn or has expired', () => {
    const change = reconcileMembership(['a', 'gone'], [at('a', 1, true)], ZONES);

    expect(change.exited).toEqual(['gone']);
    expect(change.current).toEqual(['a']);
  });

  it('handles several zones independently', () => {
    const change = reconcileMembership(
      ['a'],
      [at('a', 50, false), at('b', 3, true)],
      ZONES
    );

    expect(change).toEqual({ entered: ['b'], exited: ['a'], current: ['b'] });
  });
});

describe('membership persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('round-trips the recorded set without duplicates', async () => {
    await writeMembership(['a', 'a', 'b']);
    expect(await readMembership()).toEqual(['a', 'b']);
  });

  it('treats an unreadable record as empty rather than throwing', async () => {
    await AsyncStorage.setItem('zoneguard:insideZones', '{not json');
    expect(await readMembership()).toEqual([]);

    await AsyncStorage.setItem('zoneguard:insideZones', JSON.stringify({ a: true }));
    expect(await readMembership()).toEqual([]);
  });

  it('marks geofence entries and exits idempotently', async () => {
    await markEntered('a');
    await markEntered('a');
    expect(await readMembership()).toEqual(['a']);

    await markExited('a');
    await markExited('a');
    expect(await readMembership()).toEqual([]);
  });
});
