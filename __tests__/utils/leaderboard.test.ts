import { setDoc, getDocs } from 'firebase/firestore';
import { handleForUid, publishScore, fetchTopScores, LEADERBOARD_SIZE } from '../../app/utils/leaderboard';

jest.mock('../../app/config/firebase', () => ({ db: {} }));

const setDocMock = setDoc as jest.Mock;
const getDocsMock = getDocs as jest.Mock;

function snapshotOf(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return { docs: docs.map((d) => ({ id: d.id, data: () => d.data })) };
}

beforeEach(() => {
  jest.clearAllMocks();
  setDocMock.mockResolvedValue(undefined);
});

describe('handleForUid', () => {
  it('is stable for the same uid', () => {
    expect(handleForUid('abc123')).toBe(handleForUid('abc123'));
  });

  it('differs between uids', () => {
    expect(handleForUid('abc123')).not.toBe(handleForUid('xyz789'));
  });

  // The leaderboard document is world-readable, so it must not carry the uid
  // itself, which is the key used for the owner-only user document.
  it('does not embed the raw uid', () => {
    expect(handleForUid('abc123')).not.toContain('abc123');
  });

  it('stays inside the 32-character limit the rules enforce', () => {
    const long = 'a'.repeat(200);
    expect(handleForUid(long).length).toBeLessThanOrEqual(32);
  });

  it('handles an empty uid without throwing', () => {
    expect(handleForUid('')).toMatch(/^Guardian /);
  });
});

describe('publishScore', () => {
  it('writes score and handle for the given uid', async () => {
    expect(await publishScore('abc123', 72)).toBe(true);

    const [, payload] = setDocMock.mock.calls[0];
    expect(payload.score).toBe(72);
    expect(payload.handle).toBe(handleForUid('abc123'));
  });

  // Rules require an integer in 0-100; a fractional score would be rejected.
  it('rounds a fractional score to an integer', async () => {
    await publishScore('abc123', 72.6);
    expect(setDocMock.mock.calls[0][1].score).toBe(73);
  });

  it('clamps a score above the permitted range', async () => {
    await publishScore('abc123', 150);
    expect(setDocMock.mock.calls[0][1].score).toBe(100);
  });

  it('clamps a negative score', async () => {
    await publishScore('abc123', -20);
    expect(setDocMock.mock.calls[0][1].score).toBe(0);
  });

  it('writes only the three permitted fields', async () => {
    await publishScore('abc123', 50);
    expect(Object.keys(setDocMock.mock.calls[0][1]).sort()).toEqual(['handle', 'score', 'updatedAt']);
  });

  it('reports failure rather than throwing when the write is rejected', async () => {
    setDocMock.mockRejectedValue(new Error('permission-denied'));
    expect(await publishScore('abc123', 50)).toBe(false);
  });
});

describe('fetchTopScores', () => {
  it('ranks entries in the order returned', async () => {
    getDocsMock.mockResolvedValue(
      snapshotOf([
        { id: 'u1', data: { score: 90, handle: 'Guardian AAAA' } },
        { id: 'u2', data: { score: 70, handle: 'Guardian BBBB' } },
      ])
    );

    const entries = await fetchTopScores();
    expect(entries.map((e) => e.rank)).toEqual([1, 2]);
    expect(entries[0].score).toBe(90);
  });

  it('flags the current user', async () => {
    getDocsMock.mockResolvedValue(
      snapshotOf([
        { id: 'u1', data: { score: 90, handle: 'Guardian AAAA' } },
        { id: 'me', data: { score: 70, handle: 'Guardian BBBB' } },
      ])
    );

    const entries = await fetchTopScores('me');
    expect(entries[0].isCurrentUser).toBe(false);
    expect(entries[1].isCurrentUser).toBe(true);
  });

  it('derives a handle when the stored document lacks one', async () => {
    getDocsMock.mockResolvedValue(snapshotOf([{ id: 'u1', data: { score: 50 } }]));

    const entries = await fetchTopScores();
    expect(entries[0].handle).toBe(handleForUid('u1'));
  });

  it('defaults a missing score to zero rather than NaN', async () => {
    getDocsMock.mockResolvedValue(snapshotOf([{ id: 'u1', data: { handle: 'Guardian AAAA' } }]));

    const entries = await fetchTopScores();
    expect(entries[0].score).toBe(0);
  });

  it('returns an empty list when nobody has published', async () => {
    getDocsMock.mockResolvedValue(snapshotOf([]));
    expect(await fetchTopScores()).toEqual([]);
  });

  it('returns an empty list rather than throwing on query failure', async () => {
    getDocsMock.mockRejectedValue(new Error('unavailable'));
    expect(await fetchTopScores()).toEqual([]);
  });

  it('caps the board at ten places', () => {
    expect(LEADERBOARD_SIZE).toBe(10);
  });
});
