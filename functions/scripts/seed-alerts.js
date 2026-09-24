/**
 * Seeds the Firestore `alerts` collection.
 *
 * Security rules deny client writes to `alerts` on purpose — a forged alert
 * could trigger a false evacuation — so this runs through the Admin SDK, which
 * bypasses rules. The Admin SDK itself is free; only Cloud Functions *hosting*
 * requires the Blaze plan, so this works on Spark.
 *
 *   node functions/scripts/seed-alerts.js
 *   node functions/scripts/seed-alerts.js --at 31.52,74.35 --radius 1
 *   node functions/scripts/seed-alerts.js --expire alert-taunsa-2026
 *   node functions/scripts/seed-alerts.js --deactivate alert-taunsa-2026
 *
 * Requires a service account key at functions/service-account.json
 * (Firebase console → Project settings → Service accounts → Generate new
 * private key). That file is gitignored and must never be committed.
 */
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

const KEY_PATH = path.resolve(__dirname, '../service-account.json');

if (!fs.existsSync(KEY_PATH)) {
  console.error(`No service account key at ${KEY_PATH}`);
  console.error('Firebase console → Project settings → Service accounts → Generate new private key');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(KEY_PATH)) });
const db = admin.firestore();

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const inDays = (n) => new Date(Date.now() + n * DAY);

const ALERTS = {
  'alert-taunsa-2026': {
    zoneId: 'zone-taunsa-barrage',
    title: 'Taunsa Barrage Flood Warning',
    description: 'Heavy monsoon discharge expected. Prepare to move to higher ground.',
    severity: 'high',
    latitude: 30.6987,
    longitude: 70.8503,
    radiusKm: 15,
  },
  'alert-jacobabad-2026': {
    zoneId: 'zone-jacobabad',
    title: 'Jacobabad Extreme Heat Warning',
    description: 'Temperatures above 50°C forecast. Avoid outdoor exposure.',
    severity: 'critical',
    latitude: 27.2822,
    longitude: 68.4501,
    radiusKm: 30,
  },
  'alert-muzaffarabad-2026': {
    zoneId: 'zone-muzaffarabad',
    title: 'Muzaffarabad Aftershock Advisory',
    description: 'Continued seismic activity. Avoid damaged structures.',
    severity: 'medium',
    latitude: 34.359,
    longitude: 73.4713,
    radiusKm: 20,
  },
};

function flag(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function setAlert(id, data) {
  await db.collection('alerts').doc(id).set({
    ...data,
    isActive: true,
    createdAt: now,
    // Far enough out that the query keeps matching during testing.
    expiresAt: inDays(30),
  });
  console.log(`  ✓ ${id}  ${data.severity.padEnd(8)} ${data.radiusKm}km  ${data.title}`);
}

async function main() {
  const expire = flag('--expire');
  const deactivate = flag('--deactivate');

  if (expire) {
    await db.collection('alerts').doc(expire).update({ expiresAt: new Date(Date.now() - DAY) });
    console.log(`Expired ${expire} — it should vanish from the app within ~5s.`);
    return;
  }

  if (deactivate) {
    await db.collection('alerts').doc(deactivate).update({ isActive: false });
    console.log(`Deactivated ${deactivate} — it should vanish from the app within ~5s.`);
    return;
  }

  console.log('Seeding alerts:');
  for (const [id, data] of Object.entries(ALERTS)) {
    await setAlert(id, data);
  }

  // A zone centred on the tester, small enough to walk in and out of.
  const at = flag('--at');
  if (at) {
    const [latitude, longitude] = at.split(',').map(Number);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      console.error(`--at expects "lat,lon", received "${at}"`);
      process.exit(1);
    }
    const radiusKm = Number(flag('--radius') ?? 1);
    await setAlert('alert-field-test', {
      zoneId: 'zone-field-test',
      title: 'Field Test Zone',
      description: 'Temporary zone for walking in and out during device testing.',
      severity: 'high',
      latitude,
      longitude,
      radiusKm,
    });
  }

  const snapshot = await db.collection('alerts').get();
  console.log(`\n${snapshot.size} documents in alerts. Expiry set 30 days out.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  });
