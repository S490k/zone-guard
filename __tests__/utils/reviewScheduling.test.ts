import * as Notifications from 'expo-notifications';
import { syncReviewReminder, REVIEW_REMINDER_ID } from '../../app/utils/reviewReminders';
import { QuizProgress } from '../../app/utils/progressStore';

const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
const cancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;

/**
 * Due dates are pinned to midnight rather than "now plus n days". Reminders are
 * normalised to 09:00, so a fixture carrying the current time of day would fall
 * after the scheduled moment whenever the suite runs after 9am — passing in the
 * morning and failing in the evening.
 */
const due = (daysFromNow: number): QuizProgress => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(0, 0, 0, 0);
  return { easeFactor: 2.5, interval: 1, repetitions: 1, nextReviewDate: date.toISOString() };
};

const copy = (count: number) => ({
  title: 'Time to review',
  body: `${count} questions are ready`,
});

beforeEach(() => {
  jest.clearAllMocks();
  schedule.mockResolvedValue('scheduled-id');
  cancel.mockResolvedValue(undefined);
});

describe('syncReviewReminder', () => {
  it('schedules a reminder for a pending review', async () => {
    const moment = await syncReviewReminder({ q1: due(1) }, copy);

    expect(moment).toBeInstanceOf(Date);
    expect(schedule).toHaveBeenCalledTimes(1);
  });

  /**
   * Cancelling first is what keeps rescheduling idempotent. Without it, every
   * answered question would leave its own pending notification behind and the
   * user would be reminded several times for one review.
   */
  it('cancels the existing reminder before scheduling', async () => {
    await syncReviewReminder({ q1: due(1) }, copy);

    expect(cancel).toHaveBeenCalledWith(REVIEW_REMINDER_ID);
    expect(cancel.mock.invocationCallOrder[0]).toBeLessThan(
      schedule.mock.invocationCallOrder[0]
    );
  });

  it('reuses one identifier so reminders replace rather than accumulate', async () => {
    await syncReviewReminder({ q1: due(1) }, copy);
    expect(schedule.mock.calls[0][0].identifier).toBe(REVIEW_REMINDER_ID);
  });

  it('schedules against a date trigger', async () => {
    await syncReviewReminder({ q1: due(2) }, copy);

    const { trigger } = schedule.mock.calls[0][0];
    expect(trigger.type).toBe('date');
    expect(trigger.date).toBeInstanceOf(Date);
  });

  it('schedules only in the future', async () => {
    await syncReviewReminder({ q1: due(-5) }, copy);

    const { trigger } = schedule.mock.calls[0][0];
    expect(trigger.date.getTime()).toBeGreaterThan(Date.now());
  });

  // Nothing answered means nothing to come back to.
  it('schedules nothing when no question has been answered', async () => {
    const moment = await syncReviewReminder({}, copy);

    expect(moment).toBeNull();
    expect(schedule).not.toHaveBeenCalled();
  });

  it('still clears a stale reminder when nothing is due', async () => {
    await syncReviewReminder({}, copy);
    expect(cancel).toHaveBeenCalledWith(REVIEW_REMINDER_ID);
  });

  it('passes the due count to the copy builder', async () => {
    const spy = jest.fn(copy);
    await syncReviewReminder({ q1: due(1), q2: due(1), q3: due(30) }, spy);

    expect(spy).toHaveBeenCalledWith(2);
    expect(schedule.mock.calls[0][0].content.body).toContain('2 questions');
  });

  it('tags the payload so a tap can be routed', async () => {
    await syncReviewReminder({ q1: due(1) }, copy);
    expect(schedule.mock.calls[0][0].content.data.type).toBe('review_reminder');
  });

  // A scheduling failure must not break the progress save that triggered it.
  it('returns null rather than throwing when scheduling fails', async () => {
    schedule.mockRejectedValue(new Error('notifications disabled'));

    await expect(syncReviewReminder({ q1: due(1) }, copy)).resolves.toBeNull();
  });

  it('survives cancellation failing', async () => {
    cancel.mockRejectedValue(new Error('nothing to cancel'));

    const moment = await syncReviewReminder({ q1: due(1) }, copy);
    expect(moment).toBeInstanceOf(Date);
  });
});
