import * as Location from 'expo-location';

/**
 * Adaptive monitoring under battery pressure.
 *
 * The roadmap budgets ≤5% drain per hour, and continuous location polling is
 * the largest contributor. Rather than pick one interval and hope, the polling
 * rate widens as the battery falls.
 *
 * **Geofencing is deliberately untouched.** It is evaluated by the OS against
 * hardware the device is already running, so it costs the app almost nothing —
 * which means zone alerting keeps working at full fidelity even in the most
 * conservative mode. Only the position history degrades.
 */

export type PowerMode = 'normal' | 'reduced' | 'minimal';

export interface MonitoringProfile {
  mode: PowerMode;
  /** Seconds between position updates. */
  timeInterval: number;
  /** Metres of movement before an update. */
  distanceInterval: number;
  accuracy: Location.Accuracy;
}

export const PROFILES: Record<PowerMode, MonitoringProfile> = {
  normal: {
    mode: 'normal',
    timeInterval: 30_000,
    distanceInterval: 50,
    accuracy: Location.Accuracy.Balanced,
  },
  reduced: {
    mode: 'reduced',
    timeInterval: 120_000,
    distanceInterval: 200,
    accuracy: Location.Accuracy.Low,
  },
  minimal: {
    mode: 'minimal',
    timeInterval: 300_000,
    distanceInterval: 500,
    accuracy: Location.Accuracy.Lowest,
  },
};

export const REDUCED_BELOW = 0.5;
export const MINIMAL_BELOW = 0.2;

/**
 * Chooses a profile from battery level and charging state.
 *
 * `level` is 0–1, or -1 where the platform cannot report it — simulators and
 * some Android devices. An unknown level takes the normal profile rather than
 * the cautious one: silently degrading a disaster app's monitoring because a
 * reading was unavailable would be the wrong failure direction.
 */
export function profileForBattery(level: number, isCharging: boolean): MonitoringProfile {
  if (isCharging) return PROFILES.normal;
  if (level < 0 || !Number.isFinite(level)) return PROFILES.normal;

  if (level < MINIMAL_BELOW) return PROFILES.minimal;
  if (level < REDUCED_BELOW) return PROFILES.reduced;
  return PROFILES.normal;
}
