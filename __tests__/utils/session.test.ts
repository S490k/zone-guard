import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistUid, getPersistedUid } from '../../app/utils/session';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('session uid mirror', () => {
  it('round-trips a uid', async () => {
    await persistUid('abc123');
    expect(await getPersistedUid()).toBe('abc123');
  });

  it('returns null before any sign-in', async () => {
    expect(await getPersistedUid()).toBeNull();
  });

  it('clears the uid on sign-out', async () => {
    await persistUid('abc123');
    await persistUid(null);
    expect(await getPersistedUid()).toBeNull();
  });

  it('swallows write failures rather than breaking sign-in', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
    await expect(persistUid('abc123')).resolves.toBeUndefined();
  });

  // A background task must degrade to skipping its Firestore sync, not crash.
  it('returns null rather than throwing when the read fails', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('unavailable'));
    expect(await getPersistedUid()).toBeNull();
  });
});
