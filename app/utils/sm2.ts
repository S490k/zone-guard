// SM-2 Spaced Repetition Algorithm
// Quality scale: 0-5
// 0 = complete blackout
// 1 = blackout with serious difficulty
// 2 = serious difficulty
// 3 = difficulty, serious errors
// 4 = difficulty, minor errors
// 5 = perfect response

export interface SM2State {
  easeFactor: number;
  interval: number; // days
  repetitions: number;
}

export interface SM2Result extends SM2State {
  nextReviewDate: Date;
}

// Initialize SM-2 state for new question
export function initializeSM2(): SM2State {
  return {
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
  };
}

// Compute next SM-2 state based on user response quality
export function computeSM2(
  currentState: SM2State,
  quality: number
): SM2Result {
  if (quality < 0 || quality > 5) {
    throw new Error('Quality must be between 0 and 5');
  }

  let { easeFactor, interval, repetitions } = currentState;

  // Quality >= 3 means success
  if (quality >= 3) {
    repetitions += 1;

    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 3;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  } else {
    // Failure: reset repetitions
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor
  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    easeFactor,
    interval,
    repetitions,
    nextReviewDate,
  };
}

// Calculate quality score (0-5) based on user accuracy
export function calculateQualityScore(
  isCorrect: boolean,
  timeSpentSeconds: number,
  avgTimeSeconds: number
): number {
  if (!isCorrect) {
    // Incorrect answer = quality 2
    return 2;
  }

  // Correct answer: quality based on speed
  if (timeSpentSeconds <= avgTimeSeconds * 0.5) {
    return 5; // Perfect + fast
  } else if (timeSpentSeconds <= avgTimeSeconds) {
    return 5; // Perfect
  } else if (timeSpentSeconds <= avgTimeSeconds * 1.5) {
    return 4; // Good with minor hesitation
  } else {
    return 3; // Correct but slow
  }
}

// Get description of ease factor level
export function getEaseFactorDescription(easeFactor: number): string {
  if (easeFactor < 1.3) return 'Critical';
  if (easeFactor < 1.5) return 'Very Difficult';
  if (easeFactor < 1.8) return 'Difficult';
  if (easeFactor < 2.1) return 'Moderate';
  if (easeFactor < 2.4) return 'Good';
  return 'Excellent';
}

export default {
  initializeSM2,
  computeSM2,
  calculateQualityScore,
  getEaseFactorDescription,
};
