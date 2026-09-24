import {
  mapUsgsFeature,
  mapGdacsFeature,
  severityForMagnitude,
  severityForAlertLevel,
  annotateAndSort,
  NewsItem,
} from '../../app/utils/disasterNews';

// Shapes copied from live responses rather than invented, so a change in the
// upstream contract shows up here rather than as an empty list on device.
const usgsFeature = {
  id: 'nc75440902',
  properties: {
    mag: 5.8,
    place: '1 km S of Orange Cove, CA',
    title: 'M 5.8 - 1 km S of Orange Cove, CA',
    time: 1790264428080,
    url: 'https://earthquake.usgs.gov/earthquakes/eventpage/nc75440902',
  },
  geometry: { coordinates: [-119.3143, 36.6178, 19.44] },
};

const gdacsFeature = {
  properties: {
    eventid: 1001325,
    eventtype: 'TC',
    name: 'Tropical Cyclone POLO-26',
    alertlevel: 'Orange',
    fromdate: '2026-09-21T03:00:00',
    country: 'Mexico',
    severitydata: { severitytext: 'Hurricane/Typhoon > 74 mph' },
    url: { report: 'https://www.gdacs.org/report.aspx?eventid=1001325' },
  },
  geometry: { coordinates: [-156.2, 14.9] },
};

describe('severity mapping', () => {
  it('bands earthquake magnitude', () => {
    expect(severityForMagnitude(2.5)).toBe('low');
    expect(severityForMagnitude(4.2)).toBe('medium');
    expect(severityForMagnitude(6.1)).toBe('high');
    expect(severityForMagnitude(7.4)).toBe('critical');
  });

  it('bands at the exact boundaries', () => {
    expect(severityForMagnitude(4)).toBe('medium');
    expect(severityForMagnitude(5.5)).toBe('high');
    expect(severityForMagnitude(7)).toBe('critical');
  });

  it('maps the GDACS traffic-light levels', () => {
    expect(severityForAlertLevel('Red')).toBe('critical');
    expect(severityForAlertLevel('Orange')).toBe('high');
    expect(severityForAlertLevel('Green')).toBe('medium');
  });

  it('is case-insensitive and safe on an unknown level', () => {
    expect(severityForAlertLevel('rEd')).toBe('critical');
    expect(severityForAlertLevel('')).toBe('low');
    expect(severityForAlertLevel(undefined as unknown as string)).toBe('low');
  });
});

describe('mapUsgsFeature', () => {
  it('maps a live-shaped feature', () => {
    const item = mapUsgsFeature(usgsFeature)!;
    expect(item.source).toBe('usgs');
    expect(item.title).toContain('M5.8');
    expect(item.severity).toBe('high');
    expect(item.url).toContain('earthquake.usgs.gov');
  });

  /**
   * GeoJSON orders coordinates longitude-first, the opposite of every
   * latitude/longitude pair elsewhere in the app. Swapping them would place
   * a Californian earthquake in the Southern Ocean.
   */
  it('reads GeoJSON coordinates longitude-first', () => {
    const item = mapUsgsFeature(usgsFeature)!;
    expect(item.longitude).toBeCloseTo(-119.3143, 3);
    expect(item.latitude).toBeCloseTo(36.6178, 3);
  });

  it('returns an ISO timestamp', () => {
    const item = mapUsgsFeature(usgsFeature)!;
    expect(Number.isNaN(Date.parse(item.publishedAt))).toBe(false);
  });

  it('rejects a feature with no magnitude', () => {
    expect(mapUsgsFeature({ id: 'x', properties: {}, geometry: { coordinates: [0, 0] } })).toBeNull();
  });

  it('rejects malformed input rather than throwing', () => {
    expect(mapUsgsFeature(null)).toBeNull();
    expect(mapUsgsFeature({})).toBeNull();
  });
});

describe('mapGdacsFeature', () => {
  it('maps a live-shaped feature', () => {
    const item = mapGdacsFeature(gdacsFeature)!;
    expect(item.source).toBe('gdacs');
    expect(item.title).toContain('POLO-26');
    expect(item.title).toContain('Mexico');
    expect(item.severity).toBe('high');
  });

  it('builds an id unique across event types', () => {
    const item = mapGdacsFeature(gdacsFeature)!;
    expect(item.id).toBe('gdacs:TC:1001325');
  });

  it('tolerates a feature with no geometry', () => {
    const item = mapGdacsFeature({ properties: { ...gdacsFeature.properties } })!;
    expect(item).not.toBeNull();
    expect(item.latitude).toBeUndefined();
  });

  it('rejects a feature with no event id', () => {
    expect(mapGdacsFeature({ properties: { name: 'x' } })).toBeNull();
  });
});

describe('annotateAndSort', () => {
  const items: NewsItem[] = [
    {
      id: 'old-near',
      source: 'usgs',
      title: 'Older but close',
      summary: '',
      url: '',
      publishedAt: '2026-09-01T00:00:00.000Z',
      latitude: 30.7,
      longitude: 70.85,
      severity: 'low',
    },
    {
      id: 'new-far',
      source: 'gdacs',
      title: 'Newer but distant',
      summary: '',
      url: '',
      publishedAt: '2026-09-20T00:00:00.000Z',
      latitude: -33.8,
      longitude: 151.2,
      severity: 'critical',
    },
  ];

  it('computes distance from the user', () => {
    const [first] = annotateAndSort(items, 30.6987, 70.8503);
    const near = annotateAndSort(items, 30.6987, 70.8503).find((i) => i.id === 'old-near')!;
    expect(near.distanceKm).toBeLessThan(5);
    expect(first).toBeDefined();
  });

  // Recency wins over proximity: a major event last night outranks a minor
  // one nearby, and sorting by distance would bury it.
  it('orders by recency, not proximity', () => {
    const sorted = annotateAndSort(items, 30.6987, 70.8503);
    expect(sorted[0].id).toBe('new-far');
  });

  it('leaves distance undefined without a user position', () => {
    const sorted = annotateAndSort(items);
    sorted.forEach((item) => expect(item.distanceKm).toBeUndefined());
  });

  it('leaves distance undefined for an item with no coordinates', () => {
    const noCoords: NewsItem = { ...items[0], id: 'no-coords', latitude: undefined, longitude: undefined };
    const [result] = annotateAndSort([noCoords], 30.6987, 70.8503);
    expect(result.distanceKm).toBeUndefined();
  });

  it('handles an empty list', () => {
    expect(annotateAndSort([], 30, 70)).toEqual([]);
  });
});
