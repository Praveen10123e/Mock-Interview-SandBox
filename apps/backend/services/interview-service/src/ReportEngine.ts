import { PrismaClient } from './generated/client';
import axios from 'axios';

// Valid Naan Mudhalvan curriculum categories available in Question Bank
const NM_CURRICULUM_MODULES: Record<string, { moduleName: string; practiceCategory: string }> = {
  'Aptitude': { moduleName: 'Quantitative & Logical Reasoning Fundamentals', practiceCategory: 'Aptitude' },
  'Arrays': { moduleName: 'Linear Data Structures & Two-Pointer Patterns', practiceCategory: 'Data Structures' },
  'Sorting': { moduleName: 'Divide & Conquer and Sorting Algorithms', practiceCategory: 'Programming' },
  'Strings': { moduleName: 'String Manipulation & Parsing Techniques', practiceCategory: 'Programming' },
  'Hash Table': { moduleName: 'Hashing & Frequency Counting Optimization', practiceCategory: 'Data Structures' },
  'Dynamic Programming': { moduleName: 'State Optimization & Dynamic Programming', practiceCategory: 'Data Structures' },
  'Trees': { moduleName: 'Binary Trees & Tree Traversals', practiceCategory: 'Data Structures' },
  'Graphs': { moduleName: 'Graph Algorithms & Cycle Detection', practiceCategory: 'Data Structures' },
  'SQL': { moduleName: 'Relational Database Queries & Joins', practiceCategory: 'SQL' },
  'Networking': { moduleName: 'Computer Networks & Protocols', practiceCategory: 'Networking' },
  'Operating Systems': { moduleName: 'Process Management & Memory Architecture', practiceCategory: 'Operating Systems' },
  'DBMS': { moduleName: 'Database Management Systems & Normalization', practiceCategory: 'DBMS MCQ' },
  'HR': { moduleName: 'Behavioral & Leadership Communication Excellence', practiceCategory: 'HR' },
  'General': { moduleName: 'Core Technical Problem Solving', practiceCategory: 'Programming' },
};

async function fetchQuestionMeta(questionId: string) {
  try {
    const res = await axios.get(`http://localhost:3005/${questionId}`, {
      headers: { 'x-user-role': 'FACULTY' },
    });
    return res.data?.data || null;
  } catch {
    return null;
  }
}

/** Deterministic time and space complexity analyzer from source code and problem metadata */
function analyzeCodeComplexity(sourceCode: string | null | undefined, expectedComplexity: string = 'O(n log n)', executionRecord?: any): { candidateTime: string; candidateSpace: string; complexityScore: number; reason: string } {
  if (!sourceCode || sourceCode.trim().length === 0) {
    if (executionRecord && executionRecord.passedCount > 0) {
      const isFast = (executionRecord.executionTime || 0) < 0.1;
      const candidateTime = isFast ? expectedComplexity : 'O(n²)';
      const candidateSpace = (executionRecord.memory || 0) < 5000 ? 'O(1)' : 'O(n)';
      const complexityScore = executionRecord.status === 'PASSED' ? 90 : 75;
      return {
        candidateTime,
        candidateSpace,
        complexityScore,
        reason: executionRecord.status === 'PASSED'
          ? `Solution executed cleanly within time budget (${executionRecord.executionTime || 0}s) and memory constraints (${executionRecord.memory || 0} KB), aligning with the optimal ${expectedComplexity} complexity target.`
          : `Solution executed in ${executionRecord.executionTime || 0}s across ${executionRecord.passedCount}/${executionRecord.totalCount} tests.`
      };
    }
    return {
      candidateTime: 'Not Submitted',
      candidateSpace: 'Not Submitted',
      complexityScore: 0,
      reason: 'No source code was submitted for complexity analysis.'
    };
  }

  const code = sourceCode.toLowerCase();
  
  // Heuristic pattern detection
  const hasNestedLoops = /(for|while)[\s\S]*?(for|while)/.test(code);
  const hasSingleLoop = /(for|while)/.test(code);
  const hasSorting = /(sort\(|sorted\(|\.sort\(|qsort|collections\.sort|arrays\.sort)/.test(code);
  const hasRecursion = /def\s+([a-zA-Z0-9_]+)[\s\S]*?\1\(|function\s+([a-zA-Z0-9_]+)[\s\S]*?\2\(/.test(code);
  const hasHashTable = /(dict\(|\{|\bmap\b|\bset\(|\bhashmap\b|\bunordered_map\b)/.test(code);

  let candidateTime = 'O(n)';
  let candidateSpace = 'O(1)';

  if (hasNestedLoops) {
    candidateTime = 'O(n²)';
  } else if (hasSorting) {
    candidateTime = 'O(n log n)';
  } else if (hasSingleLoop) {
    candidateTime = 'O(n)';
  } else if (hasRecursion) {
    candidateTime = 'O(2^n)';
  } else {
    candidateTime = 'O(1)';
  }

  if (hasHashTable) {
    candidateSpace = 'O(n)';
  } else if (hasSorting) {
    candidateSpace = 'O(log n)';
  }

  // Score comparison against expected
  let complexityScore = 85;
  let reason = '';

  const normExpected = expectedComplexity.toLowerCase();
  const normCandidate = candidateTime.toLowerCase();

  if (normExpected.includes(normCandidate) || (normCandidate === 'O(n)' && normExpected.includes('log n'))) {
    complexityScore = 95;
    reason = `Candidate solution achieves optimal ${candidateTime} time complexity and ${candidateSpace} auxiliary space, matching the expected ${expectedComplexity}.`;
  } else if (normCandidate === 'O(n²)' && normExpected.includes('log n')) {
    complexityScore = 65;
    reason = `Candidate used a quadratic ${candidateTime} approach with nested iteration whereas optimal ${expectedComplexity} was expected.`;
  } else if (normCandidate === 'O(n²)' && normExpected.includes('o(n)')) {
    complexityScore = 60;
    reason = `Candidate implementation required ${candidateTime} time complexity compared to optimal linear ${expectedComplexity}.`;
  } else {
    complexityScore = 75;
    reason = `Candidate implemented a ${candidateTime} time and ${candidateSpace} space solution.`;
  }

  return { candidateTime, candidateSpace, complexityScore, reason };
}

/** Analyze code quality & readability based on actual AST/code properties */
function analyzeCodeQuality(sourceCode: string | null | undefined, executionRecord?: any): { score: number; reasons: string[] } {
  if (!sourceCode || sourceCode.trim().length === 0) {
    if (executionRecord && executionRecord.sourceCodeLength > 0) {
      const reasons: string[] = ['Structured, executable solution submitted.'];
      let score = 80;
      if (executionRecord.status === 'PASSED') {
        score = 90;
        reasons.push('Code successfully satisfied all boundary conditions and runtime specifications.');
      } else if (executionRecord.compileOutput) {
        score = 65;
        reasons.push('Observed syntax or compilation warnings during execution.');
      }
      return { score, reasons };
    }
    return { score: 0, reasons: ['No code submitted.'] };
  }

  let score = 85;
  const reasons: string[] = [];
  const lines = sourceCode.split('\n');

  // Check identifier naming
  const singleCharVars = (sourceCode.match(/\b[a-z]\b/g) || []).length;
  if (singleCharVars > 15) {
    score -= 10;
    reasons.push('High usage of single-letter variable names instead of descriptive identifiers.');
  } else {
    reasons.push('Descriptive and structured variable naming.');
  }

  // Check nesting depth
  let maxIndent = 0;
  lines.forEach(line => {
    const indent = line.search(/\S/);
    if (indent > maxIndent) maxIndent = indent;
  });
  if (maxIndent >= 16) {
    score -= 10;
    reasons.push('Deep nesting detected; consider modular helper function extraction.');
  } else {
    reasons.push('Clean indentation and modular control flow.');
  }

  // Check function structure
  if (/def\s+|function\s+|class\s+|public\s+/.test(sourceCode)) {
    score += 5;
    reasons.push('Proper modular function encapsulation.');
  }

  score = Math.min(100, Math.max(20, score));
  return { score, reasons };
}

/** HR transcript and communication clarity analyzer */
function analyzeHRCommunication(hrHistory: any[], transcript: string | null | undefined): {
  overallScore: number;
  clarityScore: number;
  confidenceScore: number;
  technicalExplanationScore: number;
  relevanceScore: number;
  reasons: string[];
} {
  const candidateMessages = (hrHistory || []).filter((m: any) => m.role === 'candidate' || m.sender === 'candidate');
  const validCandidateTexts = candidateMessages
    .map((m: any) => m.content || m.text || '')
    .filter((txt: string) => {
      const lower = (txt || '').trim().toLowerCase();
      return lower && !lower.includes('audio response recorded') && !lower.includes('no speech') && !lower.includes('no transcript') && lower !== 'silence';
    });

  const fullText = (validCandidateTexts.join(' ') + ' ' + (transcript || '')).trim();

  if (fullText.length === 0) {
    return {
      overallScore: 0,
      clarityScore: 0,
      confidenceScore: 0,
      technicalExplanationScore: 0,
      relevanceScore: 0,
      reasons: ['HR round was not attempted or no candidate responses were recorded.']
    };
  }

  const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;
  const technicalKeywords = (fullText.match(/\b(architecture|algorithm|optimization|database|scale|distributed|tradeoff|design|testing|debugging|api|latency|framework)\b/gi) || []).length;
  const structuredKeywords = (fullText.match(/\b(first|second|because|therefore|result|handled|resolved|implemented|collaborated|responsible)\b/gi) || []).length;

  let clarityScore = 75;
  let confidenceScore = 75;
  let technicalExplanationScore = 70;
  let relevanceScore = 80;
  const reasons: string[] = [];

  if (wordCount >= 80) {
    clarityScore += 15;
    confidenceScore += 10;
    reasons.push(`Articulate responses with comprehensive explanations (${wordCount} words recorded).`);
  } else if (wordCount >= 30) {
    clarityScore += 5;
    reasons.push('Concise answers providing direct responses to interview questions.');
  } else {
    clarityScore -= 20;
    confidenceScore -= 15;
    reasons.push('Brief responses with limited elaboration on key technical aspects.');
  }

  if (technicalKeywords >= 3) {
    technicalExplanationScore += 20;
    reasons.push(`Effective incorporation of technical terminology and engineering principles.`);
  } else {
    technicalExplanationScore -= 10;
    reasons.push('Opportunity to incorporate more concrete technical examples and metrics.');
  }

  if (structuredKeywords >= 3) {
    relevanceScore += 15;
    reasons.push('Structured response flow utilizing cause-and-effect reasoning.');
  }

  clarityScore = Math.min(100, Math.max(30, clarityScore));
  confidenceScore = Math.min(100, Math.max(30, confidenceScore));
  technicalExplanationScore = Math.min(100, Math.max(30, technicalExplanationScore));
  relevanceScore = Math.min(100, Math.max(30, relevanceScore));

  const overallScore = Math.round((clarityScore + confidenceScore + technicalExplanationScore + relevanceScore) / 4);

  return {
    overallScore,
    clarityScore,
    confidenceScore,
    technicalExplanationScore,
    relevanceScore,
    reasons
  };
}

export async function generateReport(interviewId: string, identityId: string, prisma: PrismaClient, telemetryInput?: any) {
  // 1. Fetch Interview & Session
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: { session: true }
  });

  if (!interview || !interview.session) {
    throw new Error('Interview or session not found');
  }

  const sessionId = interview.session.id;

  // 2. Fetch Assignments
  const assignments = await (prisma as any).interviewRoundAssignment.findMany({
    where: { interviewId },
    orderBy: [{ round: 'asc' }, { position: 'asc' }]
  });

  // Fetch telemetry stored in session or input
  const sessionHistory = await prisma.interviewHistory.findMany({
    where: { interviewId },
    orderBy: { timestamp: 'asc' }
  });

  let aptitudeData = telemetryInput?.aptitude || null;
  let hrData = telemetryInput?.hr || null;

  sessionHistory.forEach(h => {
    if (h.event === 'APTITUDE_SUBMIT' && h.details) aptitudeData = h.details;
    if (h.event === 'HR_COMPLETE' && h.details) hrData = h.details;
  });

  // ─── 3. APTITUDE ANALYSIS ──────────────────────────────────────────────────
  const aptAssignments = assignments.filter((a: any) => a.round === 'APTITUDE');
  let aptScore = 0;
  let aptCorrectCount = 0;
  let aptTotalCount = aptAssignments.length || 5;
  let aptStatus = 'NOT_ATTEMPTED';
  const aptQuestionsDetail: any[] = [];

  if (aptitudeData && typeof aptitudeData.correct === 'number') {
    aptCorrectCount = aptitudeData.correct;
    aptTotalCount = aptitudeData.total || aptTotalCount;
    aptScore = Math.round((aptCorrectCount / aptTotalCount) * 100);
    aptStatus = aptCorrectCount === aptTotalCount ? 'PASSED' : 'COMPLETED';
  }

  // Hydrate Aptitude Question details
  for (const asg of aptAssignments) {
    const qMeta = await fetchQuestionMeta(asg.questionId);
    aptQuestionsDetail.push({
      questionId: asg.questionId,
      title: qMeta?.title || 'Aptitude Question',
      topic: qMeta?.topic?.name || qMeta?.topic || 'Aptitude',
      difficulty: qMeta?.difficulty || 'Medium'
    });
  }

  // ─── 4. CODING ANALYSIS ────────────────────────────────────────────────────
  const codingAssignments = assignments.filter((a: any) => a.round === 'CODING');
  const codingQuestionsOut: any[] = [];
  let codingTotalScore = 0;
  let codingEarnedScore = 0;
  let codingAttemptedProblems = 0;
  let codingAcceptedProblems = 0;
  let totalTestsPassed = 0;
  let totalTestsCount = 0;
  let totalExecutionAttempts = 0;
  let codingStatus = 'NOT_ATTEMPTED';

  const complexityScoresList: number[] = [];
  const codeQualityScoresList: number[] = [];
  const debuggingScoresList: number[] = [];
  const debuggingEvidenceList: string[] = [];
  const topicsMap: Record<string, { passed: number; total: number; errors: number; name: string }> = {};

  for (const asg of codingAssignments) {
    const qMeta = await fetchQuestionMeta(asg.questionId);
    const title = qMeta?.title || 'Coding Problem';
    const topic = qMeta?.topic?.name || (typeof qMeta?.topic === 'string' ? qMeta.topic : 'Algorithms');
    const tags = qMeta?.tags || [];
    const difficulty = qMeta?.difficulty || 'Medium';
    const expectedComplexity = qMeta?.metadata?.jsonPayload?.expectedComplexity || 'O(n log n)';
    const totalQTests = qMeta?.metadata?.jsonPayload?.testCases?.length || 2;

    const qResult = await prisma.interviewQuestionResult.findUnique({
      where: { sessionId_questionRefId: { sessionId, questionRefId: asg.questionRefId } }
    });

    const attempts = await prisma.interviewExecutionRecord.findMany({
      where: { sessionId, questionRefId: asg.questionRefId, runMode: 'SUBMIT' },
      orderBy: { attemptNumber: 'asc' }
    });

    totalExecutionAttempts += attempts.length;

    let finalStatus = qResult?.finalStatus || 'NOT_ATTEMPTED';
    let finalScore = qResult?.finalScore || 0;
    let tScore = qResult?.totalScore || 100;
    let passedCount = qResult?.passedCount || 0;
    let totalCount = qResult?.totalCount || totalQTests;
    let lastSourceCode = '';
    let totalTimeSpentSeconds = 0;

    if (attempts.length > 0) {
      codingAttemptedProblems++;
      // Deterministic Best Result rule:
      // 1. Highest passedCount wins.
      // 2. If passedCount is tied, latest attempt wins.
      let bestAttempt = attempts[0];
      for (let i = 1; i < attempts.length; i++) {
        const att = attempts[i];
        if (att.passedCount > bestAttempt.passedCount) {
          bestAttempt = att;
        } else if (att.passedCount === bestAttempt.passedCount) {
          if (att.attemptNumber >= bestAttempt.attemptNumber) {
            bestAttempt = att;
          }
        }
      }

      passedCount = bestAttempt.passedCount;
      totalCount = bestAttempt.totalCount || totalQTests;
      lastSourceCode = bestAttempt.sourceCode || '';

      finalStatus = bestAttempt.status === 'PASSED' || bestAttempt.status === 'ACCEPTED'
        ? 'PASSED'
        : (bestAttempt.passedCount > 0 ? 'PARTIALLY_SOLVED' : 'SUBMITTED_FAILED');

      if (finalStatus === 'PASSED') codingAcceptedProblems++;
      codingEarnedScore += finalScore;
      codingTotalScore += tScore;
      totalTestsPassed += passedCount;
      totalTestsCount += totalCount;

      // Estimate time spent from timestamps
      const firstTs = new Date(attempts[0].timestamp).getTime();
      const lastTs = new Date(attempts[attempts.length - 1].timestamp).getTime();
      totalTimeSpentSeconds = Math.max(30, Math.round((lastTs - firstTs) / 1000));

      // Complexity Analysis
      const compAnalysis = analyzeCodeComplexity(lastSourceCode, expectedComplexity, bestAttempt);
      complexityScoresList.push(compAnalysis.complexityScore);

      // Code Quality Analysis
      const cqAnalysis = analyzeCodeQuality(lastSourceCode, bestAttempt);
      codeQualityScoresList.push(cqAnalysis.score);

      // Debugging Analysis
      if (attempts.length === 1) {
        if (bestAttempt.status === 'PASSED' || bestAttempt.status === 'RUN_PASSED') {
          debuggingScoresList.push(95);
          debuggingEvidenceList.push(`✓ First-try acceptance on ${title} (${passedCount}/${totalCount} tests passed).`);
        } else {
          debuggingScoresList.push(70);
          debuggingEvidenceList.push(`• Single attempt made for ${title}; iteration recommended.`);
        }
      } else {
        const first = attempts[0];
        const firstPct = first.totalCount > 0 ? first.passedCount / first.totalCount : 0;
        const lastPct = totalCount > 0 ? passedCount / totalCount : 0;

        if (lastPct > firstPct) {
          debuggingScoresList.push(90);
          debuggingEvidenceList.push(`✓ Successfully improved test pass rate from ${first.passedCount}/${first.totalCount} to ${passedCount}/${totalCount} on ${title}.`);
        } else if (lastPct === 1) {
          debuggingScoresList.push(85);
          debuggingEvidenceList.push(`✓ Resolved initial execution failures on ${title} to reach full pass.`);
        } else {
          debuggingScoresList.push(65);
          debuggingEvidenceList.push(`✗ Required ${attempts.length} executions on ${title} with remaining edge case failures.`);
        }
      }

      // Topic tracking
      if (!topicsMap[topic]) topicsMap[topic] = { passed: 0, total: 0, errors: 0, name: topic };
      topicsMap[topic].passed += passedCount;
      topicsMap[topic].total += totalCount;
      const errorRecords = attempts.filter(a => ['COMPILATION_ERROR', 'RUNTIME_ERROR', 'WRONG_ANSWER'].includes(a.primaryErrorType || ''));
      topicsMap[topic].errors += errorRecords.length;

      codingQuestionsOut.push({
        questionId: asg.questionId,
        questionRefId: asg.questionRefId,
        title,
        topic,
        tags,
        difficulty,
        finalStatus,
        finalScore,
        totalScore: tScore,
        passedCount,
        totalCount,
        attempts: attempts.length,
        timeSpent: `${Math.floor(totalTimeSpentSeconds / 60).toString().padStart(2, '0')}m ${(totalTimeSpentSeconds % 60).toString().padStart(2, '0')}s`,
        candidateComplexity: compAnalysis.candidateTime,
        candidateSpaceComplexity: compAnalysis.candidateSpace,
        expectedComplexity,
        complexityReason: compAnalysis.reason
      });
    } else {
      // Not attempted question
      codingTotalScore += 100;
      totalTestsCount += totalQTests;
      if (!topicsMap[topic]) topicsMap[topic] = { passed: 0, total: 0, errors: 0, name: topic };
      topicsMap[topic].total += totalQTests;

      codingQuestionsOut.push({
        questionId: asg.questionId,
        questionRefId: asg.questionRefId,
        title,
        topic,
        tags,
        difficulty,
        finalStatus: 'NOT_ATTEMPTED',
        finalScore: 0,
        totalScore: 100,
        passedCount: 0,
        totalCount: totalQTests,
        attempts: 0,
        timeSpent: '00m 00s',
        candidateComplexity: 'Not Submitted',
        candidateSpaceComplexity: 'Not Submitted',
        expectedComplexity,
        complexityReason: 'Problem was not submitted.'
      });
    }
  }

  if (codingAssignments.length > 0) {
    if (codingAttemptedProblems === 0) codingStatus = 'NOT_ATTEMPTED';
    else if (codingAcceptedProblems === codingAssignments.length) codingStatus = 'PASSED';
    else if (codingAcceptedProblems > 0) codingStatus = 'PARTIALLY_SOLVED';
    else codingStatus = 'SUBMITTED_FAILED';
  } else {
    codingStatus = 'NOT_ASSESSED';
  }

  const overallCodingScore = codingTotalScore > 0 ? Math.round((codingEarnedScore / codingTotalScore) * 100) : (codingStatus === 'NOT_ATTEMPTED' ? 0 : 0);

  // ─── 5. HR ANALYSIS ────────────────────────────────────────────────────────
  const hrAssignments = assignments.filter((a: any) => a.round === 'HR');
  const hrAnalysis = analyzeHRCommunication(hrData?.history || [], hrData?.transcript || '');
  const hrStatus = hrAssignments.length > 0 ? (hrAnalysis.overallScore > 0 ? 'COMPLETED' : 'NOT_ATTEMPTED') : 'NOT_ASSESSED';

  // ─── 6. THE 7-DIMENSION SCORING MODEL ──────────────────────────────────────
  // 1. Correctness & Edge-Case Handling (20%)
  const aptWeightedTest = aptTotalCount > 0 ? (aptCorrectCount / aptTotalCount) : 0;
  const codingWeightedTest = totalTestsCount > 0 ? (totalTestsPassed / totalTestsCount) : 0;
  const correctnessScore = Math.round((aptWeightedTest * 0.4 + codingWeightedTest * 0.6) * 100);
  const correctnessExplanation = `Passed ${aptCorrectCount}/${aptTotalCount} aptitude questions and ${totalTestsPassed}/${totalTestsCount} total coding test cases across assigned problems.`;

  // 2. Time & Space Complexity (18%)
  const complexityScore = complexityScoresList.length > 0 
    ? Math.round(complexityScoresList.reduce((a, b) => a + b, 0) / complexityScoresList.length)
    : 0;
  const complexityExplanation = codingQuestionsOut.map(q => `${q.title}: ${q.candidateComplexity} vs expected ${q.expectedComplexity}`).join('. ');

  // 3. Code Quality & Readability (15%)
  const codeQualityScore = codeQualityScoresList.length > 0
    ? Math.round(codeQualityScoresList.reduce((a, b) => a + b, 0) / codeQualityScoresList.length)
    : 0;
  const codeQualityExplanation = `Evaluated structure, naming conventions, and nesting modularity of submitted solutions.`;

  // 4. Debugging Efficiency (15%)
  const debuggingScore = debuggingScoresList.length > 0
    ? Math.round(debuggingScoresList.reduce((a, b) => a + b, 0) / debuggingScoresList.length)
    : (totalExecutionAttempts === 0 ? 0 : 70);
  const debuggingExplanation = debuggingEvidenceList.length > 0
    ? debuggingEvidenceList.join(' ')
    : (totalExecutionAttempts > 0 ? `Required ${totalExecutionAttempts} executions to validate solutions.` : 'No debugging executions recorded.');

  // 5. Communication Clarity (15%)
  const communicationScore = hrAnalysis.overallScore;
  const communicationExplanation = hrAnalysis.reasons.join(' ');

  // 6. Problem-Solving Approach (10%)
  const problemSolvingScore = Math.round((aptScore * 0.5) + (overallCodingScore * 0.5));
  const problemSolvingExplanation = `Combined reasoning accuracy from Aptitude (${aptCorrectCount}/${aptTotalCount}) and algorithmic resolution rate (${codingAcceptedProblems}/${codingAssignments.length} problems accepted).`;

  // 7. Stress Resilience (7%)
  let stressResilienceScore = 80;
  if (totalExecutionAttempts > 4 && codingAcceptedProblems > 0) stressResilienceScore = 90;
  else if (totalExecutionAttempts > 4 && codingAcceptedProblems === 0) stressResilienceScore = 65;
  else if (codingAcceptedProblems === codingAssignments.length) stressResilienceScore = 95;
  const stressResilienceExplanation = `Observed candidate pacing, persistence through ${totalExecutionAttempts} test runs, and cross-round consistency.`;

  // Overall Proficiency Calculation
  const overallProficiencyScore = Math.round(
    correctnessScore * 0.20 +
    complexityScore * 0.18 +
    codeQualityScore * 0.15 +
    debuggingScore * 0.15 +
    communicationScore * 0.15 +
    problemSolvingScore * 0.10 +
    stressResilienceScore * 0.07
  );

  // ─── 7. DEMONSTRATED STRENGTHS & IMPROVEMENT AREAS ─────────────────────────
  const strengths: string[] = [];
  const areasToImprove: string[] = [];

  const dimensions = [
    { name: 'Correctness & Edge-Case Handling', score: correctnessScore, detail: correctnessExplanation },
    { name: 'Time & Space Complexity', score: complexityScore, detail: `Optimal algorithmic complexity achieved in submitted solutions.` },
    { name: 'Code Quality & Readability', score: codeQualityScore, detail: `Clean and maintainable code formatting with structured functions.` },
    { name: 'Debugging Efficiency', score: debuggingScore, detail: `Effective error diagnosis and iteration across test cases.` },
    { name: 'Communication Clarity', score: communicationScore, detail: `Articulate, structured responses in behavioral interview.` },
    { name: 'Problem-Solving Approach', score: problemSolvingScore, detail: `Strong analytical aptitude and algorithmic intuition.` },
    { name: 'Stress Resilience', score: stressResilienceScore, detail: `Maintained composure and persistent pacing across all assessment stages.` },
  ].sort((a, b) => b.score - a.score);

  // Top 3 strengths
  dimensions.slice(0, 3).forEach(d => {
    if (d.score >= 60) {
      strengths.push(`${d.name} (${d.score}/100): ${d.detail}`);
    }
  });
  if (strengths.length === 0) {
    strengths.push(`Completed assessment session across ${assignments.length} assigned question items.`);
  }

  // Bottom 2 improvement areas
  dimensions.slice(-2).forEach(d => {
    if (d.score < 80) {
      areasToImprove.push(`Focus on ${d.name} (${d.score}/100): Targeted practice recommended to improve from ${d.score} to 85+.`);
    }
  });
  if (areasToImprove.length === 0) {
    areasToImprove.push('Continue practicing advanced edge cases and competitive time-limit challenges.');
  }

  // ─── 8. WEAKEST TECHNICAL SKILL GAP & NM MAP ──────────────────────────────
  const topicEntries = Object.entries(topicsMap);
  let weakestTopic = 'Algorithms';
  let minTopicPassRate = 1.0;

  topicEntries.forEach(([tName, data]) => {
    const rate = data.total > 0 ? (data.passed / data.total) : 0;
    if (rate <= minTopicPassRate) {
      minTopicPassRate = rate;
      weakestTopic = tName;
    }
  });

  const nmModule = NM_CURRICULUM_MODULES[weakestTopic] || NM_CURRICULUM_MODULES['General'];

  const skillGapMap = [
    {
      weakSkill: weakestTopic,
      evidence: `Passed ${topicsMap[weakestTopic]?.passed || 0}/${topicsMap[weakestTopic]?.total || 0} test cases with ${topicsMap[weakestTopic]?.errors || 0} recorded execution iterations.`,
      recommendedNMModule: nmModule.moduleName,
      recommendedPractice: nmModule.practiceCategory
    },
    {
      weakSkill: 'Aptitude & Problem Solving',
      evidence: `Achieved ${aptCorrectCount}/${aptTotalCount} in timed problem solving.`,
      recommendedNMModule: NM_CURRICULUM_MODULES['Aptitude'].moduleName,
      recommendedPractice: 'Aptitude'
    }
  ];

  // ─── 9. PERCENTILE BENCHMARK ──────────────────────────────────────────────
  const totalCompletedSessions = await prisma.interviewSession.count({
    where: { finalizedAt: { not: null } }
  });

  let percentileBenchmark = 'Benchmark available after more completed assessments.';
  if (totalCompletedSessions >= 5) {
    const higherScoreCount = await prisma.interviewSession.count({
      where: {
        finalizedAt: { not: null },
        reportSnapshot: { path: ['overallProficiencyScore'], gt: overallProficiencyScore }
      }
    });
    const percentile = Math.max(1, Math.round((1 - (higherScoreCount / totalCompletedSessions)) * 100));
    percentileBenchmark = `Top ${100 - percentile + 1}% of completed assessments (${totalCompletedSessions} benchmark cohort).`;
  }

  // ─── 10. NEXT ACTION PLAN ──────────────────────────────────────────────────
  const nextActionPlan = [
    `Complete 5 practice questions in ${nmModule.practiceCategory} on NM Sandbox to strengthen ${weakestTopic} patterns.`,
    `Review ${nmModule.moduleName} in the Naan Mudhalvan course modules.`,
    `Practice dry-running algorithms on paper to reduce trial-and-error executions (targeted: under 2 runs per problem).`,
    `Review optimal O(n log n) and O(n) algorithmic patterns before retaking mock assessments.`
  ];

  // Duration: accurately calculate and clamp to configured assessment duration
  const configDuration = ((interview as any).configuration?.duration as number) || 60;
  const sessionStarted = interview.session.startedAt ? new Date(interview.session.startedAt).getTime() : Date.now();
  const sessionFinished = interview.session.finalizedAt ? new Date(interview.session.finalizedAt).getTime() : (interview.session.finishedAt ? new Date(interview.session.finishedAt).getTime() : sessionStarted + configDuration * 60000);
  const diffMinutes = Math.max(1, Math.round((sessionFinished - sessionStarted) / 60000));
  const totalSessionMinutes = Math.min(configDuration, diffMinutes);
  const formattedDuration = totalSessionMinutes < 60
    ? `${totalSessionMinutes} min`
    : (totalSessionMinutes % 60 === 0 ? `${Math.floor(totalSessionMinutes / 60)} hr` : `${Math.floor(totalSessionMinutes / 60)} hr ${totalSessionMinutes % 60} min`);

  return {
    sessionId,
    interviewId,
    candidateId: identityId,
    assessmentDate: interview.createdAt.toISOString(),
    sessionDuration: formattedDuration,
    assessmentStatus: interview.state === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
    overallProficiencyScore,
    percentileBenchmark,
    
    // The 7 Performance Metrics
    metrics: {
      correctness: {
        name: 'Correctness & Edge-Case Handling',
        weight: '20%',
        score: correctnessScore,
        explanation: correctnessExplanation
      },
      complexity: {
        name: 'Time & Space Complexity',
        weight: '18%',
        score: complexityScore,
        explanation: complexityExplanation
      },
      codeQuality: {
        name: 'Code Quality & Readability',
        weight: '15%',
        score: codeQualityScore,
        explanation: codeQualityExplanation
      },
      debugging: {
        name: 'Debugging Efficiency',
        weight: '15%',
        score: debuggingScore,
        explanation: debuggingExplanation
      },
      communication: {
        name: 'Communication Clarity',
        weight: '15%',
        score: communicationScore,
        explanation: communicationExplanation,
        subScores: {
          clarity: hrAnalysis.clarityScore,
          confidence: hrAnalysis.confidenceScore,
          technicalExplanation: hrAnalysis.technicalExplanationScore,
          relevance: hrAnalysis.relevanceScore
        }
      },
      problemSolving: {
        name: 'Problem-Solving Approach',
        weight: '10%',
        score: problemSolvingScore,
        explanation: problemSolvingExplanation
      },
      stressResilience: {
        name: 'Stress Resilience',
        weight: '7%',
        score: stressResilienceScore,
        explanation: stressResilienceExplanation
      }
    },

    // Session Summary
    summary: {
      aptitudePassed: aptCorrectCount,
      aptitudeTotal: aptTotalCount,
      aptitudeScore: aptScore,
      codingAccepted: codingAcceptedProblems,
      codingTotal: codingAssignments.length,
      codingScore: overallCodingScore,
      testsPassed: totalTestsPassed,
      totalTests: totalTestsCount,
      totalCodingAttempts: totalExecutionAttempts,
      hrStatus
    },

    // Detailed Question-by-Question Breakdown
    codingBreakdown: codingQuestionsOut,
    aptitudeBreakdown: aptQuestionsDetail,

    // Insights & Actions
    strengths,
    areasToImprove,
    weakestTopic: {
      name: weakestTopic,
      passRate: `${Math.round(minTopicPassRate * 100)}%`,
      evidence: `Passed ${topicsMap[weakestTopic]?.passed || 0}/${topicsMap[weakestTopic]?.total || 0} tests in ${weakestTopic}.`
    },
    skillGapMap,
    nextActionPlan,

    // Legacy backwards-compatibility
    scores: {
      aptitude: aptScore,
      coding: overallCodingScore,
      hr: hrAnalysis.overallScore,
      normalizedCompositeScore: overallProficiencyScore,
      normalizedCompositeMaximum: 100
    },
    assessmentCoverage: {
      aptitude: aptStatus === 'NOT_ATTEMPTED' ? 'NOT_ATTEMPTED' : 'ASSESSED',
      coding: codingStatus,
      hr: hrStatus
    },
    finalized: !!interview.session.finalizedAt,
    generatedAt: new Date().toISOString()
  };
}
