import * as Location from 'expo-location';

const getForeground = Location.getForegroundPermissionsAsync as jest.Mock;
const requestForeground = Location.requestForegroundPermissionsAsync as jest.Mock;
const getBackground = Location.getBackgroundPermissionsAsync as jest.Mock;
const requestBackground = Location.requestBackgroundPermissionsAsync as jest.Mock;

import { ensureForegroundPermission, ensureBackgroundPermission } from '../../app/utils/permissions';

beforeEach(() => {
  jest.clearAllMocks();
  getForeground.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
  requestForeground.mockResolvedValue({ status: 'granted' });
  getBackground.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
  requestBackground.mockResolvedValue({ status: 'granted' });
});

describe('ensureForegroundPermission', () => {
  it('grants without prompting when already granted', async () => {
    getForeground.mockResolvedValue({ status: 'granted', canAskAgain: false });

    expect(await ensureForegroundPermission()).toBe(true);
    expect(requestForeground).not.toHaveBeenCalled();
  });

  it('prompts when undetermined', async () => {
    expect(await ensureForegroundPermission()).toBe(true);
    expect(requestForeground).toHaveBeenCalledTimes(1);
  });

  /**
   * The defect this guards: two callers requesting at once meant iOS resolved
   * the second against the still-undetermined state and reported denied,
   * leaving both the map and the background task without location.
   */
  it('prompts once for concurrent callers', async () => {
    const results = await Promise.all([
      ensureForegroundPermission(),
      ensureForegroundPermission(),
      ensureForegroundPermission(),
    ]);

    expect(results).toEqual([true, true, true]);
    expect(requestForeground).toHaveBeenCalledTimes(1);
  });

  // The shared promise collapses concurrent callers; it is not a result cache.
  // A later call re-reads the OS status, which now reports granted, so no
  // second dialog appears — and a permission revoked in Settings is noticed.
  it('re-reads status on a later call instead of caching the grant', async () => {
    await ensureForegroundPermission();
    expect(requestForeground).toHaveBeenCalledTimes(1);

    getForeground.mockResolvedValue({ status: 'granted', canAskAgain: false });
    expect(await ensureForegroundPermission()).toBe(true);

    expect(requestForeground).toHaveBeenCalledTimes(1);
  });

  it('reports a permission revoked mid-session', async () => {
    expect(await ensureForegroundPermission()).toBe(true);

    getForeground.mockResolvedValue({ status: 'denied', canAskAgain: false });
    expect(await ensureForegroundPermission()).toBe(false);
  });

  it('allows a later attempt after a denial', async () => {
    requestForeground.mockResolvedValue({ status: 'denied' });

    expect(await ensureForegroundPermission()).toBe(false);

    requestForeground.mockResolvedValue({ status: 'granted' });
    expect(await ensureForegroundPermission()).toBe(true);
    expect(requestForeground).toHaveBeenCalledTimes(2);
  });

  it('does not prompt when permanently denied', async () => {
    getForeground.mockResolvedValue({ status: 'denied', canAskAgain: false });

    expect(await ensureForegroundPermission()).toBe(false);
    expect(requestForeground).not.toHaveBeenCalled();
  });

  it('returns false rather than throwing when the API errors', async () => {
    getForeground.mockRejectedValue(new Error('location services unavailable'));

    expect(await ensureForegroundPermission()).toBe(false);
  });
});

describe('ensureBackgroundPermission', () => {
  // iOS rejects an "Always" request that does not follow a granted "When In Use".
  it('requires foreground permission first', async () => {
    getForeground.mockResolvedValue({ status: 'denied', canAskAgain: false });

    expect(await ensureBackgroundPermission()).toBe(false);
    expect(requestBackground).not.toHaveBeenCalled();
  });

  it('requests background after foreground is granted', async () => {
    expect(await ensureBackgroundPermission()).toBe(true);
    expect(requestForeground).toHaveBeenCalled();
    expect(requestBackground).toHaveBeenCalledTimes(1);
  });

  it('skips the prompt when background is already granted', async () => {
    getBackground.mockResolvedValue({ status: 'granted', canAskAgain: false });

    expect(await ensureBackgroundPermission()).toBe(true);
    expect(requestBackground).not.toHaveBeenCalled();
  });

  it('reports denial without throwing', async () => {
    requestBackground.mockResolvedValue({ status: 'denied' });

    expect(await ensureBackgroundPermission()).toBe(false);
  });

  it('prompts once for concurrent callers', async () => {
    await Promise.all([ensureBackgroundPermission(), ensureBackgroundPermission()]);
    expect(requestBackground).toHaveBeenCalledTimes(1);
  });
});
