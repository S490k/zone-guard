import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { presentZoneAlert, shouldSuppressAlert, clearAlertHistory } from '../../app/utils/localAlerts';
import { DisasterZone } from '../../app/constants/zones';

const zone: DisasterZone = {
  id: 'zone-taunsa-barrage',
  name: 'Taunsa Barrage Flood Risk',
  latitude: 30.6987,
  longitude: 70.8503,
  radiusKm: 15,
  severity: 'high',
  description: 'Flood risk zone',
  createdAt: new Date(),
};

const scheduleMock = Notifications.scheduleNotificationAsync as jest.Mock;

beforeEach(async () => {
  await AsyncStorage.clear();
  scheduleMock.mockClear();
  scheduleMock.mockResolvedValue('notification-id');
});

describe('presentZoneAlert', () => {
  it('delivers a notification carrying the zone name and description', async () => {
    const delivered = await presentZoneAlert(zone);

    expect(delivered).toBe(true);
    expect(scheduleMock).toHaveBeenCalledTimes(1);

    const { content } = scheduleMock.mock.calls[0][0];
    expect(content.title).toBe('Taunsa Barrage Flood Risk');
    expect(content.body).toContain('Flood risk zone');
  });

  it('delivers immediately rather than on a schedule', async () => {
    await presentZoneAlert(zone);
    expect(scheduleMock.mock.calls[0][0].trigger).toBeNull();
  });

  it('includes the distance when one is supplied', async () => {
    await presentZoneAlert(zone, { distanceKm: 3.42 });
    expect(scheduleMock.mock.calls[0][0].content.body).toContain('3.4km');
  });

  it('carries zone id and severity for the tap handler', async () => {
    await presentZoneAlert(zone);
    const { data } = scheduleMock.mock.calls[0][0].content;

    expect(data.zoneId).toBe('zone-taunsa-barrage');
    expect(data.severity).toBe('high');
    expect(data.type).toBe('zone_alert');
  });

  // A simulated alert must never be mistakable for a real emergency.
  it('prefixes a test alert and flags it in the payload', async () => {
    await presentZoneAlert(zone, { isTest: true });
    const { content } = scheduleMock.mock.calls[0][0];

    expect(content.title).toBe('TEST ALERT - Taunsa Barrage Flood Risk');
    expect(content.data.isTest).toBe('true');
  });

  it('does not prefix a real alert', async () => {
    await presentZoneAlert(zone);
    expect(scheduleMock.mock.calls[0][0].content.title).not.toContain('TEST');
    expect(scheduleMock.mock.calls[0][0].content.data.isTest).toBe('false');
  });

  it('returns false when the notification cannot be delivered', async () => {
    scheduleMock.mockRejectedValueOnce(new Error('permission denied'));
    expect(await presentZoneAlert(zone)).toBe(false);
  });
});

describe('cooldown', () => {
  it('suppresses a second alert for the same zone inside the window', async () => {
    expect(await presentZoneAlert(zone)).toBe(true);
    expect(await presentZoneAlert(zone)).toBe(false);
    expect(scheduleMock).toHaveBeenCalledTimes(1);
  });

  it('does not suppress a different zone', async () => {
    await presentZoneAlert(zone);
    await presentZoneAlert({ ...zone, id: 'zone-jacobabad', name: 'Jacobabad' });

    expect(scheduleMock).toHaveBeenCalledTimes(2);
  });

  it('allows the alert again once the window has elapsed', async () => {
    await presentZoneAlert(zone);

    const past = Date.now() - 61_000;
    await AsyncStorage.setItem('zoneguard:lastAlertAt', JSON.stringify({ [zone.id]: past }));

    expect(await shouldSuppressAlert(zone.id)).toBe(false);
    expect(await presentZoneAlert(zone)).toBe(true);
  });

  it('reports no suppression for a zone never alerted', async () => {
    expect(await shouldSuppressAlert('never-seen')).toBe(false);
  });

  // The manual test button must fire every press, unlike a real zone entry.
  it('bypassDedup delivers repeatedly and leaves the cooldown untouched', async () => {
    await presentZoneAlert(zone, { isTest: true, bypassDedup: true });
    await presentZoneAlert(zone, { isTest: true, bypassDedup: true });

    expect(scheduleMock).toHaveBeenCalledTimes(2);
    expect(await shouldSuppressAlert(zone.id)).toBe(false);
  });

  it('clearing history lifts an active cooldown', async () => {
    await presentZoneAlert(zone);
    expect(await shouldSuppressAlert(zone.id)).toBe(true);

    await clearAlertHistory();
    expect(await shouldSuppressAlert(zone.id)).toBe(false);
  });

  it('treats corrupt cooldown data as no cooldown', async () => {
    await AsyncStorage.setItem('zoneguard:lastAlertAt', 'not json');
    expect(await shouldSuppressAlert(zone.id)).toBe(false);
  });
});
