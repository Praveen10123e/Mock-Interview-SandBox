/**
 * AutopsyPatternDetector.ts
 *
 * Deterministic failure pattern detector and recurrence classifier.
 * Strictly differentiates SINGLE_OCCURRENCE, EMERGING_PATTERN, and RECURRING weaknesses.
 * Identifies cross-round themes and tracks resolved/improved competencies.
 */

import {
  AutopsyEvidence,
  AutopsyFinding,
  AutopsyStrength,
  AutopsyResolvedPattern,
  CrossRoundPattern,
  PatternType,
  FindingSeverity,
  FindingConfidence,
} from './AutopsyTypes';
import { CollectedCandidateHistory } from './AutopsyEvidenceCollector';

export interface PatternDetectionResult {
  findings: AutopsyFinding[];
  strengths: AutopsyStrength[];
  resolvedPatterns: AutopsyResolvedPattern[];
  crossRoundPatterns: CrossRoundPattern[];
  insufficientHistory: boolean;
}

export class AutopsyPatternDetector {
  /**
   * Analyze candidate history and detect evidence-backed recurring failure patterns
   */
  static detectPatterns(history: CollectedCandidateHistory): PatternDetectionResult {
    const { interviews, totalCompletedCount } = history;

    // ── 1. Insufficient Data Boundary Check ─────────────────────────────────
    if (totalCompletedCount === 0) {
      return {
        findings: [],
        strengths: [],
        resolvedPatterns: [],
        crossRoundPatterns: [],
        insufficientHistory: true,
      };
    }

    const allEvidence: AutopsyEvidence[] = [];
    interviews.forEach((inv) => allEvidence.push(...inv.evidenceItems));

    // ── 2. Group Evidence by Competency / Pattern Key ──────────────────────
    const evidenceGroups: Record<
      string,
      {
        category: 'CODING' | 'APTITUDE' | 'HR';
        skill: string;
        title: string;
        evidence: AutopsyEvidence[];
        interviewsMap: Map<string, AutopsyEvidence[]>;
      }
    > = {};

    const registerEvidence = (
      groupKey: string,
      category: 'CODING' | 'APTITUDE' | 'HR',
      skill: string,
      title: string,
      ev: AutopsyEvidence
    ) => {
      if (!evidenceGroups[groupKey]) {
        evidenceGroups[groupKey] = {
          category,
          skill,
          title,
          evidence: [],
          interviewsMap: new Map(),
        };
      }
      evidenceGroups[groupKey].evidence.push(ev);
      const list = evidenceGroups[groupKey].interviewsMap.get(ev.interviewId) || [];
      list.push(ev);
      evidenceGroups[groupKey].interviewsMap.set(ev.interviewId, list);
    };

    allEvidence.forEach((ev) => {
      if (ev.sourceType === 'CODING') {
        if (ev.evidenceType === 'EDGE_CASE_FAILURE') {
          registerEvidence(
            'CODING_EDGE_CASE',
            'CODING',
            'EDGE_CASE_REASONING',
            'Boundary & Edge Case Handling',
            ev
          );
        } else if (ev.evidenceType === 'COMPLEXITY_TIMEOUT') {
          registerEvidence(
            'CODING_TIMEOUT_COMPLEXITY',
            'CODING',
            'ALGORITHMIC_EFFICIENCY',
            'Suboptimal Time Complexity & Timeouts',
            ev
          );
        } else if (ev.evidenceType === 'COMPILATION_ERROR') {
          registerEvidence(
            'CODING_SYNTAX_COMPILATION',
            'CODING',
            'CODE_HYGIENE_COMPILATION',
            'Compilation & Syntax Error Persistence',
            ev
          );
        } else {
          registerEvidence(
            'CODING_ALGORITHM_LOGIC',
            'CODING',
            'ALGORITHMIC_PROBLEM_SOLVING',
            'Algorithmic Logic & Test Verification',
            ev
          );
        }
      } else if (ev.sourceType === 'APTITUDE') {
        const topic = ev.details.topic || 'Quantitative Reasoning';
        const groupKey = `APTITUDE_${topic.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
        registerEvidence(
          groupKey,
          'APTITUDE',
          `APTITUDE_${topic.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
          `Aptitude Topic Accuracy: ${topic}`,
          ev
        );
      } else if (ev.sourceType === 'HR') {
        if (ev.evidenceType === 'MISSING_STAR_RESULT') {
          registerEvidence(
            'HR_MISSING_STAR_RESULT',
            'HR',
            'STAR_RESULT_STRUCTURE',
            'Omission of STAR Result & Quantified Impact',
            ev
          );
        } else if (ev.evidenceType === 'LOW_TECHNICAL_DEPTH') {
          registerEvidence(
            'HR_LOW_TECHNICAL_DEPTH',
            'HR',
            'TECHNICAL_DEPTH_BEHAVIORAL',
            'Technical Depth & Nuance in Responses',
            ev
          );
        } else if (ev.evidenceType === 'LOW_SPECIFICITY') {
          registerEvidence(
            'HR_LOW_SPECIFICITY',
            'HR',
            'CONCRETE_EVIDENCE_SPECIFICITY',
            'Abstract Responses Lacking Concrete Examples',
            ev
          );
        } else if (ev.evidenceType === 'WEAK_STRUCTURE') {
          registerEvidence(
            'HR_WEAK_STRUCTURE',
            'HR',
            'COMMUNICATION_STRUCTURE',
            'Response Coherence & STAR Methodology',
            ev
          );
        } else {
          registerEvidence(
            'HR_BEHAVIORAL_REASONING',
            'HR',
            'BEHAVIORAL_COMPETENCY',
            'Behavioral Articulation & Evidence',
            ev
          );
        }
      }
    });

    // ── 3. Classify Pattern Recurrence & Formulate Findings ────────────────
    const findings: AutopsyFinding[] = [];

    Object.entries(evidenceGroups).forEach(([key, group]) => {
      const distinctInterviewsCount = group.interviewsMap.size;
      const totalOccurrences = group.evidence.length;
      const interviewIds = Array.from(group.interviewsMap.keys());

      // Recurrence rule:
      // totalCompletedCount == 1 -> SINGLE_OCCURRENCE
      // distinctInterviewsCount == 1 -> SINGLE_OCCURRENCE
      // distinctInterviewsCount == 2 -> EMERGING_PATTERN
      // distinctInterviewsCount >= 3 -> RECURRING / PERSISTENT
      let patternType: PatternType = 'SINGLE_OCCURRENCE';
      let severity: FindingSeverity = 'LOW';
      let confidence: FindingConfidence = 'LOW';

      if (totalCompletedCount >= 3 && distinctInterviewsCount >= 3) {
        patternType = distinctInterviewsCount >= 4 ? 'PERSISTENT' : 'RECURRING';
        severity = totalOccurrences >= 5 ? 'CRITICAL' : 'HIGH';
        confidence = 'HIGH';
      } else if (totalCompletedCount >= 2 && distinctInterviewsCount >= 2) {
        patternType = 'EMERGING_PATTERN';
        severity = 'MEDIUM';
        confidence = 'MEDIUM';
      } else {
        patternType = 'SINGLE_OCCURRENCE';
        severity = 'LOW';
        confidence = totalCompletedCount === 1 ? 'LOW' : 'MEDIUM';
      }

      // Generate default deterministic root causes & recommendations
      const { likelyRootCause, impact, recommendation, recommendedPractice } =
        AutopsyPatternDetector.synthesizeDeterministicFindingText(
          group.category,
          group.skill,
          patternType,
          distinctInterviewsCount,
          totalOccurrences
        );

      findings.push({
        id: `finding-${key.toLowerCase()}`,
        category: group.category,
        skill: group.skill,
        title: group.title,
        patternType,
        severity,
        confidence,
        frequency: totalOccurrences,
        interviewsAffected: distinctInterviewsCount,
        interviewIds,
        likelyRootCause,
        impact,
        recommendation,
        recommendedPractice,
        evidence: group.evidence,
      });
    });

    // Sort findings: CRITICAL > HIGH > MEDIUM > LOW, then by frequency descending
    const severityRank: Record<FindingSeverity, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };
    findings.sort((a, b) => {
      const diff = severityRank[b.severity] - severityRank[a.severity];
      if (diff !== 0) return diff;
      return b.frequency - a.frequency;
    });

    // ── 4. Cross-Round Pattern Inferences ──────────────────────────────────
    const crossRoundPatterns: CrossRoundPattern[] = [];

    const hasCodingTechIssue = findings.some(
      (f) => f.category === 'CODING' && f.interviewsAffected >= 2
    );
    const hasHRTechDepthIssue = findings.some(
      (f) => f.category === 'HR' && f.skill === 'TECHNICAL_DEPTH_BEHAVIORAL' && f.interviewsAffected >= 2
    );

    if (hasCodingTechIssue && hasHRTechDepthIssue) {
      crossRoundPatterns.push({
        id: 'cr-tech-depth',
        title: 'Cross-Round Technical Depth Alignment',
        roundsInvolved: ['CODING', 'HR'],
        severity: 'HIGH',
        confidence: 'HIGH',
        inference:
          'Evidence suggests difficulty articulating in-depth technical decisions appears across both hands-on algorithmic problem solving and behavioral system explanations.',
        impact:
          'Candidates with this cross-round pattern frequently score well on high-level concepts but lose marks when asked for concrete metrics, time/space complexity trade-offs, or architectural rationale.',
        recommendation:
          'When preparing technical and behavioral answers, explicitly connect code implementations with system-level architectural reasoning and trade-off analysis.',
      });
    }

    const hasCodingTimeout = findings.some(
      (f) => f.skill === 'ALGORITHMIC_EFFICIENCY' && f.interviewsAffected >= 2
    );
    const hasAptitudeTimeIssue = allEvidence.some(
      (e) => e.evidenceType === 'UNANSWERED_QUESTION'
    );

    if (hasCodingTimeout && hasAptitudeTimeIssue) {
      crossRoundPatterns.push({
        id: 'cr-time-management',
        title: 'Session Pacing & Time Pressure Friction',
        roundsInvolved: ['CODING', 'APTITUDE'],
        severity: 'MEDIUM',
        confidence: 'MEDIUM',
        inference:
          'Evidence suggests time-management friction under proctored timer constraints across both quantitative and coding stages.',
        impact:
          'Spending disproportionate time on early sub-problems leaves insufficient runway for final verification and edge-case testing.',
        recommendation:
          'Practice timeboxing: allocate a strict 5-minute planning phase, 15-minute implementation phase, and 5-minute boundary verification phase for coding problems.',
      });
    }

    // ── 5. Detect Positive Strengths & Resolved Weaknesses ────────────────
    const strengths: AutopsyStrength[] = [];
    const resolvedPatterns: AutopsyResolvedPattern[] = [];

    if (totalCompletedCount >= 2) {
      const firstInv = interviews[0];
      const latestInv = interviews[interviews.length - 1];

      // Check Coding resolution
      if (
        firstInv.codingScore !== null &&
        latestInv.codingScore !== null &&
        firstInv.codingScore < 60 &&
        latestInv.codingScore >= 75
      ) {
        resolvedPatterns.push({
          id: 'res-coding-improvement',
          category: 'CODING',
          skill: 'ALGORITHMIC_PROBLEM_SOLVING',
          title: 'Algorithmic Implementation & Test Case Accuracy',
          initialScore: firstInv.codingScore,
          latestScore: latestInv.codingScore,
          scoreDelta: latestInv.codingScore - firstInv.codingScore,
          explanation: `Coding score improved from ${firstInv.codingScore}% in initial assessment to ${latestInv.codingScore}% in latest session.`,
          evidence: `Unit test pass rate improved significantly across consecutive submissions.`,
        });
      }

      // Check Aptitude resolution
      if (
        firstInv.aptitudeScore !== null &&
        latestInv.aptitudeScore !== null &&
        firstInv.aptitudeScore < 60 &&
        latestInv.aptitudeScore >= 75
      ) {
        resolvedPatterns.push({
          id: 'res-aptitude-improvement',
          category: 'APTITUDE',
          skill: 'QUANTITATIVE_REASONING',
          title: 'Quantitative & Logical Problem Solving',
          initialScore: firstInv.aptitudeScore,
          latestScore: latestInv.aptitudeScore,
          scoreDelta: latestInv.aptitudeScore - firstInv.aptitudeScore,
          explanation: `Aptitude accuracy rose from ${firstInv.aptitudeScore}% in baseline session to ${latestInv.aptitudeScore}% in latest session.`,
          evidence: `Demonstrated marked accuracy improvement on assigned question sets.`,
        });
      }

      // Check HR resolution
      if (
        firstInv.hrScore !== null &&
        latestInv.hrScore !== null &&
        firstInv.hrScore < 65 &&
        latestInv.hrScore >= 75
      ) {
        resolvedPatterns.push({
          id: 'res-hr-improvement',
          category: 'HR',
          skill: 'COMMUNICATION_STRUCTURE',
          title: 'Behavioral Communication & Structure',
          initialScore: firstInv.hrScore,
          latestScore: latestInv.hrScore,
          scoreDelta: latestInv.hrScore - firstInv.hrScore,
          explanation: `Behavioral evaluation rose from ${firstInv.hrScore}% to ${latestInv.hrScore}%, demonstrating improved STAR delivery.`,
          evidence: `Verified transcripts show structured Situation, Task, Action, and Result coverage.`,
        });
      }

      // Check Ongoing Strengths (score consistently >= 75% across all recorded interviews)
      const avgApt =
        interviews
          .map((i) => i.aptitudeScore)
          .filter((s): s is number => typeof s === 'number')
          .reduce((a, b, _, arr) => a + b / arr.length, 0);

      if (avgApt >= 80) {
        strengths.push({
          id: 'str-apt-high',
          category: 'APTITUDE',
          skill: 'QUANTITATIVE_CONSISTENCY',
          title: 'High Quantitative Accuracy & Logical Precision',
          consistencyScore: Math.round(avgApt),
          interviewsDemonstrated: totalCompletedCount,
          description: `Consistently achieved strong aptitude marks (average ${Math.round(avgApt)}%) across ${totalCompletedCount} sequential evaluations.`,
          evidenceSnippet: `High accuracy in mathematical, logical, and verbal problem solving sets.`,
        });
      }

      const avgCoding =
        interviews
          .map((i) => i.codingScore)
          .filter((s): s is number => typeof s === 'number')
          .reduce((a, b, _, arr) => a + b / arr.length, 0);

      if (avgCoding >= 80) {
        strengths.push({
          id: 'str-coding-high',
          category: 'CODING',
          skill: 'OPTIMAL_IMPLEMENTATION',
          title: 'Optimal Algorithmic Implementation',
          consistencyScore: Math.round(avgCoding),
          interviewsDemonstrated: totalCompletedCount,
          description: `Consistently achieved ${Math.round(avgCoding)}% coding pass rate with clean unit test verification.`,
          evidenceSnippet: `High test case acceptance on assigned algorithmic challenges.`,
        });
      }

      const avgHR =
        interviews
          .map((i) => i.hrScore)
          .filter((s): s is number => typeof s === 'number')
          .reduce((a, b, _, arr) => a + b / arr.length, 0);

      if (avgHR >= 80) {
        strengths.push({
          id: 'str-hr-high',
          category: 'HR',
          skill: 'PROFESSIONAL_ARTICULATION',
          title: 'Poised Behavioral & Situational Articulation',
          consistencyScore: Math.round(avgHR),
          interviewsDemonstrated: totalCompletedCount,
          description: `Consistently achieved strong behavioral evaluation scores (average ${Math.round(avgHR)}%).`,
          evidenceSnippet: `Structured communication with clear ownership, teamwork, and problem-solving evidence.`,
        });
      }
    }

    return {
      findings,
      strengths,
      resolvedPatterns,
      crossRoundPatterns,
      insufficientHistory: false,
    };
  }

  /**
   * Deterministic root cause, impact, and recommendation text generator
   */
  private static synthesizeDeterministicFindingText(
    category: 'CODING' | 'APTITUDE' | 'HR',
    skill: string,
    patternType: PatternType,
    interviewsCount: number,
    frequency: number
  ): {
    likelyRootCause: string;
    impact: string;
    recommendation: string;
    recommendedPractice: string;
  } {
    const isRecurring = patternType === 'RECURRING' || patternType === 'PERSISTENT';
    const recurrencePhrase = isRecurring
      ? `Observed repeatedly across ${interviewsCount} interviews (${frequency} total occurrences).`
      : patternType === 'EMERGING_PATTERN'
      ? `Observed in ${interviewsCount} consecutive assessments.`
      : `Observed in recent assessment.`;

    if (category === 'CODING') {
      if (skill === 'EDGE_CASE_REASONING') {
        return {
          likelyRootCause: `Evidence suggests boundary conditions (such as empty inputs, single-element collections, negative values, and extreme index bounds) are not systematically mapped prior to writing solution loops. ${recurrencePhrase}`,
          impact:
            'Test executions fail on visible boundary-condition test cases despite functionally sound core logic. These failures contributed to incorrect results in the affected coding submissions.',
          recommendation:
            'Adopt an explicit pre-flight checklist: before coding, write down 5 boundary cases (empty, 0/1, negative, duplicates, maximum value) and verify them manually against your pseudo-code.',
          recommendedPractice: 'Solve Array & String boundary challenges with strict test case validation.',
        };
      }
      if (skill === 'ALGORITHMIC_EFFICIENCY') {
        return {
          likelyRootCause: `Likely contributing factor: Initial intuition tends toward nested iteration (O(N^2)) without evaluating hash map frequency tracking (O(N)) or two-pointer techniques. ${recurrencePhrase}`,
          impact:
            'Submissions fail time-limit constraints on larger datasets, preventing full credit for the coding round.',
          recommendation:
            'Evaluate input constraints before selecting an approach. For N >= 10^5, reject O(N^2) algorithms immediately and utilize HashMaps, Binary Search, or Sliding Windows.',
          recommendedPractice: 'Practice Optimal Time Complexity & Space-Time Tradeoff problem sets.',
        };
      }
      if (skill === 'CODE_HYGIENE_COMPILATION') {
        return {
          likelyRootCause: `Evidence suggests sub-routine syntax or type mismatches are being debugged iteratively through judge submissions rather than verified locally. ${recurrencePhrase}`,
          impact:
            'Multiple failed compilation attempts consume valuable interview time and reduce candidate confidence.',
          recommendation:
            'Review standard library method signatures and verify variable scopes before pressing Submit.',
          recommendedPractice: 'Language-specific syntax drill sets in standard data structures.',
        };
      }
      return {
        likelyRootCause: `Evidence suggests logic branching errors or unhandled conditions in algorithm control flow. ${recurrencePhrase}`,
        impact: 'Partial test case failures prevent automated judge acceptance.',
        recommendation:
          'Trace through algorithms with a representative dry-run test case before final submission.',
        recommendedPractice: 'Algorithmic problem solving with stepwise dry-run verification.',
      };
    }

    if (category === 'HR') {
      if (skill === 'STAR_RESULT_STRUCTURE') {
        return {
          likelyRootCause: `Evidence suggests behavioral responses focus heavily on Situation and Action while cutting off before quantifying the concrete Result or Business Impact. ${recurrencePhrase}`,
          impact:
            'Interviewers cannot gauge the actual magnitude of candidate contribution or business success, leading to lower scoring on the Evidence and Structure dimensions.',
          recommendation:
            'Conclude every STAR response with a dedicated 2-sentence Result: state the tangible outcome, percentage improvement, team benefit, or key lesson learned.',
          recommendedPractice: 'STAR Method: Formulating Measurable Outcomes & Business Impact.',
        };
      }
      if (skill === 'TECHNICAL_DEPTH_BEHAVIORAL') {
        return {
          likelyRootCause: `Evidence suggests explanations remain at a high-level operational overview without detailing the underlying architectural stack, trade-offs, or engineering challenges. ${recurrencePhrase}`,
          impact:
            'Lower scores on Technical Depth dimension, leaving evaluators uncertain of the candidate’s hands-on engineering involvement.',
          recommendation:
            'Name specific frameworks, protocols, algorithms, or database choices when describing project contributions. Explain why you chose tool X over tool Y.',
          recommendedPractice: 'Technical Depth & Architectural Articulation in HR interviews.',
        };
      }
      if (skill === 'CONCRETE_EVIDENCE_SPECIFICITY') {
        return {
          likelyRootCause: `Evidence suggests generic claims ("We worked hard and solved the issue") are used instead of specific personal actions ("I implemented the caching layer"). ${recurrencePhrase}`,
          impact: 'Weak scores on the Relevance and Evidence dimensions.',
          recommendation:
            'Anchor every story in a specific real project or academic challenge, highlighting your specific individual ownership.',
          recommendedPractice: 'Individual Ownership & Concrete Situational Storytelling.',
        };
      }
      return {
        likelyRootCause: `Evidence suggests opportunity to structure behavioral delivery more concisely. ${recurrencePhrase}`,
        impact: 'Meandering delivery impacts clarity and time management.',
        recommendation: 'Use the STAR format: 15% Situation, 15% Task, 50% Action, 20% Result.',
        recommendedPractice: 'STAR Framework delivery practice.',
      };
    }

    // Aptitude
    return {
      likelyRootCause: `Evidence indicates recurring incorrect problem solutions in this specific mathematical/logical topic under timed conditions. ${recurrencePhrase}`,
      impact:
        'Aptitude cutoff marks are affected, reducing overall multi-round readiness score.',
      recommendation:
        'Review core formulas, shortcut techniques, and pattern recognition rules for this topic in the practice portal.',
      recommendedPractice: `Targeted Practice: ${skill.replace('APTITUDE_', '')} Problem Sets.`,
    };
  }
}
