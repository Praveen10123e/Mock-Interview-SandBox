/**
 * InterviewDNATypes.ts
 *
 * Authoritative data contracts for Phase 6 — Interview DNA / Skill Genome.
 * Answers: "How am I improving over time?" / "How is my skill profile changing across interviews?"
 */

export type TrendDirection =
  | 'STRONG_IMPROVEMENT'
  | 'MODERATE_IMPROVEMENT'
  | 'STABLE'
  | 'MODERATE_REGRESSION'
  | 'STRONG_REGRESSION'
  | 'INSUFFICIENT_HISTORY';

export type DNAStatus = 'COMPLETED' | 'BASELINE_ONLY' | 'INSUFFICIENT_DATA';

export interface CanonicalSkillMetric {
  key: string;
  name: string;
  category: 'HR_BEHAVIORAL' | 'CODING_TECHNICAL' | 'APTITUDE_LOGIC' | 'CORE_COMPETENCY';
  currentScore: number | null; // 0 - 100, or null if insufficient data
  baselineScore: number | null; // 0 - 100
  previousScore: number | null; // from the interview immediately preceding the latest
  absoluteChange: number | null; // latest - first
  growthRate: number | null; // % change, null if baseline is 0 or unavailable
  trend: TrendDirection;
  history: Array<{
    interviewId: string;
    interviewNumber: number;
    formattedDate: string;
    score: number;
  }>;
  description: string;
  isReliable: boolean;
}

export interface LongitudinalTimelinePoint {
  interviewId: string;
  interviewNumber: number;
  title: string;
  formattedDate: string;
  completedAt: string;
  overallScore: number | null;
  aptitudeScore: number | null;
  codingScore: number | null;
  hrScore: number | null;
  hrDimensions: Record<string, number>;
  codingTestsPassedRatio?: string;
  aptitudeAccuracyRatio?: string;
}

export interface SkillGrowthItem {
  skillKey: string;
  skillName: string;
  category: string;
  baselineScore: number;
  latestScore: number;
  absoluteChange: number;
  growthRate: number | null;
  trend: TrendDirection;
  evidence: string;
  sourceInterviewIds: string[];
}

export interface StableStrengthItem {
  skillKey: string;
  skillName: string;
  category: string;
  averageScore: number;
  scoreRange: { min: number; max: number };
  interviewsDemonstrated: number;
  description: string;
  evidence: string;
}

export interface DNAMilestone {
  id: string;
  type: 'FIRST_INTERVIEW' | 'SCORE_MILESTONE' | 'COMPETENCY_MASTERY' | 'STABILITY' | 'WEAKNESS_RESOLVED';
  title: string;
  description: string;
  interviewId: string;
  interviewNumber: number;
  achievedAt: string;
}

export interface RoundProgression {
  round: 'APTITUDE' | 'CODING' | 'HR';
  name: string;
  baselineScore: number | null;
  latestScore: number | null;
  absoluteChange: number | null;
  growthRate: number | null;
  trend: TrendDirection;
  history: Array<{ interviewNumber: number; formattedDate: string; score: number | null }>;
  summary: string;
}

export interface HRDimensionProgression {
  dimensionKey: string;
  dimensionName: string;
  description: string;
  baselineScore: number | null;
  latestScore: number | null;
  absoluteChange: number | null;
  growthRate: number | null;
  trend: TrendDirection;
  history: Array<{ interviewNumber: number; formattedDate: string; score: number }>;
}

export interface AutopsyDNABridge {
  recurringWeaknessesCount: number;
  activeFindings: Array<{
    skill: string;
    title: string;
    severity: string;
    patternType: string;
    interviewsAffected: number;
    trendStatus: 'IMPROVING_BUT_BELOW_TARGET' | 'STABLE_WEAKNESS' | 'RECENT_REGRESSION';
    note: string;
  }>;
  resolvedFindings: Array<{
    skill: string;
    title: string;
    scoreDelta: number;
    resolutionNote: string;
  }>;
}

export interface AIInterpretation {
  overview: string;
  strongestGrowthSummary: string;
  regressionsWarning: string | null;
  stableStrengthsSummary: string;
  coachingObservations: string[];
  nextFocusAreas: Array<{
    skill: string;
    reason: string;
    actionAdvice: string;
  }>;
}

export interface InterviewDNASummaryResult {
  id: string;
  candidateId: string;
  generatedAt: string;
  analysisVersion: string;
  model: string;
  promptVersion: string;
  status: DNAStatus;
  interviewsAnalyzed: number;
  sourceInterviewIds: string[];
  isStale: boolean;
  staleReason?: string;
  currentProfile: {
    skills: CanonicalSkillMetric[];
    overallReadinessScore: number | null;
    readinessTier: 'DEVELOPING' | 'INTERVIEW_READY' | 'STRONG' | 'HIGHLY_CONSISTENT' | 'INSUFFICIENT_HISTORY';
    readinessDescription: string;
  };
  timelineSnapshots: LongitudinalTimelinePoint[];
  strongestGrowth: SkillGrowthItem[];
  recentRegressions: SkillGrowthItem[];
  stableStrengths: StableStrengthItem[];
  roundEvolution: RoundProgression[];
  hrDimensionEvolution: HRDimensionProgression[];
  milestones: DNAMilestone[];
  autopsyConnection: AutopsyDNABridge | null;
  aiInterpretation: AIInterpretation | null;
  summary: string;
  kpis: {
    interviewsAnalyzed: number;
    currentScore: number | null;
    strongestGrowthSkill: string | null;
    strongestGrowthDelta: number | null;
    priorityFocusSkill: string | null;
  };
}
