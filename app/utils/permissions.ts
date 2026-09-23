import * as Location from 'expo-location';

/**
 * iOS presents one permission dialog at a time: a second concurrent request
 * resolves against the still-undetermined state and reads back as denied.
 * Callers share a single in-flight promise so the dialog is requested once.
 */
let foregroundRequest: Promise<boolean> | null = null;
let backgroundRequest: Promise<boolean> | null = null;

export async function ensureForegroundPermission(): Promise<boolean> {
  if (foregroundRequest) return foregroundRequest;

  foregroundRequest = (async () => {
    try {
      const existing = await Location.getForegroundPermissionsAsync();
      if (existing.status === 'granted') return true;

      if (!existing.canAskAgain) {
        console.warn(
          '[Permissions] Foreground location permanently denied — enable it in Settings'
        );
        return false;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('[Permissions] Foreground request failed:', error);
      return false;
    }
  })();

  const granted = await foregroundRequest;
  // Clear on denial so a later attempt can prompt again; a grant is permanent
  // for the session and stays cached.
  if (!granted) foregroundRequest = null;
  return granted;
}

/** Must follow a granted foreground permission — iOS rejects it otherwise. */
export async function ensureBackgroundPermission(): Promise<boolean> {
  if (backgroundRequest) return backgroundRequest;

  backgroundRequest = (async () => {
    try {
      if (!(await ensureForegroundPermission())) return false;

      const existing = await Location.getBackgroundPermissionsAsync();
      if (existing.status === 'granted') return true;

      if (!existing.canAskAgain) {
        console.warn(
          '[Permissions] Background location permanently denied — enable "Always" in Settings'
        );
        return false;
      }

      const { status } = await Location.requestBackgroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('[Permissions] Background request failed:', error);
      return false;
    }
  })();

  const granted = await backgroundRequest;
  if (!granted) backgroundRequest = null;
  return granted;
}
