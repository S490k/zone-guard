import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import {
  BACKGROUND_LOCATION_TASK_NAME,
  GEOFENCING_TASK_NAME,
} from '../../app/tasks/backgroundLocationTask';
import { cacheZones } from '../../app/utils/zoneCache';
import { DisasterZone } from '../../app/constants/zones';
import { geodesicPoint } from '../helpers/geodesy';

// The tasks register themselves with TaskManager when the module loads. The
// setup file mocks defineTask, so the registered callbacks can be driven
// directly — the same entry points the OS invokes on a device.
const registered = new Map<string, (body: unknown) => Promise<void>>(
  (TaskManager.defineTask as jest.Mock).mock.calls.map(([name, fn]) => [name, fn])
);
const locationTask = registered.get(BACKGROUND_LOCATION_TASK_NAME)!;
const geofenceTask = registered.get(GEOFENCING_TASK_NAME)!;

// Mirrors the 500 m zone used in the Android field test (§5.4.2 of the report).
const FIELD_ZONE: DisasterZone = {
  id: 'field-test-zone',
  name: 'Field Test Zone',
  latitude: 32.2596,
  longitude: 72.8991,
  radiusKm: 0.5,
  severity: 'high',
  description: 'Temporary zone for walking in and out during device testing.',
  createdAt: new Date(),
};

const ENTER = 1; // Location.GeofencingEventType.Enter in the setup mock
const EXIT = 2;
const MINUTE = 60_000;

const scheduleMock = Notifications.scheduleNotificationAsync as jest.Mock;
const dismissMock = Notifications.dismissNotificationAsync as jest.Mock;

let now = Date.UTC(2026, 8, 25, 12, 14);
const at = (minutesLater: number) => {
  now = Date.UTC(2026, 8, 25, 12, 14) + minutesLater * MINUTE;
};

/** A position `km` north of the zone centre, placed on the WGS-84 ellipsoid. */
async function fixAt(km: number) {
  const p = geodesicPoint(FIELD_ZONE.latitude, FIELD_ZONE.longitude, 0, km * 1000);
  await locationTask({
    data: { locations: [{ coords: { latitude: p.lat, longitude: p.lon, accuracy: 10 } }] },
    error: null,
  });
}

const geofence = (eventType: number) =>
  geofenceTask({ data: { eventType, region: { identifier: FIELD_ZONE.id } }, error: null });

const alertsDelivered = () =>
  scheduleMock.mock.calls.filter(([request]) => request?.content?.data?.zoneId === FIELD_ZONE.id)
    .length;

beforeEach(async () => {
  await AsyncStorage.clear();
  await cacheZones([FIELD_ZONE]);
  scheduleMock.mockReset();
  scheduleMock.mockResolvedValue('notification-id');
  dismissMock.mockClear();
  at(0);
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('location-updates task', () => {
  // The defect observed in the field: the task alerted on *presence*, so a user
  // who stayed inside and kept moving was re-alerted every time the 60-second
  // cooldown lapsed. Fixes are spaced minutes apart here so the cooldown cannot
  // mask the behaviour.
  it('does not re-alert while the user stays inside a zone', async () => {
    await fixAt(0.1);
    at(3);
    await fixAt(0.2);
    at(6);
    await fixAt(0.4);

    expect(alertsDelivered()).toBe(1);
  });

  it('alerts again after the user leaves and re-enters', async () => {
    await fixAt(0.2);
    at(5);
    await fixAt(0.8); // well beyond the boundary and its exit margin
    at(10);
    await fixAt(0.2);

    expect(alertsDelivered()).toBe(2);
  });

  it('does not treat position jitter at the boundary as a fresh entry', async () => {
    await fixAt(0.45);
    at(3);
    await fixAt(0.55); // outside the radius, inside the exit margin
    at(6);
    await fixAt(0.45);

    expect(alertsDelivered()).toBe(1);
  });

  it('dismisses the alert once the user has left the zone', async () => {
    await fixAt(0.2);
    at(5);
    await fixAt(0.8);

    expect(dismissMock).toHaveBeenCalledWith(`zoneguard:zone:${FIELD_ZONE.id}`);
  });

  it('retries on the next fix when an alert fails to deliver', async () => {
    scheduleMock.mockRejectedValueOnce(new Error('notification service unavailable'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await fixAt(0.2);
    at(3);
    await fixAt(0.2);

    // Two attempts, one of them delivered: the failure was not recorded as an
    // alerted stay, so the entry was not silently lost.
    expect(scheduleMock).toHaveBeenCalledTimes(2);
  });
});

describe('geofencing task alongside location updates', () => {
  it('records a geofence entry, so the next location fix does not repeat the alert', async () => {
    await geofence(ENTER);
    at(5);
    await fixAt(0.2);

    expect(alertsDelivered()).toBe(1);
  });

  it('treats a geofence exit as the end of the stay, so re-entry alerts again', async () => {
    await geofence(ENTER);
    at(2);
    await geofence(EXIT);
    at(5);
    await fixAt(0.2);

    expect(alertsDelivered()).toBe(2);
  });

  // A geofence Enter is an OS-observed crossing, so it must alert even when the
  // stored state says the user is already inside — that state could be stale if
  // an exit event was missed while the process was dead. Suppressing here would
  // fail in the unsafe direction.
  it('always alerts on a geofence entry, even over a stale recorded stay', async () => {
    await fixAt(0.2);
    at(10);
    await geofence(ENTER);

    expect(alertsDelivered()).toBe(2);
  });
});
