import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useLocationMonitor } from '../../app/hooks/useLocationMonitor';
import { DisasterZone } from '../../app/constants/zones';

const getForeground = Location.getForegroundPermissionsAsync as jest.Mock;
const requestForeground = Location.requestForegroundPermissionsAsync as jest.Mock;
const watchPosition = Location.watchPositionAsync as jest.Mock;

const taunsa: DisasterZone = {
  id: 'zone-taunsa-barrage',
  name: 'Taunsa Barrage',
  latitude: 30.6987,
  longitude: 70.8503,
  radiusKm: 15,
  severity: 'high',
  description: 'Flood risk',
  createdAt: new Date(),
};

/** Captures the watcher callback so tests can push positions at will. */
function captureWatcher() {
  let emit: ((position: unknown) => void) | undefined;
  const remove = jest.fn();

  watchPosition.mockImplementation(async (_options: unknown, callback: (p: unknown) => void) => {
    emit = callback;
    return { remove };
  });

  return {
    remove,
    emit: (latitude: number, longitude: number) =>
      emit?.({ coords: { latitude, longitude, accuracy: 5 }, timestamp: Date.now() }),
    hasSubscribed: () => emit !== undefined,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  getForeground.mockResolvedValue({ status: 'granted', canAskAgain: false });
  requestForeground.mockResolvedValue({ status: 'granted' });
  watchPosition.mockResolvedValue({ remove: jest.fn() });
});

describe('useLocationMonitor', () => {
  it('starts with no location and no zones', () => {
    const { result } = renderHook(() => useLocationMonitor([taunsa]));

    expect(result.current.location).toBeNull();
    expect(result.current.activeZones).toEqual([]);
  });

  it('begins watching position on mount', async () => {
    const watcher = captureWatcher();
    renderHook(() => useLocationMonitor([taunsa]));

    await waitFor(() => expect(watcher.hasSubscribed()).toBe(true));
  });

  it('exposes the reported position', async () => {
    const watcher = captureWatcher();
    const { result } = renderHook(() => useLocationMonitor([taunsa]));

    await waitFor(() => expect(watcher.hasSubscribed()).toBe(true));
    act(() => watcher.emit(30.6987, 70.8503));

    await waitFor(() => {
      expect(result.current.location?.latitude).toBeCloseTo(30.6987, 4);
      expect(result.current.location?.accuracy).toBe(5);
    });
  });

  it('reports the user inside a zone at its centre', async () => {
    const watcher = captureWatcher();
    const { result } = renderHook(() => useLocationMonitor([taunsa]));

    await waitFor(() => expect(watcher.hasSubscribed()).toBe(true));
    act(() => watcher.emit(30.6987, 70.8503));

    await waitFor(() => {
      const zone = result.current.activeZones.find((z) => z.zoneId === 'zone-taunsa-barrage');
      expect(zone?.isInZone).toBe(true);
      expect(zone?.distance).toBeCloseTo(0, 1);
    });
  });

  it('reports the user outside a distant zone', async () => {
    const watcher = captureWatcher();
    const { result } = renderHook(() => useLocationMonitor([taunsa]));

    await waitFor(() => expect(watcher.hasSubscribed()).toBe(true));
    // San Francisco — roughly 12,000km away.
    act(() => watcher.emit(37.7858, -122.4064));

    await waitFor(() => {
      const zone = result.current.activeZones[0];
      expect(zone.isInZone).toBe(false);
      expect(zone.distance).toBeGreaterThan(10000);
    });
  });

  it('surfaces an error when permission is refused', async () => {
    getForeground.mockResolvedValue({ status: 'denied', canAskAgain: true });
    requestForeground.mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => useLocationMonitor([taunsa]));

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(watchPosition).not.toHaveBeenCalled();
  });

  it('removes the subscription on unmount', async () => {
    const watcher = captureWatcher();
    const { unmount } = renderHook(() => useLocationMonitor([taunsa]));

    await waitFor(() => expect(watcher.hasSubscribed()).toBe(true));
    unmount();

    await waitFor(() => expect(watcher.remove).toHaveBeenCalled());
  });

  /**
   * Zones are read through a ref precisely so a zone update does not tear down
   * and re-establish the watcher, which would drop positions mid-flight.
   */
  it('does not resubscribe when the zone list changes', async () => {
    const watcher = captureWatcher();
    const { rerender } = renderHook(({ zones }: { zones: DisasterZone[] }) => useLocationMonitor(zones), {
      initialProps: { zones: [taunsa] },
    });

    await waitFor(() => expect(watcher.hasSubscribed()).toBe(true));
    expect(watchPosition).toHaveBeenCalledTimes(1);

    rerender({ zones: [taunsa, { ...taunsa, id: 'zone-second' }] });

    expect(watchPosition).toHaveBeenCalledTimes(1);
  });

  it('evaluates positions against the latest zone list', async () => {
    const watcher = captureWatcher();
    const { result, rerender } = renderHook(({ zones }: { zones: DisasterZone[] }) => useLocationMonitor(zones), {
      initialProps: { zones: [] as DisasterZone[] },
    });

    await waitFor(() => expect(watcher.hasSubscribed()).toBe(true));
    act(() => watcher.emit(30.6987, 70.8503));
    await waitFor(() => expect(result.current.activeZones).toEqual([]));

    rerender({ zones: [taunsa] });
    act(() => watcher.emit(30.6987, 70.8503));

    await waitFor(() => expect(result.current.activeZones).toHaveLength(1));
  });

  it('handles an empty zone list without error', async () => {
    const watcher = captureWatcher();
    const { result } = renderHook(() => useLocationMonitor([]));

    await waitFor(() => expect(watcher.hasSubscribed()).toBe(true));
    act(() => watcher.emit(30.6987, 70.8503));

    await waitFor(() => expect(result.current.location).not.toBeNull());
    expect(result.current.activeZones).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
