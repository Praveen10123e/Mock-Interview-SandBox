/**
 * PersonalizedImprovementTypes.ts
 *
 * Data contracts for Phase 7 — Personalized Improvement Loop.
 * Answers: "WHAT SHOULD I DO NEXT TO IMPROVE?"
 * Converts stored interview evidence, Autopsy failure patterns, and DNA skill trajectories
 * into an actionable, evidence-grounded practice and reassessment plan.
 */

export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type LoopTaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'IMPROVING'
  | 'TARGET_REACHED'
  | 'REGRESSED'
  | 'STALE';

export interface PracticeTask {
  id: string;
  type: 'CODING_PROBLEM' | 'APTITUDE_SET' | 'HR_STAR_RESPONSE' | 'TECHNICAL_EXPLANATION' | 'MOCK_REASSESSMENT';
  title: string;
  description: string;
  category: string;
  canonicalSkillId: string;
  estimatedMinutes: number;
  practiceRoute: string; // Real existing route in the platform
  actionLabel: string;
  requiredCount: number;
  completedCount: number;
  isCompleted: boolean;
  completionNote?: string;
}

export interface TargetProvenance {
  canonicalSkillId: string;
  skillTitle: string;
  baselineScore: number;
  currentScore: number;
  targetScore: number;
  scoreDeltaNeeded: number;
  sourceEvidenceIds: string[];
  reassessmentMethod: string;
  status: LoopTaskStatus;
  verifiedReassessmentScore?: number | null;
  lastEvaluatedAt?: string;
}

export interface ImprovementPriority {
  id: string;
  rank: number;
  category: 'CODING' | 'APTITUDE' | 'HR' | 'CROSS_ROUND';
  canonicalSkillId: string; // Universal canonical skill identifier
  skillKey: string;
  title: string;
  priorityLevel: PriorityLevel;
  priorityScore: number; // Deterministic ranking score (0-100, internal debug metric)
  currentScore: number;
  targetScore: number;
  scoreDeltaNeeded: number;
  status: LoopTaskStatus;
  statusLabel: string;
  rationale: string; // Explains WHY this was selected based on evidence
  evidenceSummary: string;
  evidenceSourceIds: string[];
  tasks: PracticeTask[];
  provenance: TargetProvenance;
  reassessmentMethod: string;
}

export interface ImprovementCoaching {
  coachingSummary: string;
  priorityGuidance: Array<{
    priorityId: string;
    skillTitle: string;
    actionAdvice: string;
    commonMistakeToAvoid: string;
    suggestedStructure: string;
  }>;
}

export interface ReassessmentGuidance {
  isReadyForReassessment: boolean;
  reassessmentType: 'FULL_MOCK' | 'CODING_STAGE' | 'APTITUDE_STAGE' | 'HR_STAGE';
  recommendedSession: string;
  reassessmentReason: string;
  targetMetrics: string[];
}

export interface PersonalizedImprovementPlanResult {
  id: string;
  candidateId: string;
  generatedAt: string;
  analysisVersion: string;
  status: 'ACTIVE' | 'TARGETS_REACHED' | 'INSUFFICIENT_DATA';
  interviewsAnalyzed: number;
  isStale: boolean;
  staleReason?: string;
  sourceAutopsySnapshotId?: string;
  sourceDNASnapshotId?: string;
  topPriorities: ImprovementPriority[]; // Focused Top 3 action priorities
  secondaryPriorities: ImprovementPriority[]; // Medium / low backlog
  coaching: ImprovementCoaching;
  reassessment: ReassessmentGuidance;
  summary: string;
  kpis: {
    activePrioritiesCount: number;
    tasksInProgressCount: number;
    skillsImprovingCount: number;
    targetsReachedCount: number;
  };
}
