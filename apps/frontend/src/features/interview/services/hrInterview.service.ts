/**
 * hrInterview.service.ts
 * 
 * Client-side API wrapper for the new HR Behavioral Interview module.
 */
import api from '../../../api/axios/instance';

const BASE = '/interviews';

export const HRInterviewAPI = {
  /** Initialize or resume the HR session — returns session with questions */
  initSession: async (interviewId: string, role = 'Software Engineer') => {
    const res = await api.post(`${BASE}/${interviewId}/hr/session`, { role });
    return res.data;
  },

  /** Get current HR session status + questions + evaluation */
  getSession: async (interviewId: string) => {
    const res = await api.get(`${BASE}/${interviewId}/hr/session`);
    return res.data;
  },

  /** Mark session as started (in progress) */
  startSession: async (interviewId: string) => {
    const res = await api.post(`${BASE}/${interviewId}/hr/start`);
    return res.data;
  },

  /** Submit a transcript response for a specific question */
  submitResponse: async (
    interviewId: string,
    questionId: string,
    transcript: string,
    durationSeconds: number
  ) => {
    const res = await api.post(`${BASE}/${interviewId}/hr/response`, {
      questionId,
      transcript,
      durationSeconds,
    });
    return res.data;
  },

  /** Complete the HR round and trigger AI evaluation */
  completeHR: async (interviewId: string) => {
    const res = await api.post(`${BASE}/${interviewId}/hr/complete`);
    return res.data;
  },

  /** Get detailed HR report with all scores */
  getReport: async (interviewId: string) => {
    const res = await api.get(`${BASE}/${interviewId}/hr/report`);
    return res.data;
  },

  /** Delete a recording file from the server */
  deleteRecording: async (interviewId: string, responseId: string) => {
    const res = await api.delete(`${BASE}/${interviewId}/hr/recording/${responseId}`);
    return res.data;
  },

  /** Upload question-specific video answer recording blob */
  uploadAnswerMedia: async (
    interviewId: string,
    questionId: string,
    videoBlob: Blob,
    durationSeconds: number
  ) => {
    const formData = new FormData();
    const ext = videoBlob.type?.includes('mp4') ? 'mp4' : 'webm';
    formData.append('file', videoBlob, `answer_${questionId}.${ext}`);
    formData.append('questionId', questionId);
    formData.append('durationSeconds', String(durationSeconds));
    formData.append('mimeType', videoBlob.type || 'video/webm');

    const res = await api.post(`${BASE}/${interviewId}/hr/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

// Types for use throughout the HR module

export interface AnswerMediaInfo {
  available: boolean;
  mediaId?: string;
  durationSeconds?: number;
  expiresAt?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  status: 'AVAILABLE' | 'EXPIRED' | 'DELETED' | 'UNAVAILABLE';
  reason?: string;
  watchUrl?: string;
  downloadUrl?: string;
}

export interface HRQuestion {
  id: string;
  question: string;
  category: string;
  questionType: 'MAIN' | 'FOLLOW_UP';
  sequence: number;
  difficulty?: string;
  competency?: string | null;
  selectionReason?: string | null;
  isFollowUpToId?: string | null;
  response?: {
    id: string;
    transcript: string;
    rawTranscript?: string;
    verifiedTranscript?: string;
    corrections?: Array<{
      original: string;
      corrected: string;
      reason: string;
      confidence: number;
    }>;
    uncertainSegments?: Array<{
      text: string;
      reason: string;
    }>;
    dimensionScores?: {
      relevance: number;
      specificity: number;
      evidence: number;
      structure: number;
      clarity: number;
      technicalDepth: number;
      ownership: number;
      professionalism: number;
    };
    questionScore?: number;
    justification?: string;
    strengths?: string[];
    areasForImprovement?: string[];
    starFormatDetected?: boolean;
    starAnalysis?: {
      starApplicable: boolean;
      situation: { present: boolean; score: number; evidence: string };
      task: { present: boolean; score: number; evidence: string };
      action: { present: boolean; score: number; evidence: string };
      result: { present: boolean; score: number; evidence: string };
      starScore: number;
      completeness: number;
      missingComponents: string[];
      feedback: string;
      improvedVersion: string;
      wordCount: number;
    } | null;
    speechAnalysis?: HRSpeechAnalysis | null;
    responseQuality?: string;
    evaluationStatus?: string;
    durationSeconds: number;
    wordCount: number;
    hasRecording: boolean;
    recordingPath?: string;
    answerMedia?: AnswerMediaInfo;
    submittedAt: string;
  } | null;
}

export interface HRSpeechAnalysis {
  analysisVersion?: string;
  model?: string;
  promptVersion?: string;
  generatedAt?: string;
  status: 'pending' | 'completed' | 'failed' | 'unavailable';
  fillerWords: {
    total: number;
    ratePer100Words: number;
    breakdown: Record<string, number>;
  };
  repetitions: {
    count: number;
    items: Array<{ text: string; type: string; count: number }>;
  };
  falseStarts: {
    count: number;
    items: Array<{ text: string; reason: string }>;
  };
  hesitations: {
    source: 'transcript' | 'audio';
    count: number;
    pauseCount: number | null;
    averagePauseMs: number | null;
  };
  speechPace: {
    wordCount: number;
    durationSeconds: number;
    wordsPerMinute: number | null;
    classification: 'slow' | 'normal' | 'fast' | 'very_fast' | 'unavailable';
  };
  confidenceMarkers: {
    confidenceCount: number;
    uncertaintyCount: number;
    confidenceRatio: number;
    confidenceExamples: string[];
    uncertaintyExamples: string[];
  };
  sentenceStructure: {
    sentenceCount: number;
    averageWordsPerSentence: number;
    longestSentenceWords: number;
    fragmentedSentenceCount: number;
  };
  communicationAssessment: {
    clarity: string;
    conciseness: string;
    fluency: string;
  };
  recommendations: string[];
}

export interface HRSpeechSummary {
  totalFillerWords: number;
  averageFillerRate: number;
  totalRepetitions: number;
  totalFalseStarts: number;
  averageWpm: number | null;
  paceClassification: string;
  overallClarity: string;
  overallFluency: string;
  topFillerWords: Array<{ word: string; count: number }>;
  totalConfidenceMarkers: number;
  totalUncertaintyMarkers: number;
  coachingRecommendations: string[];
}

export interface HRInterviewSummary {
  analysisVersion?: string;
  model?: string;
  promptVersion?: string;
  generatedAt?: string;
  status: 'completed' | 'insufficient_evidence' | 'failed';
  executiveSummary: string;
  topStrengths: Array<{
    title: string;
    description?: string;
    strength?: string;
    evidence: string;
    sourceQuestionIds: string[];
  }>;
  areasForImprovement: Array<{
    title: string;
    description?: string;
    area?: string;
    evidence: string;
    impact: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    sourceQuestionIds: string[];
  }>;
  overallAssessment: {
    officialScore: number;
    scoreSource: 'HRScoreEngine';
    category: string;
    summary: string;
  };
  communicationAssessment: {
    summary: string;
    strengths: string[];
    improvements: string[];
  };
  starAssessment: {
    applicableResponses: number;
    completeResponses: number;
    missingResultResponses: number;
    summary: string;
  };
  strongestDimensions: Array<{
    dimension: string;
    averageScore: number;
  }>;
  weakestDimensions: Array<{
    dimension: string;
    averageScore: number;
  }>;
  recommendedPracticeFocus: Array<{
    focus: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  readinessScore: number | null;
  assessmentLimitations: string[];
}

export interface HRSessionEvaluation {
  communicationScore: number;
  problemSolvingScore: number;
  teamworkScore: number;
  professionalismScore: number;
  relevanceScore: number;
  clarityScore: number;
  ownershipScore: number;
  leadershipScore: number;
  confidenceScore: number;
  structureScore: number;
  overallScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  starGuidance: string;
  aiSummary: string;
  speechSummary?: HRSpeechSummary | null;
  summary?: HRInterviewSummary | null;
}

export interface HRSession {
  id: string;
  interviewId: string;
  position: string;
  interviewType: string;
  status: 'READY' | 'IN_PROGRESS' | 'ANALYZING' | 'COMPLETED';
  startedAt?: string;
  completedAt?: string;
  overallScore?: number;
  questions: HRQuestion[];
  evaluation?: HRSessionEvaluation | null;
}

export const SCORING_DIMENSIONS = [
  { key: 'communicationScore',   label: 'Communication',    weight: 20, color: '#6366f1' },
  { key: 'problemSolvingScore',  label: 'Problem Solving',  weight: 15, color: '#8b5cf6' },
  { key: 'teamworkScore',        label: 'Teamwork',         weight: 15, color: '#a855f7' },
  { key: 'professionalismScore', label: 'Professionalism',  weight: 15, color: '#ec4899' },
  { key: 'relevanceScore',       label: 'Relevance',        weight: 15, color: '#f59e0b' },
  { key: 'clarityScore',         label: 'Clarity',          weight: 10, color: '#10b981' },
  { key: 'ownershipScore',       label: 'Ownership',        weight:  5, color: '#14b8a6' },
  { key: 'leadershipScore',      label: 'Leadership',       weight:  5, color: '#3b82f6' },
  { key: 'confidenceScore',      label: 'Confidence',       weight:  0, color: '#f97316' },
  { key: 'structureScore',       label: 'Structure',        weight:  0, color: '#64748b' },
] as const;
