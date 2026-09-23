import AsyncStorage from '@react-native-async-storage/async-storage';

const UID_KEY = 'zoneguard:uid';

// Background tasks run in a fresh JS context where Firebase Auth has not yet
// rehydrated from storage, so auth.currentUser is null on cold start. The uid is
// mirrored here at sign-in so background code can read it synchronously-ish.
export async function persistUid(uid: string | null): Promise<void> {
  try {
    if (uid) {
      await AsyncStorage.setItem(UID_KEY, uid);
    } else {
      await AsyncStorage.removeItem(UID_KEY);
    }
  } catch (error) {
    console.error('[Session] Failed to persist uid:', error);
  }
}

export async function getPersistedUid(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(UID_KEY);
  } catch (error) {
    console.error('[Session] Failed to read uid:', error);
    return null;
  }
}
