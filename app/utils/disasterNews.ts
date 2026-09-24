import AsyncStorage from '@react-native-async-storage/async-storage';
import { haversineDistance } from '@utils/distance';

/**
 * Disaster reporting from two public feeds, neither of which needs a key or an
 * account:
 *
 *  - USGS earthquake feed — magnitude, place and coordinates
 *  - GDACS (EU/UN) — cyclones, floods, droughts, wildfires, volcanoes
 *
 * ReliefWeb was the obvious third source for Pakistan-specific humanitarian
 * reporting, but its v1 API is decommissioned and v2 now rejects unregistered
 * callers, so it is deliberately not used.
 *
 * Both feeds carry coordinates, so an item becomes "340km from you" rather than
 * a headline with no bearing on the reader.
 */

const CACHE_KEY = 'zoneguard:disasterNews';
const REQUEST_TIMEOUT_MS = 12000;

export const USGS_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson';
export const GDACS_URL =
  'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ,TC,FL,DR,WF,VO';

export type NewsSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface NewsItem {
  id: string;
  source: 'usgs' | 'gdacs';
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  latitude?: number;
  longitude?: number;
  severity: NewsSeverity;
  /** Populated once a user position is known. */
  distanceKm?: number;
}

/** Earthquake magnitude bands, following USGS's own descriptive scale. */
export function severityForMagnitude(magnitude: number): NewsSeverity {
  if (magnitude >= 7) return 'critical';
  if (magnitude >= 5.5) return 'high';
  if (magnitude >= 4) return 'medium';
  return 'low';
}

/** GDACS publishes a traffic-light alert level rather than a numeric scale. */
export function severityForAlertLevel(level: string): NewsSeverity {
  switch ((level ?? '').toLowerCase()) {
    case 'red':
      return 'critical';
    case 'orange':
      return 'high';
    case 'green':
      return 'medium';
    default:
      return 'low';
  }
}

export function mapUsgsFeature(feature: any): NewsItem | null {
  const props = feature?.properties;
  const coords = feature?.geometry?.coordinates;
  if (!props || typeof props.mag !== 'number' || !Array.isArray(coords)) return null;

  return {
    id: `usgs:${feature.id}`,
    source: 'usgs',
    title: `M${props.mag.toFixed(1)} — ${props.place ?? 'Unknown location'}`,
    summary: props.title ?? props.place ?? '',
    url: props.url ?? '',
    publishedAt: new Date(props.time ?? Date.now()).toISOString(),
    // GeoJSON orders coordinates longitude-first, which is the opposite of
    // every latitude/longitude pair elsewhere in this app.
    longitude: coords[0],
    latitude: coords[1],
    severity: severityForMagnitude(props.mag),
  };
}

export function mapGdacsFeature(feature: any): NewsItem | null {
  const props = feature?.properties;
  const coords = feature?.geometry?.coordinates;
  if (!props?.eventid) return null;

  const country = props.country ? ` — ${props.country}` : '';

  return {
    id: `gdacs:${props.eventtype}:${props.eventid}`,
    source: 'gdacs',
    title: `${props.name ?? props.eventname ?? 'Event'}${country}`,
    summary: props.severitydata?.severitytext ?? props.description ?? '',
    url: props.url?.report ?? '',
    publishedAt: new Date(props.fromdate ?? Date.now()).toISOString(),
    longitude: Array.isArray(coords) ? coords[0] : undefined,
    latitude: Array.isArray(coords) ? coords[1] : undefined,
    severity: severityForAlertLevel(props.alertlevel),
  };
}

/**
 * Annotates with distance where a position is known, then orders by recency.
 * Distance informs but does not reorder: a major event last night matters more
 * than a minor one nearby, and sorting by proximity would bury it.
 */
export function annotateAndSort(
  items: NewsItem[],
  userLat?: number,
  userLon?: number
): NewsItem[] {
  const annotated = items.map((item) => {
    if (
      userLat === undefined ||
      userLon === undefined ||
      item.latitude === undefined ||
      item.longitude === undefined
    ) {
      return item;
    }
    return {
      ...item,
      distanceKm: haversineDistance(userLat, userLon, item.latitude, item.longitude),
    };
  });

  return annotated.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export interface RelativeTime {
  unit: 'now' | 'minutes' | 'hours' | 'days';
  value: number;
}

/**
 * Coarse relative age, as buckets rather than a formatted string, so the
 * wording stays in the translation files. Pure for testing.
 */
export function relativeTime(iso: string, now: Date = new Date()): RelativeTime {
  const elapsed = now.getTime() - new Date(iso).getTime();
  const minutes = Math.floor(elapsed / 60000);

  if (!Number.isFinite(minutes) || minutes < 1) return { unit: 'now', value: 0 };
  if (minutes < 60) return { unit: 'minutes', value: minutes };

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { unit: 'hours', value: hours };

  return { unit: 'days', value: Math.floor(hours / 24) };
}

async function fetchJson(url: string): Promise<any | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      console.warn(`[News] ${url} returned ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[News] Request failed for ${url}: ${message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export interface NewsResult {
  items: NewsItem[];
  /** True when the feeds could not be reached and this came from storage. */
  fromCache: boolean;
}

export async function fetchDisasterNews(
  userLat?: number,
  userLon?: number,
  limit = 20
): Promise<NewsResult> {
  // Settled independently: one feed being down should not blank the other.
  const [usgs, gdacs] = await Promise.all([fetchJson(USGS_URL), fetchJson(GDACS_URL)]);

  const items: NewsItem[] = [
    ...((usgs?.features ?? []).map(mapUsgsFeature) as (NewsItem | null)[]),
    ...((gdacs?.features ?? []).map(mapGdacsFeature) as (NewsItem | null)[]),
  ].filter((item): item is NewsItem => item !== null);

  if (items.length === 0) {
    const cached = await readCachedNews();
    return { items: annotateAndSort(cached, userLat, userLon).slice(0, limit), fromCache: true };
  }

  const ordered = annotateAndSort(items, userLat, userLon).slice(0, limit);
  await writeCachedNews(ordered);
  return { items: ordered, fromCache: false };
}

export async function readCachedNews(): Promise<NewsItem[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[News] Failed to read cache:', error);
    return [];
  }
}

async function writeCachedNews(items: NewsItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('[News] Failed to write cache:', error);
  }
}
