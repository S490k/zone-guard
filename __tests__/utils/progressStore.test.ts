import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  readLocalProgress,
  writeLocalProgress,
  normaliseProgress,
  toggleId,
  EMPTY_PROGRESS,
  StoredProgress,
} from '../../app/utils/progressStore';

const sampleProgress: StoredProgress = {
  completedTaskIds: ['task-go-bag'],
  completedKitIds: ['kit-water', 'kit-food'],
  quizStates: {
    'q-eq-1': { easeFactor: 2.5, interval: 6, repetitions: 2, nextReviewDate: '2026-10-01T00:00:00.000Z' },
  },
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('toggleId', () => {
  it('adds an absent id', () => {
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('removes a present id', () => {
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('does not mutate the input', () => {
    const original = ['a'];
    toggleId(original, 'b');
    expect(original).toEqual(['a']);
  });
});

describe('normaliseProgress', () => {
  it('returns empty progress for non-objects', () => {
    expect(normaliseProgress(null)).toEqual(EMPTY_PROGRESS);
    expect(normaliseProgress('nonsense')).toEqual(EMPTY_PROGRESS);
    expect(normaliseProgress(undefined)).toEqual(EMPTY_PROGRESS);
  });

  it('strips non-string entries from id arrays', () => {
    const result = normaliseProgress({ completedTaskIds: ['valid', 42, null, 'also-valid'] });
    expect(result.completedTaskIds).toEqual(['valid', 'also-valid']);
  });

  it('drops quiz states missing required numeric fields', () => {
    const result = normaliseProgress({
      quizStates: {
        good: { easeFactor: 2.5, interval: 1, repetitions: 0, nextReviewDate: '2026-01-01T00:00:00.000Z' },
        missingInterval: { easeFactor: 2.5, repetitions: 0 },
        notAnObject: 'nope',
      },
    });

    expect(Object.keys(result.quizStates)).toEqual(['good']);
  });

  it('substitutes a review date when one is absent', () => {
    const result = normaliseProgress({
      quizStates: { q: { easeFactor: 2.5, interval: 1, repetitions: 0 } },
    });

    expect(typeof result.quizStates.q.nextReviewDate).toBe('string');
    expect(Number.isNaN(Date.parse(result.quizStates.q.nextReviewDate))).toBe(false);
  });

  // Firestore stores these under shorter names than the local shape uses.
  it('accepts the Firestore field names as aliases', () => {
    const result = normaliseProgress({
      tasks: ['from-firestore'],
      kit: ['kit-water'],
      quiz: { q: { easeFactor: 2.5, interval: 1, repetitions: 1, nextReviewDate: '2026-01-01T00:00:00.000Z' } },
    });

    expect(result.completedTaskIds).toEqual(['from-firestore']);
    expect(result.completedKitIds).toEqual(['kit-water']);
    expect(Object.keys(result.quizStates)).toEqual(['q']);
  });
});

describe('local persistence', () => {
  it('round-trips progress', async () => {
    await writeLocalProgress(sampleProgress);
    expect(await readLocalProgress()).toEqual(sampleProgress);
  });

  it('returns empty progress when nothing is stored', async () => {
    expect(await readLocalProgress()).toEqual(EMPTY_PROGRESS);
  });

  it('degrades to empty progress rather than throwing on corrupt data', async () => {
    await AsyncStorage.setItem('zoneguard:progress', '{ broken json');
    expect(await readLocalProgress()).toEqual(EMPTY_PROGRESS);
  });

  it('normalises malformed stored data on read', async () => {
    await AsyncStorage.setItem(
      'zoneguard:progress',
      JSON.stringify({ completedTaskIds: ['ok', 99], completedKitIds: 'not-an-array' })
    );

    const result = await readLocalProgress();
    expect(result.completedTaskIds).toEqual(['ok']);
    expect(result.completedKitIds).toEqual([]);
  });
});
