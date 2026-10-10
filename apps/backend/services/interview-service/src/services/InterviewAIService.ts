/**
 * InterviewAIService.ts
 *
 * Core AI engine for the HR Behavioral Interview Module.
 * - Question generation from curated bank (20+ placement behavioral questions)
 * - Dynamic follow-up generation via Groq LLM with deterministic fallback
 * - Evidence-based question-specific rubric evaluation
 * - Deterministic scoring engine with traceable criterion evidence
 */

import axios from 'axios';
import { HRTranscriptValidator } from './HRTranscriptValidator';
import { HRScoreEngine, HRDimensionScores } from './HRScoreEngine';
import {
  HRRubricService,
  QuestionRubric,
  CriterionEvidenceResult,
  DeterministicEvaluationResult,
} from './HRRubrics';

const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'GROQ').toUpperCase();
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

export interface HREvaluationResult {
  dimensionScores: HRDimensionScores;
  overallScore: number;
  justification: string;
  strengths: string[];
  areasForImprovement: string[];
  starFormatDetected: boolean;
  wordCount: number;
  responseQuality: 'empty' | 'weak' | 'adequate' | 'strong' | 'exceptional';
  metadata: {
    analysisVersion: string;
    model: string;
    promptVersion: string;
    generatedAt: string;
    status: 'completed' | 'failed' | 'skipped';
  };
}

// ─── Phase 2: STAR & Adaptive Contracts ──────────────────────────────────────

export interface STARComponentResult {
  present: boolean;
  score: number; // 0 - 10
  evidence: string;
}

export interface STARAnalysisResult {
  starApplicable: boolean;
  situation: STARComponentResult;
  task: STARComponentResult;
  action: STARComponentResult;
  result: STARComponentResult;
  starScore: number;
  completeness: number;
  missingComponents: Array<'Situation' | 'Task' | 'Action' | 'Result'>;
  feedback: string;
  improvedVersion: string;
  wordCount: number;
  metadata: {
    analysisVersion: string;
    model: string;
    promptVersion: string;
    generatedAt: string;
    status: 'completed' | 'failed' | 'skipped';
  };
}

export interface AdaptiveSelectorInput {
  previousQuestion: string;
  previousQuestionId: string;
  previousScore: number;
  responseQuality: 'empty' | 'weak' | 'adequate' | 'strong' | 'exceptional';
  stage?: string;
  candidateTechLevel?: string;
  candidateProfile?: any;
  remainingQuestionBank?: CuratedQuestion[];
  previousCompetencies: string[];
  usedQuestionIds: string[];
}

export interface AdaptiveSelectorResult {
  nextQuestionId: string;
  nextQuestionText: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  competency: string;
  reasoning: string;
  followUp: boolean;
}

// ─── Curated Behavioral Question Bank ─────────────────────────────────────────

export interface CuratedQuestion {
  id: string;
  question: string;
  category: 'Self Introduction' | 'Project Challenge' | 'Teamwork' | 'Conflict Resolution' | 'Ownership' | 'Leadership' | 'Adaptability' | 'Situational';
  competency: 'communication' | 'problem-solving' | 'teamwork' | 'conflict-resolution' | 'ownership' | 'leadership' | 'adaptability' | 'technical-depth' | 'situational';
  difficulty: 'easy' | 'medium' | 'hard';
  starApplicable: boolean;
  sequence: number;
}

export const BEHAVIORAL_QUESTION_BANK: CuratedQuestion[] = [
  // --- Self Introduction (Always First) ---
  {
    id: 'bh-intro-1',
    question: 'Please introduce yourself. Tell me about your academic background, your core technical skills, and what motivated you to pursue a career in software engineering.',
    category: 'Self Introduction',
    competency: 'communication',
    difficulty: 'easy',
    starApplicable: false,
    sequence: 1,
  },

  // --- Project Challenge / Problem Solving ---
  {
    id: 'bh-proj-easy-1',
    question: 'Tell me about a time when you had to learn a new technology, framework, or programming language under a tight deadline. How did you approach the learning curve?',
    category: 'Project Challenge',
    competency: 'problem-solving',
    difficulty: 'easy',
    starApplicable: true,
    sequence: 2,
  },
  {
    id: 'bh-proj-med-1',
    question: 'Walk me through a scenario where your initial technical solution did not work as expected. How did you debug and pivot to reach the final solution?',
    category: 'Project Challenge',
    competency: 'problem-solving',
    difficulty: 'medium',
    starApplicable: true,
    sequence: 2,
  },
  {
    id: 'bh-proj-hard-1',
    question: 'Describe the most technically challenging project you have worked on. What was the problem, what architectural tradeoffs did you evaluate, and what were the measurable system outcomes?',
    category: 'Project Challenge',
    competency: 'problem-solving',
    difficulty: 'hard',
    starApplicable: true,
    sequence: 2,
  },

  // --- Teamwork ---
  {
    id: 'bh-team-easy-1',
    question: 'Describe a situation where you worked with a partner or small team on a coding project. How did you divide the work and keep each other updated?',
    category: 'Teamwork',
    competency: 'teamwork',
    difficulty: 'easy',
    starApplicable: true,
    sequence: 3,
  },
  {
    id: 'bh-team-med-1',
    question: 'Describe a situation where you collaborated effectively with a diverse team to deliver a product feature or resolve a critical bug. What was your specific contribution?',
    category: 'Teamwork',
    competency: 'teamwork',
    difficulty: 'medium',
    starApplicable: true,
    sequence: 3,
  },
  {
    id: 'bh-team-hard-1',
    question: 'Tell me about a time when you had to work with team members who had conflicting technical opinions on a critical design decision. How did you reach consensus and maintain project momentum?',
    category: 'Teamwork',
    competency: 'teamwork',
    difficulty: 'hard',
    starApplicable: true,
    sequence: 3,
  },

  // --- Conflict Resolution ---
  {
    id: 'bh-conf-easy-1',
    question: 'Have you ever had a disagreement with a peer or teammate about a project task assignment? How did you talk it through and resolve it?',
    category: 'Conflict Resolution',
    competency: 'conflict-resolution',
    difficulty: 'easy',
    starApplicable: true,
    sequence: 3,
  },
  {
    id: 'bh-conf-med-1',
    question: 'Give me an example of a conflict or disagreement you had with a teammate or supervisor. How did you handle it, and what was the result?',
    category: 'Conflict Resolution',
    competency: 'conflict-resolution',
    difficulty: 'medium',
    starApplicable: true,
    sequence: 3,
  },
  {
    id: 'bh-conf-hard-1',
    question: 'Describe a time when you had to manage competing priorities from multiple stakeholders who held contradictory technical expectations. How did you decide what to focus on and communicate that constructively?',
    category: 'Conflict Resolution',
    competency: 'conflict-resolution',
    difficulty: 'hard',
    starApplicable: true,
    sequence: 3,
  },

  // --- Ownership ---
  {
    id: 'bh-own-easy-1',
    question: 'Tell me about a situation where you took initiative and completed a project task without waiting to be asked.',
    category: 'Ownership',
    competency: 'ownership',
    difficulty: 'easy',
    starApplicable: true,
    sequence: 4,
  },
  {
    id: 'bh-own-med-1',
    question: 'Tell me about a situation where you took initiative and went beyond what was asked of you to ensure a project or task succeeded.',
    category: 'Ownership',
    competency: 'ownership',
    difficulty: 'medium',
    starApplicable: true,
    sequence: 4,
  },
  {
    id: 'bh-own-hard-1',
    question: 'Describe a time when something went severely wrong on a project or system you were responsible for. What immediate action did you take to fix it, how did you handle accountability, and what did you learn?',
    category: 'Ownership',
    competency: 'ownership',
    difficulty: 'hard',
    starApplicable: true,
    sequence: 4,
  },

  // --- Leadership ---
  {
    id: 'bh-lead-easy-1',
    question: 'Tell me about a time you mentored a junior teammate or helped a peer understand a complex technical topic.',
    category: 'Leadership',
    competency: 'leadership',
    difficulty: 'easy',
    starApplicable: true,
    sequence: 4,
  },
  {
    id: 'bh-lead-med-1',
    question: 'Describe a time you led a team or sub-team, even informally. How did you motivate your teammates and ensure everyone was aligned on the goal?',
    category: 'Leadership',
    competency: 'leadership',
    difficulty: 'medium',
    starApplicable: true,
    sequence: 4,
  },
  {
    id: 'bh-lead-hard-1',
    question: 'Describe a scenario where a project was falling behind schedule and team morale was low. How did you step up to realign technical priorities and motivate the team to deliver successfully?',
    category: 'Leadership',
    competency: 'leadership',
    difficulty: 'hard',
    starApplicable: true,
    sequence: 4,
  },

  // --- Adaptability ---
  {
    id: 'bh-adapt-easy-1',
    question: 'Tell me about a time you had to work in an environment or with tools that were completely unfamiliar to you. How did you manage?',
    category: 'Adaptability',
    competency: 'adaptability',
    difficulty: 'easy',
    starApplicable: true,
    sequence: 4,
  },
  {
    id: 'bh-adapt-med-1',
    question: 'Describe a time when project requirements changed significantly in the middle of development. How did you adapt and what was the final outcome?',
    category: 'Adaptability',
    competency: 'adaptability',
    difficulty: 'medium',
    starApplicable: true,
    sequence: 4,
  },
  {
    id: 'bh-adapt-hard-1',
    question: 'Walk me through a situation where a core architectural assumption was invalidated late in development. How did you redesign and adapt under tight constraints?',
    category: 'Adaptability',
    competency: 'adaptability',
    difficulty: 'hard',
    starApplicable: true,
    sequence: 4,
  },

  // --- Situational / Technical Depth ---
  {
    id: 'bh-sit-med-1',
    question: 'Imagine you are given a critical bug in production with no clear documentation, and the original developer is unavailable. Walk me through your debugging strategy.',
    category: 'Situational',
    competency: 'situational',
    difficulty: 'medium',
    starApplicable: true,
    sequence: 4,
  },
  {
    id: 'bh-sit-hard-1',
    question: 'You join a new team and discover that the codebase has significant technical debt causing latency spikes. How would you approach refactoring it while still delivering new features on schedule?',
    category: 'Situational',
    competency: 'technical-depth',
    difficulty: 'hard',
    starApplicable: true,
    sequence: 4,
  },
];

// Deterministic follow-up bank (fallback when LLM unavailable)
const DETERMINISTIC_FOLLOWUPS: Record<string, string[]> = {
  'Self Introduction': [
    'You mentioned your technical skills — can you elaborate on one project where you directly applied one of those skills to solve a real problem?',
    'What specific aspect of software engineering excites you the most, and how are you actively building expertise in that area?',
  ],
  'Project Challenge': [
    'Could you describe a specific technical edge case or bug you encountered in that project and how you resolved it step by step?',
    'Looking back, what is one architectural or design decision from that project you would approach differently today, and why?',
    'How did you communicate your technical approach to non-technical teammates or stakeholders?',
  ],
  'Teamwork': [
    'What specific actions did you take to keep the team aligned when there was ambiguity in requirements?',
    'How did you handle a situation where a teammate was not delivering their part of the work on time?',
  ],
  'Conflict Resolution': [
    'What was the most difficult part of that conversation, and what specific technique helped you de-escalate?',
    'What did you learn about working with people from that experience that you now apply proactively?',
  ],
  'Ownership': [
    'How did you measure the success of your initiative? What were the quantifiable outcomes?',
    'What risks did you identify upfront before taking that initiative, and how did you mitigate them?',
  ],
  'Leadership': [
    'How did you identify and leverage each team member\'s individual strengths to maximize the team\'s output?',
    'What was the hardest feedback you had to give to a teammate, and how did you deliver it constructively?',
  ],
  'Adaptability': [
    'Specifically, what learning resources or strategies helped you get up to speed the fastest?',
    'How did the experience of adapting to that change affect your approach to future uncertainties?',
  ],
  'Situational': [
    'In that scenario, how would you communicate your debugging progress and any blockers to your manager without creating panic?',
    'What documentation would you create after resolving the situation to prevent recurrence?',
  ],
};

// ─── Evaluation Types ──────────────────────────────────────────────────────────

export interface BehavioralEvaluation {
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
  criteriaEvidence?: CriterionEvidenceResult[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isLLMAvailable(): boolean {
  return LLM_PROVIDER === 'GROQ' && !!LLM_API_KEY && LLM_API_KEY.length > 10;
}

async function callGroq(messages: Array<{ role: string; content: string }>, maxTokens = 600): Promise<string> {
  const response = await axios.post(
    GROQ_API_URL,
    {
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2, // Low temperature for deterministic scoring consistency
    },
    {
      headers: {
        Authorization: `Bearer ${LLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 18000,
    }
  );
  return response.data?.choices?.[0]?.message?.content?.trim() || '';
}

function clamp(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Deterministic Heuristic Evaluator (used when LLM is offline or fails).
 * Strictly evidence-based: NO arbitrary base 48! Points are awarded strictly
 * based on verified evidence matching the question's rubric criteria.
 */
function heuristicEvaluation(
  question: string,
  category: string,
  verifiedTranscript: string,
  durationSeconds: number
): DeterministicEvaluationResult {
  const rubric = HRRubricService.getRubricForQuestion(question, category);
  const words = verifiedTranscript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount === 0) {
    return HRRubricService.calculateDeterministicScore(
      rubric,
      rubric.criteria.map((c) => ({
        criterion: c.name,
        maxScore: c.maxScore,
        score: 0,
        evidence: null,
        reason: 'No response was provided, so there was insufficient evidence to evaluate this question.',
      })),
      'NO_RESPONSE',
      durationSeconds,
      0
    );
  }

  // Check for Direct Concise Question (e.g. "What programming language did you use?" -> "Java.")
  if (rubric.isDirectEntityQuestion) {
    const isKnownEntity = /\b(java|python|javascript|typescript|c\+\+|c#|go|rust|sql|html|css|react|node|docker|aws)\b/i.test(verifiedTranscript);
    if (isKnownEntity) {
      const criteriaResults: CriterionEvidenceResult[] = [
        {
          criterion: rubric.criteria[0].name,
          maxScore: rubric.criteria[0].maxScore,
          score: rubric.criteria[0].maxScore,
          evidence: `Candidate explicitly stated: "${verifiedTranscript}"`,
          reason: 'Directly and accurately answered the specific entity question.',
        },
        {
          criterion: rubric.criteria[1].name,
          maxScore: rubric.criteria[1].maxScore,
          score: rubric.criteria[1].maxScore,
          evidence: `Candidate communicated clearly without confusion.`,
          reason: 'Clear and concise answer.',
        },
      ];
      return HRRubricService.calculateDeterministicScore(rubric, criteriaResults, 'ON_TOPIC', durationSeconds, wordCount);
    }
  }

  // Off-topic detection
  const qLower = question.toLowerCase();
  const tLower = verifiedTranscript.toLowerCase();

  const isTechnicalQuestion = /challeng|problem|project|bug|debug|error|solution|scale/i.test(qLower);
  const hasTechnicalEvidence = /(model|segment|object|threshold|watershed|detect|yolo|algorithm|database|api|backend|frontend|code|server|pipeline|accuracy|loss|mask|split|feature|system|service|deploy)/i.test(tLower);
  const isPureAcademicOffTopic = /(diploma|marks|percentage|cgpa|school|college|hobbies|cricket|sports)/i.test(tLower) && !hasTechnicalEvidence;

  if (isTechnicalQuestion && isPureAcademicOffTopic) {
    return HRRubricService.calculateDeterministicScore(
      rubric,
      rubric.criteria.map((c) => ({
        criterion: c.name,
        maxScore: c.maxScore,
        score: 0,
        evidence: null,
        reason: 'Response did not address the technical challenge or problem asked in the question.',
      })),
      'OFF_TOPIC',
      durationSeconds,
      wordCount
    );
  }

  // Semantic evidence extraction across standard dimensions.
  // NOTE: For Self Introduction, 'approach evidence' = technical skill/stack mentions (Python, React, etc.)
  //       For Project Challenge, 'approach evidence' = verbs like 'implemented', 'built', etc.
  const hasProblemEvidence = /\b(fail\w*|error\w*|bug\w*|issue\w*|problem\w*|difficult\w*|challeng\w*|obstacle\w*|bottleneck\w*|slow\w*|crash\w*|touching|overlap\w*|broken|limit\w*|timeout\w*|timing\s+out|project\w*|task\w*|deadline|require\w*)\b/i.test(verifiedTranscript);
  const hasApproachEvidence = /\b(used|implement\w*|built|appli\w*|algorithm\w*|method\w*|model\w*|approach\w*|solution\w*|watershed|split\w*|morphological|fix\w*|adjust\w*|threshold|cache|caching|index\w*|refactor\w*|optimi\w*|investigat\w*|add\w*|tun\w*|quer\w*|plan|database|python|java(?:script)?|react|node|django|flask|fastapi|spring|sql|html|css|angular|vue|typescript|c\+\+|c#|go\b|rust\b|kotlin|swift|php|ruby|scala|tensorflow|pytorch|scikit|pandas|numpy|docker|kubernetes|aws|azure|git\b|linux|back.?end|front.?end|full.?stack|api\b|machine.learning|deep.learning|neural|computer.vision|nlp|specification\w*|develop\w*|creat\w*|design\w*)\b/i.test(verifiedTranscript);
  const hasReasoningEvidence = /\b(because|why|reason\w*|initial\w*|tried|instead|since|tradeoff\w*|analy\w*|cause\w*|root|so that|in order to|due to|as a result of|to improv|wanted to|decided to|chose|prefer\w*)\b/i.test(verifiedTranscript);
  const hasResultEvidence = /\b(result\w*|outcome\w*|improv\w*|resolv\w*|success\w*|accura\w*|separat\w*|solv\w*|reduc\w*|percent|%|final\w*|deliver\w*|boost\w*|gain\w*|complet\w*|achiev\w*|finish\w*)\b/i.test(verifiedTranscript);
  const hasLearningEvidence = /\b(learn\w*|takeaway\w*|realiz\w*|future|growth|reflection|interest\w*|passion\w*|motivat\w*|aspir\w*|career\w*|pursu\w*)\b/i.test(verifiedTranscript);

  const criteriaResults: CriterionEvidenceResult[] = rubric.criteria.map((crit) => {
    const id = crit.id;
    const maxScore = crit.maxScore;

    if (id.includes('problem') || id.includes('obstacle') || id.includes('disagree') || id.includes('change')) {
      if (hasProblemEvidence) {
        const score = wordCount >= 15 ? maxScore : Math.max(1, maxScore - 1);
        return {
          criterion: crit.name,
          maxScore,
          score,
          evidence: `Candidate described the obstacle or challenge: "${verifiedTranscript.slice(0, 100)}..."`,
          reason: 'Clear problem identification communicated.',
        };
      }
      return {
        criterion: crit.name,
        maxScore,
        score: 0,
        evidence: null,
        reason: 'Candidate did not clearly define the specific obstacle or problem.',
      };
    }

    if (id.includes('approach') || id.includes('solution') || id.includes('contribution') || id.includes('action') || id.includes('technical_skills')) {
      if (hasApproachEvidence) {
        const score = wordCount >= 20 ? maxScore : Math.max(1, Math.floor(maxScore / 2));
        return {
          criterion: crit.name,
          maxScore,
          score,
          evidence: `Candidate explained technical approach and implementation.`,
          reason: score === maxScore ? 'Detailed solution approach articulated.' : 'Partial solution mentioned without full technical detail.',
        };
      }
      return {
        criterion: crit.name,
        maxScore,
        score: 0,
        evidence: null,
        reason: 'Candidate did not describe the technical approach or specific actions taken.',
      };
    }

    if (id.includes('reasoning') || id.includes('analysis') || id.includes('consensus') || id.includes('strategy')) {
      if (hasReasoningEvidence) {
        return {
          criterion: crit.name,
          maxScore,
          score: maxScore,
          evidence: `Candidate provided technical reasoning and explanation of why choices were made.`,
          reason: 'Solid cause-and-effect reasoning demonstrated.',
        };
      } else if (hasApproachEvidence && wordCount >= 25) {
        // Partial credit for implicit technical rationale
        return {
          criterion: crit.name,
          maxScore,
          score: Math.max(1, Math.floor(maxScore / 2)),
          evidence: `Candidate described steps taken with partial implicit reasoning.`,
          reason: 'Partial technical reasoning; could articulate tradeoffs more explicitly.',
        };
      }
      return {
        criterion: crit.name,
        maxScore,
        score: 0,
        evidence: null,
        reason: 'Candidate did not explain the technical reasoning or root cause.',
      };
    }

    if (id.includes('result') || id.includes('outcome') || id.includes('impact') || id.includes('delivery')) {
      if (hasResultEvidence) {
        return {
          criterion: crit.name,
          maxScore,
          score: maxScore,
          evidence: `Candidate stated measurable impact or final resolution.`,
          reason: 'Clear outcome and resolution provided.',
        };
      }
      return {
        criterion: crit.name,
        maxScore,
        score: 0,
        evidence: null,
        reason: 'Candidate did not describe the final outcome or impact of their work.',
      };
    }

    // Communication / reflection
    const commScore = wordCount >= 15 ? maxScore : Math.max(1, Math.floor(maxScore / 2));
    return {
      criterion: crit.name,
      maxScore,
      score: commScore,
      evidence: `Response was coherent and understandable (${wordCount} words).`,
      reason: 'Communicated in an intelligible and structured manner.',
    };
  });

  const relevanceStatus = wordCount >= 15 && hasProblemEvidence && hasApproachEvidence
    ? 'ON_TOPIC'
    : (hasProblemEvidence || hasApproachEvidence)
    ? 'PARTIALLY_RELEVANT'
    : 'OFF_TOPIC';

  return HRRubricService.calculateDeterministicScore(
    rubric,
    criteriaResults,
    relevanceStatus,
    durationSeconds,
    wordCount
  );
}

// ─── Public API ────────────────────────────────────────────────────────────────

export class InterviewAIService {
  /**
   * Select interview questions for an HR session.
   * Always starts with Self Introduction, then randomly selects from pool.
   */
  static selectSessionQuestions(count: number = 3): CuratedQuestion[] {
    const introQ = BEHAVIORAL_QUESTION_BANK.find((q) => q.category === 'Self Introduction')!;
    const pool = BEHAVIORAL_QUESTION_BANK.filter((q) => q.category !== 'Self Introduction');
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count - 1);
    return [introQ, ...selected];
  }

  /**
   * Generate a context-aware follow-up question.
   * Falls back to deterministic bank if LLM unavailable.
   */
  static async generateFollowUp(
    mainQuestion: string,
    category: string,
    candidateTranscript: string,
    role = 'Software Engineer'
  ): Promise<string> {
    const val = HRTranscriptValidator.validate(candidateTranscript, { question: mainQuestion, category });
    if (val.isEmpty || val.isFillerOnly || val.isNonResponsive || val.wordCount < 4) {
      return 'Could you elaborate a bit more with a specific technical example?';
    }
    if (!isLLMAvailable()) {
      const pool = DETERMINISTIC_FOLLOWUPS[category] || DETERMINISTIC_FOLLOWUPS['Project Challenge'];
      return pool[Math.floor(Math.random() * pool.length)];
    }

    const systemPrompt = `You are a professional technical HR interviewer for a ${role} position. Your tone is professional, empathetic, and precise.`;
    const userPrompt = `You just asked: "${mainQuestion}"\n\nThe candidate responded: "${val.verifiedTranscript.substring(0, 800)}"\n\nGenerate ONE targeted follow-up question (1–2 sentences) probing deeper into a specific aspect of their answer — a concrete example, measurable outcome, or technical detail. Output ONLY the question, nothing else.`;

    try {
      const result = await callGroq([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], 150);
      return result || DETERMINISTIC_FOLLOWUPS['Project Challenge'][0];
    } catch {
      const pool = DETERMINISTIC_FOLLOWUPS[category] || DETERMINISTIC_FOLLOWUPS['Project Challenge'];
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }

  /**
   * Evaluate a single candidate response across all behavioral dimensions
   * with evidence-based rubric scoring.
   */
  static async evaluateResponse(
    question: string,
    category: string,
    rawTranscript: string,
    durationSeconds: number
  ): Promise<BehavioralEvaluation> {
    // 1. STEP 1: Validate transcript and check for empty / silence / filler
    const val = HRTranscriptValidator.validate(rawTranscript, { question, category });
    const rubric = HRRubricService.getRubricForQuestion(question, category);

    // CRITICAL GUARD: If empty, filler-only, or non-responsive, score is strictly 0.
    // Do NOT call scoring LLM for empty response.
    if (val.isEmpty || val.isFillerOnly || val.isNonResponsive) {
      const zeroResult = HRRubricService.calculateDeterministicScore(
        rubric,
        rubric.criteria.map((c) => ({
          criterion: c.name,
          maxScore: c.maxScore,
          score: 0,
          evidence: null,
          reason: val.rejectionReason || 'No response was provided, so there was insufficient evidence to evaluate this question.',
        })),
        'NO_RESPONSE',
        durationSeconds,
        0
      );

      return {
        ...zeroResult.dimensions,
        overallScore: 0,
        feedback: zeroResult.feedback,
        strengths: zeroResult.strengths,
        improvements: zeroResult.improvements,
        starGuidance: zeroResult.starGuidance,
        aiSummary: `Question: "${question}" — Score: 0/100. Insufficient evidence: ${val.rejectionReason}`,
        criteriaEvidence: zeroResult.criteriaResults,
      };
    }

    // 2. STEP 2: Candidate provided speech -> Evaluate against question-specific rubric
    if (!isLLMAvailable()) {
      const heuristic = heuristicEvaluation(question, category, val.verifiedTranscript, durationSeconds);
      return {
        ...heuristic.dimensions,
        overallScore: heuristic.overallScore,
        feedback: heuristic.feedback,
        strengths: heuristic.strengths,
        improvements: heuristic.improvements,
        starGuidance: heuristic.starGuidance,
        aiSummary: `Candidate response evaluated via deterministic rubric. Score: ${heuristic.overallScore}/100.`,
        criteriaEvidence: heuristic.criteriaResults,
      };
    }

    // 3. STEP 3: LLM Evidence Extraction
    const criteriaDescriptionList = rubric.criteria
      .map(
        (c) =>
          `- Criterion "${c.name}" (id: "${c.id}", maxScore: ${c.maxScore}): ${c.description}. Semantic signals: ${c.semanticExpectations.join('; ')}`
      )
      .join('\n');

    const systemPrompt = `You are an expert technical and HR interview evaluator assessing a candidate's spoken response.
Your evaluation MUST BE EVIDENCE-BASED, adhering strictly to these rules:
1. NO EVIDENCE -> NO CREDIT. If the candidate did not mention something, award 0 points for that criterion. Never assume or fabricate.
2. PARTIAL CREDIT: If the candidate partially addressed the criterion or lacked technical detail, award partial points (e.g. 1 out of 2).
3. SEMANTIC POINT DETECTION: Do NOT require rigid keyword matches. Accept semantic equivalence (e.g., "touching objects were detected as one" is equivalent to "overlapping object segmentation error").
4. NATURAL SPEECH: Do not penalize natural pauses, informal phrasing, or minor grammatical imperfections if the technical/behavioral information was communicated.
5. OFF-TOPIC ANSWERS: If the candidate answer does NOT address the question (e.g., talking about academic percentages when asked about a technical bug), mark "relevanceStatus": "OFF_TOPIC" and give 0 points for content criteria.
6. Return ONLY valid JSON matching the exact schema specified. No markdown, no explanations outside JSON.`;

    const userPrompt = `EVALUATION TASK:
Question: "${question}"
Category: "${category}"
Candidate's Verified Transcript: "${val.verifiedTranscript}"
Response Duration: ${durationSeconds} seconds

RUBRIC CRITERIA:
${criteriaDescriptionList}

Return JSON with this schema:
{
  "relevanceStatus": "ON_TOPIC" | "PARTIALLY_RELEVANT" | "OFF_TOPIC",
  "criteriaResults": [
    {
      "id": "<criterion id>",
      "criterion": "<criterion name>",
      "score": <number between 0 and maxScore>,
      "maxScore": <maxScore>,
      "evidence": "<exact quote or semantic phrase from transcript supporting the score, or null if missing>",
      "reason": "<1 concise sentence explaining the score awarded>"
    }
  ]
}`;

    try {
      const llmText = await callGroq([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], 700);

      const jsonStart = llmText.indexOf('{');
      const jsonEnd = llmText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(llmText.substring(jsonStart, jsonEnd + 1));
        const relevanceStatus = parsed.relevanceStatus || 'ON_TOPIC';
        const rawResults = Array.isArray(parsed.criteriaResults) ? parsed.criteriaResults : [];

        // Map and validate criteria results against the rubric
        const alignedResults: CriterionEvidenceResult[] = rubric.criteria.map((c) => {
          const matched = rawResults.find((r: any) => r.id === c.id || r.criterion === c.name);
          const score = typeof matched?.score === 'number' ? Math.min(c.maxScore, Math.max(0, matched.score)) : 0;
          return {
            criterion: c.name,
            maxScore: c.maxScore,
            score,
            evidence: matched?.evidence || null,
            reason: matched?.reason || (score === 0 ? 'No evidence identified in answer.' : 'Evidence identified.'),
          };
        });

        // Deterministically compute final score and dimensions from evidence
        const detResult = HRRubricService.calculateDeterministicScore(
          rubric,
          alignedResults,
          relevanceStatus,
          durationSeconds,
          val.wordCount
        );

        return {
          ...detResult.dimensions,
          overallScore: detResult.overallScore,
          feedback: detResult.feedback,
          strengths: detResult.strengths,
          improvements: detResult.improvements,
          starGuidance: detResult.starGuidance,
          aiSummary: `Evaluated via ${rubric.category} rubric. Score: ${detResult.overallScore}/100. Status: ${relevanceStatus}.`,
          criteriaEvidence: detResult.criteriaResults,
        };
      }
    } catch {
      // Fallback to deterministic heuristic
    }

    const heuristic = heuristicEvaluation(question, category, val.verifiedTranscript, durationSeconds);
    return {
      ...heuristic.dimensions,
      overallScore: heuristic.overallScore,
      feedback: heuristic.feedback,
      strengths: heuristic.strengths,
      improvements: heuristic.improvements,
      starGuidance: heuristic.starGuidance,
      aiSummary: `Candidate response evaluated via deterministic rubric fallback. Score: ${heuristic.overallScore}/100.`,
      criteriaEvidence: heuristic.criteriaResults,
    };
  }

  /**
   * Synthesize final holistic HR evaluation across ALL session responses.
   * Real mathematical aggregation: NEVER filters out 0s! If all responses are empty, overallScore = 0.
   */
  static async evaluateFinalSession(
    questionsWithTranscripts: Array<{ question: string; category: string; transcript: string; durationSeconds: number }>
  ): Promise<BehavioralEvaluation> {
    if (!questionsWithTranscripts || questionsWithTranscripts.length === 0) {
      return {
        communicationScore: 0,
        problemSolvingScore: 0,
        teamworkScore: 0,
        professionalismScore: 0,
        relevanceScore: 0,
        clarityScore: 0,
        ownershipScore: 0,
        leadershipScore: 0,
        confidenceScore: 0,
        structureScore: 0,
        overallScore: 0,
        feedback: 'No response was provided, so there was insufficient evidence to evaluate this question.',
        strengths: [],
        improvements: ['Participate actively in the HR interview and speak clearly into the microphone.'],
        starGuidance: 'Ensure your microphone is functioning and speak clearly to structure your response.',
        aiSummary: 'HR round had 0 recorded responses. Final score: 0/100.',
        criteriaEvidence: [],
      };
    }

    // Evaluate each question individually
    const perResponse = await Promise.all(
      questionsWithTranscripts.map((q) =>
        this.evaluateResponse(q.question, q.category, q.transcript, q.durationSeconds)
      )
    );

    const totalQuestions = perResponse.length;

    // True mathematical average across all questions asked — zeroes are preserved!
    const avgDim = (key: keyof BehavioralEvaluation): number => {
      const sum = perResponse.reduce((acc, r) => acc + ((r[key] as number) || 0), 0);
      return Math.round(sum / totalQuestions);
    };

    const communicationScore = avgDim('communicationScore');
    const problemSolvingScore = avgDim('problemSolvingScore');
    const teamworkScore = avgDim('teamworkScore');
    const professionalismScore = avgDim('professionalismScore');
    const relevanceScore = avgDim('relevanceScore');
    const clarityScore = avgDim('clarityScore');
    const ownershipScore = avgDim('ownershipScore');
    const leadershipScore = avgDim('leadershipScore');
    const confidenceScore = avgDim('confidenceScore');
    const structureScore = avgDim('structureScore');

    // Authoritative overall score is the weighted sum of the dimension averages.
    // Weights match SCORING_DIMENSIONS in the frontend (communication=20, problemSolving=15,
    // teamwork=15, professionalism=15, relevance=15, clarity=10, ownership=5, leadership=5).
    // This guarantees overallScore always matches what the report UI displays.
    const weightedOverall =
      communicationScore   * 0.20 +
      problemSolvingScore  * 0.15 +
      teamworkScore        * 0.15 +
      professionalismScore * 0.15 +
      relevanceScore       * 0.15 +
      clarityScore         * 0.10 +
      ownershipScore       * 0.05 +
      leadershipScore      * 0.05;
    const overallScore = Math.min(100, Math.max(0, Math.round(weightedOverall)));

    // Collect all criteria evidence across all questions
    const allCriteriaEvidence: CriterionEvidenceResult[] = perResponse.flatMap(
      (r) => r.criteriaEvidence || []
    );

    const allStrengths = perResponse.flatMap((r) => r.strengths || []);
    const allImprovements = perResponse.flatMap((r) => r.improvements || []);
    const uniqueStrengths = [...new Set(allStrengths)].filter(Boolean).slice(0, 4);
    const uniqueImprovements = [...new Set(allImprovements)].filter(Boolean).slice(0, 4);

    // Check if ANY question had actual candidate words
    const hadAnyActualResponse = questionsWithTranscripts.some((q) => {
      const words = (q.transcript || '').trim().split(/\s+/).filter(Boolean);
      return words.length >= 2;
    });

    let aiSummary = `Candidate completed ${totalQuestions} behavioral interview question${totalQuestions > 1 ? 's' : ''}. Overall score: ${overallScore}/100.`;

    if (!hadAnyActualResponse) {
      // Truly no responses at all — silent interview
      aiSummary = 'No audible or substantive responses were provided during the HR interview. Score: 0/100. Insufficient evidence to award credit.';
    } else if (overallScore === 0) {
      // Candidate spoke but responses were off-topic, very short, or non-substantive
      aiSummary = `Candidate provided responses across ${totalQuestions} question${totalQuestions > 1 ? 's' : ''} but did not substantively address the behavioral questions asked. Score: ${overallScore}/100. Focus on directly answering with concrete examples.`;
    } else if (isLLMAvailable()) {
      try {
        const transcriptSample = questionsWithTranscripts
          .map((q, i) => `Q${i + 1} [Score: ${perResponse[i].overallScore}/100]: "${q.transcript.substring(0, 200)}"`)
          .join('\n');
        const summaryText = await callGroq([
          { role: 'system', content: 'You are a professional HR evaluator. Write a concise 2-sentence evaluation summary based strictly on the candidate actual responses.' },
          { role: 'user', content: `Candidate interview evaluation summary:\nOverall Score: ${overallScore}/100\nResponses:\n${transcriptSample}\n\nWrite a 2-sentence evidence-based summary.` },
        ], 160);
        if (summaryText) aiSummary = summaryText;
      } catch {
        // keep default aiSummary
      }
    }

    const starGuidance =
      'STAR Framework: (1) Situation — context and constraints; (2) Task — your specific responsibility; (3) Action — what YOU specifically did; (4) Result — quantifiable outcome (%, time, team size).';

    let feedback = '';
    if (!hadAnyActualResponse) {
      feedback = 'No response was provided, so there was insufficient evidence to evaluate this interview.';
    } else if (overallScore === 0) {
      feedback = 'Responses were provided but did not sufficiently address the behavioral questions. Focus on direct, structured answers with concrete project examples.';
    } else if (overallScore >= 80) {
      feedback = 'Strong behavioral competency demonstrated with structured articulation and evidence-based problem solving.';
    } else if (overallScore >= 50) {
      feedback = 'Solid performance with partial credit earned across criteria. To improve, explicitly articulate technical trade-offs and quantifiable results.';
    } else {
      feedback = 'Limited substantive technical or behavioral evidence provided. Focus on structuring answers with concrete project examples.';
    }

    return {
      communicationScore,
      problemSolvingScore,
      teamworkScore,
      professionalismScore,
      relevanceScore,
      clarityScore,
      ownershipScore,
      leadershipScore,
      confidenceScore,
      structureScore,
      overallScore,
      feedback,
      strengths: uniqueStrengths.length > 0 ? uniqueStrengths : (overallScore > 0 ? ['Participated in interview session'] : []),
      improvements: uniqueImprovements.length > 0 ? uniqueImprovements : ['Practice structuring answers with STAR framework'],
      starGuidance,
      aiSummary,
      criteriaEvidence: allCriteriaEvidence,
    };
  }

  /**
   * FEATURE B: HR Response Quality Evaluator
   * Evaluates candidate response across 8 core dimensions (0 - 10):
   * relevance, specificity, evidence, structure, clarity, technicalDepth, ownership, professionalism.
   *
   * FEATURE C: Uses HRScoreEngine for deterministic question scoring.
   */
  static async evaluateResponseQuality(
    question: string,
    verifiedTranscript: string,
    category = 'General',
    durationSeconds = 0
  ): Promise<HREvaluationResult> {
    const trimmed = (verifiedTranscript || '').trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const isPureFiller = HRTranscriptValidator.isPureFiller(trimmed);

    // Case 1 & Case 2: Silence or pure filler sounds
    if (wordCount === 0 || isPureFiller) {
      const zeroScores: HRDimensionScores = {
        relevance: 0,
        specificity: 0,
        evidence: 0,
        structure: 0,
        clarity: 0,
        technicalDepth: 0,
        ownership: 0,
        professionalism: 0,
      };
      return {
        dimensionScores: zeroScores,
        overallScore: 0,
        justification: wordCount === 0
          ? 'No audible or substantive responses were provided.'
          : 'Candidate response contained only speech disfluencies and filler sounds without substantive content.',
        strengths: [],
        areasForImprovement: ['Provide a direct, substantive answer to the question asked with concrete technical examples.'],
        starFormatDetected: false,
        wordCount,
        responseQuality: 'empty',
        metadata: {
          analysisVersion: '1.0',
          model: 'deterministic-rule',
          promptVersion: '1.0',
          generatedAt: new Date().toISOString(),
          status: 'completed',
        },
      };
    }

    // Try Groq LLM when available
    if (isLLMAvailable()) {
      try {
        const systemPrompt = `You are a strict, objective technical and HR interview evaluator assessing a software engineering candidate's spoken response.
Evaluate the candidate's verified response strictly across these EIGHT dimensions, each scored as a number between 0.0 and 10.0:
1. relevance (0-10): How directly does the response address what the question asked?
   - 0: Completely off-topic or irrelevant.
   - 1-3: Minimally addresses question or digresses significantly.
   - 4-6: Directly addresses the main question with minor omissions.
   - 7-9: Directly answers with comprehensive alignment to prompt.
   - 10: Flawlessly focused on the prompt.
2. specificity (0-10): Concrete details, technical entities, specific scenarios vs vague generalities.
3. evidence (0-10): Real actions, tools, frameworks, metrics, quantifiable outcomes.
4. structure (0-10): Logical flow (e.g. STAR: Situation/Task, Action, Result).
5. clarity (0-10): Intelligible, coherent articulation without ambiguity.
6. technicalDepth (0-10): Sound technical explanation appropriate for the context.
7. ownership (0-10): Personal responsibility and initiative ("I designed", "I investigated" vs vague "we").
8. professionalism (0-10): Constructive, professional tone appropriate for a software engineering interview.

CRITICAL RULES:
- NO FABRICATION: Never invent technologies, achievements, or experience the candidate did not mention.
- A long irrelevant answer must receive low relevance and low overall credit.
- A short but highly relevant answer should receive reasonable credit.
- Return ONLY valid JSON matching the schema with no markdown formatting.`;

        const userPrompt = `EVALUATION TASK:
Question: "${question}"
Category: "${category}"
Candidate's Verified Response: "${trimmed}"

Return JSON matching this exact schema:
{
  "dimensionScores": {
    "relevance": number,
    "specificity": number,
    "evidence": number,
    "structure": number,
    "clarity": number,
    "technicalDepth": number,
    "ownership": number,
    "professionalism": number
  },
  "justification": "2-3 sentence evidence-based justification",
  "strengths": ["string", "string"],
  "areasForImprovement": ["string", "string"],
  "starFormatDetected": boolean
}`;

        const llmText = await callGroq([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ], 650);

        const jsonStart = llmText.indexOf('{');
        const jsonEnd = llmText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const parsed = JSON.parse(llmText.substring(jsonStart, jsonEnd + 1));
          if (parsed && typeof parsed.dimensionScores === 'object') {
            const sanitized = HRScoreEngine.sanitizeDimensionScores(parsed.dimensionScores);
            const questionScore = HRScoreEngine.calculateQuestionScore(sanitized);
            const quality = HRScoreEngine.determineQuality(questionScore);

            return {
              dimensionScores: sanitized,
              overallScore: questionScore,
              justification: parsed.justification || 'Evaluation completed based on response evidence.',
              strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter(Boolean) : [],
              areasForImprovement: Array.isArray(parsed.areasForImprovement) ? parsed.areasForImprovement.filter(Boolean) : [],
              starFormatDetected: !!parsed.starFormatDetected,
              wordCount,
              responseQuality: quality,
              metadata: {
                analysisVersion: '1.0',
                model: GROQ_MODEL,
                promptVersion: '1.0',
                generatedAt: new Date().toISOString(),
                status: 'completed',
              },
            };
          }
        }
      } catch {
        // Fall back to deterministic heuristic evaluation
      }
    }

    return this.evaluateHeuristic8Dimensions(question, trimmed, category, durationSeconds);
  }

  /**
   * Question-aware deterministic heuristic evaluator for 8 dimensions.
   * Ensures high-quality evaluation even when LLM is unavailable.
   */
  static evaluateHeuristic8Dimensions(
    question: string,
    verifiedTranscript: string,
    category = 'General',
    durationSeconds = 0
  ): HREvaluationResult {
    const trimmed = verifiedTranscript.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const qLower = question.toLowerCase();
    const tLower = trimmed.toLowerCase();

    // Check for Direct Entity Question (e.g. "What programming language did you use?")
    const isDirectEntityQ = /what (programming language|language|database|framework|tool|library)/i.test(qLower);
    const hasKnownEntity = /\b(java|python|javascript|typescript|c\+\+|c#|go|rust|sql|html|css|react|node|docker|aws|mongodb|postgresql)\b/i.test(tLower);

    if (isDirectEntityQ && hasKnownEntity) {
      const dimScores: HRDimensionScores = {
        relevance: 9.0,
        specificity: 8.0,
        evidence: 7.5,
        structure: 7.0,
        clarity: 9.0,
        technicalDepth: 7.0,
        ownership: 7.0,
        professionalism: 9.0,
      };
      const score = HRScoreEngine.calculateQuestionScore(dimScores);
      return {
        dimensionScores: dimScores,
        overallScore: score,
        justification: `Candidate directly answered the specific technical entity question with concrete evidence.`,
        strengths: ['Direct, accurate answer to specific question prompt'],
        areasForImprovement: ['Can provide additional architectural context when time permits'],
        starFormatDetected: false,
        wordCount,
        responseQuality: HRScoreEngine.determineQuality(score),
        metadata: {
          analysisVersion: '1.0',
          model: 'deterministic-heuristic',
          promptVersion: '1.0',
          generatedAt: new Date().toISOString(),
          status: 'completed',
        },
      };
    }

    // Off-topic detection
    const isTechnicalQuestion = /challeng|problem|project|bug|debug|error|solution|scale|system|code|architecture/i.test(qLower);
    const hasTechnicalKeywords = /(model|segment|object|threshold|watershed|detect|yolo|algorithm|database|api|backend|frontend|code|server|pipeline|accuracy|loss|mask|split|feature|system|service|deploy|python|react|java|sql)/i.test(tLower);
    const isPureAcademicOffTopic = /(diploma|marks|percentage|cgpa|school|college|hobbies|cricket|sports|movies)/i.test(tLower) && !hasTechnicalKeywords;

    if (isTechnicalQuestion && isPureAcademicOffTopic) {
      const dimScores: HRDimensionScores = {
        relevance: 1.0,
        specificity: 2.0,
        evidence: 0.0,
        structure: 4.0,
        clarity: 6.0,
        technicalDepth: 0.0,
        ownership: 3.0,
        professionalism: 6.0,
      };
      const score = HRScoreEngine.calculateQuestionScore(dimScores);
      return {
        dimensionScores: dimScores,
        overallScore: score,
        justification: 'Response was off-topic and did not address the technical project or challenge asked in the question.',
        strengths: ['Coherent speech'],
        areasForImprovement: ['Address the specific technical challenge asked in the prompt.'],
        starFormatDetected: false,
        wordCount,
        responseQuality: 'weak',
        metadata: {
          analysisVersion: '1.0',
          model: 'deterministic-heuristic',
          promptVersion: '1.0',
          generatedAt: new Date().toISOString(),
          status: 'completed',
        },
      };
    }

    // Detect technical entities and evidence
    const techMatches = tLower.match(/\b(python|javascript|typescript|java|c\+\+|c#|go|rust|react|node|vue|angular|django|flask|fastapi|spring|sql|postgres|mongodb|redis|docker|kubernetes|aws|azure|git|linux|api|graphql|rest|microservice|database|cache|index|algorithm|model|yolo|pipeline|frontend|backend|fullstack|yolov8)\b/g) || [];
    const problemMatches = tLower.match(/\b(challeng\w*|problem\w*|bug\w*|error\w*|issue\w*|bottleneck\w*|fail\w*|slow\w*|timeout\w*|crash\w*|obstacle\w*|difficult\w*)\b/g) || [];
    const actionMatches = tLower.match(/\b(implemented|built|developed|designed|created|investigated|debugged|resolved|optimized|fixed|configured|deployed|tested|integrated|analyzed|refactored|used|handled)\b/g) || [];
    const resultMatches = tLower.match(/\b(result\w*|improved|reduced|increased|resolved|success\w*|achieved|outcome|delivered|percent|%|faster|accuracy|separated)\b/g) || [];
    const ownershipMatches = tLower.match(/\b(i\s+(?:handled|implemented|built|designed|resolved|debugged|decided|worked|led|created|managed|took)|my\s+(?:role|responsibility|task|contribution))\b/g) || [];
    const hasStarCues = /\b(when|situation|task|initially|first|then|so I|because|result|finally)\b/i.test(tLower);

    // Compute dimensions
    let relevance = 5.0;
    if (techMatches.length > 0 && (actionMatches.length > 0 || problemMatches.length > 0)) {
      relevance = wordCount >= 15 ? 8.5 : 7.0;
    } else if (techMatches.length > 0 || actionMatches.length > 0) {
      relevance = wordCount >= 10 ? 6.5 : 5.5;
    } else if (wordCount >= 20) {
      relevance = 4.5;
    } else {
      relevance = 3.0;
    }

    const specificity = techMatches.length >= 3 ? 8.5 : techMatches.length >= 1 ? 7.0 : wordCount >= 25 ? 5.5 : 4.0;
    const evidence = (actionMatches.length >= 2 && techMatches.length >= 1) ? 8.0 : (actionMatches.length >= 1 || techMatches.length >= 1) ? 6.5 : 3.5;
    const structure = (hasStarCues && wordCount >= 20) ? 8.0 : wordCount >= 12 ? 6.5 : 4.5;
    const clarity = wordCount >= 12 ? 8.5 : 6.5;
    const technicalDepth = techMatches.length >= 2 ? 8.0 : techMatches.length >= 1 ? 6.5 : 3.5;
    const ownership = ownershipMatches.length >= 2 ? 8.5 : ownershipMatches.length >= 1 ? 7.5 : 6.0;
    const professionalism = 8.5;

    const dimScores: HRDimensionScores = HRScoreEngine.sanitizeDimensionScores({
      relevance,
      specificity,
      evidence,
      structure,
      clarity,
      technicalDepth,
      ownership,
      professionalism,
    });

    const overallScore = HRScoreEngine.calculateQuestionScore(dimScores);
    const starFormatDetected = hasStarCues && actionMatches.length > 0 && resultMatches.length > 0;

    const strengths: string[] = [];
    if (techMatches.length > 0) strengths.push(`Cited relevant technical technologies (${[...new Set(techMatches)].slice(0, 3).join(', ')})`);
    if (actionMatches.length > 0) strengths.push('Articulated specific engineering actions taken');
    if (ownershipMatches.length > 0) strengths.push('Demonstrated individual ownership and initiative');
    if (strengths.length === 0) strengths.push('Communicated clearly with professional tone');

    const areasForImprovement: string[] = [];
    if (resultMatches.length === 0) areasForImprovement.push('Quantify the final result or measurable business/performance impact');
    if (!starFormatDetected) areasForImprovement.push('Structure your answer explicitly using the STAR method (Situation, Task, Action, Result)');
    if (technicalDepth < 6) areasForImprovement.push('Provide deeper technical detail on implementation and architecture');

    return {
      dimensionScores: dimScores,
      overallScore,
      justification: `Candidate answered with ${wordCount} words, citing concrete engineering details and relevant tools.`,
      strengths,
      areasForImprovement,
      starFormatDetected,
      wordCount,
      responseQuality: HRScoreEngine.determineQuality(overallScore),
      metadata: {
        analysisVersion: '1.0',
        model: 'deterministic-heuristic',
        promptVersion: '1.0',
        generatedAt: new Date().toISOString(),
        status: 'completed',
      },
    };
  }

  // ─── Phase 2: STAR Format Detector & Coach ───────────────────────────────────

  /** Return the curated active behavioral question bank */
  static getQuestionBank(): CuratedQuestion[] {
    return BEHAVIORAL_QUESTION_BANK;
  }

  /**
   * Determine whether a question requires STAR format evaluation.
   * STAR is applicable to behavioral, leadership, teamwork, conflict, challenge questions.
   * Factual/introductory questions (e.g. "What programming languages do you know?") do NOT require STAR.
   */
  static isStarApplicable(question: string, category = 'General'): boolean {
    const qLower = (question || '').toLowerCase().trim();
    const catLower = (category || '').toLowerCase().trim();

    if (catLower === 'self introduction' || catLower === 'intro') return false;

    // Check bank configuration if question matches
    const bankItem = BEHAVIORAL_QUESTION_BANK.find(
      (b) => b.question.toLowerCase() === qLower || b.id === question
    );
    if (bankItem && typeof bankItem.starApplicable === 'boolean') {
      return bankItem.starApplicable;
    }

    // Check for factual / direct entity queries
    if (/^(what|which) (programming language|language|framework|tool|database|technolog)/i.test(qLower)) {
      return false;
    }
    if (/^(introduce yourself|tell me about yourself|what are your core skills)\b/i.test(qLower)) {
      return false;
    }

    return true;
  }

  /**
   * STAR Format Detector & Coach.
   * Evaluates Situation, Task, Action, and Result with 0-10 scores, evidence quotes,
   * missing components, and coaching version without fabricating experience.
   */
  static async analyzeSTAR(
    question: string,
    verifiedTranscript: string,
    category = 'General'
  ): Promise<STARAnalysisResult> {
    const trimmed = (verifiedTranscript || '').trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const isApplicable = this.isStarApplicable(question, category);

    // If question is factual / intro, STAR is not applicable (do not penalize candidate)
    if (!isApplicable) {
      return {
        starApplicable: false,
        situation: { present: false, score: 0, evidence: '' },
        task: { present: false, score: 0, evidence: '' },
        action: { present: false, score: 0, evidence: '' },
        result: { present: false, score: 0, evidence: '' },
        starScore: 0,
        completeness: 0,
        missingComponents: [],
        feedback: 'This question does not require the STAR framework. The candidate is evaluated on factual clarity and communication.',
        improvedVersion: trimmed,
        wordCount,
        metadata: {
          analysisVersion: '2.0',
          model: 'rule-based',
          promptVersion: '2.0',
          generatedAt: new Date().toISOString(),
          status: 'completed',
        },
      };
    }

    // Check for empty or pure filler response
    const isPureFiller = HRTranscriptValidator.isPureFiller(trimmed);
    if (wordCount === 0 || isPureFiller) {
      return {
        starApplicable: true,
        situation: { present: false, score: 0, evidence: '' },
        task: { present: false, score: 0, evidence: '' },
        action: { present: false, score: 0, evidence: '' },
        result: { present: false, score: 0, evidence: '' },
        starScore: 0,
        completeness: 0,
        missingComponents: ['Situation', 'Task', 'Action', 'Result'],
        feedback: 'No response was provided. To excel in behavioral interviews, structure your response using the STAR method: Situation, Task, Action, Result.',
        improvedVersion:
          'Situation: [Describe the context and background of your challenge.]\nTask: [Explain your specific role and responsibility.]\nAction: [Detail the exact steps and technologies you used.]\nResult: [State the measurable outcome or resolution achieved.]',
        wordCount,
        metadata: {
          analysisVersion: '2.0',
          model: 'deterministic-rule',
          promptVersion: '2.0',
          generatedAt: new Date().toISOString(),
          status: 'completed',
        },
      };
    }

    // Try Groq LLM for nuanced STAR extraction when available
    if (isLLMAvailable()) {
      try {
        const systemPrompt = `You are an expert technical and HR interview STAR coach.
Analyze the candidate's verified transcript using the STAR framework (Situation, Task, Action, Result).

CRITICAL RULES:
1. NO FABRICATION: Every evidence quote MUST be taken directly from the candidate's actual words.
   If a component was not mentioned, set present=false, score=0, and evidence="". Never invent technologies, metrics, team sizes, percentages, or achievements.
2. SCORES (0-10):
   - 0: Completely absent.
   - 1-3: Very weak, vague, or only implied (e.g. "I worked on a project" with no details).
   - 4-6: Present but insufficiently developed or lacking specifics.
   - 7-8: Clear, specific, and directly relevant.
   - 9-10: Detailed, specific, and evidence-backed.
3. IMPROVED VERSION RULE:
   - Restructure the candidate's ACTUAL WORDS into Situation, Task, Action, and Result sections.
   - DO NOT fabricate candidate achievements or numbers.
   - If the candidate never provided a result, state: "Result: [The response does not provide a measurable outcome. Add your actual quantifiable impact or final resolution.]"
4. Return ONLY valid JSON matching the exact schema with no markdown wrapper.`;

        const userPrompt = `TASK:
Question: "${question}"
Category: "${category}"
Verified Transcript: "${trimmed}"

Return JSON matching this schema:
{
  "situation": { "present": boolean, "score": number, "evidence": "string" },
  "task": { "present": boolean, "score": number, "evidence": "string" },
  "action": { "present": boolean, "score": number, "evidence": "string" },
  "result": { "present": boolean, "score": number, "evidence": "string" },
  "missingComponents": ["Situation" | "Task" | "Action" | "Result"],
  "feedback": "Coaching feedback string",
  "improvedVersion": "Restructured candidate text without fabricated facts"
}`;

        const llmText = await callGroq([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ], 750);

        const jsonStart = llmText.indexOf('{');
        const jsonEnd = llmText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const parsed = JSON.parse(llmText.substring(jsonStart, jsonEnd + 1));
          if (parsed && parsed.situation && parsed.task && parsed.action && parsed.result) {
            const sanitizeComp = (c: any): STARComponentResult => ({
              present: !!c?.present,
              score: Math.min(10, Math.max(0, typeof c?.score === 'number' ? c.score : 0)),
              evidence: typeof c?.evidence === 'string' ? c.evidence.trim() : '',
            });

            const sit = sanitizeComp(parsed.situation);
            const tsk = sanitizeComp(parsed.task);
            const act = sanitizeComp(parsed.action);
            const res = sanitizeComp(parsed.result);

            // Re-derive missing components strictly from scores & present flags
            const missing: Array<'Situation' | 'Task' | 'Action' | 'Result'> = [];
            if (!sit.present || sit.score < 4) missing.push('Situation');
            if (!tsk.present || tsk.score < 4) missing.push('Task');
            if (!act.present || act.score < 4) missing.push('Action');
            if (!res.present || res.score < 4) missing.push('Result');

            const presentCount = 4 - missing.length;
            const starScore = Math.min(100, Math.max(0, Math.round(((sit.score + tsk.score + act.score + res.score) / 4) * 10)));
            const completeness = Math.round((presentCount / 4) * 100);

            return {
              starApplicable: true,
              situation: sit,
              task: tsk,
              action: act,
              result: res,
              starScore,
              completeness,
              missingComponents: missing,
              feedback: parsed.feedback || 'Response evaluated using the STAR framework.',
              improvedVersion: parsed.improvedVersion || trimmed,
              wordCount,
              metadata: {
                analysisVersion: '2.0',
                model: GROQ_MODEL,
                promptVersion: '2.0',
                generatedAt: new Date().toISOString(),
                status: 'completed',
              },
            };
          }
        }
      } catch {
        // Fall back to deterministic STAR evaluation
      }
    }

    return this.evaluateHeuristicSTAR(question, trimmed, category);
  }

  /**
   * Deterministic Heuristic STAR Analyzer.
   * Extracts evidence, checks for keyword-only vs detailed responses,
   * scores 0-10 per component, and builds coaching version without hallucinating.
   */
  static evaluateHeuristicSTAR(
    question: string,
    verifiedTranscript: string,
    category = 'General'
  ): STARAnalysisResult {
    const trimmed = (verifiedTranscript || '').trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const isApplicable = this.isStarApplicable(question, category);

    if (!isApplicable) {
      return {
        starApplicable: false,
        situation: { present: false, score: 0, evidence: '' },
        task: { present: false, score: 0, evidence: '' },
        action: { present: false, score: 0, evidence: '' },
        result: { present: false, score: 0, evidence: '' },
        starScore: 0,
        completeness: 0,
        missingComponents: [],
        feedback: 'This question does not require the STAR framework. Evaluated on factual clarity and communication.',
        improvedVersion: trimmed,
        wordCount,
        metadata: {
          analysisVersion: '2.0',
          model: 'deterministic-heuristic',
          promptVersion: '2.0',
          generatedAt: new Date().toISOString(),
          status: 'completed',
        },
      };
    }

    const sentences = trimmed.split(/(?<=[.?!])\s+/).filter(Boolean);
    const tLower = trimmed.toLowerCase();

    // 1. Situation Analysis
    const situationKeywords = /(when I was|during my|in our project|in my project|we were working on|we faced|there was a (?:problem|bug|issue|bottleneck|crash|error|challenge|conflict)|the problem was|issue with|bottleneck|slow query|latency increased|crash|overlap|touching waste|bug in|deadline was)/i;
    const situationSentences = sentences.filter((s) => situationKeywords.test(s));
    let situationScore = 0;
    let situationEvidence = '';

    const hasConcreteProblem = /(latency|response time|database query|overlap|production|algorithm|pipeline|dataset|scale|architecture|error rate|bug|crash|memory leak|bottleneck|obstacle|issue|disagree)/i.test(tLower);

    if (situationSentences.length > 0 && hasConcreteProblem) {
      situationEvidence = situationSentences.join(' ');
      const isDetailed = /(latency|response time|database query|overlap|production|algorithm|pipeline|dataset|scale|architecture|error rate|memory leak)/i.test(situationEvidence);
      situationScore = isDetailed ? (wordCount >= 25 ? 9 : 8) : 6;
    } else if (/(project|internship|system|work\w*)/i.test(tLower)) {
      // Vague keyword only e.g. "I worked on a project." or "in our project" with no problem details
      situationScore = 2;
      situationEvidence = sentences[0] || trimmed.slice(0, 80);
    }

    // 2. Task Analysis
    const taskKeywords = /(my role was|my task was|my responsibility was|I needed to|I was responsible for|we had to|I had to|my goal was|objective was|aimed to|needed to resolve)/i;
    const taskSentences = sentences.filter((s) => taskKeywords.test(s));
    let taskScore = 0;
    let taskEvidence = '';

    const hasSubstantiveTask = taskSentences.some((s) => !/^(?:I did my task|my task|did my task)\.?$/i.test(s.trim()) && s.trim().split(/\s+/).length >= 4);

    if (taskSentences.length > 0 && hasSubstantiveTask) {
      taskEvidence = taskSentences.join(' ');
      taskScore = wordCount >= 20 ? 8 : 6;
    } else if (taskSentences.length > 0 || /(did my task|task was done)/i.test(tLower)) {
      taskScore = 2;
      taskEvidence = taskSentences.join(' ') || 'Mentioned task without details.';
    } else if (situationScore >= 6 && /(implement|fix|resolve|build|debug)/i.test(tLower)) {
      // Implicit task from context
      taskScore = 4;
      taskEvidence = 'Implicitly identified need to address the problem.';
    }

    // 3. Action Analysis
    const concreteActionKeywords = /(implemented|built|developed|designed|created|investigated|debugged|resolved|optimized|fixed|configured|deployed|tested|analyzed|refactored|used|added|wrote|applied)\b/i;
    const actionSentences = sentences.filter((s) => concreteActionKeywords.test(s));
    let actionScore = 0;
    let actionEvidence = '';

    if (actionSentences.length > 0) {
      actionEvidence = actionSentences.join(' ');
      const actionsCount = (tLower.match(/(implemented|built|developed|designed|created|investigated|debugged|resolved|optimized|fixed|configured|deployed|tested|analyzed|refactored|used|added)/g) || []).length;
      actionScore = actionsCount >= 2 ? (wordCount >= 25 ? 9 : 8) : 6;
    } else if (/(did|handled|worked on|took action|action)/i.test(tLower)) {
      actionScore = 2;
      actionEvidence = sentences.find((s) => /action/i.test(s)) || sentences[0] || '';
    }

    // 4. Result Analysis
    const substantiveResultKeywords = /(as a result,?\s+\w+|outcome was\s+\w+|improved\s+\w+|reduced\s+\w+|increased\s+\w+|resolved\s+\w+|successfully delivered|faster by|percent|%|fixed the issue|separated objects|latency reduced|restored)/i;
    const resultSentences = sentences.filter((s) => substantiveResultKeywords.test(s));
    let resultScore = 0;
    let resultEvidence = '';

    if (resultSentences.length > 0) {
      resultEvidence = resultSentences.join(' ');
      const hasMetric = /(%|percent|ms|seconds|minutes|times|reduced by|increased by|restored)/i.test(resultEvidence);
      resultScore = hasMetric ? (wordCount >= 25 ? 9 : 8) : 6;
    } else if (/(result|outcome)/i.test(tLower)) {
      resultScore = 2;
      resultEvidence = sentences.find((s) => /result/i.test(s)) || '';
    }

    const situationPresent = situationScore >= 4;
    const taskPresent = taskScore >= 4;
    const actionPresent = actionScore >= 4;
    const resultPresent = resultScore >= 4;

    const missingComponents: Array<'Situation' | 'Task' | 'Action' | 'Result'> = [];
    if (!situationPresent) missingComponents.push('Situation');
    if (!taskPresent) missingComponents.push('Task');
    if (!actionPresent) missingComponents.push('Action');
    if (!resultPresent) missingComponents.push('Result');

    const starScore = Math.min(
      100,
      Math.max(0, Math.round(((situationScore + taskScore + actionScore + resultScore) / 4) * 10))
    );
    const completeness = Math.round(((4 - missingComponents.length) / 4) * 100);

    // Build coaching feedback
    let feedback = '';
    if (missingComponents.length === 0) {
      feedback = 'Strong STAR structure. You clearly communicated the situation context, your task responsibility, engineering actions, and final outcome.';
    } else {
      feedback = `Solid answer, but missing key STAR components: ${missingComponents.join(', ')}. ${
        missingComponents.includes('Result')
          ? 'Add the actual outcome or measurable impact of your action.'
          : ''
      } ${
        missingComponents.includes('Situation')
          ? 'Clearly set the context and technical problem faced.'
          : ''
      }`.trim();
    }

    // Build improved version without fabricating facts
    const sitCoaching = situationEvidence && situationScore >= 4
      ? `Situation: ${situationEvidence}`
      : `Situation: [Describe the technical context and problem you faced.]`;

    const taskCoaching = taskEvidence && taskScore >= 4
      ? `Task: ${taskEvidence}`
      : `Task: [Explain your specific responsibility in resolving this issue.]`;

    const actCoaching = actionEvidence && actionScore >= 4
      ? `Action: ${actionEvidence}`
      : `Action: [Detail the exact engineering steps and tools you utilized.]`;

    const resCoaching = resultEvidence && resultScore >= 4
      ? `Result: ${resultEvidence}`
      : `Result: [The response does not provide a measurable outcome. Add your actual quantifiable impact or final resolution.]`;

    const improvedVersion = `${sitCoaching}\n${taskCoaching}\n${actCoaching}\n${resCoaching}`;

    return {
      starApplicable: true,
      situation: {
        present: situationPresent,
        score: situationScore,
        evidence: situationEvidence,
      },
      task: {
        present: taskPresent,
        score: taskScore,
        evidence: taskEvidence,
      },
      action: {
        present: actionPresent,
        score: actionScore,
        evidence: actionEvidence,
      },
      result: {
        present: resultPresent,
        score: resultScore,
        evidence: resultEvidence,
      },
      starScore,
      completeness,
      missingComponents,
      feedback,
      improvedVersion,
      wordCount,
      metadata: {
        analysisVersion: '2.0',
        model: 'deterministic-heuristic',
        promptVersion: '2.0',
        generatedAt: new Date().toISOString(),
        status: 'completed',
      },
    };
  }

  // ─── Phase 2: Adaptive Next-Question Selector ─────────────────────────────────

  /**
   * Select the next question adaptively based on deterministic previous question score,
   * response quality, difficulty progression, and competency variety.
   *
   * Rules:
   *  - previousScore >= 80 -> Hard question (deeper challenge).
   *  - previousScore >= 50 && previousScore < 80 -> Medium question with different competency.
   *  - previousScore < 50:
   *      if responseQuality == 'empty' -> Gentle follow-up or easy question allowing retry.
   *      else -> Targeted easy/follow-up question probing weakness.
   *
   * Question Bank Authority:
   *  - Selected question MUST exist in BEHAVIORAL_QUESTION_BANK.
   *  - Selected question MUST NOT be in usedQuestionIds.
   *  - AI recommendation is strictly validated; falls back to deterministic selector on any failure.
   */
  static async selectAdaptiveNextQuestion(
    input: AdaptiveSelectorInput
  ): Promise<AdaptiveSelectorResult | null> {
    const authorizedPool = (input.remainingQuestionBank || BEHAVIORAL_QUESTION_BANK).filter(
      (q) => q.category !== 'Self Introduction' && !input.usedQuestionIds.includes(q.id)
    );

    if (authorizedPool.length === 0) {
      return null;
    }

    // Try LLM selection from authorized pool when available
    if (isLLMAvailable()) {
      try {
        const poolOverview = authorizedPool.map((q) => ({
          id: q.id,
          question: q.question,
          category: q.category,
          difficulty: q.difficulty,
          competency: q.competency,
        }));

        const systemPrompt = `You are an adaptive technical interview director selecting the next question for a candidate.
ADAPTIVE DECISION RULES:
1. IF previousScore >= 80: Select a 'hard' difficulty question to challenge candidate and test deeper competency.
2. IF previousScore >= 50 AND previousScore < 80: Select a 'medium' difficulty question. Prefer a different competency than tested previously.
3. IF previousScore < 50:
   - If responseQuality is 'empty': Select an accessible question to give the candidate another opportunity.
   - Else: Select an 'easy' question or targeted follow-up probing weakness.
4. VARIETY: Prioritize competencies NOT in previousCompetencies.
5. STRICT QUESTION BANK AUTHORITY: You MUST choose ONLY from the provided Candidate Questions by exact 'nextQuestionId'. Never generate external questions.
6. Return ONLY valid JSON matching the exact schema with no markdown formatting.`;

        const userPrompt = `ADAPTIVE SELECTION TASK:
Previous Question: "${input.previousQuestion}" (id: "${input.previousQuestionId}")
Previous Score: ${input.previousScore} / 100
Response Quality: "${input.responseQuality}"
Previous Competencies: [${input.previousCompetencies.map((c) => `"${c}"`).join(', ')}]
Used Question IDs: [${input.usedQuestionIds.map((id) => `"${id}"`).join(', ')}]

Candidate Questions Pool:
${JSON.stringify(poolOverview, null, 2)}

Return JSON matching this schema:
{
  "nextQuestionId": "string from Candidate Questions Pool",
  "reasoning": "1-2 sentences explaining why this difficulty and competency were chosen",
  "followUp": boolean
}`;

        const llmText = await callGroq([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ], 350);

        const jsonStart = llmText.indexOf('{');
        const jsonEnd = llmText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const parsed = JSON.parse(llmText.substring(jsonStart, jsonEnd + 1));
          const chosen = authorizedPool.find((q) => q.id === parsed.nextQuestionId);

          // STRICT DETERMINISTIC VALIDATION OF AI OUTPUT
          if (chosen && !input.usedQuestionIds.includes(chosen.id)) {
            return {
              nextQuestionId: chosen.id,
              nextQuestionText: chosen.question,
              category: chosen.category,
              difficulty: chosen.difficulty,
              competency: chosen.competency,
              reasoning: parsed.reasoning || `Adaptive selection based on previous score ${input.previousScore}/100.`,
              followUp: !!parsed.followUp,
            };
          }
        }
      } catch {
        // Fall back to deterministic selector
      }
    }

    return this.selectDeterministicAdaptiveQuestion(input);
  }

  /**
   * Deterministic Fallback Adaptive Selector.
   * Single source of truth when LLM is unavailable or returns invalid questions.
   */
  static selectDeterministicAdaptiveQuestion(
    input: AdaptiveSelectorInput
  ): AdaptiveSelectorResult | null {
    const authorizedPool = (input.remainingQuestionBank || BEHAVIORAL_QUESTION_BANK).filter(
      (q) => q.category !== 'Self Introduction' && !input.usedQuestionIds.includes(q.id)
    );

    if (authorizedPool.length === 0) {
      return null;
    }

    // Determine target difficulty order
    let targetDifficulties: Array<'easy' | 'medium' | 'hard'>;
    if (input.previousScore >= 80) {
      targetDifficulties = ['hard', 'medium', 'easy'];
    } else if (input.previousScore >= 50) {
      targetDifficulties = ['medium', 'hard', 'easy'];
    } else {
      targetDifficulties = ['easy', 'medium', 'hard'];
    }

    // Prioritize unvisited competencies
    const unvisited = authorizedPool.filter(
      (q) => !input.previousCompetencies.includes(q.competency)
    );
    const poolToSearch = unvisited.length > 0 ? unvisited : authorizedPool;

    // Find best match matching preferred difficulty
    let selected: CuratedQuestion | undefined;
    for (const diff of targetDifficulties) {
      selected = poolToSearch.find((q) => q.difficulty === diff);
      if (selected) break;
    }

    if (!selected) {
      selected = poolToSearch[0] || authorizedPool[0];
    }

    const reasoning = input.previousScore >= 80
      ? `Candidate demonstrated strong competency (Score: ${input.previousScore}/100). Advancing to '${selected.difficulty}' difficulty probing '${selected.competency}'.`
      : input.previousScore >= 50
      ? `Candidate demonstrated satisfactory performance (Score: ${input.previousScore}/100). Maintaining '${selected.difficulty}' difficulty to explore '${selected.competency}'.`
      : input.responseQuality === 'empty'
      ? `Previous response was empty. Providing an accessible '${selected.difficulty}' question on '${selected.competency}' to allow candidate to respond.`
      : `Previous response scored below threshold (${input.previousScore}/100). Adjusting to '${selected.difficulty}' difficulty probing '${selected.competency}'.`;

    return {
      nextQuestionId: selected.id,
      nextQuestionText: selected.question,
      category: selected.category,
      difficulty: selected.difficulty,
      competency: selected.competency,
      reasoning,
      followUp: false,
    };
  }
}
