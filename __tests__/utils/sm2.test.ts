import {
  initializeSM2,
  computeSM2,
  calculateQualityScore,
  getEaseFactorDescription,
} from '../../app/utils/sm2';

describe('SM-2 Algorithm', () => {
  describe('Initialization', () => {
    it('initializes with correct default values', () => {
      const state = initializeSM2();
      expect(state.easeFactor).toBe(2.5);
      expect(state.interval).toBe(1);
      expect(state.repetitions).toBe(0);
    });
  });

  describe('Success Scenarios (quality >= 3)', () => {
    it('handles first correct response', () => {
      const initial = initializeSM2();
      const result = computeSM2(initial, 5);

      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1);
      expect(result.easeFactor).toBe(2.6); // Default + 0.1
    });

    it('handles second correct response', () => {
      const initial = initializeSM2();
      const after1st = computeSM2(initial, 5);
      const after2nd = computeSM2(after1st, 5);

      expect(after2nd.repetitions).toBe(2);
      expect(after2nd.interval).toBe(3);
    });

    it('applies ease factor multiplication from third review onwards', () => {
      let state = initializeSM2();
      state = computeSM2(state, 5); // 1st
      state = computeSM2(state, 5); // 2nd
      expect(state.interval).toBe(3);

      state = computeSM2(state, 5); // 3rd
      expect(state.interval).toBeGreaterThan(3);
      // interval = 3 * easeFactor, which should be > 3
    });

    it('increases ease factor for quality 5', () => {
      const initial = initializeSM2();
      const result = computeSM2(initial, 5);
      expect(result.easeFactor).toBeGreaterThan(initial.easeFactor);
    });

    it('decreases ease factor for quality 3', () => {
      const initial = initializeSM2();
      const result = computeSM2(initial, 3);
      expect(result.easeFactor).toBeLessThan(initial.easeFactor);
    });
  });

  describe('Failure Scenarios (quality < 3)', () => {
    it('resets to first repetition on failure', () => {
      let state = initializeSM2();
      state = computeSM2(state, 5); // 1st success
      state = computeSM2(state, 5); // 2nd success
      expect(state.repetitions).toBe(2);

      state = computeSM2(state, 2); // Failure
      expect(state.repetitions).toBe(0);
      expect(state.interval).toBe(1);
    });

    it('handles quality 0 (complete blackout)', () => {
      const initial = initializeSM2();
      const result = computeSM2(initial, 0);

      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
      expect(result.easeFactor).toBeLessThan(initial.easeFactor);
    });

    it('maintains minimum ease factor of 1.3', () => {
      let state = initializeSM2();
      // Simulate repeated failures to drive ease factor down
      for (let i = 0; i < 10; i++) {
        state = computeSM2(state, 0);
      }
      expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
    });
  });

  describe('Quality Score Calculation', () => {
    it('returns 2 for incorrect answers', () => {
      const quality = calculateQualityScore(false, 5, 10);
      expect(quality).toBe(2);
    });

    it('returns 5 for perfect + fast responses', () => {
      const quality = calculateQualityScore(true, 2, 10); // 2 sec vs avg 10
      expect(quality).toBe(5);
    });

    it('returns 5 for perfect responses at normal speed', () => {
      const quality = calculateQualityScore(true, 10, 10); // Exactly average
      expect(quality).toBe(5);
    });

    it('returns 4 for correct responses with minor hesitation', () => {
      const quality = calculateQualityScore(true, 12, 10); // 20% slower
      expect(quality).toBe(4);
    });

    it('returns 3 for correct but slow responses', () => {
      const quality = calculateQualityScore(true, 20, 10); // 2x slower
      expect(quality).toBe(3);
    });
  });

  describe('Ease Factor Description', () => {
    it('describes different ease factor ranges', () => {
      expect(getEaseFactorDescription(1.2)).toBe('Critical');
      expect(getEaseFactorDescription(1.4)).toBe('Very Difficult');
      expect(getEaseFactorDescription(1.7)).toBe('Difficult');
      expect(getEaseFactorDescription(2.0)).toBe('Moderate');
      expect(getEaseFactorDescription(2.3)).toBe('Good');
      expect(getEaseFactorDescription(2.6)).toBe('Excellent');
    });
  });

  describe('Input Validation', () => {
    it('throws error for invalid quality score (< 0)', () => {
      const initial = initializeSM2();
      expect(() => computeSM2(initial, -1)).toThrow('Quality must be between 0 and 5');
    });

    it('throws error for invalid quality score (> 5)', () => {
      const initial = initializeSM2();
      expect(() => computeSM2(initial, 6)).toThrow('Quality must be between 0 and 5');
    });
  });

  describe('Next Review Date Calculation', () => {
    it('calculates correct next review date', () => {
      const initial = initializeSM2();
      const result = computeSM2(initial, 5);

      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + result.interval);

      // Allow 1-minute difference (test execution time)
      const diff = Math.abs(result.nextReviewDate.getTime() - expectedDate.getTime());
      expect(diff).toBeLessThan(60000);
    });
  });
});
