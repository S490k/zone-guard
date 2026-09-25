import { useEffect, useState } from 'react';
import * as Battery from 'expo-battery';
import { currentProfile } from '@tasks/backgroundLocationTask';
import { PowerMode } from '@utils/batteryPolicy';

/**
 * The polling profile currently in force.
 *
 * Exists so the user can see when monitoring has been throttled. Without it the
 * app quietly changes its own behaviour and the only evidence is a debugger —
 * which is the wrong tradeoff for a safety app, and also makes the adaptation
 * impossible to verify on a release build.
 *
 * The extra battery subscription is an OS event listener rather than a poll, so
 * having a second one alongside the tracker's costs effectively nothing.
 */
export function useMonitoringMode(): PowerMode {
  const [mode, setMode] = useState<PowerMode>('normal');

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const profile = await currentProfile();
      if (!cancelled) setMode(profile.mode);
    };

    refresh();
    const subscription = Battery.addBatteryLevelListener(refresh);

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  return mode;
}

export default useMonitoringMode;
