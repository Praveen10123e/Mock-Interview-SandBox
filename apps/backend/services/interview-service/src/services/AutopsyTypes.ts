/**
 * AutopsyTypes.ts
 *
 * Core type definitions for Phase 5 — Interview Autopsy Engine.
 * Authoritative, evidence-first normalized data contracts.
 */

export type AutopsySourceType = 'CODING' | 'APTITUDE' | 'HR' | 'REPORT';

export type PatternType = 'SINGLE_OCCURRENCE' | 'EMERGING_PATTERN' | 'RECURRING' | 'PERSISTENT';

export type FindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FindingConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AutopsyEvidenceDetails {
  // Coding execution evidence (exact stored values, never rerun)
  attemptNumber?: number;
  passedCount?: number;
  totalCount?: number;
  failedTestCases?: Array<{
    testCaseId?: string;
    input?: string;
    expectedOutput?: string;
    actualOutput?: string;
    status?: string;
    error?: string;
  }>;
  compileOutput?: string | null;
  runtimeError?: string | null;
  primaryErrorType?: string | null;
  submittedCodeSnippet?: string | null;
  complexityIdentified?: string | null;

  // HR behavioral evidence (verified transcript preferred)
  questionText?: string;
  verifiedTranscript?: string | null;
  rawTranscript?: string | null;
  starAnalysis?: {
    situation?: boolean;
    task?: boolean;
    action?: boolean;
    result?: boolean;
    missingComponents?: string[];
  };
  dimensionScores?: Record<string, number>;
  speechMetrics?: {
    fillerWordCount?: number;
    fillerWordsPerMin?: number;
    speechPaceWpm?: number;
    pausesCount?: number;
  } | null;

  // Aptitude evidence
  options?: string[];
  selectedOptionIndex?: number | null;
  selectedOptionText?: string | null;
  correctOptionIndex?: number;
  correctOptionText?: string;
  topic?: string;
  category?: string | null;
  explanation?: string | null;
}

export interface AutopsyEvidence {
  id: string;
  sourceType: AutopsySourceType;
  sourceId: string;
  sessionId: string;
  interviewId: string;
  interviewTitle: string;
  interviewDate: string;
  questionId: string;
  questionTitle: string;
  evidenceType: string;
  description: string;
  score: number | null;
  details: AutopsyEvidenceDetails;
}

export interface AutopsyFinding {
  id: string;
  category: 'CODING' | 'APTITUDE' | 'HR' | 'CROSS_ROUND';
  skill: string;
  title: string;
  patternType: PatternType;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  frequency: number;
  interviewsAffected: number;
  interviewIds: string[];
  likelyRootCause: string;
  impact: string;
  recommendation: string;
  recommendedPractice: string;
  evidence: AutopsyEvidence[];
}

export interface AutopsyStrength {
  id: string;
  category: 'CODING' | 'APTITUDE' | 'HR' | 'OVERALL';
  skill: string;
  title: string;
  consistencyScore: number;
  interviewsDemonstrated: number;
  description: string;
  evidenceSnippet: string;
}

export interface AutopsyResolvedPattern {
  id: string;
  category: 'CODING' | 'APTITUDE' | 'HR';
  skill: string;
  title: string;
  initialScore: number;
  latestScore: number;
  scoreDelta: number;
  explanation: string;
  evidence: string;
}

export interface CrossRoundPattern {
  id: string;
  title: string;
  roundsInvolved: Array<'CODING' | 'APTITUDE' | 'HR'>;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  inference: string;
  impact: string;
  recommendation: string;
}

export interface AutopsySummaryResult {
  id: string;
  candidateId: string;
  generatedAt: string;
  analysisVersion: string;
  model: string;
  promptVersion: string;
  status: 'COMPLETED' | 'INSUFFICIENT_DATA';
  interviewsAnalyzed: number;
  isStale: boolean;
  staleReason?: string;
  findings: AutopsyFinding[];
  strengths: AutopsyStrength[];
  resolvedPatterns: AutopsyResolvedPattern[];
  crossRoundPatterns: CrossRoundPattern[];
  summary: string;
  kpis: {
    interviewsAnalyzed: number;
    recurringWeaknessesCount: number;
    highPriorityCount: number;
    improvedAreasCount: number;
  };
}
