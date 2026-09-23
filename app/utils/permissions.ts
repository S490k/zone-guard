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

  try {
    return await foregroundRequest;
  } finally {
    // Cleared once settled, whatever the outcome. The shared promise exists to
    // collapse *concurrent* requests into one dialog; caching the result beyond
    // that would miss a permission revoked from Settings mid-session, and the
    // status check it replaces is cheap.
    foregroundRequest = null;
  }
}

/** Must follow a granted foreground permission — iOS rejects it otherwise. */
export async function ensureBackgroundPermission(): Promise<boolean> {
  if (backgroundRequest) return backgroundRequest;

  backgroundRequest = (async () => {
    try {
      if (!(await ensureForegroundPermission())) return false;

      const existing = await Location.getBackgroundPermissionsAsync();
      if (existing.status === 'granted') return true;

      if (existing.canAskAgain) {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        if (status === 'granted') return true;
      }

      // iOS often defers or suppresses the "Always" upgrade prompt, so denial
      // here is routine rather than exceptional — name the manual route out.
      console.warn(
        '[Permissions] Background location not granted. Set Location to "Always" for ZoneGuard: ' +
          'Settings > Privacy & Security > Location Services > ZoneGuard > Always'
      );
      return false;
    } catch (error) {
      console.error('[Permissions] Background request failed:', error);
      return false;
    }
  })();

  try {
    return await backgroundRequest;
  } finally {
    backgroundRequest = null;
  }
}
