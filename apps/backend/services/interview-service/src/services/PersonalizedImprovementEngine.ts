/**
 * PersonalizedImprovementEngine.ts
 *
 * Deterministic engine for Phase 7 — Personalized Improvement Loop.
 * Transforms multi-round assessment reports, Autopsy failure patterns, and DNA trajectories
 * into a prioritized, actionable practice and reassessment plan.
 * Connects directly to existing practice question categories and interview routes.
 */

import { PrismaClient } from '../generated/client';
import {
  ImprovementPriority,
  PracticeTask,
  ImprovementCoaching,
  ReassessmentGuidance,
  PersonalizedImprovementPlanResult,
  PriorityLevel,
  LoopTaskStatus,
} from './PersonalizedImprovementTypes';
import { InterviewAutopsyService } from './InterviewAutopsyService';
import { InterviewDNAService } from './InterviewDNAService';
import { toCanonicalSkillId } from './CanonicalSkills';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export class PersonalizedImprovementEngine {
  /**
   * Retrieve the candidate's latest improvement plan or generate one if none exists.
   */
  static async getLatestPlan(identityId: string): Promise<PersonalizedImprovementPlanResult> {
    if (!identityId) throw new Error('Candidate identityId is required.');

    // Count completed interviews to check staleness
    const completedCount = await (prisma as any).interview.count({
      where: {
        identityId,
        OR: [{ state: 'COMPLETED' }, { session: { finalizedAt: { not: null } } }],
      },
    });

    const latestRecord = await (prisma as any).personalizedImprovementPlan.findFirst({
      where: { candidateId: identityId },
      orderBy: { generatedAt: 'desc' },
    });

    if (!latestRecord) {
      return this.generatePlan(identityId);
    }

    const isStale = completedCount > (latestRecord.interviewsAnalyzed ?? 0);
    const staleReason = isStale
      ? `You have completed ${completedCount - latestRecord.interviewsAnalyzed} new mock interview(s) since this improvement plan was generated.`
      : undefined;

    return {
      id: latestRecord.id,
      candidateId: latestRecord.candidateId,
      generatedAt: latestRecord.generatedAt.toISOString(),
      analysisVersion: latestRecord.analysisVersion,
      status: latestRecord.status as any,
      interviewsAnalyzed: latestRecord.interviewsAnalyzed,
      isStale,
      staleReason,
      sourceAutopsySnapshotId: latestRecord.sourceAutopsySnapshotId || undefined,
      sourceDNASnapshotId: latestRecord.sourceDNASnapshotId || undefined,
      topPriorities: (latestRecord.priorities as any)?.topPriorities || [],
      secondaryPriorities: (latestRecord.priorities as any)?.secondaryPriorities || [],
      coaching: latestRecord.coaching as ImprovementCoaching,
      reassessment: latestRecord.reassessmentGuidance as ReassessmentGuidance,
      summary: latestRecord.summary,
      kpis: this.computeKPIs(
        (latestRecord.priorities as any)?.topPriorities || [],
        (latestRecord.priorities as any)?.secondaryPriorities || []
      ),
    };
  }

  /**
   * Generate, persist, and return a fresh Personalized Improvement Plan.
   */
  static async generatePlan(identityId: string): Promise<PersonalizedImprovementPlanResult> {
    if (!identityId) throw new Error('Candidate identityId is required.');

    // 1. Fetch completed interviews
    const rawInterviews = await (prisma as any).interview.findMany({
      where: {
        identityId,
        OR: [{ state: 'COMPLETED' }, { session: { finalizedAt: { not: null } } }],
      },
      include: {
        session: { include: { progress: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalInterviews = rawInterviews.length;

    // ── 2. Handle Zero Interviews ──────────────────────────────────────────
    if (totalInterviews === 0) {
      const emptyResult: PersonalizedImprovementPlanResult = {
        id: `plan-empty-${identityId}`,
        candidateId: identityId,
        generatedAt: new Date().toISOString(),
        analysisVersion: 'improvement-v1',
        status: 'INSUFFICIENT_DATA',
        interviewsAnalyzed: 0,
        isStale: false,
        topPriorities: [],
        secondaryPriorities: [],
        coaching: {
          coachingSummary: 'Complete your first mock interview to generate targeted practice priorities.',
          priorityGuidance: [],
        },
        reassessment: {
          isReadyForReassessment: false,
          reassessmentType: 'FULL_MOCK',
          recommendedSession: 'Complete First Mock Assessment',
          reassessmentReason: 'Initial baseline needed before generating personalized practice tasks.',
          targetMetrics: ['Aptitude accuracy >= 70%', 'Coding problem completion', 'Structured STAR responses'],
        },
        summary:
          'No completed interview evaluations recorded. Complete a full multi-round mock assessment to unlock your personalized improvement loop.',
        kpis: {
          activePrioritiesCount: 0,
          tasksInProgressCount: 0,
          skillsImprovingCount: 0,
          targetsReachedCount: 0,
        },
      };

      await (prisma as any).personalizedImprovementPlan.create({
        data: {
          candidateId: identityId,
          analysisVersion: 'improvement-v1',
          status: 'INSUFFICIENT_DATA',
          interviewsAnalyzed: 0,
          isStale: false,
          priorities: { topPriorities: [], secondaryPriorities: [] },
          tasks: [],
          targets: [],
          coaching: emptyResult.coaching as any,
          reassessmentGuidance: emptyResult.reassessment as any,
          summary: emptyResult.summary,
        },
      });

      return emptyResult;
    }

    // ── 3. Query Autopsy and DNA Data for candidate ────────────────────────
    let autopsyData: any = null;
    let dnaData: any = null;

    try {
      autopsyData = await InterviewAutopsyService.getLatestAutopsy(identityId);
    } catch (e) {
      console.warn('Autopsy lookup failed (non-fatal):', e);
    }

    try {
      dnaData = await InterviewDNAService.getLatestDNA(identityId);
    } catch (e) {
      console.warn('DNA lookup failed (non-fatal):', e);
    }

    // ── 4. Formulate Candidate Improvement Candidates ──────────────────────
    const allCandidatePriorities: ImprovementPriority[] = [];
    const autopsyFindings = autopsyData?.findings || [];
    const dnaSkills = dnaData?.currentProfile?.skills || [];
    const dnaRegressions = dnaData?.recentRegressions || [];
    const dnaStableStrengths = dnaData?.stableStrengths || [];

    // Helper map for fast DNA skill lookup
    const dnaSkillMap = new Map<string, any>();
    dnaSkills.forEach((s: any) => dnaSkillMap.set(s.key, s));

    // A. Incorporate Autopsy Failure Patterns
    autopsyFindings.forEach((f: any) => {
      const canonicalId = toCanonicalSkillId(f.category, f.skill || f.title);
      const isRecurring = f.patternType === 'RECURRING' || f.patternType === 'PERSISTENT';
      const isEmerging = f.patternType === 'EMERGING_PATTERN';
      const recurrenceCount = f.interviewsAffected || 1;

      // Find matching DNA skill using canonical ID
      const matchingDnaSkill = dnaSkills.find(
        (s: any) => toCanonicalSkillId(s.category, s.key || s.name) === canonicalId
      );

      const currentScore = matchingDnaSkill?.currentScore ?? (f.severity === 'HIGH' ? 45 : f.severity === 'MEDIUM' ? 55 : 65);
      const baselineScore = matchingDnaSkill?.baselineScore ?? currentScore;
      const isRegressed = dnaRegressions.some((r: any) => toCanonicalSkillId(r.category, r.skillKey || r.skillName) === canonicalId);
      const isStableStrength = dnaStableStrengths.some((st: any) => toCanonicalSkillId(st.category, st.skillKey || st.skillName) === canonicalId);

      // Deterministic Priority Score Calculation
      let priorityScore = 0;
      if (f.severity === 'CRITICAL') priorityScore += 40;
      else if (f.severity === 'HIGH') priorityScore += 30;
      else if (f.severity === 'MEDIUM') priorityScore += 20;
      else priorityScore += 10;

      // Recurrence weight: up to 30 pts
      priorityScore += Math.min(30, recurrenceCount * 10);

      // Skill gap weight: (100 - currentScore) * 0.25
      const gap = Math.max(0, 100 - currentScore);
      priorityScore += Math.round(gap * 0.25);

      if (isRegressed) priorityScore += 15;
      if (f.category === 'CROSS_ROUND') priorityScore += 10;

      // Stable strength discount with safety bound:
      // A critical recurring weakness (>=3 sessions) CANNOT be demoted below HIGH (50 pts)
      if (isStableStrength) {
        if (f.severity === 'CRITICAL' && recurrenceCount >= 3) {
          priorityScore = Math.max(50, priorityScore - 15);
        } else {
          priorityScore = Math.max(10, priorityScore - 40);
        }
      }

      // Enforce minimum bound (never negative)
      priorityScore = Math.max(0, priorityScore);

      // Determine Priority Level
      let priorityLevel: PriorityLevel = 'LOW';
      if (priorityScore >= 70) priorityLevel = 'CRITICAL';
      else if (priorityScore >= 50) priorityLevel = 'HIGH';
      else if (priorityScore >= 30) priorityLevel = 'MEDIUM';

      const targetScore = Math.min(85, Math.max(70, currentScore + 15));
      const scoreDeltaNeeded = Math.max(0, targetScore - currentScore);

      // Determine Status: verified ONLY when authoritative evidence measuring the SAME canonical skill proves >= targetScore
      let status: LoopTaskStatus = 'NOT_STARTED';
      let statusLabel = 'Practice Pending';

      if (currentScore >= targetScore && totalInterviews >= 2) {
        status = 'TARGET_REACHED';
        statusLabel = 'Target Reached';
      } else if (matchingDnaSkill && (matchingDnaSkill.absoluteChange ?? 0) >= 10) {
        status = 'IMPROVING';
        statusLabel = 'Score Improving';
      } else if (isRegressed) {
        status = 'REGRESSED';
        statusLabel = 'Recent Regression';
      }

      // Generate Actionable Tasks connected to real routes
      const tasks = this.generatePracticeTasks(f.category, f.skill, f.title, canonicalId);

      const reassessmentMethod = f.category === 'CODING'
        ? 'Next Mock Interview Coding Stage (verifying visible boundary test cases)'
        : f.category === 'APTITUDE'
        ? 'Timed Quantitative Practice Session'
        : 'Next Mock Interview Behavioral Round (focusing on concrete metrics and STAR Result)';

      const evidenceSourceIds = (f.evidence || []).map((e: any) => e.sourceId || e.id);

      allCandidatePriorities.push({
        id: `prio-${canonicalId.replace(/[^a-z0-9]/g, '-')}`,
        rank: 0, // Will be set after deterministic sorting
        category: f.category === 'CROSS_ROUND' ? 'CROSS_ROUND' : f.category,
        canonicalSkillId: canonicalId,
        skillKey: f.skill,
        title: f.title,
        priorityLevel,
        priorityScore,
        currentScore,
        targetScore,
        scoreDeltaNeeded,
        status,
        statusLabel,
        rationale: isRecurring
          ? `Observed repeatedly across ${f.interviewsAffected} historical interviews. Current score is ${currentScore}/100.`
          : isEmerging
          ? `Detected in ${f.interviewsAffected} recent assessments. Needs targeted practice to prevent becoming a persistent bottleneck.`
          : `Observed in recent assessment evaluation.`,
        evidenceSummary: f.impact || f.likelyRootCause || 'Identified developmental area from mock assessment submissions.',
        evidenceSourceIds,
        tasks,
        provenance: {
          canonicalSkillId: canonicalId,
          skillTitle: f.title,
          baselineScore,
          currentScore,
          targetScore,
          scoreDeltaNeeded,
          sourceEvidenceIds: evidenceSourceIds,
          reassessmentMethod,
          status,
          verifiedReassessmentScore: currentScore,
        },
        reassessmentMethod,
      });
    });

    // B. Check for DNA Regressions not covered by Autopsy
    dnaRegressions.forEach((reg: any) => {
      const canonicalId = toCanonicalSkillId(reg.category, reg.skillKey || reg.skillName);
      if (!allCandidatePriorities.some((p) => p.canonicalSkillId === canonicalId)) {
        const currentScore = reg.latestScore;
        const targetScore = Math.min(85, Math.max(70, currentScore + 15));
        const tasks = this.generatePracticeTasks(reg.category as any, reg.skillKey, reg.skillName, canonicalId);
        const reassessmentMethod = 'Next sequential mock interview evaluation';
        const evidenceSourceIds = reg.sourceInterviewIds || [];

        allCandidatePriorities.push({
          id: `prio-reg-${canonicalId.replace(/[^a-z0-9]/g, '-')}`,
          rank: 0,
          category: reg.category.includes('CODING') ? 'CODING' : reg.category.includes('APTITUDE') ? 'APTITUDE' : 'HR',
          canonicalSkillId: canonicalId,
          skillKey: reg.skillKey,
          title: `Regression Recovery: ${reg.skillName}`,
          priorityLevel: 'HIGH',
          priorityScore: 65,
          currentScore,
          targetScore,
          scoreDeltaNeeded: targetScore - currentScore,
          status: 'REGRESSED',
          statusLabel: 'Recent Regression',
          rationale: `Score dropped by ${Math.abs(reg.absoluteChange)} points in recent evaluation (from ${reg.baselineScore} to ${currentScore}/100).`,
          evidenceSummary: reg.evidence,
          evidenceSourceIds,
          tasks,
          provenance: {
            canonicalSkillId: canonicalId,
            skillTitle: reg.skillName,
            baselineScore: reg.baselineScore,
            currentScore,
            targetScore,
            scoreDeltaNeeded: targetScore - currentScore,
            sourceEvidenceIds: evidenceSourceIds,
            reassessmentMethod,
            status: 'REGRESSED',
            verifiedReassessmentScore: currentScore,
          },
          reassessmentMethod,
        });
      }
    });

    // C. If candidates are sparse (e.g. 1 interview), build foundational priorities from lowest skills
    if (allCandidatePriorities.length === 0) {
      const sortedDnaSkills = [...dnaSkills]
        .filter((s: any) => s.isReliable && typeof s.currentScore === 'number')
        .sort((a: any, b: any) => (a.currentScore ?? 100) - (b.currentScore ?? 100));

      sortedDnaSkills.slice(0, 3).forEach((s: any) => {
        const canonicalId = toCanonicalSkillId(s.category, s.key || s.name);
        const cur = s.currentScore ?? 50;
        const tgt = Math.min(85, cur + 15);
        const tasks = this.generatePracticeTasks(s.category as any, s.key, s.name, canonicalId);
        const reassessmentMethod = 'Second mock interview assessment';

        allCandidatePriorities.push({
          id: `prio-base-${canonicalId.replace(/[^a-z0-9]/g, '-')}`,
          rank: 0,
          category: s.category.includes('CODING') ? 'CODING' : s.category.includes('APTITUDE') ? 'APTITUDE' : 'HR',
          canonicalSkillId: canonicalId,
          skillKey: s.key,
          title: s.name,
          priorityLevel: cur < 60 ? 'HIGH' : 'MEDIUM',
          priorityScore: 100 - cur,
          currentScore: cur,
          targetScore: tgt,
          scoreDeltaNeeded: tgt - cur,
          status: 'NOT_STARTED',
          statusLabel: 'Baseline Focus',
          rationale: `Baseline assessment recorded at ${cur}/100. Target score is ${tgt}/100.`,
          evidenceSummary: `Identified from initial mock interview evaluation.`,
          evidenceSourceIds: [],
          tasks,
          provenance: {
            canonicalSkillId: canonicalId,
            skillTitle: s.name,
            baselineScore: cur,
            currentScore: cur,
            targetScore: tgt,
            scoreDeltaNeeded: tgt - cur,
            sourceEvidenceIds: [],
            reassessmentMethod,
            status: 'NOT_STARTED',
            verifiedReassessmentScore: cur,
          },
          reassessmentMethod,
        });
      });
    }

    // Deterministic stable sorting: priorityScore DESC -> severityRank DESC -> recurrenceCount DESC -> canonicalSkillId ASC
    const severityRankMap: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    allCandidatePriorities.sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      const sevDiff = (severityRankMap[b.priorityLevel] || 0) - (severityRankMap[a.priorityLevel] || 0);
      if (sevDiff !== 0) return sevDiff;
      return a.canonicalSkillId.localeCompare(b.canonicalSkillId);
    });

    // Assign rank numbers
    allCandidatePriorities.forEach((p, idx) => {
      p.rank = idx + 1;
    });

    // Take focused Top 3 as primary priorities, remainder as secondary backlog
    const topPriorities = allCandidatePriorities.slice(0, 3);
    const secondaryPriorities = allCandidatePriorities.slice(3, 7);

    // ── 5. Formulate Evidence-Grounded Coaching Guidance ───────────────────
    const priorityGuidance: ImprovementCoaching['priorityGuidance'] = [];

    topPriorities.forEach((tp) => {
      let actionAdvice = '';
      let commonMistakeToAvoid = '';
      let suggestedStructure = '';

      if (tp.category === 'CODING') {
        actionAdvice = 'Before implementing algorithms, write down 5 explicit boundary inputs (empty collection, single-element, duplicates, negative values, max limits).';
        commonMistakeToAvoid = 'Coding the primary loop immediately without checking edge conditions or null checks.';
        suggestedStructure = '1. Clarify constraints -> 2. Identify boundary conditions -> 3. Pseudo-code logic -> 4. Dry run -> 5. Submit.';
      } else if (tp.category === 'HR') {
        actionAdvice = 'Conclude every behavioral answer with a 2-sentence Result detailing the quantified outcome, metric improvement, or engineering lesson learned.';
        commonMistakeToAvoid = 'Spending 80% of response time detailing the problem and cutting off before explaining individual actions and results.';
        suggestedStructure = 'STAR Format: Situation (15%), Task (15%), Action (50%), Result (20%).';
      } else {
        actionAdvice = 'Apply systematic shortcut formulas and timebox calculations to 90 seconds per problem.';
        commonMistakeToAvoid = 'Getting stuck on long algebraic derivations during timed sets.';
        suggestedStructure = 'Read problem -> Extract numerical targets -> Apply formula -> Verify option.';
      }

      priorityGuidance.push({
        priorityId: tp.id,
        skillTitle: tp.title,
        actionAdvice,
        commonMistakeToAvoid,
        suggestedStructure,
      });
    });

    const coaching: ImprovementCoaching = {
      coachingSummary: `Your personalized improvement plan focuses on ${topPriorities.length} high-value competencies. Prioritize boundary condition verification in Coding and quantified STAR results in Behavioral responses.`,
      priorityGuidance,
    };

    // ── 6. Formulate Reassessment Guidance ─────────────────────────────────
    const hasCompletedTasks = topPriorities.some((p) => p.tasks.some((t) => t.isCompleted));
    const reassessment: ReassessmentGuidance = {
      isReadyForReassessment: totalInterviews >= 1,
      reassessmentType: 'FULL_MOCK',
      recommendedSession: 'Full Multi-Round Mock Interview Assessment',
      reassessmentReason: totalInterviews === 1
        ? 'Complete a second mock interview to measure longitudinal growth against your baseline.'
        : 'Complete a full mock assessment to verify whether targeted practice has resolved recurring failure patterns.',
      targetMetrics: topPriorities.map((tp) => `${tp.title} >= ${tp.targetScore}/100`),
    };

    const summary = `Personalized Improvement Plan calibrated across ${totalInterviews} interview assessments. Identified ${topPriorities.length} primary actionable practice priorities to maximize overall interview readiness.`;

    const finalPlanResult: PersonalizedImprovementPlanResult = {
      id: `plan-${identityId}-${Date.now()}`,
      candidateId: identityId,
      generatedAt: new Date().toISOString(),
      analysisVersion: 'improvement-v1',
      status: topPriorities.every((p) => p.status === 'TARGET_REACHED') ? 'TARGETS_REACHED' : 'ACTIVE',
      interviewsAnalyzed: totalInterviews,
      isStale: false,
      sourceAutopsySnapshotId: autopsyData?.id || undefined,
      sourceDNASnapshotId: dnaData?.id || undefined,
      topPriorities,
      secondaryPriorities,
      coaching,
      reassessment,
      summary,
      kpis: this.computeKPIs(topPriorities, secondaryPriorities),
    };

    // ── 7. Persist Snapshot in Database ────────────────────────────────────
    await (prisma as any).personalizedImprovementPlan.create({
      data: {
        candidateId: identityId,
        analysisVersion: 'improvement-v1',
        status: finalPlanResult.status,
        interviewsAnalyzed: totalInterviews,
        sourceAutopsySnapshotId: finalPlanResult.sourceAutopsySnapshotId,
        sourceDNASnapshotId: finalPlanResult.sourceDNASnapshotId,
        isStale: false,
        priorities: {
          topPriorities: finalPlanResult.topPriorities,
          secondaryPriorities: finalPlanResult.secondaryPriorities,
        },
        tasks: topPriorities.flatMap((p) => p.tasks) as any,
        targets: topPriorities.map((p) => ({ skill: p.title, current: p.currentScore, target: p.targetScore })),
        coaching: finalPlanResult.coaching as any,
        reassessmentGuidance: finalPlanResult.reassessment as any,
        summary: finalPlanResult.summary,
      },
    });

    return finalPlanResult;
  }

  /**
   * Helper: Generate actionable tasks linked to real existing platform practice routes
   */
  private static generatePracticeTasks(
    category: 'CODING' | 'APTITUDE' | 'HR' | 'CROSS_ROUND',
    skillKey: string,
    skillTitle: string,
    canonicalId: string
  ): PracticeTask[] {
    const tasks: PracticeTask[] = [];

    if (category === 'CODING') {
      if (skillKey.includes('EDGE_CASE') || skillTitle.toLowerCase().includes('boundary') || skillTitle.toLowerCase().includes('edge')) {
        tasks.push({
          id: `task-${canonicalId.replace(/[^a-z0-9]/g, '-')}-1`,
          type: 'CODING_PROBLEM',
          title: 'Array Boundary Conditions Drill',
          description: 'Solve 3 algorithmic problems verifying empty arrays, single elements, and extreme boundary indexes.',
          category: 'Algorithms',
          canonicalSkillId: canonicalId,
          estimatedMinutes: 25,
          practiceRoute: '/student/practice/questions?category=Algorithms',
          actionLabel: 'Practice Boundary Problems',
          requiredCount: 3,
          completedCount: 0,
          isCompleted: false,
        });
      } else if (skillKey.includes('EFFICIENCY') || skillKey.includes('TIMEOUT') || skillTitle.toLowerCase().includes('complexity')) {
        tasks.push({
          id: `task-${canonicalId.replace(/[^a-z0-9]/g, '-')}-2`,
          type: 'CODING_PROBLEM',
          title: 'Optimal Time Complexity & Hash Map Drill',
          description: 'Solve 2 problems optimizing from O(N^2) nested loops to O(N) linear time using Hash Maps.',
          category: 'Algorithms',
          canonicalSkillId: canonicalId,
          estimatedMinutes: 20,
          practiceRoute: '/student/practice/questions?category=Algorithms',
          actionLabel: 'Practice Optimization',
          requiredCount: 2,
          completedCount: 0,
          isCompleted: false,
        });
      } else {
        tasks.push({
          id: `task-${canonicalId.replace(/[^a-z0-9]/g, '-')}-3`,
          type: 'CODING_PROBLEM',
          title: 'Algorithmic Problem Solving Set',
          description: 'Solve 2 targeted coding challenges and verify against all visible test cases before submission.',
          category: 'Algorithms',
          canonicalSkillId: canonicalId,
          estimatedMinutes: 20,
          practiceRoute: '/student/practice/questions?category=Algorithms',
          actionLabel: 'Practice Coding',
          requiredCount: 2,
          completedCount: 0,
          isCompleted: false,
        });
      }
    } else if (category === 'HR') {
      if (skillKey.includes('STAR') || skillTitle.toLowerCase().includes('result') || skillTitle.toLowerCase().includes('structure')) {
        tasks.push({
          id: `task-${canonicalId.replace(/[^a-z0-9]/g, '-')}-1`,
          type: 'HR_STAR_RESPONSE',
          title: 'STAR Result & Measurable Impact Drill',
          description: 'Practice structured behavioral responses ensuring conclusion with a clear, quantified outcome.',
          category: 'Behavioral',
          canonicalSkillId: canonicalId,
          estimatedMinutes: 15,
          practiceRoute: '/student/interviews',
          actionLabel: 'Practice HR Interview',
          requiredCount: 2,
          completedCount: 0,
          isCompleted: false,
        });
      } else if (skillKey.includes('TECHNICAL_DEPTH') || skillTitle.toLowerCase().includes('depth')) {
        tasks.push({
          id: `task-${canonicalId.replace(/[^a-z0-9]/g, '-')}-2`,
          type: 'TECHNICAL_EXPLANATION',
          title: 'Technical Project Architecture Explanation',
          description: 'Explain a technical system architecture detailing database, API, and architectural trade-off choices.',
          category: 'Technical Behavioral',
          canonicalSkillId: canonicalId,
          estimatedMinutes: 15,
          practiceRoute: '/student/interviews',
          actionLabel: 'Practice HR Interview',
          requiredCount: 2,
          completedCount: 0,
          isCompleted: false,
        });
      } else {
        tasks.push({
          id: `task-${canonicalId.replace(/[^a-z0-9]/g, '-')}-3`,
          type: 'HR_STAR_RESPONSE',
          title: 'Situational Storytelling & Ownership Practice',
          description: 'Deliver structured situational responses emphasizing individual ownership and technical reasoning.',
          category: 'Behavioral',
          canonicalSkillId: canonicalId,
          estimatedMinutes: 15,
          practiceRoute: '/student/interviews',
          actionLabel: 'Practice HR Interview',
          requiredCount: 2,
          completedCount: 0,
          isCompleted: false,
        });
      }
    } else if (category === 'APTITUDE') {
      const topic = skillTitle.replace('Aptitude Topic Accuracy: ', '').replace('APTITUDE_', '').trim();
      tasks.push({
        id: `task-${canonicalId.replace(/[^a-z0-9]/g, '-')}-1`,
        type: 'APTITUDE_SET',
        title: `${topic || 'Quantitative'} Timed Problem Set`,
        description: `Solve 10 targeted multiple-choice questions focusing on ${topic || 'Quantitative'} shortcuts and precision.`,
        category: 'Aptitude',
        canonicalSkillId: canonicalId,
        estimatedMinutes: 15,
        practiceRoute: `/student/practice/questions?category=${encodeURIComponent(topic || 'Aptitude')}`,
        actionLabel: `Practice ${topic || 'Aptitude'}`,
        requiredCount: 10,
        completedCount: 0,
        isCompleted: false,
      });
    } else {
      // Cross round
      tasks.push({
        id: `task-${canonicalId.replace(/[^a-z0-9]/g, '-')}-1`,
        type: 'MOCK_REASSESSMENT',
        title: 'Cross-Round Technical Synthesis Drill',
        description: 'Practice coding problem time-limit analysis followed by a technical behavioral project explanation.',
        category: 'Cross-Round',
        canonicalSkillId: canonicalId,
        estimatedMinutes: 30,
        practiceRoute: '/student/interviews',
        actionLabel: 'Start Practice Assessment',
        requiredCount: 1,
        completedCount: 0,
        isCompleted: false,
      });
    }

    return tasks;
  }

  /**
   * Helper: Compute top summary KPIs
   */
  private static computeKPIs(
    topPriorities: ImprovementPriority[],
    secondaryPriorities: ImprovementPriority[]
  ) {
    const all = [...topPriorities, ...secondaryPriorities];
    return {
      activePrioritiesCount: topPriorities.length,
      tasksInProgressCount: all.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'NOT_STARTED').length,
      skillsImprovingCount: all.filter((p) => p.status === 'IMPROVING').length,
      targetsReachedCount: all.filter((p) => p.status === 'TARGET_REACHED').length,
    };
  }
}
