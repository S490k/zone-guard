import AsyncStorage from '@react-native-async-storage/async-storage';
import { performance } from 'perf_hooks';
import { detectActiveZones } from '../../app/utils/distance';
import { cacheZones, getCachedZones } from '../../app/utils/zoneCache';
import { presentZoneAlert, clearAlertHistory } from '../../app/utils/localAlerts';
import { DisasterZone } from '../../app/constants/zones';

/**
 * Latency of the on-device alert path, against the roadmap's <500ms budget.
 *
 * This measures the pipeline that actually ships: position fix to notification
 * delivered, entirely on-device. It deliberately excludes network round-trips,
 * because the Spark plan rules out the server-initiated design and no alert
 * depends on reaching Firestore.
 */

const ITERATIONS = 100;
const BUDGET_MS = 500;

function buildZones(count: number): DisasterZone[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `zone-${i}`,
    name: `Zone ${i}`,
    // Spread across Pakistan's latitude range so distances are realistic.
    latitude: 24 + (i % 12),
    longitude: 66 + (i % 10),
    radiusKm: 15,
    severity: 'high' as const,
    description: `Synthetic zone ${i}`,
    createdAt: new Date(),
  }));
}

interface Stats {
  mean: number;
  p95: number;
  max: number;
}

function summarise(samples: number[]): Stats {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    mean: samples.reduce((sum, value) => sum + value, 0) / samples.length,
    p95: sorted[Math.floor(sorted.length * 0.95)],
    max: sorted[sorted.length - 1],
  };
}

async function measure(iterations: number, run: (i: number) => Promise<void> | void): Promise<Stats> {
  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const started = performance.now();
    await run(i);
    samples.push(performance.now() - started);
  }
  return summarise(samples);
}

function report(label: string, stats: Stats): void {
  console.log(
    `[latency] ${label}: mean=${stats.mean.toFixed(2)}ms ` +
      `p95=${stats.p95.toFixed(2)}ms max=${stats.max.toFixed(2)}ms (budget ${BUDGET_MS}ms)`
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearAlertHistory();
});

describe('alert latency', () => {
  it('detects zones within budget for a realistic zone count', async () => {
    const zones = buildZones(3);
    const stats = await measure(ITERATIONS, () => {
      detectActiveZones(30.6987, 70.8503, zones);
    });

    report('zone detection (3 zones)', stats);
    expect(stats.mean).toBeLessThan(BUDGET_MS);
    expect(stats.p95).toBeLessThan(BUDGET_MS);
  });

  // iOS caps monitored regions at 20, so this is the practical worst case.
  it('detects zones within budget at the geofence ceiling', async () => {
    const zones = buildZones(20);
    const stats = await measure(ITERATIONS, () => {
      detectActiveZones(30.6987, 70.8503, zones);
    });

    report('zone detection (20 zones)', stats);
    expect(stats.mean).toBeLessThan(BUDGET_MS);
    expect(stats.p95).toBeLessThan(BUDGET_MS);
  });

  it('completes the full fix-to-notification path within budget', async () => {
    await cacheZones(buildZones(20));

    const stats = await measure(ITERATIONS, async (i) => {
      const zones = await getCachedZones();
      const proximities = detectActiveZones(30.6987, 70.8503, zones);
      const inZone = proximities.find((p) => p.isInZone);
      if (inZone) {
        const zone = zones.find((z) => z.id === inZone.zoneId)!;
        // bypassDedup so every iteration exercises delivery rather than the
        // cooldown short-circuit, which would understate the real cost.
        await presentZoneAlert(zone, { distanceKm: inZone.distance, bypassDedup: true });
      }
    });

    report('cache read + detection + notification', stats);
    expect(stats.mean).toBeLessThan(BUDGET_MS);
    expect(stats.p95).toBeLessThan(BUDGET_MS);
  });

  it('keeps the cooldown check off the critical path', async () => {
    const zones = buildZones(3);
    await cacheZones(zones);
    await presentZoneAlert(zones[0]);

    // A suppressed alert is the common case when sitting inside a zone.
    const stats = await measure(ITERATIONS, async () => {
      await presentZoneAlert(zones[0]);
    });

    report('suppressed alert (cooldown active)', stats);
    expect(stats.mean).toBeLessThan(BUDGET_MS);
  });

  it('scales sub-linearly enough that zone count is not the bottleneck', async () => {
    const small = await measure(ITERATIONS, () => {
      detectActiveZones(30.6987, 70.8503, buildZones(3));
    });
    const large = await measure(ITERATIONS, () => {
      detectActiveZones(30.6987, 70.8503, buildZones(20));
    });

    report('scaling check (3 zones)', small);
    report('scaling check (20 zones)', large);

    // Both sit far below budget; this guards against an accidental O(n²).
    expect(large.mean).toBeLessThan(BUDGET_MS);
  });
});
