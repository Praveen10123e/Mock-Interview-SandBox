/**
 * HRScoreEngine.ts — Authoritative Deterministic Scoring Engine for HR Behavioral Interviews
 *
 * Implements the single source of truth for HR score calculations:
 * 1. 8 Core Dimensions (each 0 - 10):
 *    - relevance
 *    - specificity
 *    - evidence
 *    - structure
 *    - clarity
 *    - technicalDepth
 *    - ownership
 *    - professionalism
 *
 * 2. Question Score Formula:
 *    dimensionAverage = sum(8 dimension scores) / 8
 *    questionScore = Math.round(dimensionAverage * 10 * 100) / 100  (0 - 100 scale)
 *
 * 3. Overall HR Score Formula:
 *    overallHRScore = Math.round((sum(questionScores) / numberOfAnsweredQuestions) * 100) / 100
 *
 * Guarantees mathematical consistency:
 * Question-level score == HR report question score == HR category score == Overall HR score.
 */

export interface HRDimensionScores {
  relevance: number;
  specificity: number;
  evidence: number;
  structure: number;
  clarity: number;
  technicalDepth: number;
  ownership: number;
  professionalism: number;
}

export const HR_DIMENSION_KEYS: Array<keyof HRDimensionScores> = [
  'relevance',
  'specificity',
  'evidence',
  'structure',
  'clarity',
  'technicalDepth',
  'ownership',
  'professionalism',
];

export class HRScoreEngine {
  /**
   * Validates and clamps a dimension score to the 0 - 10 range.
   */
  static clampDimensionScore(val: unknown): number {
    if (typeof val !== 'number' || isNaN(val)) return 0;
    return Math.max(0, Math.min(10, Math.round(val * 10) / 10));
  }

  /**
   * Sanitizes all 8 dimension scores, ensuring each is within 0 - 10.
   */
  static sanitizeDimensionScores(rawScores: Partial<HRDimensionScores> | null | undefined): HRDimensionScores {
    const sanitized: HRDimensionScores = {
      relevance: 0,
      specificity: 0,
      evidence: 0,
      structure: 0,
      clarity: 0,
      technicalDepth: 0,
      ownership: 0,
      professionalism: 0,
    };

    if (!rawScores || typeof rawScores !== 'object') {
      return sanitized;
    }

    for (const key of HR_DIMENSION_KEYS) {
      sanitized[key] = this.clampDimensionScore(rawScores[key]);
    }

    return sanitized;
  }

  /**
   * Calculates the authoritative question score from the 8 dimension scores.
   * Formula: (sum of 8 dimensions / 8) * 10 -> Range 0 - 100.
   */
  static calculateQuestionScore(rawScores: Partial<HRDimensionScores> | null | undefined): number {
    const scores = this.sanitizeDimensionScores(rawScores);
    const sum = HR_DIMENSION_KEYS.reduce((acc, k) => acc + scores[k], 0);
    const dimensionAverage = sum / HR_DIMENSION_KEYS.length;
    const questionScore = dimensionAverage * 10;
    return Math.round(questionScore * 100) / 100;
  }

  /**
   * Calculates the overall HR score from an array of question scores.
   * Formula: sum(questionScores) / numberOfAnsweredQuestions -> Range 0 - 100.
   */
  static calculateOverallHRScore(questionScores: number[]): number {
    if (!Array.isArray(questionScores) || questionScores.length === 0) {
      return 0;
    }

    const validScores = questionScores.map((s) => (typeof s === 'number' && !isNaN(s) ? Math.max(0, Math.min(100, s)) : 0));
    const sum = validScores.reduce((acc, s) => acc + s, 0);
    const average = sum / validScores.length;
    return Math.round(average * 100) / 100;
  }

  /**
   * Calculates the aggregated average for each of the 8 dimensions across multiple responses.
   */
  static calculateAverageDimensionScores(
    allResponseDimensions: Array<Partial<HRDimensionScores>>
  ): HRDimensionScores {
    const result: HRDimensionScores = {
      relevance: 0,
      specificity: 0,
      evidence: 0,
      structure: 0,
      clarity: 0,
      technicalDepth: 0,
      ownership: 0,
      professionalism: 0,
    };

    if (!Array.isArray(allResponseDimensions) || allResponseDimensions.length === 0) {
      return result;
    }

    const count = allResponseDimensions.length;

    for (const key of HR_DIMENSION_KEYS) {
      const sum = allResponseDimensions.reduce((acc, r) => {
        const val = typeof r?.[key] === 'number' ? r[key]! : 0;
        return acc + Math.max(0, Math.min(10, val));
      }, 0);
      result[key] = Math.round((sum / count) * 10) / 10;
    }

    return result;
  }

  /**
   * Categorizes response quality deterministically based on score.
   */
  static classifyResponseQuality(score: number): 'empty' | 'weak' | 'adequate' | 'strong' | 'exceptional' {
    if (score <= 0) return 'empty';
    if (score < 40) return 'weak';
    if (score < 70) return 'adequate';
    if (score < 90) return 'strong';
    return 'exceptional';
  }

  static determineQuality(score: number): 'empty' | 'weak' | 'adequate' | 'strong' | 'exceptional' {
    return this.classifyResponseQuality(score);
  }
}
