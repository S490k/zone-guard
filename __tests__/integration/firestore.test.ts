import fs from 'fs';
import path from 'path';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';

/**
 * Security-rule and atomicity tests against the Firestore emulator.
 *
 * `firebase emulators:exec` sets FIRESTORE_EMULATOR_HOST, so its presence is
 * the signal that an emulator is reachable. Without it these skip rather than
 * fail — and they skip *visibly*, instead of passing while asserting nothing.
 *
 *   npm run test:rules
 *
 * Requires a Java runtime, which the Firestore emulator depends on.
 */
const emulatorRunning = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const describeWithEmulator = emulatorRunning ? describe : describe.skip;

const OWNER = 'user-owner';
const INTRUDER = 'user-intruder';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  if (!emulatorRunning) return;

  testEnv = await initializeTestEnvironment({
    projectId: 'zoneguard-rules-test',
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

describeWithEmulator('users collection rules', () => {
  it('lets a user read their own document', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertSucceeds(getDoc(doc(db, 'users', OWNER)));
  });

  it('lets a user write their own document', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', OWNER), {
        lastKnownLocation: { latitude: 30.6987, longitude: 70.8503, timestamp: new Date() },
      })
    );
  });

  // Location history and progress are personal data; isolation is the point.
  it('denies reading another user document', async () => {
    const db = testEnv.authenticatedContext(INTRUDER).firestore();
    await assertFails(getDoc(doc(db, 'users', OWNER)));
  });

  it('denies writing another user document', async () => {
    const db = testEnv.authenticatedContext(INTRUDER).firestore();
    await assertFails(setDoc(doc(db, 'users', OWNER), { expoPushToken: 'stolen' }));
  });

  it('denies an unauthenticated read', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'users', OWNER)));
  });

  it('denies deletion even by the owner', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(
      import('firebase/firestore').then(({ deleteDoc }) => deleteDoc(doc(db, 'users', OWNER)))
    );
  });
});

describeWithEmulator('alerts collection rules', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'alerts', 'alert-taunsa'), {
        zoneId: 'zone-taunsa-barrage',
        title: 'Taunsa Barrage Flood Warning',
        description: 'Heavy monsoon discharge expected.',
        severity: 'high',
        latitude: 30.6987,
        longitude: 70.8503,
        radiusKm: 15,
        isActive: true,
        expiresAt: new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
      });
    });
  });

  it('lets any signed-in user read alerts', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertSucceeds(getDocs(collection(db, 'alerts')));
  });

  // A forged alert could trigger a false evacuation, so clients never write.
  it('denies a client writing an alert', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(
      setDoc(doc(db, 'alerts', 'forged'), { title: 'Fake emergency', isActive: true })
    );
  });

  it('denies modifying an existing alert', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(setDoc(doc(db, 'alerts', 'alert-taunsa'), { isActive: false }, { merge: true }));
  });

  it('denies an unauthenticated read', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(db, 'alerts')));
  });
});

describeWithEmulator('alertLog rules', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', OWNER, 'alertLog', 'entry-1'), {
        alertId: 'alert-taunsa',
        sentAt: new Date(),
        distance: 3.2,
      });
    });
  });

  it('lets the owner read their audit trail', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertSucceeds(getDoc(doc(db, 'users', OWNER, 'alertLog', 'entry-1')));
  });

  it('denies another user reading it', async () => {
    const db = testEnv.authenticatedContext(INTRUDER).firestore();
    await assertFails(getDoc(doc(db, 'users', OWNER, 'alertLog', 'entry-1')));
  });

  // The log is written by the Cloud Function through the Admin SDK, which
  // bypasses rules; a client forging entries would corrupt the audit trail.
  it('denies the owner writing to it', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(
      setDoc(doc(db, 'users', OWNER, 'alertLog', 'forged'), { alertId: 'made-up' })
    );
  });
});

describeWithEmulator('leaderboard rules', () => {
  const validEntry = { score: 72, handle: 'Guardian A3F2', updatedAt: new Date() };

  it('lets a signed-in user read the board', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertSucceeds(getDocs(collection(db, 'leaderboard')));
  });

  it('lets a user publish their own score', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertSucceeds(setDoc(doc(db, 'leaderboard', OWNER), validEntry));
  });

  it('denies writing another user entry', async () => {
    const db = testEnv.authenticatedContext(INTRUDER).firestore();
    await assertFails(setDoc(doc(db, 'leaderboard', OWNER), validEntry));
  });

  it('denies a score above the valid range', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(setDoc(doc(db, 'leaderboard', OWNER), { ...validEntry, score: 9999 }));
  });

  it('denies a negative score', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(setDoc(doc(db, 'leaderboard', OWNER), { ...validEntry, score: -1 }));
  });

  it('denies a non-integer score', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(setDoc(doc(db, 'leaderboard', OWNER), { ...validEntry, score: 72.5 }));
  });

  // The document is world-readable, so extra fields would leak whatever they
  // contain to every user of the app.
  it('denies smuggling extra fields into a public document', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(
      setDoc(doc(db, 'leaderboard', OWNER), {
        ...validEntry,
        lastKnownLocation: { latitude: 30.6987, longitude: 70.8503 },
      })
    );
  });

  it('denies an over-long handle', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(setDoc(doc(db, 'leaderboard', OWNER), { ...validEntry, handle: 'x'.repeat(64) }));
  });

  it('denies an unauthenticated read', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(db, 'leaderboard')));
  });
});

describeWithEmulator('unknown collections', () => {
  it('denies access to collections the rules do not name', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(setDoc(doc(db, 'arbitrary', 'thing'), { value: 1 }));
  });
});

describeWithEmulator('write atomicity', () => {
  it('applies a batched location and progress update as one commit', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    const batch = writeBatch(db);

    batch.set(doc(db, 'users', OWNER), {
      lastKnownLocation: { latitude: 30.6987, longitude: 70.8503, timestamp: new Date() },
    });
    batch.set(
      doc(db, 'users', OWNER),
      { progress: { completedTaskIds: ['task-go-bag'], completedKitIds: [], quizStates: {} } },
      { merge: true }
    );

    await assertSucceeds(batch.commit());

    const snapshot = await getDoc(doc(db, 'users', OWNER));
    expect(snapshot.data()?.lastKnownLocation.latitude).toBe(30.6987);
    expect(snapshot.data()?.progress.completedTaskIds).toEqual(['task-go-bag']);
  });

  // Partial application would leave a user's own document readable but their
  // neighbour's silently written — the batch must fail whole.
  it('rejects the entire batch when one write violates the rules', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    const batch = writeBatch(db);

    batch.set(doc(db, 'users', OWNER), { lastCheckedAt: new Date() });
    batch.set(doc(db, 'users', INTRUDER), { expoPushToken: 'stolen' });

    await assertFails(batch.commit());

    const snapshot = await getDoc(doc(db, 'users', OWNER));
    expect(snapshot.exists()).toBe(false);
  });

  it('lets a later merge preserve fields written earlier', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    const ref = doc(db, 'users', OWNER);

    await setDoc(ref, { expoPushToken: 'ExponentPushToken[abc]' });
    await setDoc(ref, { lastKnownLocation: { latitude: 1, longitude: 2 } }, { merge: true });

    const snapshot = await getDoc(ref);
    expect(snapshot.data()?.expoPushToken).toBe('ExponentPushToken[abc]');
    expect(snapshot.data()?.lastKnownLocation.latitude).toBe(1);
  });
});

if (!emulatorRunning) {
  describe('Firestore integration', () => {
    it.skip('requires the Firestore emulator — run `npm run test:rules`', () => {});
  });
}
