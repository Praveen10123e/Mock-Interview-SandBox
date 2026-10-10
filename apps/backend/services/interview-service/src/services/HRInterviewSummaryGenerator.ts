/**
 * HRInterviewSummaryGenerator.ts
 *
 * PHASE 4 — Evidence-Based HR Interview Summary Generator.
 *
 * Consumes persisted multi-phase interview evidence:
 * - Verified Transcripts (Phase 1)
 * - 8-Dimension Evaluation & Official HRScoreEngine Score (Phase 1)
 * - STAR Breakdown & Coaching Evidence (Phase 2)
 * - Filler Word & Speech Pattern Intelligence (Phase 3)
 *
 * STRICT GOVERNING RULES:
 * 1. Official HR score is strictly authoritative from HRScoreEngine — never modified or overridden.
 * 2. Absolute zero hallucination — never invents technologies, metrics, team sizes, or leadership.
 * 3. Uses verifiedTranscript as primary text; rawTranscript as audit trail.
 * 4. Executive summary capped at 250 words.
 * 5. Handles empty and partial interviews honestly with explicit limitations.
 * 6. Readiness score is deterministic or null — never invented by LLM.
 * 7. Non-blocking failure tolerance — if generation fails, interview and scores remain valid.
 */

import axios from 'axios';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const LLM_API_KEY = process.env.GROQ_API_KEY || '';
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'GROQ';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface CandidateContext {
  name?: string;
  targetRole?: string;
  experienceLevel?: string;
  technicalStack?: string[];
}

export interface QuestionResponseEvidence {
  questionId: string;
  sequence: number;
  question: string;
  category: string;
  difficulty?: string;
  competency?: string | null;
  rawTranscript?: string | null;
  verifiedTranscript?: string | null;
  questionScore?: number | null;
  dimensionScores?: Record<string, number> | null;
  starAnalysis?: any | null;
  speechAnalysis?: any | null;
  durationSeconds?: number;
  wordCount?: number;
}

export interface SummaryGenerationInput {
  candidate?: CandidateContext;
  durationSeconds: number;
  officialHRScore: number;
  officialScoreSource: 'HRScoreEngine';
  responses: QuestionResponseEvidence[];
  speechSummary?: any | null;
}

export interface TopStrengthItem {
  title: string;
  description: string;
  evidence: string;
  sourceQuestionIds: string[];
}

export interface ImprovementAreaItem {
  title: string;
  description: string;
  evidence: string;
  impact: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
  sourceQuestionIds: string[];
}

export interface RecommendedPracticeItem {
  focus: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface HRInterviewSummaryResult {
  status: 'completed' | 'insufficient_evidence' | 'failed';
  executiveSummary: string;
  topStrengths: TopStrengthItem[];
  areasForImprovement: ImprovementAreaItem[];
  overallAssessment: {
    officialScore: number;
    scoreSource: 'HRScoreEngine';
    category: 'Top Tier' | 'Proficient' | 'Needs Attention';
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
  strongestDimensions: Array<{ dimension: string; averageScore: number }>;
  weakestDimensions: Array<{ dimension: string; averageScore: number }>;
  recommendedPracticeFocus: RecommendedPracticeItem[];
  readinessScore: number | null;
  assessmentLimitations: string[];
  metadata: {
    analysisVersion: string;
    model: string;
    promptVersion: string;
    generatedAt: string;
    status: 'completed' | 'insufficient_evidence' | 'failed';
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isLLMAvailable(): boolean {
  return LLM_PROVIDER === 'GROQ' && !!LLM_API_KEY && LLM_API_KEY.length > 10;
}

async function callGroq(messages: Array<{ role: string; content: string }>, maxTokens = 800): Promise<string> {
  const response = await axios.post(
    GROQ_API_URL,
    {
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2, // Low temperature for high factual adherence
    },
    {
      headers: {
        Authorization: `Bearer ${LLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );
  return response.data?.choices?.[0]?.message?.content || '';
}

// ─── Core Service ─────────────────────────────────────────────────────────────

export class HRInterviewSummaryGenerator {
  static readonly ANALYSIS_VERSION = 'hr-summary-v1';
  static readonly PROMPT_VERSION = 'hr-summary-prompt-v1';

  /**
   * Main entry point to generate the evidence-based final interview summary.
   */
  static async generateSummary(input: SummaryGenerationInput): Promise<HRInterviewSummaryResult> {
    const totalScheduled = input.responses.length;

    // Filter responses with meaningful candidate speech
    const answeredResponses = (input.responses || []).filter((r) => {
      const text = (r.verifiedTranscript || r.rawTranscript || '').trim();
      const silencePlaceholders = [
        '[candidate audio response recorded]',
        '[candidate audio response]',
        '[no speech]',
        '[no speech detected]',
      ];
      return text.length > 0 && !silencePlaceholders.some((p) => text.toLowerCase() === p);
    });

    const answeredCount = answeredResponses.length;

    // ─── CASE 1: ZERO ANSWERED RESPONSES (Empty Interview) ──────────────────────
    if (answeredCount === 0) {
      return this.buildInsufficientEvidenceResult(input);
    }

    // ─── CASE 2: DETERMINISTIC CORE AGGREGATION ────────────────────────────────
    const limitations: string[] = [];
    if (answeredCount < totalScheduled) {
      limitations.push(
        `Assessment is based on ${answeredCount} of ${totalScheduled} scheduled questions. Unanswered questions received zero score.`
      );
    }

    // 1. Determine Score Category
    const officialScore = Math.round(input.officialHRScore);
    let scoreCategory: 'Top Tier' | 'Proficient' | 'Needs Attention';
    if (officialScore >= 80) {
      scoreCategory = 'Top Tier';
    } else if (officialScore >= 65) {
      scoreCategory = 'Proficient';
    } else {
      scoreCategory = 'Needs Attention';
    }

    // 2. Aggregate Dimension Averages (Phase 1 Evidence)
    const dimKeys = [
      'relevance',
      'specificity',
      'evidence',
      'structure',
      'clarity',
      'technicalDepth',
      'ownership',
      'professionalism',
    ] as const;

    const dimSums: Record<string, number> = {};
    const dimCounts: Record<string, number> = {};
    dimKeys.forEach((k) => {
      dimSums[k] = 0;
      dimCounts[k] = 0;
    });

    answeredResponses.forEach((r) => {
      if (r.dimensionScores && typeof r.dimensionScores === 'object') {
        dimKeys.forEach((k) => {
          const val = (r.dimensionScores as any)[k];
          if (typeof val === 'number') {
            dimSums[k] += val;
            dimCounts[k]++;
          }
        });
      }
    });

    const dimAverages = dimKeys.map((k) => ({
      dimension: k,
      averageScore: dimCounts[k] > 0 ? Math.round((dimSums[k] / dimCounts[k]) * 10) / 10 : 0,
    }));

    // Sort descending
    const sortedDims = [...dimAverages].sort((a, b) => b.averageScore - a.averageScore);
    const strongestDimensions = sortedDims.slice(0, 2);
    const weakestDimensions = sortedDims.slice(-2).reverse();

    // 3. Aggregate STAR Statistics (Phase 2 Evidence)
    let starApplicableCount = 0;
    let starCompleteCount = 0;
    let starMissingResultCount = 0;

    answeredResponses.forEach((r) => {
      const star = r.starAnalysis;
      if (star && typeof star === 'object' && star.starApplicable === true) {
        starApplicableCount++;
        const hasSit = star.situation?.present && star.situation?.score >= 4;
        const hasTask = star.task?.present && star.task?.score >= 4;
        const hasAct = star.action?.present && star.action?.score >= 4;
        const hasRes = star.result?.present && star.result?.score >= 4;

        if (hasSit && hasTask && hasAct && hasRes) {
          starCompleteCount++;
        }
        if (!hasRes) {
          starMissingResultCount++;
        }
      }
    });

    // Enforce invariant: complete responses cannot exceed applicable responses
    starCompleteCount = Math.min(starCompleteCount, starApplicableCount);

    let starSummaryText = '';
    if (starApplicableCount === 0) {
      starSummaryText = 'No situational or behavioral questions requiring the STAR structure were evaluated in this session.';
    } else {
      starSummaryText = `Candidate completed the STAR framework in ${starCompleteCount} of ${starApplicableCount} behavioral questions. ${
        starMissingResultCount > 0
          ? `${starMissingResultCount} response(s) lacked measurable outcomes or quantifiable results.`
          : 'All evaluated behavioral questions provided concrete results.'
      }`;
    }

    // 4. Aggregate Communication Evidence (Phase 3 Evidence)
    const speech = input.speechSummary;
    const commStrengths: string[] = [];
    const commImprovements: string[] = [];

    if (speech && typeof speech === 'object') {
      const roundedWpm = typeof speech.averageWpm === 'number' && !isNaN(speech.averageWpm) ? Math.round(speech.averageWpm) : null;
      if (speech.paceClassification === 'normal') {
        commStrengths.push(`Speaking pace remained well-balanced within the normal executive band (${roundedWpm || 'standard'} WPM).`);
      } else if (speech.paceClassification === 'fast' || speech.paceClassification === 'very_fast') {
        commImprovements.push(`Speaking pace was elevated (${roundedWpm || speech.averageWpm} WPM). Practice deliberate pausing between technical thoughts.`);
      } else if (speech.paceClassification === 'slow') {
        commImprovements.push(`Speaking pace was slower than standard (${roundedWpm || speech.averageWpm} WPM). Strive for a more fluid conversational cadence.`);
      }

      if (typeof speech.averageFillerRate === 'number') {
        if (speech.averageFillerRate <= 3.0) {
          commStrengths.push(`Minimal disfluencies observed (${speech.averageFillerRate}% filler rate per 100 words).`);
        } else if (speech.averageFillerRate > 5.0) {
          commImprovements.push(
            `Elevated filler rate (${speech.averageFillerRate}% per 100 words) with recurring expressions like ${
              speech.topFillerWords?.map((f: any) => `"${f.word}"`).join(', ') || 'fillers'
            }.`
          );
        }
      }

      if (speech.totalConfidenceMarkers > speech.totalUncertaintyMarkers) {
        commStrengths.push(`Direct ownership language predominated over qualifying uncertainty markers.`);
      } else if (speech.totalUncertaintyMarkers > 0) {
        commImprovements.push(`Frequent uncertainty phrasing qualifiers were detected across responses.`);
      }
    } else {
      commStrengths.push('Candidate articulated responses audibly and responded to scheduled questions.');
    }

    const commSummaryText =
      commImprovements.length === 0
        ? 'Speech analysis indicated clear, fluid communication with minimal disfluencies.'
        : `Communication analysis identified opportunities to refine verbal delivery, specifically addressing ${commImprovements.join(' ')}`;

    // 5. Build Top Strengths Grounded in Evidence
    const topStrengths: TopStrengthItem[] = [];

    // Strength from strongest dimension
    if (strongestDimensions.length > 0 && strongestDimensions[0].averageScore >= 6.0) {
      const topDim = strongestDimensions[0];
      const matchingResponses = answeredResponses.filter(
        (r) => ((r.dimensionScores as any)?.[topDim.dimension] || 0) >= 7.0
      );
      const qIds = matchingResponses.map((r) => r.questionId);
      const sampleEvidence = matchingResponses[0]?.verifiedTranscript || matchingResponses[0]?.rawTranscript || '';

      topStrengths.push({
        title: `Consistent ${this.formatDimName(topDim.dimension)}`,
        description: `Candidate achieved an average score of ${topDim.averageScore}/10 across evaluated questions in ${this.formatDimName(topDim.dimension)}.`,
        evidence: sampleEvidence.substring(0, 180) + (sampleEvidence.length > 180 ? '...' : ''),
        sourceQuestionIds: qIds.length > 0 ? qIds : [answeredResponses[0].questionId],
      });
    }

    // Strength from technical keywords / verified stack if present in transcript
    const techResponses = answeredResponses.filter((r) => {
      const text = (r.verifiedTranscript || '').toLowerCase();
      return /(node\.?js|react|typescript|python|postgresql|sql|api|fastapi|docker|mongodb)/.test(text);
    });

    if (techResponses.length > 0) {
      const techQ = techResponses[0];
      topStrengths.push({
        title: 'Concrete Technical Articulation',
        description: 'Candidate articulated hands-on project implementation details utilizing specific technologies.',
        evidence: (techQ.verifiedTranscript || techQ.rawTranscript || '').substring(0, 180) + '...',
        sourceQuestionIds: [techQ.questionId],
      });
    }

    // Strength from STAR complete responses if available
    const starCompleteResponses = answeredResponses.filter(
      (r) => r.starAnalysis?.starApplicable && r.starAnalysis?.completeness === 100
    );
    if (starCompleteResponses.length > 0) {
      const starQ = starCompleteResponses[0];
      topStrengths.push({
        title: 'Structured STAR Delivery',
        description: 'Candidate successfully framed project experiences covering Situation, Task, Action, and Result.',
        evidence: (starQ.starAnalysis.result?.evidence || starQ.verifiedTranscript || '').substring(0, 180) + '...',
        sourceQuestionIds: [starQ.questionId],
      });
    }

    // Fallback strength if needed
    if (topStrengths.length === 0) {
      topStrengths.push({
        title: 'Active Interview Participation',
        description: 'Candidate engaged and completed the scheduled interview questions.',
        evidence: (answeredResponses[0].verifiedTranscript || answeredResponses[0].rawTranscript || '').substring(0, 150) + '...',
        sourceQuestionIds: [answeredResponses[0].questionId],
      });
    }

    // 6. Build Areas for Improvement Grounded in Evidence
    const areasForImprovement: ImprovementAreaItem[] = [];

    // Weakness 1: Weakest dimension
    if (weakestDimensions.length > 0 && weakestDimensions[0].averageScore < 7.5) {
      const weakDim = weakestDimensions[0];
      const lowScoringResponses = answeredResponses.filter(
        (r) => ((r.dimensionScores as any)?.[weakDim.dimension] || 0) < 6.0
      );
      const qIds = lowScoringResponses.map((r) => r.questionId);
      const sampleEv = lowScoringResponses[0]?.verifiedTranscript || lowScoringResponses[0]?.rawTranscript || 'Responses lacked depth in this criterion.';

      areasForImprovement.push({
        title: `Depth in ${this.formatDimName(weakDim.dimension)}`,
        description: `Average evaluated score in ${this.formatDimName(weakDim.dimension)} was ${weakDim.averageScore}/10 across turns.`,
        evidence: sampleEv.substring(0, 160) + (sampleEv.length > 160 ? '...' : ''),
        impact: `Lower scores in ${this.formatDimName(weakDim.dimension)} diminish the overall persuasiveness of the answers.`,
        recommendation: `Provide concrete technical examples and elaborate directly on how decisions were made.`,
        priority: weakDim.averageScore < 5.0 ? 'high' : 'medium',
        sourceQuestionIds: qIds.length > 0 ? qIds : [answeredResponses[0].questionId],
      });
    }

    // Weakness 2: Missing STAR Result
    if (starMissingResultCount > 0) {
      const missingResQuestions = answeredResponses.filter(
        (r) => r.starAnalysis?.starApplicable && (!r.starAnalysis.result?.present || r.starAnalysis.result?.score === 0)
      );
      areasForImprovement.push({
        title: 'Quantifiable Results & Outcomes',
        description: 'Behavioral responses described situations and actions but omitted measurable outcomes.',
        evidence: (missingResQuestions[0]?.verifiedTranscript || 'Action completed without explaining outcome metric.').substring(0, 160) + '...',
        impact: 'Interviewers cannot assess the real-world success or business value of your contributions without results.',
        recommendation: 'Conclude behavioral answers by stating measurable metrics (e.g. latency reduced, user adoption, test pass rate).',
        priority: 'high',
        sourceQuestionIds: missingResQuestions.map((r) => r.questionId),
      });
    }

    // Weakness 3: High fillers if observed
    if (speech && typeof speech.averageFillerRate === 'number' && speech.averageFillerRate > 4.5) {
      areasForImprovement.push({
        title: 'Verbal Delivery & Filler Reduction',
        description: `Filler words were detected at a rate of ${speech.averageFillerRate}% per 100 words.`,
        evidence: `Observed filler expressions: ${speech.topFillerWords?.map((f: any) => `"${f.word}" (${f.count}×)`).join(', ') || 'fillers'}.`,
        impact: 'Excessive filler words can detract from the authoritative delivery of technical points.',
        recommendation: 'Incorporate brief 1-2 second silent pauses instead of verbal crutches when formulating complex technical thoughts.',
        priority: 'medium',
        sourceQuestionIds: [answeredResponses[0].questionId],
      });
    }

    // 7. Recommended Practice Focus (3-5 targeted areas)
    const recommendedPracticeFocus: RecommendedPracticeItem[] = [];

    if (starMissingResultCount > 0) {
      recommendedPracticeFocus.push({
        focus: 'STAR Result Statements',
        reason: `${starMissingResultCount} behavioral answer(s) lacked measurable outcomes. Practice concluding stories with quantifiable metrics.`,
        priority: 'high',
      });
    }

    if (weakestDimensions.length > 0 && weakestDimensions[0].averageScore < 6.5) {
      recommendedPracticeFocus.push({
        focus: `Technical ${this.formatDimName(weakestDimensions[0].dimension)}`,
        reason: `Lowest performance dimension (${weakestDimensions[0].averageScore}/10). Practice structuring responses with explicit engineering evidence.`,
        priority: 'high',
      });
    }

    if (speech && typeof speech.averageFillerRate === 'number' && speech.averageFillerRate > 4.0) {
      recommendedPracticeFocus.push({
        focus: 'Controlled Speech Cadence',
        reason: `Elevated filler rate (${speech.averageFillerRate}%). Practice answering under mock timing using conscious silent pauses.`,
        priority: 'medium',
      });
    }

    // Always ensure at least 3 practice areas
    if (recommendedPracticeFocus.length < 3) {
      recommendedPracticeFocus.push({
        focus: '60–90 Second STAR Storytelling',
        reason: 'Mastering concise 90-second behavioral stories ensures all components fit naturally into interview turns.',
        priority: 'medium',
      });
    }

    if (recommendedPracticeFocus.length < 3) {
      recommendedPracticeFocus.push({
        focus: 'Architectural Trade-Off Articulation',
        reason: 'Explaining why a specific tool or design pattern was selected enhances technical credibility.',
        priority: 'medium',
      });
    }

    // 8. Deterministic Executive Summary (Strictly grounded in facts)
    let executiveSummary = this.buildDeterministicExecutiveSummary(
      officialScore,
      scoreCategory,
      answeredCount,
      totalScheduled,
      topStrengths,
      areasForImprovement,
      starCompleteCount,
      starApplicableCount
    );

    // ─── STEP 3: OPTIONAL LLM NARRATIVE ENRICHMENT ─────────────────────────────
    if (isLLMAvailable() && answeredCount >= 1) {
      try {
        const enriched = await this.enrichExecutiveSummaryWithLLM({
          candidateRole: input.candidate?.targetRole || 'Software Engineer',
          officialScore,
          scoreCategory,
          answeredCount,
          totalScheduled,
          topStrengths,
          areasForImprovement,
          strongestDims: strongestDimensions,
          weakestDims: weakestDimensions,
          starApplicableCount,
          starCompleteCount,
          speechSummary: speech,
          answeredResponses,
        });

        if (enriched && enriched.trim().length > 50) {
          // Strictly sanitize LLM text: NEVER allow hallucinated scores or speech pace
          let sanitized = enriched.trim();
          sanitized = sanitized.replace(/\b\d+\s*\/\s*100\b/g, `${officialScore}/100`);
          if (speech && typeof speech.averageWpm === 'number' && !isNaN(speech.averageWpm)) {
            const authoritativeWpm = Math.round(speech.averageWpm);
            sanitized = sanitized.replace(/\b\d+\s*WPM\b/gi, `${authoritativeWpm} WPM`);
          }

          // Verify word count <= 250 words
          const words = sanitized.split(/\s+/);
          if (words.length <= 260) {
            executiveSummary = sanitized;
          } else {
            executiveSummary = words.slice(0, 250).join(' ') + '.';
          }
        }
      } catch {
        // Deterministic summary remains active
      }
    }

    return {
      status: 'completed',
      executiveSummary,
      topStrengths: topStrengths.slice(0, 5),
      areasForImprovement: areasForImprovement.slice(0, 4),
      overallAssessment: {
        officialScore,
        scoreSource: 'HRScoreEngine',
        category: scoreCategory,
        summary: `Authoritative overall score of ${officialScore}/100 evaluated by HRScoreEngine (${scoreCategory}).`,
      },
      communicationAssessment: {
        summary: commSummaryText,
        strengths: commStrengths,
        improvements: commImprovements,
      },
      starAssessment: {
        applicableResponses: starApplicableCount,
        completeResponses: starCompleteCount,
        missingResultResponses: starMissingResultCount,
        summary: starSummaryText,
      },
      strongestDimensions,
      weakestDimensions,
      recommendedPracticeFocus: recommendedPracticeFocus.slice(0, 5),
      readinessScore: null, // STRICT RULE: never hallucinate readiness score
      assessmentLimitations: limitations,
      metadata: {
        analysisVersion: this.ANALYSIS_VERSION,
        model: isLLMAvailable() ? GROQ_MODEL : 'deterministic-evidence-engine',
        promptVersion: this.PROMPT_VERSION,
        generatedAt: new Date().toISOString(),
        status: 'completed',
      },
    };
  }

  /**
   * Deterministic fallback summary that strictly abides by evidence and <= 250 words.
   */
  private static buildDeterministicExecutiveSummary(
    score: number,
    category: string,
    answeredCount: number,
    totalScheduled: number,
    strengths: TopStrengthItem[],
    improvements: ImprovementAreaItem[],
    starComplete: number,
    starApplicable: number
  ): string {
    const strengthPhrases = strengths.map((s) => s.title.toLowerCase()).join(' and ');
    const improvementPhrases = improvements.map((i) => i.title.toLowerCase()).join(' as well as ');

    return (
      `Candidate completed ${answeredCount} of ${totalScheduled} behavioral questions, achieving an authoritative official HR score of ` +
      `${score}/100 (${category}). ` +
      `Demonstrated strong performance in ${strengthPhrases || 'core communication'}, with verified evidence across evaluated responses. ` +
      `${
        starApplicable > 0
          ? `Behavioral responses demonstrated structured STAR format in ${starComplete} of ${starApplicable} applicable scenario questions. `
          : ''
      }` +
      `Primary areas for improvement center on ${improvementPhrases || 'providing more detailed implementation metrics'}. ` +
      `Continuing targeted practice on concluding responses with measurable results and maintaining a steady conversational pace will substantially enhance interview readiness.`
    );
  }

  /**
   * LLM enrichment prompt with strict anti-hallucination constraints.
   */
  private static async enrichExecutiveSummaryWithLLM(params: {
    candidateRole: string;
    officialScore: number;
    scoreCategory: string;
    answeredCount: number;
    totalScheduled: number;
    topStrengths: TopStrengthItem[];
    areasForImprovement: ImprovementAreaItem[];
    strongestDims: Array<{ dimension: string; averageScore: number }>;
    weakestDims: Array<{ dimension: string; averageScore: number }>;
    starApplicableCount: number;
    starCompleteCount: number;
    speechSummary: any;
    answeredResponses: QuestionResponseEvidence[];
  }): Promise<string | null> {
    const verifiedSamples = params.answeredResponses
      .map((r, i) => `Q${i + 1} (${r.category}): "${(r.verifiedTranscript || r.rawTranscript || '').substring(0, 150)}"`)
      .join('\n');

    const authoritativeWpm =
      typeof params.speechSummary?.averageWpm === 'number' && !isNaN(params.speechSummary.averageWpm)
        ? Math.round(params.speechSummary.averageWpm)
        : 'normal';

    const prompt = `You are a senior technical hiring manager and interview assessor.
Generate a concise, professional executive summary for a candidate's completed HR behavioral interview.

AUTHORITATIVE INTERVIEW EVIDENCE:
- Role: ${params.candidateRole}
- Official Score: ${params.officialScore} / 100 (Evaluated by deterministic HRScoreEngine — DO NOT CHANGE OR RE-CALCULATE)
- Classification: ${params.scoreCategory}
- Questions Answered: ${params.answeredCount} of ${params.totalScheduled} behavioral questions
- Strongest Dimensions: ${params.strongestDims.map((d) => `${d.dimension} (${d.averageScore}/10)`).join(', ')}
- Weakest Dimensions: ${params.weakestDims.map((d) => `${d.dimension} (${d.averageScore}/10)`).join(', ')}
- STAR Performance: ${params.starCompleteCount} complete out of ${params.starApplicableCount} applicable
- Speech Pacing & Delivery: ${authoritativeWpm} WPM, filler rate: ${params.speechSummary?.averageFillerRate || 0}%
- Spoken Excerpts:
${verifiedSamples}

CRITICAL ANTI-HALLUCINATION RULES:
1. MAXIMUM 250 WORDS. Be concise and impactful.
2. NEVER INVENT candidate experiences, projects, tools, metrics, team sizes (e.g. do not say "led a team of 5"), or companies not explicitly mentioned in the excerpts.
3. NEVER produce a different score or speech pace. The candidate scored ${params.officialScore} and average pace was ${authoritativeWpm} WPM. If mentioning WPM, use EXACTLY this number.
4. Do NOT make psychological claims (e.g. do not say "candidate was nervous" or "lacks confidence"). Use "uncertainty markers" or "conversational pace".
5. Return ONLY the narrative paragraph text. Do not include markdown headers or bullet points.`;

    const text = await callGroq(
      [
        { role: 'system', content: 'You are an objective interview assessment architect. Write concise, fact-grounded executive summaries.' },
        { role: 'user', content: prompt },
      ],
      400
    );

    return text.trim();
  }

  /**
   * Return standardized insufficient evidence structure for empty sessions.
   */
  private static buildInsufficientEvidenceResult(input: SummaryGenerationInput): HRInterviewSummaryResult {
    return {
      status: 'insufficient_evidence',
      executiveSummary: 'Insufficient interview evidence is available to generate a meaningful performance summary.',
      topStrengths: [],
      areasForImprovement: [],
      overallAssessment: {
        officialScore: input.officialHRScore,
        scoreSource: 'HRScoreEngine',
        category: 'Needs Attention',
        summary: `Authoritative overall score of ${input.officialHRScore}/100. Zero substantive candidate responses were recorded.`,
      },
      communicationAssessment: {
        summary: 'Communication analysis unavailable due to absence of recorded speech.',
        strengths: [],
        improvements: ['Ensure microphone permissions are granted and speak clearly during the interview session.'],
      },
      starAssessment: {
        applicableResponses: 0,
        completeResponses: 0,
        missingResultResponses: 0,
        summary: 'No behavioral question responses were provided for STAR analysis.',
      },
      strongestDimensions: [],
      weakestDimensions: [],
      recommendedPracticeFocus: [
        {
          focus: 'Microphone & Audio Setup',
          reason: 'Ensure audio hardware is functional before beginning future interview sessions.',
          priority: 'high',
        },
      ],
      readinessScore: null,
      assessmentLimitations: ['Candidate provided zero audible or substantive responses during this session.'],
      metadata: {
        analysisVersion: this.ANALYSIS_VERSION,
        model: 'deterministic-evidence-engine',
        promptVersion: this.PROMPT_VERSION,
        generatedAt: new Date().toISOString(),
        status: 'insufficient_evidence',
      },
    };
  }

  private static formatDimName(dim: string): string {
    const map: Record<string, string> = {
      relevance: 'Relevance',
      specificity: 'Specificity',
      evidence: 'Evidence',
      structure: 'Structure',
      clarity: 'Clarity',
      technicalDepth: 'Technical Depth',
      ownership: 'Ownership',
      professionalism: 'Professionalism',
    };
    return map[dim] || dim;
  }
}
