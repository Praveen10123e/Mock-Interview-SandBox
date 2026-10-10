/**
 * HRRubrics.ts
 *
 * Question-Specific Rubrics and Deterministic Evidence-Based Scoring Engine
 * for HR and Technical Behavioral Interviews.
 *
 * Each question category has structured evaluation criteria with:
 * - maxScore per criterion
 * - semantic description of what constitutes valid evidence
 * - guidance on full vs partial credit
 * - mapping to standard 10-dimension behavioral profile
 */

export interface RubricCriterion {
  id: string;
  name: string;
  maxScore: number;
  description: string;
  semanticExpectations: string[];
}

export interface QuestionRubric {
  category: string;
  totalMaxScore: number;
  isDirectEntityQuestion?: boolean;
  criteria: RubricCriterion[];
}

export interface CriterionEvidenceResult {
  criterion: string;
  maxScore: number;
  score: number;
  evidence: string | null;
  reason: string;
}

export interface DeterministicEvaluationResult {
  overallScore: number;
  criteriaResults: CriterionEvidenceResult[];
  relevanceStatus: 'ON_TOPIC' | 'PARTIALLY_RELEVANT' | 'OFF_TOPIC' | 'NO_RESPONSE';
  dimensions: {
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
  };
  feedback: string;
  strengths: string[];
  improvements: string[];
  starGuidance: string;
}

// ─── Rubric Definitions ────────────────────────────────────────────────────────

export const QUESTION_RUBRICS: Record<string, QuestionRubric> = {
  'Project Challenge': {
    category: 'Project Challenge',
    totalMaxScore: 10,
    criteria: [
      {
        id: 'problem_id',
        name: 'Problem Identification',
        maxScore: 2,
        description: 'Clearly identifies the technical obstacle, bug, constraint, or design challenge faced in the project.',
        semanticExpectations: [
          'Explains what was broken, failing, slow, or difficult',
          'Identifies the domain or system component involved',
        ],
      },
      {
        id: 'approach',
        name: 'Technical Approach & Solution',
        maxScore: 3,
        description: 'Articulates the technical solution, tools, algorithms, or engineering steps taken to solve the problem.',
        semanticExpectations: [
          'Describes the specific technique, library, algorithm, or architectural adjustment implemented',
          'Details the candidate own actions rather than vague passive actions',
        ],
      },
      {
        id: 'reasoning',
        name: 'Technical Reasoning & Analysis',
        maxScore: 2,
        description: 'Explains why the solution was chosen, why initial attempts failed, or trade-offs considered.',
        semanticExpectations: [
          'Explains root cause of failure or limitation of initial approach',
          'Demonstrates engineering thought process and rationale',
        ],
      },
      {
        id: 'result',
        name: 'Measurable Result / Outcome',
        maxScore: 2,
        description: 'Details the final outcome, verification, or impact of the fix on the project.',
        semanticExpectations: [
          'Confirms resolution with concrete impact (e.g. improved separation, higher accuracy, reduced latency, successfully merged)',
        ],
      },
      {
        id: 'clarity_reflection',
        name: 'Communication & Learning',
        maxScore: 1,
        description: 'Communicates clearly with logical flow and reflects on learnings or takeaways.',
        semanticExpectations: [
          'Presents a coherent narrative without heavy confusion or contradictions',
        ],
      },
    ],
  },

  'Self Introduction': {
    category: 'Self Introduction',
    totalMaxScore: 10,
    criteria: [
      {
        id: 'academic_background',
        name: 'Academic & Background Context',
        maxScore: 2,
        description: 'States academic degree, university/college, or educational foundation.',
        semanticExpectations: ['Mentions degree, branch of study, or educational stage'],
      },
      {
        id: 'technical_skills',
        name: 'Core Technical Skillset',
        maxScore: 3,
        description: 'Names specific programming languages, frameworks, developer tools, or domains of expertise.',
        semanticExpectations: ['References technical stack (e.g. Python, Java, React, SQL, backend, frontend)'],
      },
      {
        id: 'project_practical_work',
        name: 'Practical Application / Projects',
        maxScore: 3,
        description: 'Mentions real projects, internships, or practical implementations worked on.',
        semanticExpectations: ['Highlights at least one project, role, or technical deliverable'],
      },
      {
        id: 'motivation_goals',
        name: 'Career Motivation & Direction',
        maxScore: 2,
        description: 'Explains passion for software development or career aspiration.',
        semanticExpectations: ['Communicates why they want to work in software engineering'],
      },
    ],
  },

  'Teamwork': {
    category: 'Teamwork',
    totalMaxScore: 10,
    criteria: [
      {
        id: 'situation_team_context',
        name: 'Team Context & Collaboration Goal',
        maxScore: 2,
        description: 'Describes the team composition, project objective, or collaborative setting.',
        semanticExpectations: ['Sets the team dynamic and goal'],
      },
      {
        id: 'individual_contribution',
        name: 'Candidate Specific Contribution',
        maxScore: 3,
        description: 'Clearly delineates what the candidate individually owned vs team tasks.',
        semanticExpectations: ['Specifies actions taken by candidate to support teammates or deliver feature'],
      },
      {
        id: 'communication_consensus',
        name: 'Communication & Alignment',
        maxScore: 3,
        description: 'Demonstrates active listening, consensus building, or handling differing opinions.',
        semanticExpectations: ['Explains how alignment was achieved among team members'],
      },
      {
        id: 'team_outcome',
        name: 'Collective Outcome & Impact',
        maxScore: 2,
        description: 'Describes the final team result and shared success or project delivery.',
        semanticExpectations: ['Delivered feature, submitted project, met milestone'],
      },
    ],
  },

  'Conflict Resolution': {
    category: 'Conflict Resolution',
    totalMaxScore: 10,
    criteria: [
      {
        id: 'conflict_context',
        name: 'Disagreement Identification',
        maxScore: 2,
        description: 'Explains what the technical or interpersonal disagreement was without hostility.',
        semanticExpectations: ['Identifies differing opinions on architecture, tools, task distribution'],
      },
      {
        id: 'deescalation',
        name: 'Professional De-escalation & Action',
        maxScore: 4,
        description: 'Explains constructive steps taken: data-driven discussion, pros/cons list, prototype testing.',
        semanticExpectations: ['Shows constructive problem-focused resolution instead of emotional reaction'],
      },
      {
        id: 'consensus_outcome',
        name: 'Agreed Resolution & Outcome',
        maxScore: 2,
        description: 'Shows that a positive working consensus was reached.',
        semanticExpectations: ['Both parties agreed on path forward and project progressed'],
      },
      {
        id: 'learning',
        name: 'Personal Reflection & Relationship Impact',
        maxScore: 2,
        description: 'Reflects on what was learned about collaboration and stakeholder management.',
        semanticExpectations: ['Shows emotional intelligence and professional growth'],
      },
    ],
  },

  'Ownership': {
    category: 'Ownership',
    totalMaxScore: 10,
    criteria: [
      {
        id: 'initiative_context',
        name: 'Opportunity or Problem Identification',
        maxScore: 2,
        description: 'Identifies an unmet need, process gap, or project risk noticed by candidate.',
        semanticExpectations: ['Spotted something that needed fixing without being ordered to'],
      },
      {
        id: 'proactive_action',
        name: 'Proactive Responsibility & Action',
        maxScore: 4,
        description: 'Took accountability and drove the solution beyond minimum requirements.',
        semanticExpectations: ['Detailed personal initiative, voluntary effort, or extra responsibility taken'],
      },
      {
        id: 'quantified_impact',
        name: 'Outcome & Impact',
        maxScore: 2,
        description: 'Demonstrates the positive effect of taking ownership.',
        semanticExpectations: ['Impact on team, stability, delivery time, or code quality'],
      },
      {
        id: 'accountability',
        name: 'Accountability & Learning',
        maxScore: 2,
        description: 'Shows willingness to take responsibility when things go wrong and learn.',
        semanticExpectations: ['Acknowledges lessons learned and preventive measures'],
      },
    ],
  },

  'Leadership': {
    category: 'Leadership',
    totalMaxScore: 10,
    criteria: [
      {
        id: 'vision_goal',
        name: 'Goal Setting & Direction',
        maxScore: 2,
        description: 'Articulates how the goal or vision was communicated to team members.',
        semanticExpectations: ['Set clear direction and objectives'],
      },
      {
        id: 'delegation_empowerment',
        name: 'Empowerment & Support',
        maxScore: 4,
        description: 'Describes unblocking teammates, matching tasks to strengths, or mentoring.',
        semanticExpectations: ['Assisted others, delegated responsibly, kept team motivated'],
      },
      {
        id: 'delivery_outcome',
        name: 'Team Delivery & Results',
        maxScore: 2,
        description: 'Highlights successful completion of the initiative under candidate leadership.',
        semanticExpectations: ['Milestone met or project delivered'],
      },
      {
        id: 'reflection',
        name: 'Leadership Growth',
        maxScore: 2,
        description: 'Reflects on leadership style and handling team challenges.',
        semanticExpectations: ['Self-awareness and constructive leadership takeaways'],
      },
    ],
  },

  'Adaptability': {
    category: 'Adaptability',
    totalMaxScore: 10,
    criteria: [
      {
        id: 'change_context',
        name: 'Change or Unknown Environment',
        maxScore: 2,
        description: 'Identifies the unexpected requirement change or new unfamiliar tool/framework.',
        semanticExpectations: ['Explains the pivot, new stack, or sudden constraint change'],
      },
      {
        id: 'learning_strategy',
        name: 'Rapid Learning & Adjustment Action',
        maxScore: 4,
        description: 'Details the deliberate learning plan or technical adjustments made quickly.',
        semanticExpectations: ['Documentation review, POC prototyping, step-by-step ramp up'],
      },
      {
        id: 'successful_delivery',
        name: 'Successful Delivery despite Change',
        maxScore: 2,
        description: 'Shows that deadlines were met or product was successfully updated.',
        semanticExpectations: ['Delivered output on time despite the disruption'],
      },
      {
        id: 'mindset',
        name: 'Growth Mindset & Future Resilience',
        maxScore: 2,
        description: 'Demonstrates positive attitude toward change and future readiness.',
        semanticExpectations: ['Embraces new technologies and continuous learning'],
      },
    ],
  },

  'Situational': {
    category: 'Situational',
    totalMaxScore: 10,
    criteria: [
      {
        id: 'problem_triage',
        name: 'Triage & Assessment Strategy',
        maxScore: 3,
        description: 'Initial analysis: checking logs, replicating issue, identifying blast radius.',
        semanticExpectations: ['Systematic diagnosis rather than random guessing'],
      },
      {
        id: 'execution_plan',
        name: 'Systematic Execution & Resolution',
        maxScore: 4,
        description: 'Step-by-step remediation: hotfix, rollback, unit tests, code cleanup.',
        semanticExpectations: ['Clear engineering action plan executed carefully'],
      },
      {
        id: 'stakeholder_communication',
        name: 'Communication & Documentation',
        maxScore: 2,
        description: 'Updating stakeholders and documenting post-mortem or test cases.',
        semanticExpectations: ['Post-mortem, documentation, communication to manager/team'],
      },
      {
        id: 'prevention',
        name: 'Long-term Prevention',
        maxScore: 1,
        description: 'Measures to prevent recurrence (CI/CD tests, monitoring, alerts).',
        semanticExpectations: ['Alerts, regression tests, refactoring plan'],
      },
    ],
  },

  'Direct Question': {
    category: 'Direct Question',
    totalMaxScore: 5,
    isDirectEntityQuestion: true,
    criteria: [
      {
        id: 'direct_answer',
        name: 'Direct Entity / Factual Answer',
        maxScore: 4,
        description: 'Directly and accurately names the requested entity (language, tool, database, concept).',
        semanticExpectations: ['States valid answer matching question query directly'],
      },
      {
        id: 'brief_context',
        name: 'Clarity & Correctness',
        maxScore: 1,
        description: 'Unambiguous and correct context.',
        semanticExpectations: ['Accurate specification without confusion'],
      },
    ],
  },
};

export class HRRubricService {
  /**
   * Determine whether a question expects a concise entity or open-ended behavioral answer.
   */
  static isConciseEntityQuestion(question: string): boolean {
    const q = question.toLowerCase();
    return (
      (/\b(?:which|what)\s+(?:programming\s+)?(?:language|framework|database|tool|version|cloud|ide)\b/i.test(q) ||
        /\b(?:what\s+is\s+your\s+favorite|what\s+stack)\b/i.test(q)) &&
      !/\b(?:describe|explain|walk\s+me\s+through|tell\s+me\s+about|elaborate)\b/i.test(q)
    );
  }

  /**
   * Get the best matching rubric for a given question and category.
   */
  static getRubricForQuestion(question: string, category: string): QuestionRubric {
    if (this.isConciseEntityQuestion(question)) {
      return QUESTION_RUBRICS['Direct Question'];
    }

    if (QUESTION_RUBRICS[category]) {
      return QUESTION_RUBRICS[category];
    }

    // Default to Project Challenge if technical, or Self Introduction if intro-related
    const qLower = question.toLowerCase();
    if (qLower.includes('introduce') || qLower.includes('background')) {
      return QUESTION_RUBRICS['Self Introduction'];
    }
    if (qLower.includes('conflict') || qLower.includes('disagree')) {
      return QUESTION_RUBRICS['Conflict Resolution'];
    }
    if (qLower.includes('team') || qLower.includes('collaborat')) {
      return QUESTION_RUBRICS['Teamwork'];
    }
    if (qLower.includes('lead') || qLower.includes('mentor')) {
      return QUESTION_RUBRICS['Leadership'];
    }
    if (qLower.includes('adapt') || qLower.includes('learn') || qLower.includes('unfamiliar')) {
      return QUESTION_RUBRICS['Adaptability'];
    }
    if (qLower.includes('production') || qLower.includes('bug') || qLower.includes('debug')) {
      return QUESTION_RUBRICS['Situational'];
    }

    return QUESTION_RUBRICS['Project Challenge'];
  }

  /**
   * Calculate a deterministic final score and dimension breakdown from criterion results.
   */
  static calculateDeterministicScore(
    rubric: QuestionRubric,
    criteriaResults: CriterionEvidenceResult[],
    relevanceStatus: 'ON_TOPIC' | 'PARTIALLY_RELEVANT' | 'OFF_TOPIC' | 'NO_RESPONSE',
    durationSeconds: number,
    wordCount: number
  ): DeterministicEvaluationResult {
    // 1. Guard against NO_RESPONSE
    if (relevanceStatus === 'NO_RESPONSE' || wordCount === 0) {
      return {
        overallScore: 0,
        criteriaResults: rubric.criteria.map((c) => ({
          criterion: c.name,
          maxScore: c.maxScore,
          score: 0,
          evidence: null,
          reason: 'No response was provided, so there was insufficient evidence to evaluate this question.',
        })),
        relevanceStatus: 'NO_RESPONSE',
        dimensions: {
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
        },
        feedback: 'No response was provided, so there was insufficient evidence to evaluate this question.',
        strengths: [],
        improvements: ['Provide an audible and substantive response when the question is asked.'],
        starGuidance: 'Ensure your microphone is functioning and speak clearly to structure your response.',
      };
    }

    // 2. Off-Topic Guard: When off-topic, content criteria receive 0.
    // All dimensions are 0 to maintain dimension/overall consistency.
    // Minimal speaking credit (1-5 pts) is given only for communication if candidate spoke.
    if (relevanceStatus === 'OFF_TOPIC') {
      const sanitizedResults: CriterionEvidenceResult[] = criteriaResults.map((r) => ({
        criterion: r.criterion,
        maxScore: r.maxScore,
        score: 0,
        evidence: null,
        reason: 'The response did not address the question asked.',
      }));

      // Small communication credit only if candidate actually spoke (>= 5 words)
      const speakingCredit = wordCount >= 5 ? 5 : 0;

      return {
        overallScore: 0,
        criteriaResults: sanitizedResults,
        relevanceStatus: 'OFF_TOPIC',
        dimensions: {
          communicationScore: speakingCredit,
          problemSolvingScore: 0,
          teamworkScore: 0,
          professionalismScore: speakingCredit,
          relevanceScore: 0,
          clarityScore: 0,
          ownershipScore: 0,
          leadershipScore: 0,
          confidenceScore: speakingCredit,
          structureScore: 0,
        },
        feedback: 'The response did not address the question asked. No credit was awarded for question-specific content criteria.',
        strengths: wordCount >= 5 ? ['Candidate spoke audibly'] : [],
        improvements: ['Listen carefully to the question prompt and address the specific challenge or scenario requested.'],
        starGuidance: 'Directly address the question topic before providing general academic background.',
      };
    }

    // 3. Deterministic Summation of Earned Points
    let totalEarned = 0;
    let totalMax = rubric.totalMaxScore;

    for (const res of criteriaResults) {
      const clampedScore = Math.min(res.maxScore, Math.max(0, res.score));
      totalEarned += clampedScore;
    }

    // Scale to 0-100
    const rawPercentage = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;
    const overallScore = Math.min(100, Math.max(0, Math.round(rawPercentage)));

    // Derive dimensions deterministically based on criterion achievements
    const problemCriterion = criteriaResults.find((c) => /problem|obstacle|disagreement|change|triage/i.test(c.criterion));
    const solutionCriterion = criteriaResults.find((c) => /approach|solution|contribution|action|execution|skill/i.test(c.criterion));
    const reasoningCriterion = criteriaResults.find((c) => /reasoning|analysis|consensus|strategy/i.test(c.criterion));
    const resultCriterion = criteriaResults.find((c) => /result|outcome|impact|delivery/i.test(c.criterion));

    const problemRatio = problemCriterion && problemCriterion.maxScore > 0 ? problemCriterion.score / problemCriterion.maxScore : 0;
    const solutionRatio = solutionCriterion && solutionCriterion.maxScore > 0 ? solutionCriterion.score / solutionCriterion.maxScore : 0;
    const reasoningRatio = reasoningCriterion && reasoningCriterion.maxScore > 0 ? reasoningCriterion.score / reasoningCriterion.maxScore : 0;
    const resultRatio = resultCriterion && resultCriterion.maxScore > 0 ? resultCriterion.score / resultCriterion.maxScore : 0;

    const communicationScore = Math.round(overallScore * 0.9 + (wordCount >= 20 ? 10 : 0));
    const problemSolvingScore = Math.round((problemRatio * 0.4 + solutionRatio * 0.4 + reasoningRatio * 0.2) * 100);
    const relevanceScore = relevanceStatus === 'PARTIALLY_RELEVANT' ? Math.min(60, overallScore) : overallScore;
    const clarityScore = Math.round(overallScore * 0.85 + (wordCount >= 15 ? 15 : 0));
    const structureScore = Math.round((problemRatio * 0.3 + solutionRatio * 0.4 + resultRatio * 0.3) * 100);

    const dimensions = {
      communicationScore: Math.min(100, Math.max(0, communicationScore)),
      problemSolvingScore: Math.min(100, Math.max(0, problemSolvingScore)),
      teamworkScore: rubric.category === 'Teamwork' ? overallScore : Math.min(100, Math.max(0, Math.round(overallScore * 0.8))),
      professionalismScore: Math.min(100, Math.max(0, Math.round(overallScore * 0.95))),
      relevanceScore: Math.min(100, Math.max(0, relevanceScore)),
      clarityScore: Math.min(100, Math.max(0, clarityScore)),
      ownershipScore: rubric.category === 'Ownership' ? overallScore : Math.min(100, Math.max(0, Math.round(overallScore * 0.85))),
      leadershipScore: rubric.category === 'Leadership' ? overallScore : Math.min(100, Math.max(0, Math.round(overallScore * 0.75))),
      confidenceScore: Math.min(100, Math.max(0, Math.round(overallScore * 0.9))),
      structureScore: Math.min(100, Math.max(0, structureScore)),
    };

    // Construct evidence-based feedback
    const passedCriteria = criteriaResults.filter((c) => c.score >= c.maxScore * 0.7);
    const partialCriteria = criteriaResults.filter((c) => c.score > 0 && c.score < c.maxScore * 0.7);
    const missedCriteria = criteriaResults.filter((c) => c.score === 0);

    const strengths: string[] = passedCriteria.map((c) => `Demonstrated clear evidence for ${c.criterion}: ${c.evidence || 'Well articulated'}`);
    const improvements: string[] = [
      ...partialCriteria.map((c) => `Elaborate with deeper detail on ${c.criterion} (${c.reason})`),
      ...missedCriteria.map((c) => `Include specific evidence for ${c.criterion} (${c.reason})`),
    ];

    let feedback = '';
    if (overallScore >= 80) {
      feedback = `Strong answer. High evidence across key criteria including ${passedCriteria.map((c) => c.criterion).join(', ')}.`;
    } else if (overallScore >= 50) {
      feedback = `Solid foundation with partial credit earned. Addressed ${passedCriteria.map((c) => c.criterion).join(', ')}, but lacked sufficient detail for ${missedCriteria.map((c) => c.criterion).join(', ')}.`;
    } else {
      feedback = `Limited substantive evidence provided. The response lacked detail on ${missedCriteria.map((c) => c.criterion).join(', ')}.`;
    }

    return {
      overallScore,
      criteriaResults,
      relevanceStatus,
      dimensions,
      feedback,
      strengths: strengths.length > 0 ? strengths.slice(0, 3) : ['Participated in behavioral evaluation'],
      improvements: improvements.length > 0 ? improvements.slice(0, 3) : ['Continue practicing STAR structured delivery'],
      starGuidance: missedCriteria.some((c) => /result|outcome/i.test(c.criterion))
        ? 'Make sure to explicitly explain the final outcome or impact of your actions.'
        : 'Structure your explanation with concrete actions and technical reasoning.',
    };
  }
}
