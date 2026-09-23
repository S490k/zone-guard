import {
  calculatePreparednessScore,
  SCORE_WEIGHTS,
  MASTERY_REPETITIONS,
  ProgressSnapshot,
} from '../../app/utils/preparednessScore';

const TOTALS = { taskCount: 5, kitCount: 10, questionCount: 9 };

const emptyProgress: ProgressSnapshot = {
  completedTaskIds: [],
  completedKitIds: [],
  quizStates: {},
};

const masteredState = { easeFactor: 2.5, interval: 6, repetitions: MASTERY_REPETITIONS };
const unmasteredState = { easeFactor: 2.5, interval: 1, repetitions: 1 };

describe('calculatePreparednessScore', () => {
  it('scores zero when nothing is complete', () => {
    expect(calculatePreparednessScore(emptyProgress, TOTALS)).toEqual({
      total: 0,
      tasks: 0,
      kit: 0,
      quiz: 0,
    });
  });

  it('scores 100 when everything is complete', () => {
    const complete: ProgressSnapshot = {
      completedTaskIds: ['a', 'b', 'c', 'd', 'e'],
      completedKitIds: Array.from({ length: 10 }, (_, i) => `k${i}`),
      quizStates: Object.fromEntries(
        Array.from({ length: 9 }, (_, i) => [`q${i}`, masteredState])
      ),
    };

    expect(calculatePreparednessScore(complete, TOTALS).total).toBe(100);
  });

  it('weights each component independently', () => {
    const tasksOnly = { ...emptyProgress, completedTaskIds: ['a', 'b', 'c', 'd', 'e'] };
    const result = calculatePreparednessScore(tasksOnly, TOTALS);

    expect(result.tasks).toBe(SCORE_WEIGHTS.tasks);
    expect(result.kit).toBe(0);
    expect(result.quiz).toBe(0);
    expect(result.total).toBe(SCORE_WEIGHTS.tasks);
  });

  it('awards partial credit proportionally', () => {
    // Half the kit, nothing else: half of the kit weight.
    const halfKit = {
      ...emptyProgress,
      completedKitIds: Array.from({ length: 5 }, (_, i) => `k${i}`),
    };

    expect(calculatePreparednessScore(halfKit, TOTALS).kit).toBe(SCORE_WEIGHTS.kit / 2);
  });

  it('excludes questions answered correctly but not yet mastered', () => {
    const singleRepetition: ProgressSnapshot = {
      ...emptyProgress,
      quizStates: Object.fromEntries(
        Array.from({ length: 9 }, (_, i) => [`q${i}`, unmasteredState])
      ),
    };

    expect(calculatePreparednessScore(singleRepetition, TOTALS).quiz).toBe(0);
  });

  it('counts a question once it reaches the mastery threshold', () => {
    const oneMastered: ProgressSnapshot = {
      ...emptyProgress,
      quizStates: { 'q-0': masteredState },
    };

    const result = calculatePreparednessScore(oneMastered, TOTALS);
    expect(result.quiz).toBe(Math.round(SCORE_WEIGHTS.quiz / TOTALS.questionCount));
  });

  it('caps at the weight when more items are complete than exist', () => {
    // Guards against stale ids left behind by a removed task inflating the score.
    const staleIds = {
      ...emptyProgress,
      completedTaskIds: ['a', 'b', 'c', 'd', 'e', 'removed-task'],
    };

    expect(calculatePreparednessScore(staleIds, TOTALS).tasks).toBe(SCORE_WEIGHTS.tasks);
  });

  it('does not divide by zero when a category is empty', () => {
    const result = calculatePreparednessScore(emptyProgress, {
      taskCount: 0,
      kitCount: 0,
      questionCount: 0,
    });

    expect(result.total).toBe(0);
    expect(Number.isNaN(result.total)).toBe(false);
  });
});
