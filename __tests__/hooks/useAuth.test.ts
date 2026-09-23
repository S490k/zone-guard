import { renderHook, waitFor } from '@testing-library/react-native';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../app/hooks/useAuth';

jest.mock('../../app/config/firebase', () => ({
  auth: { currentUser: null },
  isFirebaseConfigured: true,
}));

const onAuthStateChangedMock = onAuthStateChanged as unknown as jest.Mock;
const signInAnonymouslyMock = signInAnonymously as unknown as jest.Mock;

/** Drives the auth listener so tests can emit sessions on demand. */
function captureAuthListener() {
  let emit: ((user: unknown) => void) | undefined;
  const unsubscribe = jest.fn();

  onAuthStateChangedMock.mockImplementation((_auth: unknown, callback: (u: unknown) => void) => {
    emit = callback;
    return unsubscribe;
  });

  return { unsubscribe, emit: (user: unknown) => emit?.(user) };
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  signInAnonymouslyMock.mockResolvedValue({ user: { uid: 'anon-uid' } });
});

describe('useAuth', () => {
  it('starts with no user while authenticating', () => {
    captureAuthListener();
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticating).toBe(true);
  });

  it('exposes a restored session', async () => {
    const listener = captureAuthListener();
    const { result } = renderHook(() => useAuth());

    listener.emit({ uid: 'existing-uid' });

    await waitFor(() => {
      expect(result.current.user).toEqual({ uid: 'existing-uid' });
      expect(result.current.isAuthenticating).toBe(false);
    });
  });

  it('signs in anonymously when there is no session', async () => {
    const listener = captureAuthListener();
    renderHook(() => useAuth());

    listener.emit(null);

    await waitFor(() => expect(signInAnonymouslyMock).toHaveBeenCalledTimes(1));
  });

  // Anonymous sign-in re-fires the listener with a user, so this must not loop.
  it('does not attempt a second sign-in once a user arrives', async () => {
    const listener = captureAuthListener();
    renderHook(() => useAuth());

    listener.emit(null);
    await waitFor(() => expect(signInAnonymouslyMock).toHaveBeenCalledTimes(1));

    listener.emit({ uid: 'anon-uid' });
    await waitFor(() => expect(signInAnonymouslyMock).toHaveBeenCalledTimes(1));
  });

  it('mirrors the uid to storage for background tasks', async () => {
    const listener = captureAuthListener();
    renderHook(() => useAuth());

    listener.emit({ uid: 'anon-uid' });

    await waitFor(async () => {
      expect(await AsyncStorage.getItem('zoneguard:uid')).toBe('anon-uid');
    });
  });

  it('clears the mirrored uid on sign-out', async () => {
    const listener = captureAuthListener();
    renderHook(() => useAuth());

    listener.emit({ uid: 'anon-uid' });
    await waitFor(async () => {
      expect(await AsyncStorage.getItem('zoneguard:uid')).toBe('anon-uid');
    });

    listener.emit(null);
    await waitFor(async () => {
      expect(await AsyncStorage.getItem('zoneguard:uid')).toBeNull();
    });
  });

  // Surfaced rather than swallowed: anonymous sign-in must be enabled in the
  // Firebase console, and silent failure was the original defect.
  it('surfaces a sign-in failure and stops authenticating', async () => {
    const listener = captureAuthListener();
    const failure = new Error('operation-not-allowed');
    signInAnonymouslyMock.mockRejectedValue(failure);

    const { result } = renderHook(() => useAuth());
    listener.emit(null);

    await waitFor(() => {
      expect(result.current.error).toBe(failure);
      expect(result.current.isAuthenticating).toBe(false);
    });
  });

  it('unsubscribes the listener on unmount', () => {
    const listener = captureAuthListener();
    const { unmount } = renderHook(() => useAuth());

    unmount();
    expect(listener.unsubscribe).toHaveBeenCalled();
  });
});
