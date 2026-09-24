import * as Notifications from 'expo-notifications';
import { QuizProgress } from '@utils/progressStore';

/** Single identifier, so rescheduling replaces rather than accumulates. */
export const REVIEW_REMINDER_ID = 'zoneguard:review-reminder';

/** Reminders land mid-morning rather than at the exact moment recall decays. */
export const REMINDER_HOUR = 9;

export interface DueReview {
  /** When to notify — the due date, moved to a civil hour. */
  moment: Date;
  /** Questions due at or before that moment. */
  count: number;
}

/**
 * Earliest pending review, as a moment worth interrupting someone for.
 *
 * SM-2 produces a bare date; delivering at that timestamp would fire at
 * whatever time of day the question was last answered, including the middle of
 * the night. The hour is normalised, and a due date already in the past becomes
 * the next upcoming reminder hour rather than firing instantly — a reminder that
 * arrives the second you close the quiz teaches nothing.
 *
 * Pure so it can be verified against fixtures.
 */
export function computeNextReview(
  quizStates: Record<string, QuizProgress>,
  now: Date = new Date()
): DueReview | null {
  const dates = Object.values(quizStates)
    .map((state) => new Date(state.nextReviewDate))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (dates.length === 0) return null;

  const earliest = dates.reduce((a, b) => (a < b ? a : b));

  const moment = new Date(earliest);
  moment.setHours(REMINDER_HOUR, 0, 0, 0);

  // Already past — roll forward to the next reminder hour.
  if (moment.getTime() <= now.getTime()) {
    moment.setTime(now.getTime());
    moment.setHours(REMINDER_HOUR, 0, 0, 0);
    if (moment.getTime() <= now.getTime()) {
      moment.setDate(moment.getDate() + 1);
      moment.setHours(REMINDER_HOUR, 0, 0, 0);
    }
  }

  const count = dates.filter((date) => date.getTime() <= moment.getTime()).length;

  return { moment, count };
}

export interface ReminderCopy {
  title: string;
  body: string;
}

/**
 * Reschedules the review reminder to match current progress. Returns the
 * scheduled moment, or null when there is nothing to review.
 */
export async function syncReviewReminder(
  quizStates: Record<string, QuizProgress>,
  copy: (count: number) => ReminderCopy
): Promise<Date | null> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REVIEW_REMINDER_ID).catch(() => {});

    const due = computeNextReview(quizStates);
    if (!due) return null;

    const { title, body } = copy(due.count);

    await Notifications.scheduleNotificationAsync({
      identifier: REVIEW_REMINDER_ID,
      content: { title, body, data: { type: 'review_reminder' } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: due.moment,
      },
    });

    console.log(
      `[Reviews] Reminder set for ${due.moment.toISOString()} (${due.count} due)`
    );
    return due.moment;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Reviews] Failed to schedule reminder:', message);
    return null;
  }
}
