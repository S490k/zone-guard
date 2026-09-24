import * as SMS from 'expo-sms';
import {
  composeEmergencyMessage,
  mapLink,
  sendEmergencySms,
  MessageLabels,
} from '../../app/utils/emergencySms';

const labels: MessageLabels = {
  intro: 'ZoneGuard emergency message.',
  at: 'My location:',
  inZone: 'I am inside:',
  noLocation: 'My location is not available yet.',
  sentAt: 'Sent',
};

const TIMESTAMP = new Date(2026, 8, 24, 21, 30, 0, 0);

const isAvailable = SMS.isAvailableAsync as jest.Mock;
const sendSms = SMS.sendSMSAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  isAvailable.mockResolvedValue(true);
  sendSms.mockResolvedValue({ result: 'sent' });
});

describe('composeEmergencyMessage', () => {
  it('includes coordinates and a map link', () => {
    const message = composeEmergencyMessage(
      { latitude: 30.6987, longitude: 70.8503, zoneNames: [], timestamp: TIMESTAMP },
      labels
    );

    expect(message).toContain('30.69870, 70.85030');
    expect(message).toContain('https://www.google.com/maps?q=30.69870,70.85030');
  });

  it('names every zone the sender is inside', () => {
    const message = composeEmergencyMessage(
      {
        latitude: 30.6987,
        longitude: 70.8503,
        zoneNames: ['Taunsa Barrage Flood Warning', 'Field Test Zone'],
        timestamp: TIMESTAMP,
      },
      labels
    );

    expect(message).toContain('Taunsa Barrage Flood Warning');
    expect(message).toContain('Field Test Zone');
  });

  // A message saying "I need help" is still worth sending without a fix.
  it('says so plainly when there is no location', () => {
    const message = composeEmergencyMessage(
      { zoneNames: [], timestamp: TIMESTAMP },
      labels
    );

    expect(message).toContain('not available');
    expect(message).not.toContain('google.com/maps');
  });

  it('omits the zone line when inside none', () => {
    const message = composeEmergencyMessage(
      { latitude: 30.6987, longitude: 70.8503, zoneNames: [], timestamp: TIMESTAMP },
      labels
    );
    expect(message).not.toContain('I am inside:');
  });

  it('always stamps the time', () => {
    const message = composeEmergencyMessage({ zoneNames: [], timestamp: TIMESTAMP }, labels);
    expect(message).toContain('Sent');
  });

  it('uses the supplied labels so the message translates', () => {
    const urdu: MessageLabels = {
      intro: 'زون گارڈ ہنگامی پیغام۔',
      at: 'میرا مقام:',
      inZone: 'میں اس علاقے میں ہوں:',
      noLocation: 'میرا مقام ابھی دستیاب نہیں۔',
      sentAt: 'بھیجا گیا',
    };
    const message = composeEmergencyMessage({ zoneNames: [], timestamp: TIMESTAMP }, urdu);
    expect(message).toContain('زون گارڈ');
  });
});

describe('mapLink', () => {
  it('builds a link any recipient can open', () => {
    expect(mapLink(30.6987, 70.8503)).toBe('https://www.google.com/maps?q=30.69870,70.85030');
  });

  it('keeps southern and western signs', () => {
    expect(mapLink(-33.8688, -151.2093)).toContain('-33.86880,-151.20930');
  });
});

describe('sendEmergencySms', () => {
  // The app opens the composer; the user picks recipients and presses send.
  it('passes no recipients, leaving the choice to the user', async () => {
    await sendEmergencySms('hello');
    expect(sendSms).toHaveBeenCalledWith([], 'hello');
  });

  it('reports a sent message', async () => {
    expect(await sendEmergencySms('hello')).toBe('sent');
  });

  it('reports a cancelled composer', async () => {
    sendSms.mockResolvedValue({ result: 'cancelled' });
    expect(await sendEmergencySms('hello')).toBe('cancelled');
  });

  it('reports a device that cannot text', async () => {
    isAvailable.mockResolvedValue(false);
    expect(await sendEmergencySms('hello')).toBe('unavailable');
    expect(sendSms).not.toHaveBeenCalled();
  });

  it('reports failure rather than throwing', async () => {
    sendSms.mockRejectedValue(new Error('no composer'));
    expect(await sendEmergencySms('hello')).toBe('failed');
  });
});
