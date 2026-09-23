import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { db } from '@config/firebase';

export interface LeaderboardEntry {
  uid: string;
  rank: number;
  handle: string;
  score: number;
  isCurrentUser: boolean;
}

export const LEADERBOARD_SIZE = 10;

/**
 * A stable, non-identifying handle derived from the uid.
 *
 * Accounts are anonymous, so there is no name to show. Publishing the raw uid
 * would leak a value used elsewhere as a key, and the roadmap's suggestion of
 * showing email addresses would put personal data in a world-readable document.
 */
export function handleForUid(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash << 5) - hash + uid.charCodeAt(i);
    hash |= 0; // keep it a 32-bit int
  }
  const suffix = Math.abs(hash).toString(16).toUpperCase().slice(0, 4).padStart(4, '0');
  return `Guardian ${suffix}`;
}

/** Publishes the signed-in user's score. Scores are per-user documents. */
export async function publishScore(uid: string, score: number): Promise<boolean> {
  if (!db) return false;

  try {
    await setDoc(doc(db, 'leaderboard', uid), {
      // Rules require an int in 0-100; a fractional score would be rejected.
      score: Math.max(0, Math.min(100, Math.round(score))),
      handle: handleForUid(uid),
      updatedAt: new Date(),
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Leaderboard] Failed to publish score:', message);
    return false;
  }
}

export async function fetchTopScores(currentUid?: string): Promise<LeaderboardEntry[]> {
  if (!db) return [];

  try {
    const snapshot = await getDocs(
      query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(LEADERBOARD_SIZE))
    );

    return snapshot.docs.map((entry, index) => {
      const data = entry.data();
      return {
        uid: entry.id,
        rank: index + 1,
        handle: typeof data.handle === 'string' ? data.handle : handleForUid(entry.id),
        score: typeof data.score === 'number' ? data.score : 0,
        isCurrentUser: entry.id === currentUid,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Leaderboard] Failed to fetch scores:', message);
    return [];
  }
}
