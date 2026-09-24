import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BadgeState,
  evaluateBadges,
  pickNewlyEarned,
  AchievementTotals,
} from '@utils/achievements';
import {
  PREPAREDNESS_TASKS,
  EMERGENCY_KIT_ITEMS,
  QUIZ_QUESTIONS,
  QUIZ_TOPICS,
} from '@constants/preparedness';
import { useProgress } from '@context/ProgressContext';

const ANNOUNCED_KEY = 'zoneguard:announcedBadges';

const TOTALS: AchievementTotals = {
  taskCount: PREPAREDNESS_TASKS.length,
  kitCount: EMERGENCY_KIT_ITEMS.length,
  questionCount: QUIZ_QUESTIONS.length,
  topicCount: QUIZ_TOPICS.length,
};

export interface AchievementsContextValue {
  badges: BadgeState[];
  /** The badge currently being celebrated, if any. */
  celebrating: BadgeState | null;
  dismissCelebration: () => void;
}

const AchievementsContext = createContext<AchievementsContextValue>({
  badges: [],
  celebrating: null,
  dismissCelebration: () => {},
});

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const { progress, isLoading } = useProgress();

  const [queue, setQueue] = useState<BadgeState[]>([]);
  const announcedRef = useRef<string[] | null>(null);

  const badges = useMemo(() => evaluateBadges(progress, TOTALS), [progress]);

  useEffect(() => {
    if (isLoading) return;

    (async () => {
      // First pass after launch seeds the announced set from what is already
      // earned, so restoring progress does not replay every past achievement.
      if (announcedRef.current === null) {
        const stored = await AsyncStorage.getItem(ANNOUNCED_KEY).catch(() => null);
        if (stored) {
          try {
            announcedRef.current = JSON.parse(stored);
          } catch {
            announcedRef.current = [];
          }
        } else {
          announcedRef.current = badges.filter((b) => b.earned).map((b) => b.id);
          await AsyncStorage.setItem(ANNOUNCED_KEY, JSON.stringify(announcedRef.current)).catch(
            () => {}
          );
          return;
        }
      }

      // Narrowed: the seeding branch above either assigns or returns early.
      const announced = announcedRef.current ?? [];
      const fresh = pickNewlyEarned(badges, announced);
      if (fresh.length === 0) return;

      announcedRef.current = [...announced, ...fresh.map((b) => b.id)];
      await AsyncStorage.setItem(ANNOUNCED_KEY, JSON.stringify(announcedRef.current)).catch(
        () => {}
      );

      // Queued rather than replaced: finishing a quiz can earn two at once,
      // and the second should not overwrite the first mid-animation.
      setQueue((current) => [...current, ...fresh]);
    })();
  }, [badges, isLoading]);

  const value = useMemo<AchievementsContextValue>(
    () => ({
      badges,
      celebrating: queue[0] ?? null,
      dismissCelebration: () => setQueue((current) => current.slice(1)),
    }),
    [badges, queue]
  );

  return (
    <AchievementsContext.Provider value={value}>{children}</AchievementsContext.Provider>
  );
}

export function useAchievements(): AchievementsContextValue {
  return useContext(AchievementsContext);
}

export default AchievementsProvider;
