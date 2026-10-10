/**
 * InterviewDNAService.ts
 *
 * Deterministic intelligence engine for Phase 6 — Interview DNA / Skill Genome.
 * Answers: "How am I improving over time?" / "How is my skill profile changing across interviews?"
 * Uses ONLY real stored historical data. Never alters official scores.
 */

import { PrismaClient } from '../generated/client';
import {
  CanonicalSkillMetric,
  LongitudinalTimelinePoint,
  SkillGrowthItem,
  StableStrengthItem,
  DNAMilestone,
  RoundProgression,
  HRDimensionProgression,
  AutopsyDNABridge,
  AIInterpretation,
  InterviewDNASummaryResult,
  TrendDirection,
  DNAStatus,
} from './InterviewDNATypes';
import { AutopsyEvidenceCollector } from './AutopsyEvidenceCollector';
import { InterviewAutopsyService } from './InterviewAutopsyService';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export class InterviewDNAService {
  /**
   * Retrieve the latest DNA snapshot for a candidate or compute a fresh one if none exists.
   */
  static async getLatestDNA(identityId: string): Promise<InterviewDNASummaryResult> {
    if (!identityId) throw new Error('Candidate identityId is required.');

    // 1. Fetch latest completed interviews count to assess staleness
    const completedCount = await (prisma as any).interview.count({
      where: {
        identityId,
        OR: [{ state: 'COMPLETED' }, { session: { finalizedAt: { not: null } } }],
      },
    });

    // 2. Fetch latest persisted snapshot
    const latestDbRecord = await (prisma as any).interviewDNASnapshot.findFirst({
      where: { candidateId: identityId },
      orderBy: { generatedAt: 'desc' },
    });

    if (!latestDbRecord) {
      // Generate initial snapshot
      return this.generateDNASnapshot(identityId);
    }

    const isStale = completedCount > (latestDbRecord.interviewsAnalyzed ?? 0);
    const staleReason = isStale
      ? `You have completed ${completedCount - latestDbRecord.interviewsAnalyzed} new mock interview(s) since this DNA analysis was generated.`
      : undefined;

    return {
      id: latestDbRecord.id,
      candidateId: latestDbRecord.candidateId,
      generatedAt: latestDbRecord.generatedAt.toISOString(),
      analysisVersion: latestDbRecord.analysisVersion,
      model: latestDbRecord.model || 'gemini-1.5-pro',
      promptVersion: latestDbRecord.promptVersion || 'v1.0',
      status: latestDbRecord.status as DNAStatus,
      interviewsAnalyzed: latestDbRecord.interviewsAnalyzed,
      sourceInterviewIds: (latestDbRecord.sourceInterviewIds as string[]) || [],
      isStale,
      staleReason,
      currentProfile: latestDbRecord.currentProfile as any,
      timelineSnapshots: (latestDbRecord.timelineSnapshots as LongitudinalTimelinePoint[]) || [],
      strongestGrowth: (latestDbRecord.strongestGrowth as SkillGrowthItem[]) || [],
      recentRegressions: (latestDbRecord.recentRegressions as SkillGrowthItem[]) || [],
      stableStrengths: (latestDbRecord.stableStrengths as StableStrengthItem[]) || [],
      roundEvolution: (latestDbRecord.roundEvolution as RoundProgression[]) || [],
      hrDimensionEvolution: (latestDbRecord.hrDimensionEvolution as HRDimensionProgression[]) || [],
      milestones: (latestDbRecord.milestones as DNAMilestone[]) || [],
      autopsyConnection: (latestDbRecord.autopsyConnection as AutopsyDNABridge) || null,
      aiInterpretation: (latestDbRecord.aiInterpretation as AIInterpretation) || null,
      summary: latestDbRecord.summary,
      kpis: this.extractKPIs(
        latestDbRecord.interviewsAnalyzed,
        latestDbRecord.currentProfile,
        latestDbRecord.strongestGrowth,
        latestDbRecord.recentRegressions
      ),
    };
  }

  /**
   * Generate, persist, and return a fresh DNA snapshot based on stored interview evidence.
   */
  static async generateDNASnapshot(identityId: string): Promise<InterviewDNASummaryResult> {
    if (!identityId) throw new Error('Candidate identityId is required.');

    // 1. Collect all completed candidate sessions
    const rawInterviews = await (prisma as any).interview.findMany({
      where: {
        identityId,
        OR: [{ state: 'COMPLETED' }, { session: { finalizedAt: { not: null } } }],
      },
      include: {
        session: {
          include: { progress: true },
        },
      },
      orderBy: { createdAt: 'asc' }, // Chronological (earliest -> latest)
    });

    const totalCount = rawInterviews.length;

    // ── 2. Handle Zero Interviews ──────────────────────────────────────────
    if (totalCount === 0) {
      const emptyResult: InterviewDNASummaryResult = {
        id: `dna-empty-${identityId}`,
        candidateId: identityId,
        generatedAt: new Date().toISOString(),
        analysisVersion: 'dna-v1',
        model: 'deterministic-engine',
        promptVersion: 'v1.0',
        status: 'INSUFFICIENT_DATA',
        interviewsAnalyzed: 0,
        sourceInterviewIds: [],
        isStale: false,
        currentProfile: {
          skills: [],
          overallReadinessScore: null,
          readinessTier: 'INSUFFICIENT_HISTORY',
          readinessDescription:
            'No completed mock interview history yet. Complete your first mock assessment to start building your Skill Genome.',
        },
        timelineSnapshots: [],
        strongestGrowth: [],
        recentRegressions: [],
        stableStrengths: [],
        roundEvolution: [],
        hrDimensionEvolution: [],
        milestones: [],
        autopsyConnection: null,
        aiInterpretation: null,
        summary:
          'No completed interview history is recorded for this candidate. Complete a full multi-round mock interview to generate your longitudinal Skill Genome.',
        kpis: {
          interviewsAnalyzed: 0,
          currentScore: null,
          strongestGrowthSkill: null,
          strongestGrowthDelta: null,
          priorityFocusSkill: null,
        },
      };

      await (prisma as any).interviewDNASnapshot.create({
        data: {
          candidateId: identityId,
          analysisVersion: 'dna-v1',
          status: 'INSUFFICIENT_DATA',
          interviewsAnalyzed: 0,
          sourceInterviewIds: [],
          isStale: false,
          currentProfile: emptyResult.currentProfile as any,
          timelineSnapshots: [],
          trends: [],
          strongestGrowth: [],
          recentRegressions: [],
          stableStrengths: [],
          roundEvolution: [],
          hrDimensionEvolution: [],
          milestones: [],
          autopsyConnection: null,
          aiInterpretation: null,
          nextFocus: [],
          summary: emptyResult.summary,
        },
      });

      return emptyResult;
    }

    // ── 3. Build Chronological Timeline Snapshots ──────────────────────────
    const timelineSnapshots: LongitudinalTimelinePoint[] = [];

    for (let idx = 0; idx < rawInterviews.length; idx++) {
      const inv = rawInterviews[idx];
      const snap = inv.session?.reportSnapshot as any;
      const dateStr = inv.createdAt.toISOString();
      const formattedDate = inv.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const overall = typeof (snap?.overallScore ?? snap?.overallProficiencyScore) === 'number'
        ? Math.round(snap?.overallScore ?? snap?.overallProficiencyScore)
        : null;

      const apt = typeof snap?.stages?.aptitude?.scorePercentage === 'number'
        ? Math.round(snap.stages.aptitude.scorePercentage)
        : null;

      const coding = typeof snap?.stages?.coding?.scorePercentage === 'number'
        ? Math.round(snap.stages.coding.scorePercentage)
        : null;

      // Fetch HR session dimension scores
      const hrSession = await (prisma as any).hRInterviewSession.findFirst({
        where: { interviewId: inv.id },
        include: {
          questions: { include: { response: true } },
          evaluation: true,
        },
      });

      const hrScore = typeof hrSession?.overallScore === 'number'
        ? Math.round(hrSession.overallScore)
        : typeof (snap?.stages?.hr?.analysis?.overallScore ?? snap?.stages?.hr?.scorePercentage) === 'number'
        ? Math.round(snap?.stages?.hr?.analysis?.overallScore ?? snap?.stages?.hr?.scorePercentage)
        : null;

      const hrDims: Record<string, number> = {};
      const hrDimKeys = [
        'relevance',
        'specificity',
        'evidence',
        'structure',
        'clarity',
        'technicalDepth',
        'ownership',
        'professionalism',
      ];

      // Extract HR dimensions: convert 0-10 to 0-100 scale
      if (hrSession?.questions) {
        hrDimKeys.forEach((k) => {
          const vals: number[] = [];
          hrSession.questions.forEach((q: any) => {
            const sc = (q.response?.dimensionScores as Record<string, number>)?.[k];
            if (typeof sc === 'number') vals.push(sc);
          });
          if (vals.length > 0) {
            const avg10 = vals.reduce((a, b) => a + b, 0) / vals.length;
            hrDims[k] = Math.round(avg10 * 10);
          }
        });
      }

      // Fallback from report snapshot competencies if questions missing
      const snapHrCompetencies = snap?.stages?.hr?.analysis?.competencyScores || {};
      hrDimKeys.forEach((k) => {
        if (hrDims[k] === undefined && typeof snapHrCompetencies[k] === 'number') {
          hrDims[k] = snapHrCompetencies[k] <= 10 ? Math.round(snapHrCompetencies[k] * 10) : Math.round(snapHrCompetencies[k]);
        }
      });

      // Coding pass ratio
      let codingRatio: string | undefined;
      const codingStage = snap?.stages?.coding;
      if (codingStage && typeof codingStage.totalTestsPassed === 'number' && codingStage.totalTestsCount > 0) {
        codingRatio = `${codingStage.totalTestsPassed}/${codingStage.totalTestsCount}`;
      }

      // Aptitude accuracy ratio
      let aptRatio: string | undefined;
      const aptStage = snap?.stages?.aptitude;
      if (aptStage && typeof aptStage.correctCount === 'number' && aptStage.totalQuestions > 0) {
        aptRatio = `${aptStage.correctCount}/${aptStage.totalQuestions}`;
      }

      timelineSnapshots.push({
        interviewId: inv.id,
        interviewNumber: idx + 1,
        title: inv.title || `Mock Interview #${idx + 1}`,
        formattedDate,
        completedAt: dateStr,
        overallScore: overall,
        aptitudeScore: apt,
        codingScore: coding,
        hrScore,
        hrDimensions: hrDims,
        codingTestsPassedRatio: codingRatio,
        aptitudeAccuracyRatio: aptRatio,
      });
    }

    const hasMultiple = totalCount >= 2;
    const status: DNAStatus = hasMultiple ? 'COMPLETED' : 'BASELINE_ONLY';
    const firstPoint = timelineSnapshots[0];
    const latestPoint = timelineSnapshots[timelineSnapshots.length - 1];

    // ── 4. Build Canonical Skill Profiles ──────────────────────────────────
    const canonicalDefinitions: Array<{
      key: string;
      name: string;
      category: CanonicalSkillMetric['category'];
      description: string;
      extractor: (pt: LongitudinalTimelinePoint) => number | null;
    }> = [
      {
        key: 'CODING_ALGORITHMIC',
        name: 'Algorithmic Problem Solving',
        category: 'CODING_TECHNICAL',
        description: 'Algorithm efficiency, time/space trade-offs and logic correctness.',
        extractor: (pt) => pt.codingScore,
      },
      {
        key: 'APTITUDE_QUANTITATIVE',
        name: 'Quantitative & Analytical Reasoning',
        category: 'APTITUDE_LOGIC',
        description: 'Mathematical problem solving, arithmetic precision and logic accuracy.',
        extractor: (pt) => pt.aptitudeScore,
      },
      {
        key: 'HR_TECHNICAL_DEPTH',
        name: 'Technical Depth (Behavioral)',
        category: 'HR_BEHAVIORAL',
        description: 'Architectural nuance, tech stack details and engineering reasoning.',
        extractor: (pt) => pt.hrDimensions.technicalDepth ?? null,
      },
      {
        key: 'HR_STRUCTURE',
        name: 'Communication Structure (STAR)',
        category: 'HR_BEHAVIORAL',
        description: 'Logical structured delivery using Situation, Task, Action, Result.',
        extractor: (pt) => pt.hrDimensions.structure ?? null,
      },
      {
        key: 'HR_SPECIFICITY',
        name: 'Concrete Specificity & Detail',
        category: 'HR_BEHAVIORAL',
        description: 'Precise technical metrics, project facts and individual ownership.',
        extractor: (pt) => pt.hrDimensions.specificity ?? null,
      },
      {
        key: 'HR_EVIDENCE',
        name: 'Problem Solving Evidence',
        category: 'HR_BEHAVIORAL',
        description: 'Demonstrated real-world evidence and outcome validation.',
        extractor: (pt) => pt.hrDimensions.evidence ?? null,
      },
      {
        key: 'HR_RELEVANCE',
        name: 'Query Relevance & Focus',
        category: 'HR_BEHAVIORAL',
        description: 'Direct alignment with interviewer questions without meandering.',
        extractor: (pt) => pt.hrDimensions.relevance ?? null,
      },
      {
        key: 'HR_CLARITY',
        name: 'Verbal Clarity & Conciseness',
        category: 'HR_BEHAVIORAL',
        description: 'Clear, concise and professional vocal delivery.',
        extractor: (pt) => pt.hrDimensions.clarity ?? null,
      },
      {
        key: 'HR_OWNERSHIP',
        name: 'Individual Ownership & Initiative',
        category: 'HR_BEHAVIORAL',
        description: 'Accountability, proactive resolution and personal leadership.',
        extractor: (pt) => pt.hrDimensions.ownership ?? null,
      },
      {
        key: 'HR_PROFESSIONALISM',
        name: 'Professional Poise & Tone',
        category: 'HR_BEHAVIORAL',
        description: 'Interview poise, ethical demeanor and professional presence.',
        extractor: (pt) => pt.hrDimensions.professionalism ?? null,
      },
    ];

    const canonicalSkills: CanonicalSkillMetric[] = [];

    canonicalDefinitions.forEach((def) => {
      const history: Array<{
        interviewId: string;
        interviewNumber: number;
        formattedDate: string;
        score: number;
      }> = [];

      timelineSnapshots.forEach((pt) => {
        const sc = def.extractor(pt);
        if (typeof sc === 'number' && !isNaN(sc)) {
          history.push({
            interviewId: pt.interviewId,
            interviewNumber: pt.interviewNumber,
            formattedDate: pt.formattedDate,
            score: sc,
          });
        }
      });

      if (history.length === 0) {
        canonicalSkills.push({
          key: def.key,
          name: def.name,
          category: def.category,
          currentScore: null,
          baselineScore: null,
          previousScore: null,
          absoluteChange: null,
          growthRate: null,
          trend: 'INSUFFICIENT_HISTORY',
          history: [],
          description: def.description,
          isReliable: false,
        });
        return;
      }

      const baselineScore = history[0].score;
      const currentScore = history[history.length - 1].score;
      const prevScore = history.length >= 2 ? history[history.length - 2].score : null;

      let absoluteChange: number | null = null;
      let growthRate: number | null = null;
      let trend: TrendDirection = 'INSUFFICIENT_HISTORY';

      if (history.length >= 2) {
        absoluteChange = currentScore - baselineScore;
        if (baselineScore > 0) {
          growthRate = Math.round(((currentScore - baselineScore) / baselineScore) * 1000) / 10;
        } else {
          growthRate = null; // Baseline zero safe handling
        }
        trend = this.classifyTrend(absoluteChange);
      }

      canonicalSkills.push({
        key: def.key,
        name: def.name,
        category: def.category,
        currentScore,
        baselineScore,
        previousScore: prevScore,
        absoluteChange,
        growthRate,
        trend,
        history,
        description: def.description,
        isReliable: true,
      });
    });

    // ── 5. Strongest Growth & Recent Regressions ───────────────────────────
    const strongestGrowth: SkillGrowthItem[] = [];
    const recentRegressions: SkillGrowthItem[] = [];

    if (hasMultiple) {
      const skillsWithHistory = canonicalSkills.filter((s) => s.isReliable && s.absoluteChange !== null);

      // Sort by absoluteChange descending
      const sortedByGrowth = [...skillsWithHistory].sort(
        (a, b) => (b.absoluteChange ?? 0) - (a.absoluteChange ?? 0)
      );

      sortedByGrowth.forEach((s) => {
        const delta = s.absoluteChange ?? 0;
        if (delta >= 5) {
          strongestGrowth.push({
            skillKey: s.key,
            skillName: s.name,
            category: s.category,
            baselineScore: s.baselineScore ?? 0,
            latestScore: s.currentScore ?? 0,
            absoluteChange: delta,
            growthRate: s.growthRate,
            trend: s.trend,
            evidence: `Improved from ${s.baselineScore}/100 in initial assessment to ${s.currentScore}/100 in latest session (${delta >= 0 ? `+${delta}` : delta} pts).`,
            sourceInterviewIds: s.history.map((h) => h.interviewId),
          });
        } else if (delta <= -5) {
          recentRegressions.push({
            skillKey: s.key,
            skillName: s.name,
            category: s.category,
            baselineScore: s.baselineScore ?? 0,
            latestScore: s.currentScore ?? 0,
            absoluteChange: delta,
            growthRate: s.growthRate,
            trend: s.trend,
            evidence: `Score decreased from ${s.baselineScore}/100 initially to ${s.currentScore}/100 in latest evaluation (${delta} pts).`,
            sourceInterviewIds: s.history.map((h) => h.interviewId),
          });
        }
      });
    }

    // ── 6. Stable Strengths Detection ──────────────────────────────────────
    const stableStrengths: StableStrengthItem[] = [];

    if (totalCount >= 2) {
      canonicalSkills.forEach((s) => {
        if (!s.isReliable || s.history.length < 2) return;
        const scores = s.history.map((h) => h.score);
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        const variance = max - min;

        // Consistently high (avg >= 75) and controlled variance (<= 15 pts fluctuation)
        if (avg >= 75 && variance <= 15) {
          stableStrengths.push({
            skillKey: s.key,
            skillName: s.name,
            category: s.category,
            averageScore: Math.round(avg),
            scoreRange: { min, max },
            interviewsDemonstrated: s.history.length,
            description: `Consistently high performance (average ${Math.round(avg)}/100) maintained across ${s.history.length} completed interviews.`,
            evidence: `Scores ranged steadily between ${min} and ${max} across all sequential sessions.`,
          });
        }
      });
    }

    // ── 7. Round-Level Progression (Aptitude, Coding, HR) ──────────────────
    const roundEvolution: RoundProgression[] = [
      this.buildRoundProgression(
        'CODING',
        'Coding & Algorithmic Problem Solving',
        timelineSnapshots,
        (pt) => pt.codingScore
      ),
      this.buildRoundProgression(
        'APTITUDE',
        'Quantitative & Analytical Aptitude',
        timelineSnapshots,
        (pt) => pt.aptitudeScore
      ),
      this.buildRoundProgression(
        'HR',
        'HR Behavioral & Situational Communication',
        timelineSnapshots,
        (pt) => pt.hrScore
      ),
    ];

    // ── 8. HR 8-Dimension Evolution ────────────────────────────────────────
    const hrDimensionEvolution: HRDimensionProgression[] = [
      { key: 'technicalDepth', name: 'Technical Depth', desc: 'Architectural nuance & engineering reasoning' },
      { key: 'structure', name: 'Communication Structure', desc: 'STAR delivery and logical sequencing' },
      { key: 'evidence', name: 'Problem Solving Evidence', desc: 'Demonstrated outcomes & concrete track record' },
      { key: 'specificity', name: 'Concrete Specificity', desc: 'Precise metrics and individual ownership' },
      { key: 'relevance', name: 'Query Relevance', desc: 'Direct alignment with interviewer queries' },
      { key: 'clarity', name: 'Verbal Clarity', desc: 'Concise articulation and vocal delivery' },
      { key: 'ownership', name: 'Individual Ownership', desc: 'Personal initiative and accountability' },
      { key: 'professionalism', name: 'Professional Poise', desc: 'Tone, demeanor and poise' },
    ].map((d) => this.buildHRDimensionProgression(d.key, d.name, d.desc, timelineSnapshots));

    // ── 9. Milestones Detection ────────────────────────────────────────────
    const milestones: DNAMilestone[] = [];

    // Milestone 1: First completed interview
    if (firstPoint) {
      milestones.push({
        id: 'ms-first-interview',
        type: 'FIRST_INTERVIEW',
        title: 'Initial Baseline Assessment Established',
        description: `Completed first multi-round mock interview with an initial score of ${firstPoint.overallScore ?? 0}/100.`,
        interviewId: firstPoint.interviewId,
        interviewNumber: 1,
        achievedAt: firstPoint.completedAt,
      });
    }

    // Milestone: Overall score thresholds
    timelineSnapshots.forEach((pt) => {
      if (typeof pt.overallScore === 'number' && pt.overallScore >= 70) {
        if (!milestones.some((m) => m.id === 'ms-overall-70')) {
          milestones.push({
            id: 'ms-overall-70',
            type: 'SCORE_MILESTONE',
            title: 'Overall Performance Milestone (70+)',
            description: `Achieved composite score of ${pt.overallScore}/100 in Interview #${pt.interviewNumber}.`,
            interviewId: pt.interviewId,
            interviewNumber: pt.interviewNumber,
            achievedAt: pt.completedAt,
          });
        }
      }
      if (typeof pt.codingScore === 'number' && pt.codingScore >= 75) {
        if (!milestones.some((m) => m.id === 'ms-coding-75')) {
          milestones.push({
            id: 'ms-coding-75',
            type: 'SCORE_MILESTONE',
            title: 'Coding Performance Milestone — 75%+ test acceptance',
            description: `Attained ${pt.codingScore}% unit test case acceptance in Interview #${pt.interviewNumber}.`,
            interviewId: pt.interviewId,
            interviewNumber: pt.interviewNumber,
            achievedAt: pt.completedAt,
          });
        }
      }
      if (pt.hrDimensions.technicalDepth && pt.hrDimensions.technicalDepth >= 70) {
        if (!milestones.some((m) => m.id === 'ms-tech-depth-70')) {
          milestones.push({
            id: 'ms-tech-depth-70',
            type: 'COMPETENCY_MASTERY',
            title: 'High Technical Depth in Behavioral Round',
            description: `Demonstrated ${pt.hrDimensions.technicalDepth}/100 on Technical Depth dimension in Interview #${pt.interviewNumber}.`,
            interviewId: pt.interviewId,
            interviewNumber: pt.interviewNumber,
            achievedAt: pt.completedAt,
          });
        }
      }
    });

    // Milestone: Stable strengths
    stableStrengths.forEach((st) => {
      milestones.push({
        id: `ms-stable-${st.skillKey.toLowerCase()}`,
        type: 'STABILITY',
        title: `Consistent Mastery: ${st.skillName}`,
        description: `Maintained consistent ${st.averageScore}/100 across ${st.interviewsDemonstrated} evaluations.`,
        interviewId: latestPoint.interviewId,
        interviewNumber: latestPoint.interviewNumber,
        achievedAt: latestPoint.completedAt,
      });
    });

    // ── 10. Autopsy Connection Bridge ──────────────────────────────────────
    let autopsyConnection: AutopsyDNABridge | null = null;
    try {
      const latestAutopsy = await InterviewAutopsyService.getLatestAutopsy(identityId);
      if (latestAutopsy && latestAutopsy.findings) {
        const activeFindings: AutopsyDNABridge['activeFindings'] = [];
        const resolvedFindings: AutopsyDNABridge['resolvedFindings'] = [];

        latestAutopsy.findings.forEach((f: any) => {
          // Check if skill has improved in DNA canonical skills
          const skillMatch = canonicalSkills.find(
            (s) => s.key.includes(f.skill) || f.skill.includes(s.key) || s.name.toLowerCase().includes(f.title.toLowerCase().slice(0, 10))
          );

          let trendStatus: AutopsyDNABridge['activeFindings'][0]['trendStatus'] = 'STABLE_WEAKNESS';
          if (skillMatch && (skillMatch.absoluteChange ?? 0) >= 10) {
            trendStatus = 'IMPROVING_BUT_BELOW_TARGET';
          } else if (skillMatch && (skillMatch.absoluteChange ?? 0) <= -5) {
            trendStatus = 'RECENT_REGRESSION';
          }

          activeFindings.push({
            skill: f.skill,
            title: f.title,
            severity: f.severity,
            patternType: f.patternType,
            interviewsAffected: f.interviewsAffected,
            trendStatus,
            note:
              trendStatus === 'IMPROVING_BUT_BELOW_TARGET'
                ? 'Demonstrated recent upward score growth (+ ' + (skillMatch?.absoluteChange ?? 0) + ' pts), but remains an active focus area.'
                : 'Identified as a recurring developmental pattern across historical submissions.',
          });
        });

        if (latestAutopsy.resolvedPatterns) {
          latestAutopsy.resolvedPatterns.forEach((r: any) => {
            resolvedFindings.push({
              skill: r.skill,
              title: r.title,
              scoreDelta: r.scoreDelta,
              resolutionNote: r.explanation,
            });
          });
        }

        autopsyConnection = {
          recurringWeaknessesCount: activeFindings.filter((a) => a.patternType === 'RECURRING' || a.patternType === 'PERSISTENT').length,
          activeFindings: activeFindings.slice(0, 4),
          resolvedFindings: resolvedFindings.slice(0, 3),
        };
      }
    } catch (err) {
      console.warn('Autopsy bridge lookup error (non-fatal):', err);
    }

    // ── 11. Transparent Readiness Calculation ──────────────────────────────
    // Transparent weighted model based only on available authoritative scores:
    // Coding: 40%, Aptitude: 30%, HR: 30%
    let overallReadinessScore: number | null = null;
    let readinessTier: InterviewDNASummaryResult['currentProfile']['readinessTier'] = 'INSUFFICIENT_HISTORY';
    let readinessDescription = '';

    const latestCoding = latestPoint.codingScore ?? null;
    const latestApt = latestPoint.aptitudeScore ?? null;
    const latestHR = latestPoint.hrScore ?? null;

    const availableScores: { weight: number; score: number }[] = [];
    if (typeof latestCoding === 'number') availableScores.push({ weight: 0.4, score: latestCoding });
    if (typeof latestApt === 'number') availableScores.push({ weight: 0.3, score: latestApt });
    if (typeof latestHR === 'number') availableScores.push({ weight: 0.3, score: latestHR });

    if (availableScores.length > 0) {
      const totalWeight = availableScores.reduce((a, b) => a + b.weight, 0);
      const weightedSum = availableScores.reduce((a, b) => a + b.score * b.weight, 0);
      overallReadinessScore = Math.round(weightedSum / totalWeight);

      if (overallReadinessScore >= 85) {
        readinessTier = 'HIGHLY_CONSISTENT';
        readinessDescription = 'Demonstrates high multi-round proficiency and structured delivery across evaluations.';
      } else if (overallReadinessScore >= 75) {
        readinessTier = 'STRONG';
        readinessDescription = 'Strong problem-solving track record with minor calibration opportunities in behavioral depth or edge cases.';
      } else if (overallReadinessScore >= 60) {
        readinessTier = 'INTERVIEW_READY';
        readinessDescription = 'Solid foundational knowledge. Target boundary-condition testing and STAR impact quantification to reach top tier.';
      } else {
        readinessTier = 'DEVELOPING';
        readinessDescription = 'Core technical and communication foundations are developing through structured practice.';
      }
    }

    // ── 12. Synthesize Deterministic Executive Summary ─────────────────────
    let summary = '';
    if (!hasMultiple) {
      summary = `Baseline skill genome established from 1 completed interview (Score: ${latestPoint.overallScore ?? '--'}/100). Complete a second assessment to unlock longitudinal growth tracking, rate of improvement, and regression alerts.`;
    } else {
      const topGrowthName = strongestGrowth[0]?.skillName || 'Overall Performance';
      const topGrowthDelta = strongestGrowth[0]?.absoluteChange ?? 0;
      summary = `Analyzed across ${totalCount} completed interview evaluations. Current readiness is ${readinessTier.replace('_', ' ')} (${overallReadinessScore}/100). Strongest observed improvement is in ${topGrowthName} (${topGrowthDelta >= 0 ? `+${topGrowthDelta}` : topGrowthDelta} points since baseline).`;
    }

    // ── 13. Formulate Deterministic Coaching & Focus Areas ─────────────────
    const focusAreas: AIInterpretation['nextFocusAreas'] = [];
    const weakestSkills = canonicalSkills
      .filter((s) => s.isReliable && typeof s.currentScore === 'number')
      .sort((a, b) => (a.currentScore ?? 100) - (b.currentScore ?? 100))
      .slice(0, 3);

    weakestSkills.forEach((ws) => {
      focusAreas.push({
        skill: ws.name,
        reason: `Current evaluation stands at ${ws.currentScore}/100.`,
        actionAdvice: ws.category === 'CODING_TECHNICAL'
          ? 'Practice visible boundary-condition verification before submitting code.'
          : ws.category === 'APTITUDE_LOGIC'
          ? 'Review quantitative shortcuts and timeboxing techniques.'
          : 'Anchor responses in concrete metrics and conclude with a dedicated STAR Result.',
      });
    });

    const aiInterpretation: AIInterpretation = {
      overview: summary,
      strongestGrowthSummary: strongestGrowth.length > 0
        ? `Top accelerated development observed in ${strongestGrowth.map((g) => `${g.skillName} (+${g.absoluteChange} pts)`).join(', ')}.`
        : 'Skills are currently calibrated at steady baseline levels.',
      regressionsWarning: recentRegressions.length > 0
        ? `Attention advised: ${recentRegressions.map((r) => `${r.skillName} (${r.absoluteChange} pts)`).join(', ')} showed recent score drop.`
        : null,
      stableStrengthsSummary: stableStrengths.length > 0
        ? `Consistently high competency demonstrated in ${stableStrengths.map((s) => `${s.skillName} (avg ${s.averageScore}/100)`).join(', ')}.`
        : 'Multi-session consistency is currently being established.',
      coachingObservations: [
        `Longitudinal evaluations track ${timelineSnapshots.length} sequential sessions from ${firstPoint?.formattedDate} to ${latestPoint?.formattedDate}.`,
        strongestGrowth[0]
          ? `${strongestGrowth[0].skillName} showed the highest net growth rate.`
          : 'Complete additional assessments to establish multi-point trend velocity.',
        autopsyConnection && autopsyConnection.activeFindings.length > 0
          ? `${autopsyConnection.activeFindings.length} recurring autopsy patterns identified for targeted improvement.`
          : 'No persistent multi-round bottlenecks detected in current history.',
      ],
      nextFocusAreas: focusAreas,
    };

    const finalResult: InterviewDNASummaryResult = {
      id: `dna-${identityId}-${Date.now()}`,
      candidateId: identityId,
      generatedAt: new Date().toISOString(),
      analysisVersion: 'dna-v1',
      model: 'deterministic-engine',
      promptVersion: 'v1.0',
      status,
      interviewsAnalyzed: totalCount,
      sourceInterviewIds: rawInterviews.map((i: any) => i.id),
      isStale: false,
      currentProfile: {
        skills: canonicalSkills,
        overallReadinessScore,
        readinessTier,
        readinessDescription,
      },
      timelineSnapshots,
      strongestGrowth,
      recentRegressions,
      stableStrengths,
      roundEvolution,
      hrDimensionEvolution,
      milestones,
      autopsyConnection,
      aiInterpretation,
      summary,
      kpis: this.extractKPIs(totalCount, { skills: canonicalSkills, overallReadinessScore }, strongestGrowth, recentRegressions),
    };

    // ── 14. Persist DNA Snapshot in Database ───────────────────────────────
    await (prisma as any).interviewDNASnapshot.create({
      data: {
        candidateId: identityId,
        analysisVersion: 'dna-v1',
        model: 'deterministic-engine',
        promptVersion: 'v1.0',
        status,
        interviewsAnalyzed: totalCount,
        sourceInterviewIds: finalResult.sourceInterviewIds,
        isStale: false,
        currentProfile: finalResult.currentProfile as any,
        timelineSnapshots: finalResult.timelineSnapshots as any,
        trends: canonicalSkills.map((s) => ({ key: s.key, change: s.absoluteChange, trend: s.trend })),
        strongestGrowth: finalResult.strongestGrowth as any,
        recentRegressions: finalResult.recentRegressions as any,
        stableStrengths: finalResult.stableStrengths as any,
        roundEvolution: finalResult.roundEvolution as any,
        hrDimensionEvolution: finalResult.hrDimensionEvolution as any,
        milestones: finalResult.milestones as any,
        autopsyConnection: finalResult.autopsyConnection as any,
        aiInterpretation: finalResult.aiInterpretation as any,
        nextFocus: finalResult.aiInterpretation?.nextFocusAreas || [],
        summary: finalResult.summary,
      },
    });

    return finalResult;
  }

  /**
   * Helper: Classify deterministic trend direction from absolute score delta
   */
  private static classifyTrend(delta: number): TrendDirection {
    if (delta >= 15) return 'STRONG_IMPROVEMENT';
    if (delta >= 5) return 'MODERATE_IMPROVEMENT';
    if (delta > -5) return 'STABLE';
    if (delta > -15) return 'MODERATE_REGRESSION';
    return 'STRONG_REGRESSION';
  }

  /**
   * Helper: Build round-level longitudinal progression
   */
  private static buildRoundProgression(
    round: 'APTITUDE' | 'CODING' | 'HR',
    name: string,
    snapshots: LongitudinalTimelinePoint[],
    extractor: (pt: LongitudinalTimelinePoint) => number | null
  ): RoundProgression {
    const history: Array<{ interviewNumber: number; formattedDate: string; score: number | null }> = [];
    snapshots.forEach((pt) => {
      history.push({
        interviewNumber: pt.interviewNumber,
        formattedDate: pt.formattedDate,
        score: extractor(pt),
      });
    });

    const validScores = history.map((h) => h.score).filter((s): s is number => typeof s === 'number');

    if (validScores.length === 0) {
      return {
        round,
        name,
        baselineScore: null,
        latestScore: null,
        absoluteChange: null,
        growthRate: null,
        trend: 'INSUFFICIENT_HISTORY',
        history,
        summary: 'No historical evaluation data recorded for this stage.',
      };
    }

    const baseline = validScores[0];
    const latest = validScores[validScores.length - 1];
    let delta: number | null = null;
    let rate: number | null = null;
    let trend: TrendDirection = 'INSUFFICIENT_HISTORY';

    if (validScores.length >= 2) {
      delta = latest - baseline;
      if (baseline > 0) {
        rate = Math.round(((latest - baseline) / baseline) * 1000) / 10;
      }
      trend = this.classifyTrend(delta);
    }

    const summary = validScores.length < 2
      ? `Baseline: ${latest}/100 recorded in initial session.`
      : `${name} shifted from ${baseline}/100 to ${latest}/100 (${delta !== null && delta >= 0 ? `+${delta}` : delta} pts).`;

    return {
      round,
      name,
      baselineScore: baseline,
      latestScore: latest,
      absoluteChange: delta,
      growthRate: rate,
      trend,
      history,
      summary,
    };
  }

  /**
   * Helper: Build HR Dimension longitudinal progression
   */
  private static buildHRDimensionProgression(
    dimensionKey: string,
    dimensionName: string,
    description: string,
    snapshots: LongitudinalTimelinePoint[]
  ): HRDimensionProgression {
    const history: Array<{ interviewNumber: number; formattedDate: string; score: number }> = [];

    snapshots.forEach((pt) => {
      const sc = pt.hrDimensions[dimensionKey];
      if (typeof sc === 'number' && !isNaN(sc)) {
        history.push({
          interviewNumber: pt.interviewNumber,
          formattedDate: pt.formattedDate,
          score: sc,
        });
      }
    });

    if (history.length === 0) {
      return {
        dimensionKey,
        dimensionName,
        description,
        baselineScore: null,
        latestScore: null,
        absoluteChange: null,
        growthRate: null,
        trend: 'INSUFFICIENT_HISTORY',
        history: [],
      };
    }

    const baseline = history[0].score;
    const latest = history[history.length - 1].score;
    let delta: number | null = null;
    let rate: number | null = null;
    let trend: TrendDirection = 'INSUFFICIENT_HISTORY';

    if (history.length >= 2) {
      delta = latest - baseline;
      if (baseline > 0) {
        rate = Math.round(((latest - baseline) / baseline) * 1000) / 10;
      }
      trend = this.classifyTrend(delta);
    }

    return {
      dimensionKey,
      dimensionName,
      description,
      baselineScore: baseline,
      latestScore: latest,
      absoluteChange: delta,
      growthRate: rate,
      trend,
      history,
    };
  }

  /**
   * Helper: Extract top-level KPIs for dashboard header
   */
  private static extractKPIs(
    interviewsAnalyzed: number,
    profile: any,
    strongestGrowth: SkillGrowthItem[],
    recentRegressions: SkillGrowthItem[]
  ) {
    const currentScore = profile?.overallReadinessScore ?? null;
    const topGrowth = strongestGrowth[0] || null;

    let prioritySkill: string | null = null;
    if (recentRegressions.length > 0) {
      prioritySkill = recentRegressions[0].skillName;
    } else if (profile?.skills) {
      const lowest = (profile.skills as CanonicalSkillMetric[])
        .filter((s) => s.isReliable && typeof s.currentScore === 'number')
        .sort((a, b) => (a.currentScore ?? 100) - (b.currentScore ?? 100))[0];
      if (lowest) prioritySkill = lowest.name;
    }

    return {
      interviewsAnalyzed,
      currentScore,
      strongestGrowthSkill: topGrowth ? topGrowth.skillName : null,
      strongestGrowthDelta: topGrowth ? topGrowth.absoluteChange : null,
      priorityFocusSkill: prioritySkill,
    };
  }
}
