import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { setDoc } from 'firebase/firestore';
import {
  requestNotificationPermissions,
  getExpoPushToken,
  storePushTokenInFirestore,
  setupPushNotifications,
  setupNotificationListeners,
} from '../../app/utils/fcmSetup';

jest.mock('../../app/config/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-uid' } },
}));

const getPermissions = Notifications.getPermissionsAsync as jest.Mock;
const requestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const getToken = Notifications.getExpoPushTokenAsync as jest.Mock;
const setDocMock = setDoc as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  getPermissions.mockResolvedValue({ status: 'undetermined' });
  requestPermissions.mockResolvedValue({ status: 'granted' });
  getToken.mockResolvedValue({ data: 'ExponentPushToken[abc123]' });
  setDocMock.mockResolvedValue(undefined);
  (Device as { isDevice: boolean }).isDevice = true;
});

describe('requestNotificationPermissions', () => {
  it('skips the prompt when already granted', async () => {
    getPermissions.mockResolvedValue({ status: 'granted' });

    expect(await requestNotificationPermissions()).toBe(true);
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it('prompts when undetermined', async () => {
    expect(await requestNotificationPermissions()).toBe(true);
    expect(requestPermissions).toHaveBeenCalledTimes(1);
  });

  it('reports refusal', async () => {
    requestPermissions.mockResolvedValue({ status: 'denied' });
    expect(await requestNotificationPermissions()).toBe(false);
  });

  it('returns false rather than throwing when the API errors', async () => {
    getPermissions.mockRejectedValue(new Error('unavailable'));
    expect(await requestNotificationPermissions()).toBe(false);
  });
});

describe('getExpoPushToken', () => {
  it('returns the token on a physical device', async () => {
    expect(await getExpoPushToken()).toBe('ExponentPushToken[abc123]');
  });

  // Simulators have no APNs registration, so this is expected, not an error.
  it('returns null on a simulator without calling the API', async () => {
    (Device as { isDevice: boolean }).isDevice = false;

    expect(await getExpoPushToken()).toBeNull();
    expect(getToken).not.toHaveBeenCalled();
  });

  it('returns null rather than throwing when registration fails', async () => {
    getToken.mockRejectedValue(new Error('no network'));
    expect(await getExpoPushToken()).toBeNull();
  });
});

describe('storePushTokenInFirestore', () => {
  it('merges the token into the user document', async () => {
    expect(await storePushTokenInFirestore('ExponentPushToken[abc123]')).toBe(true);

    const [, payload, options] = setDocMock.mock.calls[0];
    expect(payload.expoPushToken).toBe('ExponentPushToken[abc123]');
    // Merge matters: this document also holds location and progress.
    expect(options).toEqual({ merge: true });
  });

  it('reports failure rather than throwing when the write is rejected', async () => {
    setDocMock.mockRejectedValue(new Error('permission-denied'));
    expect(await storePushTokenInFirestore('token')).toBe(false);
  });
});

describe('setupPushNotifications', () => {
  it('stores a token once permission is granted', async () => {
    await setupPushNotifications();
    expect(setDocMock).toHaveBeenCalled();
  });

  it('stops before requesting a token when permission is refused', async () => {
    requestPermissions.mockResolvedValue({ status: 'denied' });

    await setupPushNotifications();

    expect(getToken).not.toHaveBeenCalled();
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('completes without a token on a simulator', async () => {
    (Device as { isDevice: boolean }).isDevice = false;

    await expect(setupPushNotifications()).resolves.toBeUndefined();
    expect(setDocMock).not.toHaveBeenCalled();
  });
});

describe('setupNotificationListeners', () => {
  it('registers both listeners and removes them on teardown', () => {
    const removeReceived = jest.fn();
    const removeResponse = jest.fn();
    (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue({ remove: removeReceived });
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue({ remove: removeResponse });

    const teardown = setupNotificationListeners();
    teardown();

    expect(removeReceived).toHaveBeenCalled();
    expect(removeResponse).toHaveBeenCalled();
  });
});
