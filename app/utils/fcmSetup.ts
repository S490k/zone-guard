import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '@config/firebase';

// Show notifications even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/** Returns an Expo push token, or null on simulators / when no EAS projectId is configured. */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[ZoneGuard] Push tokens are only available on physical devices.');
    return null;
  }
  const projectId =
    (Constants.expoConfig?.extra as any)?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
  if (!projectId) {
    console.log('[ZoneGuard] No EAS projectId yet (run `eas init`). Skipping push token.');
    return null;
  }
  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    return null;
  }
}

export async function storePushTokenInFirestore(token: string): Promise<boolean> {
  if (!db || !auth?.currentUser) return false;
  try {
    await setDoc(
      doc(db, 'users', auth.currentUser.uid),
      { expoPushToken: token, updatedAt: new Date() },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Error storing push token:', error);
    return false;
  }
}

export async function setupPushNotifications(): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;
  const token = await getExpoPushToken();
  if (token) await storePushTokenInFirestore(token);
}

export function setupNotificationListeners(): () => void {
  const received = Notifications.addNotificationReceivedListener((n) => {
    console.log('Notification received:', n.request.content.title);
  });
  const response = Notifications.addNotificationResponseReceivedListener((r) => {
    const { identifier } = r.notification.request;
    console.log('Notification tapped:', r.notification.request.content.data);
    // iOS leaves a tapped notification in Notification Centre; an acknowledged
    // warning should not keep sitting there looking current.
    Notifications.dismissNotificationAsync(identifier).catch(() => {});
  });
  return () => {
    received.remove();
    response.remove();
  };
}
