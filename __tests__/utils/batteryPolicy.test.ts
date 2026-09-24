import {
  profileForBattery,
  PROFILES,
  REDUCED_BELOW,
  MINIMAL_BELOW,
} from '../../app/utils/batteryPolicy';

describe('profileForBattery', () => {
  it('polls normally on a healthy battery', () => {
    expect(profileForBattery(0.9, false).mode).toBe('normal');
    expect(profileForBattery(0.5, false).mode).toBe('normal');
  });

  it('reduces polling below half', () => {
    expect(profileForBattery(0.49, false).mode).toBe('reduced');
    expect(profileForBattery(0.25, false).mode).toBe('reduced');
  });

  it('minimises polling below the critical threshold', () => {
    expect(profileForBattery(0.19, false).mode).toBe('minimal');
    expect(profileForBattery(0.02, false).mode).toBe('minimal');
  });

  it('switches exactly at the declared thresholds', () => {
    expect(profileForBattery(REDUCED_BELOW, false).mode).toBe('normal');
    expect(profileForBattery(REDUCED_BELOW - 0.01, false).mode).toBe('reduced');
    expect(profileForBattery(MINIMAL_BELOW, false).mode).toBe('reduced');
    expect(profileForBattery(MINIMAL_BELOW - 0.01, false).mode).toBe('minimal');
  });

  // On the charger there is nothing to conserve.
  it('polls normally while charging, whatever the level', () => {
    expect(profileForBattery(0.05, true).mode).toBe('normal');
    expect(profileForBattery(0.3, true).mode).toBe('normal');
  });

  /**
   * Simulators and some Android devices report -1. Degrading a disaster app's
   * monitoring because a reading was unavailable is the wrong failure
   * direction, so an unknown level takes the normal profile.
   */
  it('treats an unreadable level as normal, not as critical', () => {
    expect(profileForBattery(-1, false).mode).toBe('normal');
    expect(profileForBattery(NaN, false).mode).toBe('normal');
    expect(profileForBattery(Infinity, false).mode).toBe('normal');
  });

  it('widens both interval and distance as power falls', () => {
    const normal = PROFILES.normal;
    const reduced = PROFILES.reduced;
    const minimal = PROFILES.minimal;

    expect(reduced.timeInterval).toBeGreaterThan(normal.timeInterval);
    expect(minimal.timeInterval).toBeGreaterThan(reduced.timeInterval);
    expect(reduced.distanceInterval).toBeGreaterThan(normal.distanceInterval);
    expect(minimal.distanceInterval).toBeGreaterThan(reduced.distanceInterval);
  });

  it('declares a distinct mode per profile', () => {
    const modes = Object.values(PROFILES).map((p) => p.mode);
    expect(new Set(modes).size).toBe(modes.length);
  });
});
