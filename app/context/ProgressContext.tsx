import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@config/firebase';
import { computeSM2, initializeSM2, calculateQualityScore, SM2State } from '@utils/sm2';
import {
  StoredProgress,
  EMPTY_PROGRESS,
  QuizProgress,
  readLocalProgress,
  writeLocalProgress,
  normaliseProgress,
  toggleId,
} from '@utils/progressStore';
import {
  PREPAREDNESS_TASKS,
  EMERGENCY_KIT_ITEMS,
  QUIZ_QUESTIONS,
} from '@constants/preparedness';
import { calculatePreparednessScore, ScoreBreakdown } from '@utils/preparednessScore';
import { useAuth } from '@hooks/useAuth';

export interface ProgressContextValue {
  progress: StoredProgress;
  score: ScoreBreakdown;
  isLoading: boolean;
  isTaskComplete: (id: string) => boolean;
  isKitItemComplete: (id: string) => boolean;
  toggleTask: (id: string) => void;
  toggleKitItem: (id: string) => void;
  recordQuizAnswer: (questionId: string, isCorrect: boolean, secondsTaken: number) => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

const TOTALS = {
  taskCount: PREPAREDNESS_TASKS.length,
  kitCount: EMERGENCY_KIT_ITEMS.length,
  questionCount: QUIZ_QUESTIONS.length,
};

/** Average answering time used to grade recall speed into an SM-2 quality. */
const TARGET_ANSWER_SECONDS = 20;

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<StoredProgress>(EMPTY_PROGRESS);
  const [isLoading, setIsLoading] = useState(true);

  // Guards against a Firestore snapshot echoing back and clobbering a local
  // edit the user has made since the write was issued.
  const pendingWriteRef = useRef(false);
  // Set by local mutations so the sync effect can tell a user edit from a
  // remote snapshot or the initial storage load, which must not be re-written.
  const hasLocalEditRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = await readLocalProgress();
      if (cancelled) return;
      setProgress(local);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!db || !user) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        if (pendingWriteRef.current) {
          pendingWriteRef.current = false;
          return;
        }
        const remote = snapshot.data()?.progress;
        if (!remote) return;

        const normalised = normaliseProgress(remote);
        setProgress(normalised);
        writeLocalProgress(normalised);
      },
      (error) => console.error('[Progress] Listener error:', error.message)
    );

    return unsubscribe;
  }, [user]);

  // Local edits persist from an effect rather than inside the state updater,
  // so storage and network writes stay out of the render phase. Writing local
  // first means the UI never waits on the network.
  useEffect(() => {
    if (!hasLocalEditRef.current) return;
    hasLocalEditRef.current = false;

    writeLocalProgress(progress);

    if (!db || !user) return;
    pendingWriteRef.current = true;
    setDoc(doc(db, 'users', user.uid), { progress }, { merge: true }).catch((error) => {
      pendingWriteRef.current = false;
      console.error('[Progress] Failed to sync progress:', error.message);
    });
  }, [progress, user]);

  const toggleTask = useCallback((id: string) => {
    hasLocalEditRef.current = true;
    setProgress((current) => ({
      ...current,
      completedTaskIds: toggleId(current.completedTaskIds, id),
    }));
  }, []);

  const toggleKitItem = useCallback((id: string) => {
    hasLocalEditRef.current = true;
    setProgress((current) => ({
      ...current,
      completedKitIds: toggleId(current.completedKitIds, id),
    }));
  }, []);

  const recordQuizAnswer = useCallback(
    (questionId: string, isCorrect: boolean, secondsTaken: number) => {
      hasLocalEditRef.current = true;
      setProgress((current) => {
        const existing = current.quizStates[questionId];
        const priorState: SM2State = existing
          ? {
              easeFactor: existing.easeFactor,
              interval: existing.interval,
              repetitions: existing.repetitions,
            }
          : initializeSM2();

        const quality = calculateQualityScore(isCorrect, secondsTaken, TARGET_ANSWER_SECONDS);
        const result = computeSM2(priorState, quality);

        const updated: QuizProgress = {
          easeFactor: result.easeFactor,
          interval: result.interval,
          repetitions: result.repetitions,
          nextReviewDate: result.nextReviewDate.toISOString(),
        };

        return { ...current, quizStates: { ...current.quizStates, [questionId]: updated } };
      });
    },
    []
  );

  const score = useMemo(
    () => calculatePreparednessScore(progress, TOTALS),
    [progress]
  );

  const value = useMemo<ProgressContextValue>(
    () => ({
      progress,
      score,
      isLoading,
      isTaskComplete: (id) => progress.completedTaskIds.includes(id),
      isKitItemComplete: (id) => progress.completedKitIds.includes(id),
      toggleTask,
      toggleKitItem,
      recordQuizAnswer,
    }),
    [progress, score, isLoading, toggleTask, toggleKitItem, recordQuizAnswer]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress must be used inside a ProgressProvider');
  return context;
}

export default ProgressProvider;
