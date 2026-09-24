import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchDisasterNews,
  readCachedNews,
  USGS_URL,
  GDACS_URL,
} from '../../app/utils/disasterNews';

const usgsPayload = {
  features: [
    {
      id: 'eq1',
      properties: {
        mag: 6.2,
        place: 'Near Quetta',
        title: 'M 6.2 - Near Quetta',
        time: Date.parse('2026-09-23T00:00:00.000Z'),
        url: 'https://earthquake.usgs.gov/eq1',
      },
      geometry: { coordinates: [67.0, 30.2] },
    },
  ],
};

const gdacsPayload = {
  features: [
    {
      properties: {
        eventid: 42,
        eventtype: 'FL',
        name: 'Flood',
        alertlevel: 'Red',
        fromdate: '2026-09-24T00:00:00',
        country: 'Pakistan',
        url: { report: 'https://www.gdacs.org/report/42' },
      },
      geometry: { coordinates: [70.0, 30.0] },
    },
  ],
};

/** Routes each feed URL to its own outcome so one can fail independently. */
function mockFeeds(options: { usgs?: unknown | 'fail'; gdacs?: unknown | 'fail' }) {
  (global as any).fetch = jest.fn(async (url: string) => {
    const payload = url === USGS_URL ? options.usgs : options.gdacs;
    if (payload === 'fail' || payload === undefined) {
      throw new Error('network down');
    }
    return { ok: true, status: 200, json: async () => payload };
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

afterAll(() => {
  delete (global as any).fetch;
});

describe('fetchDisasterNews', () => {
  it('combines both feeds', async () => {
    mockFeeds({ usgs: usgsPayload, gdacs: gdacsPayload });

    const result = await fetchDisasterNews();
    expect(result.items).toHaveLength(2);
    expect(result.fromCache).toBe(false);
  });

  /**
   * The feeds are fetched independently precisely so a single outage does not
   * blank the screen. This is the behaviour that justifies the extra code.
   */
  it('still returns results when one feed is down', async () => {
    mockFeeds({ usgs: 'fail', gdacs: gdacsPayload });

    const result = await fetchDisasterNews();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].source).toBe('gdacs');
  });

  it('still returns results when the other feed is down', async () => {
    mockFeeds({ usgs: usgsPayload, gdacs: 'fail' });

    const result = await fetchDisasterNews();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].source).toBe('usgs');
  });

  it('caches a successful response', async () => {
    mockFeeds({ usgs: usgsPayload, gdacs: gdacsPayload });
    await fetchDisasterNews();

    expect(await readCachedNews()).toHaveLength(2);
  });

  // Losing connectivity should surface the last known picture, not a blank list.
  it('falls back to cache when both feeds fail', async () => {
    mockFeeds({ usgs: usgsPayload, gdacs: gdacsPayload });
    await fetchDisasterNews();

    mockFeeds({ usgs: 'fail', gdacs: 'fail' });
    const result = await fetchDisasterNews();

    expect(result.fromCache).toBe(true);
    expect(result.items).toHaveLength(2);
  });

  it('reports an empty cached result rather than throwing', async () => {
    mockFeeds({ usgs: 'fail', gdacs: 'fail' });

    const result = await fetchDisasterNews();
    expect(result.items).toEqual([]);
    expect(result.fromCache).toBe(true);
  });

  it('treats a non-ok response as a failed feed', async () => {
    (global as any).fetch = jest.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    }));

    const result = await fetchDisasterNews();
    expect(result.items).toEqual([]);
  });

  it('annotates distance from the supplied position', async () => {
    mockFeeds({ usgs: usgsPayload, gdacs: gdacsPayload });

    const result = await fetchDisasterNews(30.0, 70.0);
    const flood = result.items.find((i) => i.source === 'gdacs')!;
    expect(flood.distanceKm).toBeLessThan(5);
  });

  it('honours the requested limit', async () => {
    mockFeeds({ usgs: usgsPayload, gdacs: gdacsPayload });

    const result = await fetchDisasterNews(undefined, undefined, 1);
    expect(result.items).toHaveLength(1);
  });

  it('survives a feed returning an unexpected shape', async () => {
    mockFeeds({ usgs: { unexpected: true }, gdacs: { features: 'not an array' } });

    const result = await fetchDisasterNews();
    expect(result.items).toEqual([]);
  });
});
