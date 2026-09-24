import { computeNextReview, REMINDER_HOUR } from '../../app/utils/reviewReminders';
import { QuizProgress } from '../../app/utils/progressStore';

const state = (nextReviewDate: string): QuizProgress => ({
  easeFactor: 2.5,
  interval: 1,
  repetitions: 1,
  nextReviewDate,
});

/**
 * Fixtures are built in local time, not UTC. The function normalises delivery
 * to a local hour, so a UTC fixture lands on a different side of that boundary
 * depending on the runner's timezone — passing in London and failing in Karachi.
 */
const at = (year: number, monthIndex: number, day: number, hour = 0): string =>
  new Date(year, monthIndex, day, hour, 0, 0, 0).toISOString();

const NOW = new Date(2026, 8, 24, 14, 0, 0, 0);

describe('computeNextReview', () => {
  it('returns null when nothing has been answered', () => {
    expect(computeNextReview({}, NOW)).toBeNull();
  });

  it('picks the earliest due date across questions', () => {
    const due = computeNextReview(
      {
        a: state(at(2026, 8, 30)),
        b: state(at(2026, 8, 26)),
        c: state(at(2026, 9, 5)),
      },
      NOW
    );

    expect(due?.moment.getDate()).toBe(26);
  });

  /**
   * SM-2 stores a bare date carrying whatever time the question was last
   * answered. Delivering at that timestamp would fire in the middle of the
   * night for anyone revising late.
   */
  it('normalises the delivery time to a civil hour', () => {
    const due = computeNextReview({ a: state(at(2026, 8, 26, 3)) }, NOW);
    expect(due?.moment.getHours()).toBe(REMINDER_HOUR);
    expect(due?.moment.getMinutes()).toBe(0);
  });

  // A reminder arriving the instant you close the quiz teaches nothing.
  it('never schedules in the past', () => {
    const due = computeNextReview({ a: state(at(2026, 8, 1)) }, NOW);
    expect(due!.moment.getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('rolls an overdue question to the next reminder hour', () => {
    const due = computeNextReview({ a: state(at(2020, 0, 1)) }, NOW);
    expect(due?.moment.getHours()).toBe(REMINDER_HOUR);
    expect(due!.moment.getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('counts every question due by the scheduled moment', () => {
    const due = computeNextReview(
      {
        a: state(at(2026, 8, 26, 0)),
        b: state(at(2026, 8, 26, 5)),
        c: state(at(2026, 11, 1)),
      },
      NOW
    );

    expect(due?.count).toBe(2);
  });

  it('counts a single due question as one', () => {
    const due = computeNextReview({ a: state(at(2026, 8, 26)) }, NOW);
    expect(due?.count).toBe(1);
  });

  it('ignores entries with an unparseable date', () => {
    const due = computeNextReview(
      { broken: state('not-a-date'), good: state(at(2026, 8, 26)) },
      NOW
    );

    expect(due).not.toBeNull();
    expect(due?.count).toBe(1);
  });

  it('returns null when every date is unparseable', () => {
    expect(computeNextReview({ a: state('nonsense') }, NOW)).toBeNull();
  });
});
