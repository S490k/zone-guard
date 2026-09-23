import { onSnapshot } from 'firebase/firestore';
import { alertToZone, startZonesSync, stopZonesSync, Alert } from '../../app/utils/zonesSync';

jest.mock('../../app/config/firebase', () => ({ db: {} }));

const onSnapshotMock = onSnapshot as jest.Mock;

const alert: Alert = {
  id: 'alert-taunsa',
  zoneId: 'zone-taunsa-barrage',
  title: 'Taunsa Barrage Flood Warning',
  description: 'Heavy monsoon discharge expected.',
  severity: 'high',
  latitude: 30.6987,
  longitude: 70.8503,
  radiusKm: 15,
  createdAt: new Date('2026-09-01T00:00:00Z'),
  expiresAt: new Date('2026-10-01T00:00:00Z'),
  isActive: true,
};

/** Firestore snapshot stub exposing only forEach, which the listener uses. */
function snapshotOf(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    forEach: (fn: (doc: { id: string; data: () => Record<string, unknown> }) => void) =>
      docs.forEach((doc) => fn({ id: doc.id, data: () => doc.data })),
  };
}

const firestoreDoc = {
  zoneId: 'zone-taunsa-barrage',
  title: 'Taunsa Barrage Flood Warning',
  description: 'Heavy monsoon discharge expected.',
  severity: 'high',
  latitude: 30.6987,
  longitude: 70.8503,
  radiusKm: 15,
  createdAt: { toDate: () => new Date('2026-09-01T00:00:00Z') },
  expiresAt: { toDate: () => new Date('2026-10-01T00:00:00Z') },
  isActive: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('alertToZone', () => {
  it('maps the Firestore alert shape onto the zone shape', () => {
    const zone = alertToZone(alert);

    // title becomes name: the app works in zone terms, Firestore in alert terms.
    expect(zone.name).toBe('Taunsa Barrage Flood Warning');
    expect(zone.id).toBe('alert-taunsa');
    expect(zone.radiusKm).toBe(15);
    expect(zone.severity).toBe('high');
  });

  it('carries coordinates through unchanged', () => {
    const zone = alertToZone(alert);
    expect(zone.latitude).toBe(30.6987);
    expect(zone.longitude).toBe(70.8503);
  });

  it('preserves dates as Date instances', () => {
    const zone = alertToZone(alert);
    expect(zone.createdAt).toBeInstanceOf(Date);
    expect(zone.expiresAt).toBeInstanceOf(Date);
  });
});

describe('startZonesSync', () => {
  it('converts a snapshot into alerts', () => {
    const onUpdate = jest.fn();
    onSnapshotMock.mockImplementation((_query, next) => {
      next(snapshotOf([{ id: 'alert-taunsa', data: firestoreDoc }]));
      return jest.fn();
    });

    startZonesSync(onUpdate);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [alerts] = onUpdate.mock.calls[0];
    expect(alerts).toHaveLength(1);
    expect(alerts[0].title).toBe('Taunsa Barrage Flood Warning');
    expect(alerts[0].createdAt).toBeInstanceOf(Date);
  });

  it('reports an empty collection as zero alerts', () => {
    const onUpdate = jest.fn();
    onSnapshotMock.mockImplementation((_query, next) => {
      next(snapshotOf([]));
      return jest.fn();
    });

    startZonesSync(onUpdate);
    expect(onUpdate).toHaveBeenCalledWith([]);
  });

  it('substitutes dates when a document omits them', () => {
    const onUpdate = jest.fn();
    onSnapshotMock.mockImplementation((_query, next) => {
      next(snapshotOf([{ id: 'partial', data: { ...firestoreDoc, createdAt: undefined, expiresAt: undefined } }]));
      return jest.fn();
    });

    startZonesSync(onUpdate);
    const [alerts] = onUpdate.mock.calls[0];
    expect(alerts[0].createdAt).toBeInstanceOf(Date);
  });

  // A sync failure must reach the caller so the UI can say it is showing cache.
  it('routes listener errors to the error handler', () => {
    const onUpdate = jest.fn();
    const onError = jest.fn();
    const failure = new Error('permission-denied');

    onSnapshotMock.mockImplementation((_query, _next, errorHandler) => {
      errorHandler(failure);
      return jest.fn();
    });

    startZonesSync(onUpdate, onError);
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('returns the unsubscribe function from the listener', () => {
    const unsubscribe = jest.fn();
    onSnapshotMock.mockImplementation(() => unsubscribe);

    const returned = startZonesSync(jest.fn());
    returned();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('returns a usable no-op when subscribing throws', () => {
    const onError = jest.fn();
    onSnapshotMock.mockImplementation(() => {
      throw new Error('offline');
    });

    const unsubscribe = startZonesSync(jest.fn(), onError);

    expect(onError).toHaveBeenCalled();
    expect(() => unsubscribe()).not.toThrow();
  });
});

describe('stopZonesSync', () => {
  it('invokes the unsubscribe function', () => {
    const unsubscribe = jest.fn();
    stopZonesSync(unsubscribe);
    expect(unsubscribe).toHaveBeenCalled();
  });
});
