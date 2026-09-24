import { ProgressSnapshot, MASTERY_REPETITIONS } from '@utils/preparednessScore';

export interface AchievementTotals {
  taskCount: number;
  kitCount: number;
  questionCount: number;
  topicCount: number;
}

export type TierId = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Tier {
  id: TierId;
  /** Lowest score that earns this tier. */
  min: number;
  colour: string;
}

/**
 * Tiers give the leaderboard's bare number a meaning. Thresholds match the
 * bands the preparedness dial already uses, so the two never disagree about
 * how well prepared someone is.
 */
export const TIERS: Tier[] = [
  { id: 'platinum', min: 100, colour: '#1A56DB' },
  { id: 'gold', min: 75, colour: '#8A6100' },
  { id: 'silver', min: 50, colour: '#5B6472' },
  { id: 'bronze', min: 25, colour: '#9A4B1B' },
  { id: 'none', min: 0, colour: '#667085' },
];

export function tierForScore(score: number): Tier {
  return TIERS.find((tier) => score >= tier.min) ?? TIERS[TIERS.length - 1];
}

export interface BadgeDefinition {
  id: string;
  /** Ionicons glyph name, resolved in the UI so this stays free of UI imports. */
  icon: string;
  /** Fraction earned, 0 to 1. Lets the UI show partial progress, not just a lock. */
  progress: (snapshot: ProgressSnapshot, totals: AchievementTotals) => number;
}

function fraction(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(1, part / whole));
}

function masteredCount(snapshot: ProgressSnapshot): number {
  return Object.values(snapshot.quizStates).filter(
    (state) => state.repetitions >= MASTERY_REPETITIONS
  ).length;
}

/**
 * Every badge is a pure function of stored progress. Nothing here needs a new
 * data model, a server, or an event log — which is why they can be recomputed
 * from scratch on any device without drifting.
 */
export const BADGES: BadgeDefinition[] = [
  {
    id: 'first-step',
    icon: 'footsteps',
    progress: (p) => fraction(p.completedTaskIds.length, 1),
  },
  {
    id: 'planner',
    icon: 'clipboard',
    progress: (p, t) => fraction(p.completedTaskIds.length, t.taskCount),
  },
  {
    id: 'kit-started',
    icon: 'bag-add',
    progress: (p, t) => fraction(p.completedKitIds.length, Math.ceil(t.kitCount / 2)),
  },
  {
    id: 'kit-complete',
    icon: 'bag-check',
    progress: (p, t) => fraction(p.completedKitIds.length, t.kitCount),
  },
  {
    id: 'curious',
    icon: 'help-circle',
    progress: (p) => fraction(Object.keys(p.quizStates).length, 1),
  },
  {
    id: 'scholar',
    icon: 'school',
    progress: (p, t) => fraction(masteredCount(p), t.questionCount),
  },
  {
    id: 'ready',
    icon: 'shield-checkmark',
    progress: (p, t) =>
      fraction(
        p.completedTaskIds.length + p.completedKitIds.length + masteredCount(p),
        t.taskCount + t.kitCount + t.questionCount
      ),
  },
];

/** `progress` narrows from the definition's function to its evaluated value. */
export interface BadgeState extends Omit<BadgeDefinition, 'progress'> {
  progress: number;
  earned: boolean;
}

export function evaluateBadges(
  snapshot: ProgressSnapshot,
  totals: AchievementTotals
): BadgeState[] {
  return BADGES.map((badge) => {
    const value = badge.progress(snapshot, totals);
    return { ...badge, progress: value, earned: value >= 1 };
  });
}

export function earnedCount(badges: BadgeState[]): number {
  return badges.filter((badge) => badge.earned).length;
}
