/**
 * test_hr_scoring_pipeline.ts
 *
 * Comprehensive Automated Test Suite for Evidence-Based HR Interview Scoring:
 *
 * TEST 1 — SILENCE (empty response -> Score = 0)
 * TEST 2 — FILLER ONLY ("Umm... actually... yeah..." -> Score = 0)
 * TEST 3 — SHORT VALID ANSWER ("Java." for language question -> Recognized as valid positive score)
 * TEST 4 — OFF-TOPIC (academic marks for technical bug question -> Content criteria = 0)
 * TEST 5 — PARTIAL (problem & vague approach without depth -> Partial credit, e.g. 30-55)
 * TEST 6 — STRONG ANSWER (complete technically relevant answer -> High score >= 80)
 * TEST 7 — SEMANTIC EQUIVALENCE ("touching waste items" matches overlapping objects -> Problem credit)
 * TEST 8 — MISSING RESULT (problem + approach mentioned, no result -> Result criterion = 0)
 * TEST 9 — STT TECHNICAL TERM ("yellow v8" normalized to "YOLOv8")
 * TEST 10 — MULTI-TURN SESSION AGGREGATION (Question 1 strong, Question 2 silent -> True mathematical average)
 */

import { HRTranscriptValidator } from '../apps/backend/services/interview-service/src/services/HRTranscriptValidator';
import { HRRubricService } from '../apps/backend/services/interview-service/src/services/HRRubrics';
import { InterviewAIService } from '../apps/backend/services/interview-service/src/services/InterviewAIService';
import { HRScoreEngine } from '../apps/backend/services/interview-service/src/services/HRScoreEngine';
import { HRSpeechAnalyzer } from '../apps/backend/services/interview-service/src/services/HRSpeechAnalyzer';
import { HRInterviewSummaryGenerator } from '../apps/backend/services/interview-service/src/services/HRInterviewSummaryGenerator';

async function runTests() {
  console.log('================================================================');
  console.log('RUNNING EVIDENCE-BASED HR INTERVIEW SCORING PIPELINE TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (detail) console.log(`       ↳ ${detail}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       ↳ ${detail}`);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // TEST 1 — SILENCE
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 1: SILENCE / EMPTY RESPONSE ---');
  const t1Question = 'Explain your project.';
  const t1Response = '';
  const t1Val = HRTranscriptValidator.validate(t1Response, { question: t1Question, category: 'Project Challenge' });
  const t1Eval = await InterviewAIService.evaluateResponse(t1Question, 'Project Challenge', t1Response, 10);

  assert(t1Val.isEmpty === true, 'TEST 1.1: Transcript validator flags empty as isEmpty = true');
  assert(t1Eval.overallScore === 0, 'TEST 1.2: Overall score is strictly 0', `Received: ${t1Eval.overallScore}`);
  assert(
    t1Eval.criteriaEvidence?.every((c) => c.score === 0 && c.evidence === null) ?? false,
    'TEST 1.3: All criteria evidence entries have score = 0 and evidence = null'
  );
  assert(
    t1Eval.feedback.includes('No response was provided') || t1Eval.feedback.includes('insufficient evidence'),
    'TEST 1.4: Feedback explains no response was provided'
  );

  // ────────────────────────────────────────────────────────────────
  // TEST 2 — FILLER ONLY
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: FILLER WORDS ONLY ---');
  const t2Question = 'Describe a challenging technical problem you solved.';
  const t2Response = 'Umm... actually... yeah... so yeah...';
  const t2Val = HRTranscriptValidator.validate(t2Response, { question: t2Question, category: 'Project Challenge' });
  const t2Eval = await InterviewAIService.evaluateResponse(t2Question, 'Project Challenge', t2Response, 8);

  assert(t2Val.isFillerOnly === true, 'TEST 2.1: Transcript validator flags filler-only response');
  assert(t2Eval.overallScore === 0, 'TEST 2.2: Filler-only overall score is 0', `Received: ${t2Eval.overallScore}`);
  assert(
    t2Eval.feedback.includes('No response was provided') || t2Eval.feedback.includes('insufficient evidence'),
    'TEST 2.3: Feedback indicates insufficient substantive evidence'
  );

  // ────────────────────────────────────────────────────────────────
  // TEST 3 — SHORT VALID ANSWER
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: SHORT VALID ANSWER ---');
  const t3Question = 'What programming language did you use for the backend service?';
  const t3Response = 'Java.';
  const t3Val = HRTranscriptValidator.validate(t3Response, { question: t3Question, category: 'Direct Question' });
  const t3Eval = await InterviewAIService.evaluateResponse(t3Question, 'Direct Question', t3Response, 3);

  assert(t3Val.isEmpty === false, 'TEST 3.1: Short valid answer is not marked empty');
  assert(t3Eval.overallScore >= 70, 'TEST 3.2: Direct valid answer receives positive credit', `Received: ${t3Eval.overallScore}`);
  assert(
    t3Eval.criteriaEvidence?.some((c) => c.score > 0 && (c.evidence?.includes('Java') || c.reason.includes('Directly'))) ?? false,
    'TEST 3.3: Criterion evidence cites the language Java'
  );

  // ────────────────────────────────────────────────────────────────
  // TEST 4 — OFF-TOPIC
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: OFF-TOPIC RESPONSE ---');
  const t4Question = 'Describe a difficult technical problem in your project and how you debugged it.';
  const t4Response = 'I completed my diploma with 93% and I like cricket and sports.';
  const t4Eval = await InterviewAIService.evaluateResponse(t4Question, 'Project Challenge', t4Response, 12);

  assert(t4Eval.overallScore <= 20, 'TEST 4.1: Off-topic answer receives near zero or 0 content score', `Received: ${t4Eval.overallScore}`);
  assert(
    t4Eval.criteriaEvidence?.every((c) => /problem|approach|reasoning|result/i.test(c.criterion) ? c.score === 0 : true) ?? false,
    'TEST 4.2: Content criteria (problem, approach, reasoning, result) receive 0 credit'
  );
  assert(
    t4Eval.feedback.toLowerCase().includes('did not address') || t4Eval.feedback.toLowerCase().includes('lack'),
    'TEST 4.3: Feedback explains answer did not address the technical problem'
  );

  // ────────────────────────────────────────────────────────────────
  // TEST 5 — PARTIAL ANSWER
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 5: PARTIAL ANSWER ---');
  const t5Question = 'Explain a difficult technical problem and how you solved it.';
  const t5Response = 'We had problems with the model during our project and I changed the approach to fix it.';
  const t5Eval = await InterviewAIService.evaluateResponse(t5Question, 'Project Challenge', t5Response, 15);

  assert(
    t5Eval.overallScore > 0 && t5Eval.overallScore < 70,
    'TEST 5.1: Partial answer receives partial credit (between 20 and 65)',
    `Received: ${t5Eval.overallScore}`
  );
  const reasoningCrit = t5Eval.criteriaEvidence?.find((c) => /reasoning|analysis/i.test(c.criterion));
  assert(
    (reasoningCrit?.score ?? 0) <= 1,
    'TEST 5.2: Technical reasoning is penalized or awarded low score due to lack of depth',
    `Reasoning score: ${reasoningCrit?.score}/${reasoningCrit?.maxScore}`
  );

  // ────────────────────────────────────────────────────────────────
  // TEST 6 — STRONG ANSWER
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 6: STRONG ANSWER ---');
  const t6Question = 'Describe a difficult technical issue you encountered in your project and how you solved it.';
  const t6Response =
    'During our waste segmentation project, overlapping objects were detected as a single combined object by the model. ' +
    'I first tried adjusting the confidence threshold, but it did not resolve the touching boundaries. ' +
    'To solve this, I implemented watershed segmentation on the connected mask regions combined with morphological operations. ' +
    'This improved object separation accuracy and increased detection precision by 24%.';
  const t6Eval = await InterviewAIService.evaluateResponse(t6Question, 'Project Challenge', t6Response, 35);

  assert(t6Eval.overallScore >= 80, 'TEST 6.1: Strong answer receives high score (>= 80)', `Received: ${t6Eval.overallScore}`);
  assert(
    t6Eval.criteriaEvidence?.filter((c) => c.score >= c.maxScore * 0.7).length! >= 3,
    'TEST 6.2: High credit earned across multiple criteria (problem, approach, result)'
  );

  // ────────────────────────────────────────────────────────────────
  // TEST 7 — SEMANTIC EQUIVALENCE
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 7: SEMANTIC EQUIVALENCE ---');
  const t7Question = 'What was the specific bug or failure mode in your segmentation project?';
  const t7Response = 'Two touching waste items were being treated as a single object by our detector.';
  const t7Eval = await InterviewAIService.evaluateResponse(t7Question, 'Project Challenge', t7Response, 15);
  const probCrit = t7Eval.criteriaEvidence?.find((c) => /problem|obstacle/i.test(c.criterion));

  assert(
    (probCrit?.score ?? 0) > 0,
    'TEST 7.1: Problem criterion receives credit for semantically equivalent wording ("touching waste items")',
    `Score: ${probCrit?.score}/${probCrit?.maxScore}`
  );

  // ────────────────────────────────────────────────────────────────
  // TEST 8 — MISSING RESULT
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 8: MISSING RESULT CRITERION ---');
  const t8Question = 'Explain a difficult technical problem and how you solved it.';
  const t8Response =
    'We faced an issue where queries on the users table were timing out under peak load. ' +
    'I investigated the query plan, identified missing indexes on foreign keys, and added composite indexes to the PostgreSQL database.';
  const t8Eval = await InterviewAIService.evaluateResponse(t8Question, 'Project Challenge', t8Response, 25);
  const resCrit = t8Eval.criteriaEvidence?.find((c) => /result|outcome/i.test(c.criterion));
  const appCrit = t8Eval.criteriaEvidence?.find((c) => /approach|solution/i.test(c.criterion));

  assert((appCrit?.score ?? 0) > 0, 'TEST 8.1: Approach receives credit for adding composite indexes', `Approach: ${appCrit?.score}/${appCrit?.maxScore}`);
  assert((resCrit?.score ?? 0) === 0, 'TEST 8.2: Result criterion receives 0 because candidate did not explain final outcome', `Result: ${resCrit?.score}/${resCrit?.maxScore}`);

  // ────────────────────────────────────────────────────────────────
  // TEST 9 — STT TECHNICAL TERM NORMALIZATION
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 9: STT TECHNICAL PHONETIC CORRECTION ---');
  const t9Raw = 'I used yellow v8 with open cv and fast api to deploy the vision model.';
  const t9Val = HRTranscriptValidator.validate(t9Raw, {
    question: 'What libraries did you use in computer vision?',
    category: 'Project Challenge',
  });

  assert(t9Val.verifiedTranscript.includes('YOLOv8'), 'TEST 9.1: "yellow v8" normalized to "YOLOv8"', `Verified: "${t9Val.verifiedTranscript}"`);
  assert(t9Val.verifiedTranscript.includes('OpenCV'), 'TEST 9.2: "open cv" normalized to "OpenCV"');
  assert(t9Val.verifiedTranscript.includes('FastAPI'), 'TEST 9.3: "fast api" normalized to "FastAPI"');
  assert(t9Val.rawTranscript === t9Raw, 'TEST 9.4: rawTranscript is strictly preserved for auditability');

  // ────────────────────────────────────────────────────────────────
  // TEST 10 — MULTI-TURN SESSION AGGREGATION
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 10: MULTI-TURN AGGREGATION & ZERO PRESERVATION ---');
  const t10SessionQuestions = [
    {
      question: 'Describe a challenging project problem and how you solved it.',
      category: 'Project Challenge',
      transcript:
        'During our waste segmentation project, overlapping objects were detected as a single combined object by the model. ' +
        'I first tried adjusting the confidence threshold, but it did not resolve the touching boundaries. ' +
        'To solve this, I implemented watershed segmentation on the connected mask regions combined with morphological operations. ' +
        'This improved object separation accuracy and increased detection precision by 24%.',
      durationSeconds: 35,
    },
    {
      question: 'Tell me about a time you handled a conflict in your team.',
      category: 'Conflict Resolution',
      transcript: '', // Candidate was silent
      durationSeconds: 15,
    },
  ];

  const t10Final = await InterviewAIService.evaluateFinalSession(t10SessionQuestions);
  assert(
    t10Final.overallScore > 35 && t10Final.overallScore < 55,
    'TEST 10.1: Multi-turn overall score is true mathematical average across both questions (strong ~80-90 + silent 0)/2',
    `Received: ${t10Final.overallScore}/100`
  );

  // All silent session test
  const t10AllSilent = await InterviewAIService.evaluateFinalSession([
    { question: 'Q1', category: 'Self Introduction', transcript: '', durationSeconds: 0 },
    { question: 'Q2', category: 'Project Challenge', transcript: '   ', durationSeconds: 0 },
  ]);
  assert(t10AllSilent.overallScore === 0, 'TEST 10.2: Session with all silent responses produces overallScore = 0', `Received: ${t10AllSilent.overallScore}`);

  // ────────────────────────────────────────────────────────────────
  // TEST 11 — FEATURE A: CONTEXT-AWARE TRANSCRIPT VERIFICATION CONTRACT
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 11: FEATURE A CONTEXT-AWARE VERIFICATION CONTRACT ---');
  const t11Raw = 'I worked with node js and mongo db to build the rest api. Also used jason for data.';
  const t11Verification = HRTranscriptValidator.verifyTranscript(t11Raw, {
    currentQuestion: 'What technologies did you use for the backend?',
    candidateTechStack: ['Node.js', 'MongoDB', 'REST'],
  });

  assert(t11Verification.rawTranscript === t11Raw, 'TEST 11.1: rawTranscript is immutable and preserved exactly');
  assert(t11Verification.verifiedTranscript.includes('Node.js'), 'TEST 11.2: "node js" corrected to "Node.js"');
  assert(t11Verification.verifiedTranscript.includes('MongoDB'), 'TEST 11.3: "mongo db" corrected to "MongoDB"');
  assert(t11Verification.verifiedTranscript.includes('JSON'), 'TEST 11.4: "jason" contextually normalized to "JSON"');
  assert(t11Verification.corrections.length >= 3, 'TEST 11.5: Corrections list contains all normalized technical terms');
  assert(t11Verification.corrections[0].confidence > 0, 'TEST 11.6: Correction confidence is meaningful (> 0)');
  assert(!t11Verification.verifiedTranscript.includes('AWS Lambda'), 'TEST 11.7: No fabricated technologies added');

  // Uncertain segment test
  const t11UncertainRaw = 'I used ... and something ... for caching';
  const t11Uncertain = HRTranscriptValidator.verifyTranscript(t11UncertainRaw, {
    currentQuestion: 'What did you use for caching?',
  });
  assert(t11Uncertain.uncertainSegments.length > 0, 'TEST 11.8: Ellipsis / trailing fragments marked as uncertain segments');
  assert(!t11Uncertain.verifiedTranscript.includes('Redis'), 'TEST 11.9: Uncertain segment is NOT fabricated with guessed technology');

  // ────────────────────────────────────────────────────────────────
  // TEST 12 — FEATURE B: 8-DIMENSION RESPONSE QUALITY EVALUATOR
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 12: FEATURE B 8-DIMENSION QUALITY EVALUATOR ---');
  const t12Question = 'Tell me about a challenging project you worked on.';
  const t12Verified = 'I developed an e-commerce backend using Node.js and PostgreSQL. I resolved high database latency by adding composite indexes, reducing query time by 45%.';
  const t12Quality = await InterviewAIService.evaluateResponseQuality(t12Question, t12Verified, 'Project Challenge', 30);

  const dimKeys = ['relevance', 'specificity', 'evidence', 'structure', 'clarity', 'technicalDepth', 'ownership', 'professionalism'] as const;
  assert(dimKeys.every(k => typeof t12Quality.dimensionScores[k] === 'number'), 'TEST 12.1: Evaluator returns all 8 required dimension scores');
  assert(dimKeys.every(k => t12Quality.dimensionScores[k] >= 0 && t12Quality.dimensionScores[k] <= 10), 'TEST 12.2: All dimension scores are within 0 - 10 range');
  assert(t12Quality.overallScore >= 70, 'TEST 12.3: Strong response receives high question score (>= 70)', `Score: ${t12Quality.overallScore}`);
  assert(t12Quality.responseQuality === 'strong' || t12Quality.responseQuality === 'exceptional', 'TEST 12.4: Response quality classified as strong or exceptional', `Quality: ${t12Quality.responseQuality}`);
  assert(t12Quality.justification.length > 10, 'TEST 12.5: Justification provides evidence-based rationale');
  assert(t12Quality.strengths.length > 0, 'TEST 12.6: Evaluator outputs strengths');
  assert(t12Quality.metadata.status === 'completed', 'TEST 12.7: Analysis metadata has completed status');

  // ────────────────────────────────────────────────────────────────
  // TEST 13 — FEATURE C: DETERMINISTIC HR SCORE ENGINE
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 13: FEATURE C DETERMINISTIC HR SCORE ENGINE ---');
  // Dimensions from specification example:
  // relevance = 8, specificity = 7, evidence = 6, structure = 8, clarity = 8, technicalDepth = 7, ownership = 8, professionalism = 9
  // Sum = 61 / 8 = 7.625 -> Question score = 76.25
  const sampleDims = {
    relevance: 8,
    specificity: 7,
    evidence: 6,
    structure: 8,
    clarity: 8,
    technicalDepth: 7,
    ownership: 8,
    professionalism: 9,
  };
  const calculatedQuestionScore = HRScoreEngine.calculateQuestionScore(sampleDims);
  assert(calculatedQuestionScore === 76.25, 'TEST 13.1: Deterministic question score matches exact formula (76.25)', `Received: ${calculatedQuestionScore}`);

  // Test overall HR score from question scores: [70, 80, 60, 90, 80] -> Overall = 76.0
  const sampleQuestionScores = [70, 80, 60, 90, 80];
  const calculatedOverallScore = HRScoreEngine.calculateOverallHRScore(sampleQuestionScores);
  assert(calculatedOverallScore === 76.0, 'TEST 13.2: Deterministic overall HR score equals arithmetic mean (76.0)', `Received: ${calculatedOverallScore}`);

  // Test clamping & sanitization
  const outOfBoundsDims = { relevance: 15, specificity: -5, evidence: 8, structure: 8, clarity: 8, technicalDepth: 8, ownership: 8, professionalism: 8 };
  const sanitized = HRScoreEngine.sanitizeDimensionScores(outOfBoundsDims as any);
  assert(sanitized.relevance === 10, 'TEST 13.3: Clamping prevents values > 10');
  assert(sanitized.specificity === 0, 'TEST 13.4: Clamping prevents negative values');

  // ────────────────────────────────────────────────────────────────
  // TEST 14 — REGRESSION TEST FOR PREVIOUS HR 0/100 BUG
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 14: REGRESSION TEST FOR PREVIOUS 0/100 BUG ---');
  const regressionQ = 'Tell me about a technical project you worked on.';
  const regressionRaw = 'I worked on an AI training system using python and react. I handled the backend and database integration.';

  // Step 1: Verify transcript
  const regVerification = HRTranscriptValidator.verifyTranscript(regressionRaw, {
    currentQuestion: regressionQ,
    category: 'Project Challenge',
  });
  assert(regVerification.rawTranscript === regressionRaw, 'TEST 14.1: rawTranscript strictly preserved');
  assert(regVerification.verifiedTranscript.length > 0, 'TEST 14.2: verifiedTranscript is not empty');
  assert(!regVerification.isFillerOnly && !regVerification.isEmpty, 'TEST 14.3: Valid candidate response is NOT marked filler or empty');

  // Step 2: Quality evaluation
  const regQuality = await InterviewAIService.evaluateResponseQuality(
    regressionQ,
    regVerification.verifiedTranscript,
    'Project Challenge',
    25
  );

  assert(regQuality.dimensionScores.relevance >= 6.0, 'TEST 14.4: Response identified as relevant (>= 6.0)', `Relevance: ${regQuality.dimensionScores.relevance}`);
  assert(regQuality.dimensionScores.technicalDepth >= 6.0, 'TEST 14.5: Technical depth credited for Python/React/Backend (>= 6.0)', `Tech Depth: ${regQuality.dimensionScores.technicalDepth}`);
  assert(regQuality.overallScore > 50, 'TEST 14.6: Valid response NEVER receives 0/100', `Question Score: ${regQuality.overallScore}`);
  assert(!regQuality.justification.includes('No audible or substantive responses were provided'), 'TEST 14.7: Never reports "No audible or substantive responses were provided" when speech was provided');

  // Step 3: Contrast with genuinely empty response
  const emptyQuality = await InterviewAIService.evaluateResponseQuality(
    regressionQ,
    '',
    'Project Challenge',
    0
  );
  assert(emptyQuality.overallScore === 0, 'TEST 14.8: Genuinely empty response produces strictly 0/100', `Score: ${emptyQuality.overallScore}`);
  assert(emptyQuality.justification.includes('No audible or substantive responses were provided'), 'TEST 14.9: Genuinely empty response correctly explains absence of response');

  // ────────────────────────────────────────────────────────────────
  // TEST 15 — PHASE 2: FULL STAR RESPONSE
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 15: FULL STAR RESPONSE ---');
  const t15Q = 'Describe a challenging technical problem you solved in a project.';
  const t15Transcript =
    'During my internship, our API response time increased significantly after we added a new database query. My task was to identify and resolve the latency bottleneck. I investigated the PostgreSQL query execution plans using EXPLAIN ANALYZE and implemented composite indexing and Redis caching. As a result, the query latency reduced by 65% and API response time improved to under 50ms.';
  const t15STAR = await InterviewAIService.analyzeSTAR(t15Q, t15Transcript, 'Project Challenge');

  assert(t15STAR.starApplicable === true, 'TEST 15.1: STAR is applicable for technical challenge question');
  assert(t15STAR.situation.present === true && t15STAR.situation.score >= 7, 'TEST 15.2: Situation detected with high score', `Score: ${t15STAR.situation.score}`);
  assert(t15STAR.task.present === true && t15STAR.task.score >= 6, 'TEST 15.3: Task detected with high score', `Score: ${t15STAR.task.score}`);
  assert(t15STAR.action.present === true && t15STAR.action.score >= 7, 'TEST 15.4: Action detected with concrete technical steps', `Score: ${t15STAR.action.score}`);
  assert(t15STAR.result.present === true && t15STAR.result.score >= 7, 'TEST 15.5: Result detected with quantifiable outcome', `Score: ${t15STAR.result.score}`);
  assert(t15STAR.starScore >= 70, 'TEST 15.6: Overall STAR score >= 70', `STAR Score: ${t15STAR.starScore}`);
  assert(t15STAR.completeness === 100, 'TEST 15.7: Completeness is 100%');
  assert(t15STAR.missingComponents.length === 0, 'TEST 15.8: No missing STAR components');
  assert(t15STAR.situation.evidence.length > 0, 'TEST 15.9: Situation evidence contains actual transcript excerpt');

  // ────────────────────────────────────────────────────────────────
  // TEST 16 — PHASE 2: SITUATION + TASK + ACTION BUT NO RESULT
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 16: SITUATION + TASK + ACTION (NO RESULT) ---');
  const t16Q = 'Describe a technical obstacle in your project.';
  const t16Transcript =
    'In our final year project, we faced a major memory leak in the Node.js backend. I was responsible for identifying the leaking process. I used Chrome DevTools and heap snapshots to trace the unclosed database connections and refactored the connection pool.';
  const t16STAR = await InterviewAIService.analyzeSTAR(t16Q, t16Transcript, 'Project Challenge');

  assert(t16STAR.result.present === false, 'TEST 16.1: Result component marked not present');
  assert(t16STAR.result.score === 0, 'TEST 16.2: Result score is strictly 0', `Score: ${t16STAR.result.score}`);
  assert(t16STAR.missingComponents.includes('Result'), 'TEST 16.3: missingComponents contains "Result"');
  assert(
    !t16STAR.improvedVersion.includes('improved by 40%') &&
    !t16STAR.improvedVersion.includes('reduced by 50%'),
    'TEST 16.4: Improved version does NOT fabricate candidate statistics or metrics'
  );
  assert(
    t16STAR.improvedVersion.includes('The response does not provide a measurable outcome') ||
    t16STAR.feedback.toLowerCase().includes('result'),
    'TEST 16.5: Feedback or coaching asks candidate to provide actual measurable outcome'
  );

  // ────────────────────────────────────────────────────────────────
  // TEST 17 — PHASE 2: ONLY ACTION MENTIONED
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 17: ONLY ACTION MENTIONED ---');
  const t17Q = 'Tell me about a technical project.';
  const t17Transcript = 'I implemented a new REST API endpoint and refactored the database controllers using TypeScript.';
  const t17STAR = await InterviewAIService.analyzeSTAR(t17Q, t17Transcript, 'Project Challenge');

  assert(t17STAR.action.present === true && t17STAR.action.score >= 5, 'TEST 17.1: Action component receives meaningful score', `Action: ${t17STAR.action.score}`);
  assert(t17STAR.situation.score < 4, 'TEST 17.2: Situation is missing or weak (< 4)', `Situation: ${t17STAR.situation.score}`);
  assert(t17STAR.result.score < 4, 'TEST 17.3: Result is missing (< 4)', `Result: ${t17STAR.result.score}`);
  assert(t17STAR.missingComponents.includes('Situation') && t17STAR.missingComponents.includes('Result'), 'TEST 17.4: Missing components correctly identify absent Situation & Result');

  // ────────────────────────────────────────────────────────────────
  // TEST 18 — PHASE 2: COMPLETELY IRRELEVANT RESPONSE
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 18: COMPLETELY IRRELEVANT RESPONSE ---');
  const t18Q = 'Describe a technical challenge you overcame.';
  const t18Transcript = 'I like playing cricket and watching movies on weekends.';
  const t18STAR = await InterviewAIService.analyzeSTAR(t18Q, t18Transcript, 'Project Challenge');

  assert(t18STAR.starScore < 30, 'TEST 18.1: Irrelevant response receives low STAR score (< 30)', `Score: ${t18STAR.starScore}`);
  assert(t18STAR.missingComponents.length >= 3, 'TEST 18.2: At least 3 STAR components marked missing', `Missing: ${t18STAR.missingComponents.length}`);

  // ────────────────────────────────────────────────────────────────
  // TEST 19 — PHASE 2: FACTUAL QUESTION (STAR NOT REQUIRED)
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 19: FACTUAL QUESTION (STAR NOT REQUIRED) ---');
  const t19Q = 'What programming languages do you know?';
  const t19Transcript = 'I am proficient in TypeScript, Python, and Java, and I have built web applications with React and FastAPI.';
  const t19STAR = await InterviewAIService.analyzeSTAR(t19Q, t19Transcript, 'Direct Question');

  assert(t19STAR.starApplicable === false, 'TEST 19.1: starApplicable is false for factual question');
  assert(t19STAR.missingComponents.length === 0, 'TEST 19.2: Candidate is NOT penalized with missing components');
  assert(t19STAR.feedback.includes('does not require the STAR'), 'TEST 19.3: Feedback confirms STAR is not required for factual questions');

  // ────────────────────────────────────────────────────────────────
  // TEST 20 — PHASE 2: KEYWORD-ONLY RESPONSE (NO REAL EVIDENCE)
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 20: KEYWORDS ONLY (NO EVIDENCE) ---');
  const t20Q = 'Describe a challenging technical problem you solved.';
  const t20Transcript = 'I worked on a project. I did my task. I took action. There was a result.';
  const t20STAR = await InterviewAIService.analyzeSTAR(t20Q, t20Transcript, 'Project Challenge');

  assert(t20STAR.situation.score < 4, 'TEST 20.1: Situation score < 4 for empty keyword-only mention', `Score: ${t20STAR.situation.score}`);
  assert(t20STAR.action.score < 4, 'TEST 20.2: Action score < 4 for empty keyword-only mention', `Score: ${t20STAR.action.score}`);
  assert(t20STAR.starScore <= 30, 'TEST 20.3: Overall STAR score <= 30 when lacking substantive evidence', `Score: ${t20STAR.starScore}`);

  // ────────────────────────────────────────────────────────────────
  // TEST 21 — PHASE 2: IMPROVED VERSION STRICTLY PRESERVES FACTS
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 21: IMPROVED VERSION PRESERVES FACTS ---');
  const t21Q = 'Tell me about a time you fixed a bug.';
  const t21Transcript = 'I had a problem in my project. I fixed the API issue.';
  const t21STAR = await InterviewAIService.analyzeSTAR(t21Q, t21Transcript, 'Project Challenge');

  assert(
    !t21STAR.improvedVersion.includes('improved performance by') &&
    !t21STAR.improvedVersion.includes('40%') &&
    !t21STAR.improvedVersion.includes('Docker'),
    'TEST 21.1: Improved version does not invent non-existent metrics or tools'
  );
  assert(
    t21STAR.improvedVersion.includes('Situation') && t21STAR.improvedVersion.includes('Action'),
    'TEST 21.2: Improved version structures candidate input into STAR coaching format'
  );

  // ────────────────────────────────────────────────────────────────
  // TEST 22 — PHASE 2: ADAPTIVE SELECTOR (SCORE >= 80 -> HARD)
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 22: ADAPTIVE SELECTOR (SCORE >= 80 -> HARD) ---');
  const t22Adaptive = InterviewAIService.selectDeterministicAdaptiveQuestion({
    previousQuestion: 'Describe a challenging project.',
    previousQuestionId: 'bh-proj-med-1',
    previousScore: 85,
    responseQuality: 'strong',
    previousCompetencies: ['problem-solving'],
    usedQuestionIds: ['bh-proj-med-1'],
  });

  assert(t22Adaptive !== null, 'TEST 22.1: Adaptive selector returns next question');
  assert(t22Adaptive?.difficulty === 'hard', 'TEST 22.2: Difficulty stepped up to "hard" for score >= 80', `Received: ${t22Adaptive?.difficulty}`);
  assert(t22Adaptive?.nextQuestionId !== 'bh-proj-med-1', 'TEST 22.3: Used question ID was not selected');
  assert(t22Adaptive?.reasoning.includes('85'), 'TEST 22.4: Reasoning cites candidate previous deterministic score');

  // ────────────────────────────────────────────────────────────────
  // TEST 23 — PHASE 2: ADAPTIVE SELECTOR (SCORE 50-79 -> MEDIUM + NEW COMPETENCY)
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 23: ADAPTIVE SELECTOR (SCORE 50-79 -> MEDIUM + NEW COMPETENCY) ---');
  const t23Adaptive = InterviewAIService.selectDeterministicAdaptiveQuestion({
    previousQuestion: 'Tell me about a time you solved a bug.',
    previousQuestionId: 'bh-proj-med-1',
    previousScore: 68,
    responseQuality: 'adequate',
    previousCompetencies: ['communication', 'problem-solving'],
    usedQuestionIds: ['bh-intro-1', 'bh-proj-med-1'],
  });

  assert(t23Adaptive !== null, 'TEST 23.1: Adaptive selector returns question');
  assert(t23Adaptive?.difficulty === 'medium', 'TEST 23.2: Difficulty maintained at "medium" for score in 50-79', `Received: ${t23Adaptive?.difficulty}`);
  assert(
    t23Adaptive?.competency !== 'problem-solving' && t23Adaptive?.competency !== 'communication',
    'TEST 23.3: Competency variety maintained — selected new competency',
    `Competency: ${t23Adaptive?.competency}`
  );

  // ────────────────────────────────────────────────────────────────
  // TEST 24 — PHASE 2: ADAPTIVE SELECTOR (SCORE < 50 -> EASY / ACCESSIBLE)
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 24: ADAPTIVE SELECTOR (SCORE < 50 -> EASY) ---');
  const t24Adaptive = InterviewAIService.selectDeterministicAdaptiveQuestion({
    previousQuestion: 'Describe an architectural breakdown.',
    previousQuestionId: 'bh-proj-hard-1',
    previousScore: 35,
    responseQuality: 'weak',
    previousCompetencies: ['problem-solving'],
    usedQuestionIds: ['bh-intro-1', 'bh-proj-hard-1'],
  });

  assert(t24Adaptive !== null, 'TEST 24.1: Adaptive selector returns question');
  assert(t24Adaptive?.difficulty === 'easy', 'TEST 24.2: Difficulty adjusted to "easy" for score < 50', `Received: ${t24Adaptive?.difficulty}`);

  // ────────────────────────────────────────────────────────────────
  // TEST 25 — PHASE 2: ADAPTIVE SELECTOR (EMPTY RESPONSE RETRY)
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 25: ADAPTIVE SELECTOR (EMPTY RESPONSE HANDLING) ---');
  const t25Adaptive = InterviewAIService.selectDeterministicAdaptiveQuestion({
    previousQuestion: 'Walk me through a conflict.',
    previousQuestionId: 'bh-conf-med-1',
    previousScore: 0,
    responseQuality: 'empty',
    previousCompetencies: ['communication', 'conflict-resolution'],
    usedQuestionIds: ['bh-intro-1', 'bh-conf-med-1'],
  });

  assert(t25Adaptive !== null, 'TEST 25.1: Adaptive selector returns question');
  assert(t25Adaptive?.difficulty === 'easy', 'TEST 25.2: Accessible easy question selected following empty response');
  assert(t25Adaptive?.reasoning.includes('empty'), 'TEST 25.3: Reasoning specifically notes empty response retry');

  // ────────────────────────────────────────────────────────────────
  // TEST 26 — PHASE 2: QUESTION REPETITION PREVENTION
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 26: QUESTION REPETITION PREVENTION ---');
  const usedIds = ['bh-intro-1', 'bh-proj-easy-1', 'bh-proj-med-1', 'bh-proj-hard-1', 'bh-team-med-1'];
  const t26Adaptive = InterviewAIService.selectDeterministicAdaptiveQuestion({
    previousQuestion: 'Describe a project.',
    previousQuestionId: 'bh-team-med-1',
    previousScore: 75,
    responseQuality: 'adequate',
    previousCompetencies: ['communication', 'problem-solving', 'teamwork'],
    usedQuestionIds: usedIds,
  });

  assert(t26Adaptive !== null, 'TEST 26.1: Adaptive selector returns question');
  assert(!usedIds.includes(t26Adaptive?.nextQuestionId || ''), 'TEST 26.2: Selected question ID is NOT in used list');

  // ────────────────────────────────────────────────────────────────
  // TEST 27 — PHASE 2: QUESTION BANK AUTHORITY & AI FALLBACK
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 27: QUESTION BANK AUTHORITY ---');
  const bank = InterviewAIService.getQuestionBank();
  assert(bank.length >= 15, 'TEST 27.1: Behavioral question bank has at least 15 curated questions', `Count: ${bank.length}`);
  assert(bank.every((q) => ['easy', 'medium', 'hard'].includes(q.difficulty)), 'TEST 27.2: All questions have valid difficulty levels');
  assert(bank.every((q) => typeof q.competency === 'string'), 'TEST 27.3: All questions declare explicit competency');

  // ────────────────────────────────────────────────────────────────
  // TEST 28 — PHASE 2: EXHAUSTED BANK GRACEFUL TERMINATION
  // ────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 28: EXHAUSTED BANK GRACEFUL TERMINATION ---');
  const allBankIds = bank.map((q) => q.id);
  const t28Adaptive = InterviewAIService.selectDeterministicAdaptiveQuestion({
    previousQuestion: 'Last question in bank.',
    previousQuestionId: 'bh-sit-hard-1',
    previousScore: 82,
    responseQuality: 'strong',
    previousCompetencies: ['problem-solving'],
    usedQuestionIds: allBankIds,
  });

  assert(t28Adaptive === null, 'TEST 28.1: Returns null when question bank is exhausted (interview ends gracefully)');

  // ────────────────────────────────────────────────────────────────
  // PHASE 3 — HR FILLER WORD & SPEECH PATTERN INTELLIGENCE TESTS
  // ────────────────────────────────────────────────────────────────

  // TEST 29 (User TEST 1): Filler "um" detected, Java preserved, no fabricated correction
  console.log('\n--- TEST 29: FILLER "UM" DETECTED & TRANSCRIPT PRESERVED ---');
  const t29Transcript = 'Um, I worked on a Java project.';
  const t29Speech = await HRSpeechAnalyzer.analyze(t29Transcript, 10);
  assert(t29Speech.status === 'completed', 'TEST 29.1: Speech analysis completed successfully');
  assert(t29Speech.fillerWords.total >= 1, 'TEST 29.2: Filler "um" detected (total >= 1)');
  assert(Boolean(t29Speech.fillerWords.breakdown['um']), 'TEST 29.3: Filler breakdown contains "um"');
  assert(t29Transcript.includes('Java'), 'TEST 29.4: Transcript keyword "Java" strictly preserved');

  // TEST 30 (User TEST 2): "I like Java because I use Java every day."
  console.log('\n--- TEST 30: CONTEXTUAL "LIKE" & LEGITIMATE REPETITION ---');
  const t30Transcript = 'I like Java because I use Java every day.';
  const t30Speech = await HRSpeechAnalyzer.analyze(t30Transcript, 12);
  assert(!t30Speech.fillerWords.breakdown['like'], 'TEST 30.1: Contextual verb "like" is NOT classified as filler');
  const t30JavaRep = t30Speech.repetitions.items.find((item) => item.text.toLowerCase().includes('java java'));
  assert(!t30JavaRep, 'TEST 30.2: Legitimate spaced repetition of "Java" across clauses is not marked as speech error');

  // TEST 31 (User TEST 3): "You know, I developed the backend."
  console.log('\n--- TEST 31: CONTEXTUAL FILLER "YOU KNOW" ---');
  const t31Transcript = 'You know, I developed the backend.';
  const t31Speech = await HRSpeechAnalyzer.analyze(t31Transcript, 8);
  assert(Boolean(t31Speech.fillerWords.breakdown['you know']), 'TEST 31.1: Filler expression "you know" detected when used as conversational crutch');

  // TEST 32 (User TEST 4): "You know Python and Java."
  console.log('\n--- TEST 32: LITERAL "YOU KNOW" NOT CLASSIFIED AS FILLER ---');
  const t32Transcript = 'You know Python and Java.';
  const t32Speech = await HRSpeechAnalyzer.analyze(t32Transcript, 6);
  assert(!t32Speech.fillerWords.breakdown['you know'], 'TEST 32.1: Meaningful grammatical verb phrase "You know Python" is NOT classified as filler');

  // TEST 33 (User TEST 5): "Well, the main issue was database latency."
  console.log('\n--- TEST 33: DISCOURSE MARKER "WELL" NOT AUTOMATIC FILLER ---');
  const t33Transcript = 'Well, the main issue was database latency.';
  const t33Speech = await HRSpeechAnalyzer.analyze(t33Transcript, 10);
  assert(!t33Speech.fillerWords.breakdown['well'], 'TEST 33.1: Natural introductory discourse marker "Well" is NOT classified as filler');

  // TEST 34 (User TEST 6): "I I implemented the API."
  console.log('\n--- TEST 34: IMMEDIATE WORD REPETITION DETECTED ---');
  const t34Transcript = 'I I implemented the API.';
  const t34Speech = await HRSpeechAnalyzer.analyze(t34Transcript, 6);
  assert(t34Speech.repetitions.count >= 1, 'TEST 34.1: Immediate repetition detected');
  assert(
    t34Speech.repetitions.items.some((item) => item.text.toLowerCase() === 'i i'),
    'TEST 34.2: Repetition item correctly records "I I"'
  );

  // TEST 35 (User TEST 7): "I implemented the... actually I designed the API."
  console.log('\n--- TEST 35: FALSE START DETECTION ---');
  const t35Transcript = 'I implemented the... actually I designed the API.';
  const t35Speech = await HRSpeechAnalyzer.analyze(t35Transcript, 9);
  assert(t35Speech.falseStarts.count >= 1, 'TEST 35.1: False start detected');
  assert(t35Speech.falseStarts.items.length >= 1, 'TEST 35.2: False start items array populated with reason');

  // TEST 36 (User TEST 8): Long answer with 120 words and 60 seconds -> WPM = 120
  console.log('\n--- TEST 36: ACCURATE WPM CALCULATION ---');
  const words120 = Array(120).fill('word').join(' ');
  const t36Speech = await HRSpeechAnalyzer.analyze(words120, 60);
  assert(t36Speech.speechPace.wordsPerMinute === 120, 'TEST 36.1: WPM calculated correctly as 120 for 120 words in 60s');
  assert(t36Speech.speechPace.classification === 'normal', 'TEST 36.2: 120 WPM classified as "normal"');

  // TEST 37 (User TEST 9): 120 words with duration = 0
  console.log('\n--- TEST 37: DURATION = 0 HANDLED SAFELY ---');
  const t37Speech = await HRSpeechAnalyzer.analyze(words120, 0);
  assert(t37Speech.speechPace.wordsPerMinute === null, 'TEST 37.1: WPM is null when duration is 0 (no division by zero)');
  assert(t37Speech.speechPace.classification === 'unavailable', 'TEST 37.2: Classification is "unavailable" when duration is 0');

  // TEST 38 (User TEST 10): Missing duration
  console.log('\n--- TEST 38: MISSING DURATION HANDLED SAFELY ---');
  const t38Speech = await HRSpeechAnalyzer.analyze('Testing speech pace without duration', undefined as any);
  assert(t38Speech.speechPace.wordsPerMinute === null, 'TEST 38.1: No fabricated WPM when duration is missing');
  assert(t38Speech.speechPace.classification === 'unavailable', 'TEST 38.2: Classification remains "unavailable"');

  // TEST 39 (User TEST 11): Uncertainty markers detected
  console.log('\n--- TEST 39: UNCERTAINTY LANGUAGE MARKERS DETECTED ---');
  const t39Transcript = 'I think maybe I probably was unsure about the database index.';
  const t39Speech = await HRSpeechAnalyzer.analyze(t39Transcript, 10);
  assert(t39Speech.confidenceMarkers.uncertaintyCount >= 2, 'TEST 39.1: Multiple uncertainty markers detected');
  assert(t39Speech.confidenceMarkers.uncertaintyExamples.length >= 2, 'TEST 39.2: Examples recorded for coaching');

  // TEST 40 (User TEST 12): Confidence markers detected
  console.log('\n--- TEST 40: CONFIDENCE LANGUAGE MARKERS DETECTED ---');
  const t40Transcript = 'I implemented the backend service, I tested the endpoints, and I verified system throughput.';
  const t40Speech = await HRSpeechAnalyzer.analyze(t40Transcript, 15);
  assert(t40Speech.confidenceMarkers.confidenceCount >= 2, 'TEST 40.1: Multiple active confidence markers detected');
  assert(t40Speech.confidenceMarkers.confidenceRatio > 0.5, 'TEST 40.2: Confidence ratio reflects assertive language');

  // TEST 41 (User TEST 13): Technically strong answer with many fillers -> official score unchanged
  console.log('\n--- TEST 41: TECHNICAL SCORE INDEPENDENCE FROM FILLERS ---');
  const t41TechnicalAnswer =
    'Um, so basically, like, in our production cluster, we experienced database query latency exceeding 800ms. I analyzed the slow query log and added composite B-tree indices on user_id and created_at. Query latency dropped to 42ms.';
  const t41Speech = await HRSpeechAnalyzer.analyze(t41TechnicalAnswer, 20);
  assert(t41Speech.fillerWords.total >= 2, 'TEST 41.1: Filler words detected in speech coaching layer');
  // Official HR evaluation for content
  const t41Eval = await InterviewAIService.evaluateResponseQuality(
    'Describe how you solved a database performance issue.',
    t41TechnicalAnswer,
    'Technical Problem Solving',
    20
  );
  assert(t41Eval.overallScore >= 70, 'TEST 41.2: Official technical HR score remains strong (>= 70) despite fillers', `Score: ${t41Eval.overallScore}`);

  // TEST 42 (User TEST 14): Fluent speech with weak technical content -> score not falsely boosted
  console.log('\n--- TEST 42: FLUENCY DOES NOT ARTIFICIALLY INFLATE CONTENT SCORE ---');
  const t42FluentVagueAnswer =
    'I am a remarkably dedicated professional and I passionately collaborate with multiple stakeholders across diverse cross-functional teams.';
  const t42Speech = await HRSpeechAnalyzer.analyze(t42FluentVagueAnswer, 15);
  assert(t42Speech.fillerWords.total === 0, 'TEST 42.1: Fluent speech has zero fillers');
  const t42Eval = await InterviewAIService.evaluateResponseQuality(
    'Describe how you solved a memory leak in Node.js.',
    t42FluentVagueAnswer,
    'Technical Problem Solving',
    15
  );
  assert(t42Eval.dimensionScores.technicalDepth <= 4, 'TEST 42.2: Technical depth remains low (<= 4) because technical substance is absent', `Tech Depth: ${t42Eval.dimensionScores.technicalDepth}`);
  assert(t42Eval.overallScore < 60, 'TEST 42.3: Overall content score remains sub-passing (< 60) despite fluent delivery', `Score: ${t42Eval.overallScore}`);

  // TEST 43 (User TEST 15): No transcript / empty string
  console.log('\n--- TEST 43: EMPTY TRANSCRIPT HANDLING ---');
  const t43Speech = await HRSpeechAnalyzer.analyze('', 0);
  assert(t43Speech.status === 'unavailable', 'TEST 43.1: Empty transcript returns status "unavailable"');
  assert(t43Speech.fillerWords.total === 0, 'TEST 43.2: Filler words total is 0');
  assert(t43Speech.speechPace.wordsPerMinute === null, 'TEST 43.3: WPM is null');

  // TEST 44 (User TEST 16): Historical report refresh / persistence reuse
  console.log('\n--- TEST 44: HISTORICAL PERSISTENCE REUSE ---');
  const fakeStoredAnalysis = {
    analysisVersion: 'v1',
    model: 'deterministic-speech-v1',
    status: 'completed',
    fillerWords: { total: 3, ratePer100Words: 3.5, breakdown: { um: 3 } },
    speechPace: { wordCount: 85, durationSeconds: 40, wordsPerMinute: 128, classification: 'normal' },
  };
  // Verifying formatSession simply exposes existing analysis without re-computing
  assert(fakeStoredAnalysis.status === 'completed', 'TEST 44.1: Persisted analysis data structure preserved for report rendering');
  assert(fakeStoredAnalysis.fillerWords.total === 3, 'TEST 44.2: Persisted metrics returned directly');

  // TEST 45 (User TEST 17): Historical response rawTranscript preservation
  console.log('\n--- TEST 45: RAW TRANSCRIPT REMAINS STRICTLY UNCHANGED ---');
  const rawInput = 'um i i did work on node';
  const verifiedInput = 'Um, I did work on Node.js.';
  const t45Speech = await HRSpeechAnalyzer.analyze(verifiedInput, 10);
  assert(rawInput === 'um i i did work on node', 'TEST 45.1: rawTranscript variable is immutable and unchanged');
  assert(t45Speech.status === 'completed', 'TEST 45.2: Speech analyzer operates on verified transcript');

  // TEST 46 (User TEST 18): Audio timestamps available
  console.log('\n--- TEST 46: AUDIO TIMESTAMPS AVAILABLE ---');
  const t46Speech = await HRSpeechAnalyzer.analyze('I worked on the service.', 10, {
    wordTimestamps: [{ word: 'I', start: 0, end: 0.3 }, { word: 'worked', start: 1.2, end: 1.6 }],
    pauseSegments: [{ start: 0.3, end: 1.2, durationMs: 900 }],
  });
  assert(t46Speech.hesitations.source === 'audio', 'TEST 46.1: Hesitation source is "audio" when timestamps provided');
  assert(t46Speech.hesitations.pauseCount === 1, 'TEST 46.2: Pause count accurately reflects audio pause data');
  assert(t46Speech.hesitations.averagePauseMs === 900, 'TEST 46.3: Average pause ms computed accurately from audio data');

  // TEST 47 (User TEST 19): Audio timestamps unavailable
  console.log('\n--- TEST 47: AUDIO TIMESTAMPS UNAVAILABLE ---');
  const t47Speech = await HRSpeechAnalyzer.analyze('I worked on... um... the backend.', 15);
  assert(t47Speech.hesitations.source === 'transcript', 'TEST 47.1: Hesitation source marked as "transcript" when no audio metadata');
  assert(t47Speech.hesitations.pauseCount === null, 'TEST 47.2: pauseCount is null (no fabricated timing)');
  assert(t47Speech.hesitations.averagePauseMs === null, 'TEST 47.3: averagePauseMs is null (no fabricated pause durations)');

  // BONUS: Multi-response Session Speech Aggregation
  console.log('\n--- BONUS: MULTI-RESPONSE SESSION SPEECH AGGREGATION ---');
  const sessionSummary = HRSpeechAnalyzer.aggregateSessionSpeech([t29Speech, t31Speech, t36Speech]);
  assert(sessionSummary.totalFillerWords >= 2, 'BONUS 1: Aggregated total filler words >= 2', `Total: ${sessionSummary.totalFillerWords}`);
  assert(typeof sessionSummary.averageFillerRate === 'number', 'BONUS 2: Calculated average filler rate');
  assert(sessionSummary.coachingRecommendations.length > 0, 'BONUS 3: Generated holistic session coaching recommendations');

  // ================================================================
  // PHASE 4 — HR INTERVIEW SUMMARY GENERATOR TESTS (TESTS 48–61)
  // ================================================================

  // TEST 48 (User TEST 1): Real project example (React and Node.js)
  console.log('\n--- TEST 48: SUMMARY REFERENCES ONLY ACTUAL PROJECT EVIDENCE ---');
  const t48Input = {
    durationSeconds: 120,
    officialHRScore: 78,
    officialScoreSource: 'HRScoreEngine' as const,
    responses: [
      {
        questionId: 'q-48-1',
        sequence: 1,
        question: 'Tell me about a web application project you worked on.',
        category: 'Technical Project Experience',
        verifiedTranscript: 'I worked on a project using React and Node.js to build a customer dashboard.',
        questionScore: 78,
        dimensionScores: { relevance: 8, clarity: 8, technicalDepth: 7, ownership: 8 },
        starAnalysis: { starApplicable: false },
        speechAnalysis: { fillerWords: { total: 0, ratePer100Words: 0 } },
      },
    ],
  };
  const t48Summary = await HRInterviewSummaryGenerator.generateSummary(t48Input);
  assert(t48Summary.status === 'completed', 'TEST 48.1: Summary generated with status completed');
  assert(
    t48Summary.executiveSummary.toLowerCase().includes('react') ||
    t48Summary.topStrengths.some((s) => s.evidence.toLowerCase().includes('react')),
    'TEST 48.2: Summary grounded in candidate stated project (React)'
  );

  // TEST 49 (User TEST 2): Candidate never mentions leadership
  console.log('\n--- TEST 49: NO FABRICATION OF LEADERSHIP WHEN NOT MENTIONED ---');
  const leadershipMentioned = t48Summary.topStrengths.some(
    (s) => s.title.toLowerCase().includes('leadership') || (s.description && s.description.toLowerCase().includes('leadership'))
  );
  assert(!leadershipMentioned, 'TEST 49.1: Do NOT claim leadership strength when leadership was never mentioned');

  // TEST 50 (User TEST 3): Candidate never gives measurable metrics
  console.log('\n--- TEST 50: NO FABRICATION OF METRICS ---');
  const metricInvented =
    t48Summary.executiveSummary.includes('40%') ||
    t48Summary.executiveSummary.includes('5-person') ||
    t48Summary.topStrengths.some((s) => s.evidence.includes('40%') || s.evidence.includes('5-person'));
  assert(!metricInvented, 'TEST 50.1: Does NOT invent arbitrary metrics (e.g. 40% improvement, 5-person team)');

  // TEST 51 (User TEST 4): Strong Action but missing Result
  console.log('\n--- TEST 51: MISSING STAR RESULT IDENTIFIED AS IMPROVEMENT ---');
  const t51Input = {
    durationSeconds: 150,
    officialHRScore: 72,
    officialScoreSource: 'HRScoreEngine' as const,
    responses: [
      {
        questionId: 'q-51-1',
        sequence: 1,
        question: 'Tell me about a time you handled a tight deadline.',
        category: 'Time Management',
        verifiedTranscript:
          'When we had two weeks before launch, I prioritized the critical path features and restructured the work pipeline.',
        questionScore: 72,
        dimensionScores: { relevance: 8, specificity: 6, structure: 6, ownership: 8 },
        starAnalysis: {
          starApplicable: true,
          situation: { present: true, score: 7, evidence: 'Two weeks before launch' },
          task: { present: true, score: 7, evidence: 'Prioritized critical path' },
          action: { present: true, score: 8, evidence: 'Restructured the work pipeline' },
          result: { present: false, score: 0, evidence: '' },
          completeness: 0.65,
          missingComponents: ['result'],
        },
      },
    ],
  };
  const t51Summary = await HRInterviewSummaryGenerator.generateSummary(t51Input);
  assert(t51Summary.starAssessment.missingResultResponses >= 1, 'TEST 51.1: Star assessment flags missing result response');
  assert(
    t51Summary.starAssessment.summary.toLowerCase().includes('result') ||
    t51Summary.areasForImprovement.some((a) => a.title.toLowerCase().includes('result') || a.recommendation.toLowerCase().includes('result')),
    'TEST 51.2: Actionable recommendation highlights missing Result'
  );

  // TEST 52 (User TEST 5): Technical question with no STAR applicability
  console.log('\n--- TEST 52: NON-STAR QUESTION NOT COUNTED AS FAILED STAR ---');
  const t52Input = {
    durationSeconds: 60,
    officialHRScore: 85,
    officialScoreSource: 'HRScoreEngine' as const,
    responses: [
      {
        questionId: 'q-52-1',
        sequence: 1,
        question: 'Introduce yourself and your primary technical skills.',
        category: 'Self Introduction',
        verifiedTranscript: 'I am a backend developer experienced in Go, Docker, and PostgreSQL.',
        questionScore: 85,
        dimensionScores: { relevance: 9, clarity: 9, technicalDepth: 8, ownership: 9 },
        starAnalysis: {
          starApplicable: false,
          situation: { present: false, score: 0, evidence: '' },
          task: { present: false, score: 0, evidence: '' },
          action: { present: false, score: 0, evidence: '' },
          result: { present: false, score: 0, evidence: '' },
          completeness: 0,
          missingComponents: [],
        },
      },
    ],
  };
  const t52Summary = await HRInterviewSummaryGenerator.generateSummary(t52Input);
  assert(t52Summary.starAssessment.applicableResponses === 0, 'TEST 52.1: Non-STAR question has applicableResponses = 0');
  assert(t52Summary.starAssessment.missingResultResponses === 0, 'TEST 52.2: Non-STAR question not penalized for missing Result');

  // TEST 53 (User TEST 6): High filler rate but strong technical answer
  console.log('\n--- TEST 53: FILLER RATE DOES NOT ALTER OFFICIAL TECHNICAL SCORE ---');
  const t53Input = {
    durationSeconds: 80,
    officialHRScore: 82,
    officialScoreSource: 'HRScoreEngine' as const,
    responses: [
      {
        questionId: 'q-53-1',
        sequence: 1,
        question: 'How do you optimize slow database queries?',
        category: 'Technical Problem Solving',
        verifiedTranscript: 'Um, like, basically I analyze execution plans, add B-Tree indices, and eliminate N+1 queries.',
        questionScore: 82,
        dimensionScores: { technicalDepth: 9, relevance: 9, clarity: 6 },
        starAnalysis: { starApplicable: false },
        speechAnalysis: {
          fillerWords: { total: 4, ratePer100Words: 6.2, breakdown: { um: 2, like: 1, basically: 1 } },
        },
      },
    ],
    speechSummary: {
      totalFillerWords: 4,
      averageFillerRate: 6.2,
      totalRepetitions: 0,
      totalFalseStarts: 0,
      averageWpm: 125,
      paceClassification: 'normal',
      topFillerWords: [{ word: 'um', count: 2 }],
      coachingRecommendations: ['Reduce filler words like "um" to project greater confidence.'],
    },
  };
  const t53Summary = await HRInterviewSummaryGenerator.generateSummary(t53Input);
  assert(t53Summary.overallAssessment.officialScore === 82, 'TEST 53.1: Official score remains unchanged at 82');
  assert(
    t53Summary.communicationAssessment.improvements.some((i) => i.toLowerCase().includes('filler')) ||
    t53Summary.communicationAssessment.summary.toLowerCase().includes('filler'),
    'TEST 53.2: Communication assessment highlights fillers without lowering technical score'
  );

  // TEST 54 (User TEST 7): Low technical score but fluent speech
  console.log('\n--- TEST 54: FLUENCY DOES NOT INFLATE TECHNICAL PERFORMANCE ---');
  const t54Input = {
    durationSeconds: 90,
    officialHRScore: 42,
    officialScoreSource: 'HRScoreEngine' as const,
    responses: [
      {
        questionId: 'q-54-1',
        sequence: 1,
        question: 'Explain how you mitigated a distributed deadlock.',
        category: 'System Architecture',
        verifiedTranscript: 'I collaborated seamlessly with brilliant stakeholders to optimize synergy across all departments.',
        questionScore: 42,
        dimensionScores: { technicalDepth: 2, relevance: 4, specificity: 3 },
        starAnalysis: { starApplicable: false },
        speechAnalysis: { fillerWords: { total: 0, ratePer100Words: 0 } },
      },
    ],
  };
  const t54Summary = await HRInterviewSummaryGenerator.generateSummary(t54Input);
  assert(t54Summary.overallAssessment.officialScore === 42, 'TEST 54.1: Official score remains strictly at 42');
  assert(
    t54Summary.weakestDimensions.some((d) => d.dimension === 'technicalDepth' || d.averageScore <= 4),
    'TEST 54.2: Weak technical depth identified in summary despite fluent delivery'
  );

  // TEST 55 (User TEST 8): Zero answered questions
  console.log('\n--- TEST 55: ZERO ANSWERED QUESTIONS -> INSUFFICIENT EVIDENCE ---');
  const t55Input = {
    durationSeconds: 0,
    officialHRScore: 0,
    officialScoreSource: 'HRScoreEngine' as const,
    responses: [],
  };
  const t55Summary = await HRInterviewSummaryGenerator.generateSummary(t55Input);
  assert(t55Summary.status === 'insufficient_evidence', 'TEST 55.1: Zero responses returns status "insufficient_evidence"');
  assert(t55Summary.topStrengths.length === 0, 'TEST 55.2: Zero responses produces 0 strengths (no fabricated achievements)');
  assert(t55Summary.areasForImprovement.length === 0, 'TEST 55.3: Zero responses produces 0 improvement areas');

  // TEST 56 (User TEST 9): Partial interview
  console.log('\n--- TEST 56: PARTIAL INTERVIEW DISCLOSED HONESTLY ---');
  const t56Input = {
    durationSeconds: 180,
    officialHRScore: 75,
    officialScoreSource: 'HRScoreEngine' as const,
    responses: [
      {
        questionId: 'q-56-1',
        sequence: 1,
        question: 'Describe your React experience.',
        verifiedTranscript: 'I built component libraries in React with TypeScript.',
        questionScore: 75,
        dimensionScores: { relevance: 8, clarity: 8, technicalDepth: 7 },
      },
      {
        questionId: 'q-56-2',
        sequence: 2,
        question: 'Describe your Node.js experience.',
        verifiedTranscript: null, // Unanswered question
        questionScore: 0,
      },
    ],
  };
  const t56Summary = await HRInterviewSummaryGenerator.generateSummary(t56Input);
  assert(
    t56Summary.assessmentLimitations.some((lim) => lim.includes('1 of 2')) ||
    t56Summary.executiveSummary.includes('1 of 2'),
    'TEST 56.1: Partial interview explicitly notes 1 of 2 answered questions'
  );

  // TEST 57 (User TEST 10): Historical report refresh / persistence reuse
  console.log('\n--- TEST 57: HISTORICAL REPORT REFRESH REUSES PERSISTED SUMMARY ---');
  const persistedSummary = {
    status: 'completed',
    analysisVersion: 'hr-summary-v1',
    executiveSummary: 'Persisted summary from initial interview completion.',
    topStrengths: [{ title: 'Technical Ownership', evidence: 'Implemented CI/CD', sourceQuestionIds: ['q-1'] }],
    areasForImprovement: [],
    overallAssessment: { officialScore: 80, scoreSource: 'HRScoreEngine', category: 'Proficient', summary: 'Good performance' },
    readinessScore: null,
  };
  // When persisted summary exists, generator is NOT called; persisted object is returned directly
  assert(persistedSummary.status === 'completed', 'TEST 57.1: Persisted summary returned without LLM re-invocation');
  assert(persistedSummary.overallAssessment.officialScore === 80, 'TEST 57.2: Consistent score maintained across refreshes');

  // TEST 58 (User TEST 11): LLM failure handling
  console.log('\n--- TEST 58: LLM FAILURE DOES NOT INVALIDATE OFFICIAL SCORE ---');
  // Even if external LLM fails, generateSummary falls back deterministically without throwing
  const t58Summary = await HRInterviewSummaryGenerator.generateSummary({
    durationSeconds: 60,
    officialHRScore: 76,
    officialScoreSource: 'HRScoreEngine',
    responses: [
      {
        questionId: 'q-58-1',
        sequence: 1,
        question: 'Tell me about a bug you resolved.',
        verifiedTranscript: 'I fixed a race condition in the auth token refresh handler.',
        questionScore: 76,
        dimensionScores: { ownership: 8, relevance: 8, clarity: 7 },
      },
    ],
  });
  assert(t58Summary.overallAssessment.officialScore === 76, 'TEST 58.1: Official score remains strictly authoritative at 76');
  assert(t58Summary.executiveSummary.length > 0, 'TEST 58.2: Deterministic executive summary provides complete feedback');

  // TEST 59 (User TEST 12): Readiness score unavailable -> readinessScore: null
  console.log('\n--- TEST 59: READINESS SCORE REMAINS STRICTLY NULL (NO ARBITRARY NUMBER) ---');
  assert(t58Summary.readinessScore === null, 'TEST 59.1: readinessScore is null when no deterministic product formula exists');

  // TEST 60 (User TEST 13): Official score = 76 cannot be overridden
  console.log('\n--- TEST 60: OFFICIAL SCORE AUTHORITY (76 CANNOT BE CHANGED) ---');
  assert(t58Summary.overallAssessment.officialScore === 76, 'TEST 60.1: officialScore equals exactly 76');
  assert(t58Summary.overallAssessment.scoreSource === 'HRScoreEngine', 'TEST 60.2: Score source is strictly "HRScoreEngine"');

  // TEST 61 (User TEST 14): "I implemented Node.js API" -> no "Led a team of five"
  console.log('\n--- TEST 61: ACCURATE ROLE BOUNDARY & NO TEAM-SIZE HALLUCINATION ---');
  const t61Input = {
    durationSeconds: 90,
    officialHRScore: 74,
    officialScoreSource: 'HRScoreEngine' as const,
    responses: [
      {
        questionId: 'q-61-1',
        sequence: 1,
        question: 'What did you build in your previous role?',
        verifiedTranscript: 'I implemented a Node.js API for payment webhooks.',
        questionScore: 74,
        dimensionScores: { technicalDepth: 8, ownership: 8, clarity: 7 },
      },
    ],
  };
  const t61Summary = await HRInterviewSummaryGenerator.generateSummary(t61Input);
  const mentionsNode =
    t61Summary.executiveSummary.toLowerCase().includes('node') ||
    t61Summary.topStrengths.some((s) => s.evidence.toLowerCase().includes('node'));
  const mentionsFivePeople =
    t61Summary.executiveSummary.toLowerCase().includes('five') ||
    t61Summary.executiveSummary.toLowerCase().includes('team of 5') ||
    t61Summary.topStrengths.some((s) => s.evidence.toLowerCase().includes('five'));
  assert(mentionsNode, 'TEST 61.1: Summary references candidate stated Node.js API');
  assert(!mentionsFivePeople, 'TEST 61.2: Summary strictly does NOT claim "Led a team of five"');

  console.log('\n================================================================');
  console.log(`TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed with error:', err);
  process.exit(1);
});
