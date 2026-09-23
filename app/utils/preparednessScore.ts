import { SM2State } from '@utils/sm2';

export interface ProgressSnapshot {
  completedTaskIds: string[];
  completedKitIds: string[];
  quizStates: Record<string, SM2State>;
}

export interface ScoreBreakdown {
  total: number;
  tasks: number;
  kit: number;
  quiz: number;
}

export const SCORE_WEIGHTS = { tasks: 40, kit: 40, quiz: 20 } as const;

/**
 * A question counts as mastered at two successful repetitions. Requiring recall
 * across separate sessions is the point of spaced repetition — a single correct
 * answer shows recognition, not retention.
 */
export const MASTERY_REPETITIONS = 2;

function ratio(part: number, whole: number): number {
  return whole > 0 ? Math.min(1, part / whole) : 0;
}

/**
 * Preparedness as a 0-100 score over three weighted components. Kept pure and
 * separate from storage so it can be verified against fixtures.
 */
export function calculatePreparednessScore(
  progress: ProgressSnapshot,
  totals: { taskCount: number; kitCount: number; questionCount: number }
): ScoreBreakdown {
  const masteredCount = Object.values(progress.quizStates).filter(
    (state) => state.repetitions >= MASTERY_REPETITIONS
  ).length;

  const tasks = ratio(progress.completedTaskIds.length, totals.taskCount) * SCORE_WEIGHTS.tasks;
  const kit = ratio(progress.completedKitIds.length, totals.kitCount) * SCORE_WEIGHTS.kit;
  const quiz = ratio(masteredCount, totals.questionCount) * SCORE_WEIGHTS.quiz;

  return {
    tasks: Math.round(tasks),
    kit: Math.round(kit),
    quiz: Math.round(quiz),
    total: Math.round(tasks + kit + quiz),
  };
}
