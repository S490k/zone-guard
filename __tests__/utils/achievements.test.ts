import {
  tierForScore,
  evaluateBadges,
  earnedCount,
  pickNewlyEarned,
  BADGES,
  TIERS,
  AchievementTotals,
} from '../../app/utils/achievements';
import { ProgressSnapshot, MASTERY_REPETITIONS } from '../../app/utils/preparednessScore';

const TOTALS: AchievementTotals = {
  taskCount: 5,
  kitCount: 10,
  questionCount: 9,
  topicCount: 3,
};

const empty: ProgressSnapshot = {
  completedTaskIds: [],
  completedKitIds: [],
  quizStates: {},
};

const ids = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

const mastered = { easeFactor: 2.5, interval: 6, repetitions: MASTERY_REPETITIONS };
const attempted = { easeFactor: 2.5, interval: 1, repetitions: 1 };

const withMastered = (n: number): ProgressSnapshot => ({
  ...empty,
  quizStates: Object.fromEntries(ids(n, 'q').map((id) => [id, mastered])),
});

function badge(snapshot: ProgressSnapshot, id: string) {
  return evaluateBadges(snapshot, TOTALS).find((b) => b.id === id)!;
}

describe('tierForScore', () => {
  it('awards no tier below the bronze threshold', () => {
    expect(tierForScore(0).id).toBe('none');
    expect(tierForScore(24).id).toBe('none');
  });

  it('awards each tier at its threshold', () => {
    expect(tierForScore(25).id).toBe('bronze');
    expect(tierForScore(50).id).toBe('silver');
    expect(tierForScore(75).id).toBe('gold');
    expect(tierForScore(100).id).toBe('platinum');
  });

  it('keeps a tier until the next threshold', () => {
    expect(tierForScore(49).id).toBe('bronze');
    expect(tierForScore(74).id).toBe('silver');
    expect(tierForScore(99).id).toBe('gold');
  });

  it('resolves a tier for every score in range', () => {
    for (let score = 0; score <= 100; score++) {
      expect(tierForScore(score)).toBeDefined();
    }
  });

  it('declares thresholds in descending order', () => {
    // The lookup returns the first match, so an out-of-order list would
    // silently award the wrong tier.
    const mins = TIERS.map((tier) => tier.min);
    expect([...mins].sort((a, b) => b - a)).toEqual(mins);
  });
});

describe('evaluateBadges', () => {
  it('earns nothing on a fresh profile', () => {
    expect(earnedCount(evaluateBadges(empty, TOTALS))).toBe(0);
  });

  it('reports every badge, earned or not', () => {
    expect(evaluateBadges(empty, TOTALS)).toHaveLength(BADGES.length);
  });

  it('earns the first-step badge on a single task', () => {
    const snapshot = { ...empty, completedTaskIds: ['task-go-bag'] };
    expect(badge(snapshot, 'first-step').earned).toBe(true);
    expect(badge(snapshot, 'planner').earned).toBe(false);
  });

  it('earns planner only when every task is done', () => {
    expect(badge({ ...empty, completedTaskIds: ids(4, 't') }, 'planner').earned).toBe(false);
    expect(badge({ ...empty, completedTaskIds: ids(5, 't') }, 'planner').earned).toBe(true);
  });

  it('earns kit-started at half the kit', () => {
    expect(badge({ ...empty, completedKitIds: ids(4, 'k') }, 'kit-started').earned).toBe(false);
    expect(badge({ ...empty, completedKitIds: ids(5, 'k') }, 'kit-started').earned).toBe(true);
  });

  // Answering is not mastering; the badge tracks the same bar the score uses.
  it('does not earn scholar from attempts alone', () => {
    const attempts: ProgressSnapshot = {
      ...empty,
      quizStates: Object.fromEntries(ids(9, 'q').map((id) => [id, attempted])),
    };
    expect(badge(attempts, 'curious').earned).toBe(true);
    expect(badge(attempts, 'scholar').earned).toBe(false);
  });

  it('earns scholar once every question is mastered', () => {
    expect(badge(withMastered(8), 'scholar').earned).toBe(false);
    expect(badge(withMastered(9), 'scholar').earned).toBe(true);
  });

  it('earns ready only on total completion', () => {
    const complete: ProgressSnapshot = {
      completedTaskIds: ids(5, 't'),
      completedKitIds: ids(10, 'k'),
      quizStates: withMastered(9).quizStates,
    };
    expect(badge(complete, 'ready').earned).toBe(true);
    expect(earnedCount(evaluateBadges(complete, TOTALS))).toBe(BADGES.length);
  });

  it('reports partial progress rather than only a locked state', () => {
    const half = badge({ ...empty, completedKitIds: ids(5, 'k') }, 'kit-complete');
    expect(half.earned).toBe(false);
    expect(half.progress).toBeCloseTo(0.5, 2);
  });

  // Stale ids from a removed task must not push a badge past completion.
  it('clamps progress to 1 when more items are complete than exist', () => {
    const inflated = badge({ ...empty, completedTaskIds: ids(20, 't') }, 'planner');
    expect(inflated.progress).toBe(1);
  });

  it('does not divide by zero when a category is empty', () => {
    const zeroed = evaluateBadges(empty, {
      taskCount: 0,
      kitCount: 0,
      questionCount: 0,
      topicCount: 0,
    });
    zeroed.forEach((b) => expect(Number.isNaN(b.progress)).toBe(false));
  });

  it('gives every badge a unique id', () => {
    const seen = new Set(BADGES.map((b) => b.id));
    expect(seen.size).toBe(BADGES.length);
  });
});

describe('pickNewlyEarned', () => {
  const oneTask: ProgressSnapshot = { ...empty, completedTaskIds: ['task-go-bag'] };

  it('returns nothing when no badge is earned', () => {
    expect(pickNewlyEarned(evaluateBadges(empty, TOTALS), [])).toEqual([]);
  });

  it('returns a badge earned since the last announcement', () => {
    const fresh = pickNewlyEarned(evaluateBadges(oneTask, TOTALS), []);
    expect(fresh.map((b) => b.id)).toContain('first-step');
  });

  // The subtle case: restoring existing progress on a new install must not
  // replay every achievement the user earned days ago.
  it('returns nothing when the badge was already announced', () => {
    const fresh = pickNewlyEarned(evaluateBadges(oneTask, TOTALS), ['first-step']);
    expect(fresh.map((b) => b.id)).not.toContain('first-step');
  });

  it('returns only the unannounced ones when several are earned', () => {
    const complete: ProgressSnapshot = {
      completedTaskIds: ids(5, 't'),
      completedKitIds: ids(10, 'k'),
      quizStates: withMastered(9).quizStates,
    };

    const fresh = pickNewlyEarned(evaluateBadges(complete, TOTALS), ['first-step', 'planner']);
    const freshIds = fresh.map((b) => b.id);

    expect(freshIds).not.toContain('first-step');
    expect(freshIds).not.toContain('planner');
    expect(freshIds).toContain('ready');
    expect(fresh).toHaveLength(BADGES.length - 2);
  });

  it('never returns a badge that is not yet earned', () => {
    const fresh = pickNewlyEarned(evaluateBadges(oneTask, TOTALS), []);
    fresh.forEach((badge) => expect(badge.earned).toBe(true));
  });
});
