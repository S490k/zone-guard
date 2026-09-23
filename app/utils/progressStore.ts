import AsyncStorage from '@react-native-async-storage/async-storage';
import { SM2State } from '@utils/sm2';

const PROGRESS_KEY = 'zoneguard:progress';

export interface QuizProgress extends SM2State {
  /** ISO string — Date does not survive JSON or Firestore maps intact. */
  nextReviewDate: string;
}

export interface StoredProgress {
  completedTaskIds: string[];
  completedKitIds: string[];
  quizStates: Record<string, QuizProgress>;
}

export const EMPTY_PROGRESS: StoredProgress = {
  completedTaskIds: [],
  completedKitIds: [],
  quizStates: {},
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function asQuizStates(value: unknown): Record<string, QuizProgress> {
  if (!value || typeof value !== 'object') return {};

  const result: Record<string, QuizProgress> = {};
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') continue;
    const state = raw as Partial<QuizProgress>;
    if (
      typeof state.easeFactor !== 'number' ||
      typeof state.interval !== 'number' ||
      typeof state.repetitions !== 'number'
    ) {
      continue;
    }
    result[id] = {
      easeFactor: state.easeFactor,
      interval: state.interval,
      repetitions: state.repetitions,
      nextReviewDate: typeof state.nextReviewDate === 'string'
        ? state.nextReviewDate
        : new Date().toISOString(),
    };
  }
  return result;
}

/**
 * Accepts progress from either storage or Firestore. Both are untrusted enough
 * to warrant shape checking: a malformed document should degrade to empty
 * progress rather than crash a screen mid-render.
 */
export function normaliseProgress(value: unknown): StoredProgress {
  if (!value || typeof value !== 'object') return EMPTY_PROGRESS;
  const raw = value as Record<string, unknown>;
  return {
    completedTaskIds: asStringArray(raw.completedTaskIds ?? raw.tasks),
    completedKitIds: asStringArray(raw.completedKitIds ?? raw.kit),
    quizStates: asQuizStates(raw.quizStates ?? raw.quiz),
  };
}

export async function readLocalProgress(): Promise<StoredProgress> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    return raw ? normaliseProgress(JSON.parse(raw)) : EMPTY_PROGRESS;
  } catch (error) {
    console.error('[Progress] Failed to read local progress:', error);
    return EMPTY_PROGRESS;
  }
}

export async function writeLocalProgress(progress: StoredProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('[Progress] Failed to write local progress:', error);
  }
}

export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];
}
