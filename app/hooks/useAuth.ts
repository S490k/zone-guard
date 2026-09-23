import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@config/firebase';
import { persistUid } from '@utils/session';

export interface UseAuthReturn {
  user: User | null;
  isAuthenticating: boolean;
  error: Error | null;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(isFirebaseConfigured);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!auth) {
      setIsAuthenticating(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      persistUid(nextUser?.uid ?? null);

      if (nextUser) {
        setIsAuthenticating(false);
        return;
      }

      // No session yet. Anonymous sign-in re-fires this listener with a user,
      // so this does not loop; a failure simply leaves the app unauthenticated.
      signInAnonymously(auth!).catch((err: Error) => {
        console.error('[Auth] Anonymous sign-in failed:', err.message);
        setError(err);
        setIsAuthenticating(false);
      });
    });

    return unsubscribe;
  }, []);

  return { user, isAuthenticating, error };
}

export default useAuth;
