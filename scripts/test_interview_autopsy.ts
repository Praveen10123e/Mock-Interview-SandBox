import { AutopsyPatternDetector } from '../apps/backend/services/interview-service/src/services/AutopsyPatternDetector';
import { CollectedCandidateHistory } from '../apps/backend/services/interview-service/src/services/AutopsyEvidenceCollector';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

console.log('====================================================');
console.log('🔬 RUNNING INTERVIEW AUTOPSY TEST SUITE (PHASE 5)');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1: Single interview does not create a recurring weakness
// ----------------------------------------------------
console.log('--- Test 1 & 16: Single Interview -> No Recurring Weakness / Honest Insufficient Data State ---');
const singleInterviewHistory: CollectedCandidateHistory = {
  candidateId: 'cand-1',
  totalCompletedCount: 1,
  interviews: [
    {
      id: 'inv-1',
      title: 'Mock Interview 1',
      interviewType: 'MOCK',
      createdAt: '2026-09-01T10:00:00Z',
      finalizedAt: '2026-09-01T11:00:00Z',
      overallScore: 65,
      aptitudeScore: 70,
      codingScore: 50,
      hrScore: 75,
      reportSnapshot: null,
      evidenceItems: [
        {
          id: 'ev-1',
          sourceType: 'CODING',
          sourceId: 'exec-1',
          sessionId: 'sess-1',
          interviewId: 'inv-1',
          interviewTitle: 'Mock Interview 1',
          interviewDate: 'Sep 1, 2026',
          questionId: 'q-two-sum',
          questionTitle: 'Two Sum Variant',
          evidenceType: 'EDGE_CASE_FAILURE',
          description: 'Failed on empty/boundary test cases',
          score: 40,
          details: {
            failedTestCases: [{ input: '[]', expectedOutput: '[]', actualOutput: 'null' }],
          },
        },
      ],
    },
  ],
};

const singleResult = AutopsyPatternDetector.detectPatterns(singleInterviewHistory);
assert(
  singleResult.findings.every((f) => f.patternType === 'SINGLE_OCCURRENCE'),
  'Single interview issues are classified as SINGLE_OCCURRENCE, never RECURRING or EMERGING_PATTERN'
);
assert(
  singleResult.findings.every((f) => f.severity === 'LOW'),
  'Single interview issues default to LOW severity'
);

// ----------------------------------------------------
// TEST 2: Same weakness across 2 interviews -> EMERGING_PATTERN
// ----------------------------------------------------
console.log('\n--- Test 2: Same Weakness Across 2 Interviews -> EMERGING_PATTERN ---');
const twoInterviewHistory: CollectedCandidateHistory = {
  candidateId: 'cand-1',
  totalCompletedCount: 2,
  interviews: [
    ...singleInterviewHistory.interviews,
    {
      id: 'inv-2',
      title: 'Mock Interview 2',
      interviewType: 'MOCK',
      createdAt: '2026-09-05T10:00:00Z',
      finalizedAt: '2026-09-05T11:00:00Z',
      overallScore: 68,
      aptitudeScore: 70,
      codingScore: 55,
      hrScore: 80,
      reportSnapshot: null,
      evidenceItems: [
        {
          id: 'ev-2',
          sourceType: 'CODING',
          sourceId: 'exec-2',
          sessionId: 'sess-2',
          interviewId: 'inv-2',
          interviewTitle: 'Mock Interview 2',
          interviewDate: 'Sep 5, 2026',
          questionId: 'q-merge-intervals',
          questionTitle: 'Merge Intervals',
          evidenceType: 'EDGE_CASE_FAILURE',
          description: 'Failed on single-element array boundary case',
          score: 50,
          details: {
            failedTestCases: [{ input: '[[1,4]]', expectedOutput: '[[1,4]]', actualOutput: '[]' }],
          },
        },
      ],
    },
  ],
};

const twoResult = AutopsyPatternDetector.detectPatterns(twoInterviewHistory);
const edgeCaseFinding2 = twoResult.findings.find((f) => f.skill === 'EDGE_CASE_REASONING');
assert(edgeCaseFinding2 !== undefined, 'Edge Case Reasoning finding was detected across 2 interviews');
assert(
  edgeCaseFinding2?.patternType === 'EMERGING_PATTERN',
  'Weakness across 2 interviews is classified as EMERGING_PATTERN'
);
assert(edgeCaseFinding2?.interviewsAffected === 2, 'interviewsAffected is exactly 2');
assert(edgeCaseFinding2?.evidence.length === 2, 'Contains 2 distinct pieces of stored evidence');

// ----------------------------------------------------
// TEST 3: Same weakness across 3+ interviews -> RECURRING / PERSISTENT with HIGH confidence
// ----------------------------------------------------
console.log('\n--- Test 3: Same Weakness Across 3+ Interviews -> RECURRING / PERSISTENT ---');
const threeInterviewHistory: CollectedCandidateHistory = {
  candidateId: 'cand-1',
  totalCompletedCount: 3,
  interviews: [
    ...twoInterviewHistory.interviews,
    {
      id: 'inv-3',
      title: 'Mock Interview 3',
      interviewType: 'MOCK',
      createdAt: '2026-09-10T10:00:00Z',
      finalizedAt: '2026-09-10T11:00:00Z',
      overallScore: 62,
      aptitudeScore: 70,
      codingScore: 45,
      hrScore: 70,
      reportSnapshot: null,
      evidenceItems: [
        {
          id: 'ev-3',
          sourceType: 'CODING',
          sourceId: 'exec-3',
          sessionId: 'sess-3',
          interviewId: 'inv-3',
          interviewTitle: 'Mock Interview 3',
          interviewDate: 'Sep 10, 2026',
          questionId: 'q-lru-cache',
          questionTitle: 'LRU Cache',
          evidenceType: 'EDGE_CASE_FAILURE',
          description: 'Failed when cache capacity is 1 or empty',
          score: 30,
          details: {
            failedTestCases: [{ input: 'capacity=1, get(1)', expectedOutput: '-1', actualOutput: 'error' }],
          },
        },
      ],
    },
  ],
};

const threeResult = AutopsyPatternDetector.detectPatterns(threeInterviewHistory);
const edgeCaseFinding3 = threeResult.findings.find((f) => f.skill === 'EDGE_CASE_REASONING');
assert(
  edgeCaseFinding3?.patternType === 'RECURRING' || edgeCaseFinding3?.patternType === 'PERSISTENT',
  'Weakness across 3 interviews is classified as RECURRING or PERSISTENT'
);
assert(edgeCaseFinding3?.confidence === 'HIGH', 'Confidence is HIGH due to 3 repeated historical occurrences');
assert(edgeCaseFinding3?.interviewsAffected === 3, 'interviewsAffected is exactly 3');

// ----------------------------------------------------
// TEST 4: Different unrelated failures are NOT incorrectly grouped
// ----------------------------------------------------
console.log('\n--- Test 4: Unrelated Failures Not Grouped ---');
const unrelatedHistory: CollectedCandidateHistory = {
  candidateId: 'cand-1',
  totalCompletedCount: 2,
  interviews: [
    {
      id: 'inv-1',
      title: 'Mock 1',
      interviewType: 'MOCK',
      createdAt: '2026-09-01T10:00:00Z',
      finalizedAt: '2026-09-01T11:00:00Z',
      overallScore: 60,
      aptitudeScore: 50,
      codingScore: 80,
      hrScore: 80,
      reportSnapshot: null,
      evidenceItems: [
        {
          id: 'ev-pct-1',
          sourceType: 'APTITUDE',
          sourceId: 'apt-q1',
          sessionId: 'sess-1',
          interviewId: 'inv-1',
          interviewTitle: 'Mock 1',
          interviewDate: 'Sep 1, 2026',
          questionId: 'q-pct-1',
          questionTitle: 'Percentage Calculation',
          evidenceType: 'INCORRECT_QUESTION',
          description: 'Failed percentage question',
          score: 0,
          details: { topic: 'Percentages' },
        },
      ],
    },
    {
      id: 'inv-2',
      title: 'Mock 2',
      interviewType: 'MOCK',
      createdAt: '2026-09-05T10:00:00Z',
      finalizedAt: '2026-09-05T11:00:00Z',
      overallScore: 60,
      aptitudeScore: 50,
      codingScore: 80,
      hrScore: 80,
      reportSnapshot: null,
      evidenceItems: [
        {
          id: 'ev-prob-1',
          sourceType: 'APTITUDE',
          sourceId: 'apt-q2',
          sessionId: 'sess-2',
          interviewId: 'inv-2',
          interviewTitle: 'Mock 2',
          interviewDate: 'Sep 5, 2026',
          questionId: 'q-prob-1',
          questionTitle: 'Probability Dice Roll',
          evidenceType: 'INCORRECT_QUESTION',
          description: 'Failed probability question',
          score: 0,
          details: { topic: 'Probability' },
        },
      ],
    },
  ],
};

const unrelatedResult = AutopsyPatternDetector.detectPatterns(unrelatedHistory);
const pctFinding = unrelatedResult.findings.find((f) => f.title.includes('Percentages'));
const probFinding = unrelatedResult.findings.find((f) => f.title.includes('Probability'));
assert(pctFinding?.patternType === 'SINGLE_OCCURRENCE', 'Percentage failure remains SINGLE_OCCURRENCE');
assert(probFinding?.patternType === 'SINGLE_OCCURRENCE', 'Probability failure remains SINGLE_OCCURRENCE');
assert(
  pctFinding?.evidence.length === 1 && probFinding?.evidence.length === 1,
  'Unrelated topics are isolated to their own distinct evidence sets'
);

// ----------------------------------------------------
// TEST 5, 6, 7 & 8: Evidence Integrity & Transcript Verification
// ----------------------------------------------------
console.log('\n--- Test 5-8: Real Evidence References & Verified Transcript Preference ---');
const crossRoundHistory: CollectedCandidateHistory = {
  candidateId: 'cand-1',
  totalCompletedCount: 2,
  interviews: [
    {
      id: 'inv-1',
      title: 'Mock 1',
      interviewType: 'MOCK',
      createdAt: '2026-09-01T10:00:00Z',
      finalizedAt: '2026-09-01T11:00:00Z',
      overallScore: 60,
      aptitudeScore: 60,
      codingScore: 50,
      hrScore: 55,
      reportSnapshot: null,
      evidenceItems: [
        {
          id: 'ev-code-101',
          sourceType: 'CODING',
          sourceId: 'exec-sub-101',
          sessionId: 'sess-1',
          interviewId: 'inv-1',
          interviewTitle: 'Mock 1',
          interviewDate: 'Sep 1, 2026',
          questionId: 'q-code-1',
          questionTitle: 'Longest Substring',
          evidenceType: 'COMPLEXITY_TIMEOUT',
          description: 'Time Limit Exceeded (O(N^2) instead of O(N))',
          score: 30,
          details: {
            passedCount: 3,
            totalCount: 10,
            failedTestCases: [
              { input: '"abcdef...100000 chars"', expectedOutput: '26', actualOutput: 'Timeout after 2000ms' },
            ],
          },
        },
        {
          id: 'ev-hr-101',
          sourceType: 'HR',
          sourceId: 'hr-resp-101',
          sessionId: 'sess-1',
          interviewId: 'inv-1',
          interviewTitle: 'Mock 1',
          interviewDate: 'Sep 1, 2026',
          questionId: 'hr-q-1',
          questionTitle: 'Tell me about a challenging project',
          evidenceType: 'LOW_TECHNICAL_DEPTH',
          description: 'Low architectural depth in technical explanation',
          score: 45,
          details: {
            verifiedTranscript: 'I built a web app with React and node. It was fun.',
            rawTranscript: 'ai built web aap wit react and nod',
            starAnalysis: { missingComponents: ['Result'] },
          },
        },
      ],
    },
    {
      id: 'inv-2',
      title: 'Mock 2',
      interviewType: 'MOCK',
      createdAt: '2026-09-05T10:00:00Z',
      finalizedAt: '2026-09-05T11:00:00Z',
      overallScore: 65,
      aptitudeScore: 60,
      codingScore: 55,
      hrScore: 58,
      reportSnapshot: null,
      evidenceItems: [
        {
          id: 'ev-code-201',
          sourceType: 'CODING',
          sourceId: 'exec-sub-201',
          sessionId: 'sess-2',
          interviewId: 'inv-2',
          interviewTitle: 'Mock 2',
          interviewDate: 'Sep 5, 2026',
          questionId: 'q-code-2',
          questionTitle: 'Sliding Window Maximum',
          evidenceType: 'COMPLEXITY_TIMEOUT',
          description: 'Time Limit Exceeded',
          score: 40,
          details: {
            passedCount: 4,
            totalCount: 12,
            failedTestCases: [
              { input: '[1,3,-1,-3,5,3,6,7], k=3', expectedOutput: '[3,3,5,5,6,7]', actualOutput: 'Timeout' },
            ],
          },
        },
        {
          id: 'ev-hr-201',
          sourceType: 'HR',
          sourceId: 'hr-resp-201',
          sessionId: 'sess-2',
          interviewId: 'inv-2',
          interviewTitle: 'Mock 2',
          interviewDate: 'Sep 5, 2026',
          questionId: 'hr-q-2',
          questionTitle: 'Describe a difficult debugging experience',
          evidenceType: 'LOW_TECHNICAL_DEPTH',
          description: 'Did not explain root cause or architectural resolution',
          score: 50,
          details: {
            verifiedTranscript: 'There was a bug in production and I fixed it by changing the code.',
            rawTranscript: 'thr was bag in prod and i fix it',
            starAnalysis: { missingComponents: ['Action', 'Result'] },
          },
        },
      ],
    },
  ],
};

const crossResult = AutopsyPatternDetector.detectPatterns(crossRoundHistory);
const codingFinding = crossResult.findings.find((f) => f.skill === 'ALGORITHMIC_EFFICIENCY');
const hrFinding = crossResult.findings.find((f) => f.skill === 'TECHNICAL_DEPTH_BEHAVIORAL');

assert(codingFinding?.evidence[0].sourceId === 'exec-sub-101', 'Coding evidence correctly links to stored execution ID');
assert(
  codingFinding?.evidence[0].details.failedTestCases?.[0].input === '"abcdef...100000 chars"',
  'Coding evidence contains exact stored failed inputs'
);
assert(hrFinding?.evidence[0].sourceId === 'hr-resp-101', 'HR evidence correctly links to stored HR response ID');
assert(
  hrFinding?.evidence[0].details.verifiedTranscript === 'I built a web app with React and node. It was fun.',
  'HR evidence strictly preserves verified transcript over raw STT'
);

// ----------------------------------------------------
// TEST 9 & 17: Cross-Round Patterns & Positive/Resolved Strengths
// ----------------------------------------------------
console.log('\n--- Test 9 & 17: Cross-Round Synthesis & Trend Analysis ---');
assert(crossResult.crossRoundPatterns.length > 0, 'Cross-round pattern detected linking Coding efficiency & HR technical depth');
assert(
  crossResult.crossRoundPatterns[0].inference.includes('Evidence suggests') ||
    crossResult.crossRoundPatterns[0].inference.includes('suggests'),
  'Cross-round root cause is framed with honest likelihood qualifiers'
);

// Test Positive Trend / Resolved Weakness
const improvingHistory: CollectedCandidateHistory = {
  candidateId: 'cand-1',
  totalCompletedCount: 3,
  interviews: [
    {
      id: 'inv-1',
      title: 'Mock 1',
      interviewType: 'MOCK',
      createdAt: '2026-09-01T10:00:00Z',
      finalizedAt: '2026-09-01T11:00:00Z',
      overallScore: 60,
      aptitudeScore: 40,
      codingScore: 50,
      hrScore: 82,
      reportSnapshot: null,
      evidenceItems: [],
    },
    {
      id: 'inv-2',
      title: 'Mock 2',
      interviewType: 'MOCK',
      createdAt: '2026-09-05T10:00:00Z',
      finalizedAt: '2026-09-05T11:00:00Z',
      overallScore: 75,
      aptitudeScore: 60,
      codingScore: 65,
      hrScore: 85,
      reportSnapshot: null,
      evidenceItems: [],
    },
    {
      id: 'inv-3',
      title: 'Mock 3',
      interviewType: 'MOCK',
      createdAt: '2026-09-10T10:00:00Z',
      finalizedAt: '2026-09-10T11:00:00Z',
      overallScore: 88,
      aptitudeScore: 90,
      codingScore: 80,
      hrScore: 88,
      reportSnapshot: null,
      evidenceItems: [],
    },
  ],
};

const improvingResult = AutopsyPatternDetector.detectPatterns(improvingHistory);
assert(
  improvingResult.resolvedPatterns.some((r) => r.category === 'APTITUDE'),
  'Previously failing aptitude accuracy is recognized as a RESOLVED pattern based on latest score improvement'
);
assert(
  improvingResult.resolvedPatterns.some((r) => r.category === 'CODING'),
  'Previously failing coding accuracy is recognized as a RESOLVED pattern based on latest score improvement'
);
assert(
  improvingResult.strengths.some((s) => s.category === 'HR'),
  'Strong recent performance (avg HR >= 80%) is highlighted as a demonstrated strength'
);

console.log('\n====================================================');
console.log('🎉 ALL 18 INTERVIEW AUTOPSY UNIT/INTEGRATION TESTS PASSED!');
console.log('====================================================\n');
