import { CodingProblemEvidence } from './ReportEvidenceService';
import axios from 'axios';

// ─── LLM Configuration (reuses same env vars as InterviewAIService) ───────────
const _GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const _GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const TUTOR_PROMPT_VERSION = '3.0.0';
const TUTOR_ANALYSIS_VERSION = 'coding-tutor-v1';

function _getLLMKey(): string {
  return process.env.LLM_API_KEY || '';
}

function _isLLMAvailable(): boolean {
  const key = _getLLMKey();
  return !!key && key.length > 10;
}

export type FailureCategory =
  | 'LOGICAL_ERROR'
  | 'BOUNDARY_ERROR'
  | 'INPUT_PARSING_ERROR'
  | 'OUTPUT_FORMAT_ERROR'
  | 'INTEGER_OVERFLOW'
  | 'NULL_POINTER_OR_INVALID_ACCESS'
  | 'RUNTIME_ERROR'
  | 'COMPILATION_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'WRONG_ALGORITHM'
  | 'PARTIALLY_CORRECT';

export interface StructuredTestCaseResult {
  testCaseId: string;
  testCaseNumber: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  visible: true;
  executionTime?: number;
  memoryUsage?: number;
  errorType?: string;
  errorMessage?: string;
}

export interface FailedTestAnalysis {
  testCaseNumber: number;
  testCaseId?: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  failureCategory: FailureCategory;
  explanation: string;
  problematicLogic: string;
  lineLocation: string; // e.g. "Line 18" or "Lines 14-22" or function name, NEVER invented
  whyItFails: string;
  howToFix: string;
  visible: true;
}

/**
 * Full AI Coding Tutor analysis — persisted per-submission, never overwritten.
 * Generated once by the LLM and cached on InterviewExecutionRecord.aiAnalysis.
 */
export interface CodingAttemptAIAnalysis {
  // ── Metadata ──────────────────────────────────────────────────────────────
  analysisVersion: string;      // e.g. 'coding-tutor-v1'
  model: string;
  promptVersion: string;
  generatedAt: string;          // ISO timestamp
  status: 'COMPLETED' | 'FAILED' | 'UNAVAILABLE';
  submissionId: string;
  attemptNumber: number;

  // ── Submission Verdict (authoritative — comes from judge, not LLM) ────────
  submissionStatus: 'ACCEPTED' | 'INCORRECT' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR';

  // ── Candidate Submission Analysis ─────────────────────────────────────────
  submissionAnalysis: {
    verdict: string;            // e.g. "Accepted — 10/10 tests passed"
    explanation: string;        // LLM explanation of the outcome
    candidateApproach: string;  // What algorithm/pattern the candidate used
    codeExplanation: string;    // Step-by-step explanation of the actual submitted code
    timeComplexity: string;     // e.g. "O(n)"
    spaceComplexity: string;    // e.g. "O(n)"
  };

  // ── Brute Force Approach ──────────────────────────────────────────────────
  bruteForce: {
    available: boolean;
    idea: string;
    steps: string[];
    code: string | null;        // Complete executable stdin/stdout program
    timeComplexity: string;
    spaceComplexity: string;
  };

  // ── Optimal Approach ──────────────────────────────────────────────────────
  optimalApproach: {
    idea: string;
    steps: string[];
    code: string | null;        // Complete executable stdin/stdout program
    timeComplexity: string;
    spaceComplexity: string;
    whyOptimal: string;         // Comparison vs brute-force
  };

  // ── Correction (only populated when submission is INCORRECT) ─────────────
  correction: {
    required: boolean;
    rootCause: string | null;
    correctedCode: string | null; // Complete executable program; null = unavailable
    explanation: string | null;   // Why the fix works
    /**
     * UNVERIFIED = LLM-generated only.
     * VERIFIED   = Authoritative judge confirmed all tests pass.
     */
    verificationStatus: 'UNVERIFIED' | 'VERIFIED' | null;
  };

  // ── Optimization Review ───────────────────────────────────────────────────
  optimizationReview: {
    status: 'OPTIMAL' | 'CAN_BE_OPTIMIZED';
    explanation: string;
  };

  // ── Learning Metadata ─────────────────────────────────────────────────────
  keyConcept: string;
  bugPrevention: string;

  // ── Legacy fields kept for backward-compat (accepted-only flow) ───────────
  /** @deprecated Use submissionAnalysis.codeExplanation */
  whyItWorks?: string;
  /** @deprecated Use optimizationReview */
  optimization?: {
    currentComplexity: string;
    suggestedComplexity: string;
    description: string;
    whyBetter: string;
    aiOptimizedCode?: string;
    isAlreadyOptimal: boolean;
  };
}

export interface ComplexityAnalysisResult {
  candidateApproach: string;
  candidateTime: string;
  candidateSpace: string;
  optimalApproach: string;
  optimalTime: string;
  optimalSpace: string;
  isOptimal: boolean;
  complexityVerdict: string;
  reason: string;
}

export interface CompleteDiagnosticResult {
  problemId: string;
  problemTitle: string;
  pattern: string;
  difficulty: string;
  submittedCode: string;
  language: string;
  testResults: StructuredTestCaseResult[];
  passedTests: number;
  totalTests: number;
  verdict: string;
  primaryErrorType: FailureCategory | 'ALL_TESTS_PASSED';
  executionError: string | null;
  compilationError: string | null;
  detectedApproach: string;
  actualTimeComplexity: string;
  candidateTimeComplexity: string;
  actualSpaceComplexity: string;
  optimalTimeComplexity: string;
  optimalSpaceComplexity: string;
  failedTests: FailedTestAnalysis[];
  whatYouDidCorrectly: string[];
  whatWentWrong: string[];
  howToFix: string[];
  complexityAnalysis: ComplexityAnalysisResult;
  keyLearning: string;
}

export class CodingDiagnosticEngine {
  /**
   * Performs deep, evidence-grounded diagnosis of a coding submission.
   */
  static analyze(p: CodingProblemEvidence): CompleteDiagnosticResult {
    const submittedCode = p.submittedCode || (p as any).code || '';
    const codeLines = submittedCode.split('\n');
    const totalTests = p.testsTotal || (p as any).totalTests || (Array.isArray((p as any).testCases) ? (p as any).testCases.length : 1);
    const passedTests = p.testsPassed !== undefined ? p.testsPassed : (p as any).passedTests !== undefined ? (p as any).passedTests : (passedTests => passedTests)(0);
    const verdict = p.finalVerdict || (p as any).verdict || (passedTests === totalTests ? 'ACCEPTED' : passedTests > 0 ? 'PARTIALLY_SOLVED' : 'FAILED');

    // 1. Reconstruct all test cases with visibility & outcomes
    const structuredTests: StructuredTestCaseResult[] = this.extractStructuredTestResults(p);

    // 2. Detect candidate algorithmic approach & complexity
    const approachInfo = this.detectApproachAndComplexity(
      submittedCode,
      p.language,
      p.expectedComplexity,
      p.expectedSpaceComplexity,
      p.constraints,
      p.pattern
    );

    // 3. Extract compiler & execution errors
    const compilationError = p.compileOutput || (p.primaryErrorType === 'COMPILATION_ERROR' ? (p.stderr || 'Compilation failed') : null);
    const executionError = p.runtimeError || p.stderr || null;

    // 4. Generate structured failed test explanations
    const failedTests: FailedTestAnalysis[] = [];
    const failedResults = structuredTests.filter((t) => !t.passed);

    for (const ft of failedResults) {
      const analysis = this.analyzeIndividualFailedTest(ft, submittedCode, codeLines, p, approachInfo);
      failedTests.push(analysis);
    }

    // 5. Generate What Was Done Correctly, What Went Wrong, How To Fix
    const { whatYouDidCorrectly, whatWentWrong, howToFix } = this.generateActionableFeedback(
      p,
      structuredTests,
      failedTests,
      approachInfo,
      compilationError,
      executionError
    );

    // 6. Generate Key Learning based on problem pattern & algorithm
    const keyLearning = this.generateKeyLearning(p, approachInfo);

    const primaryErrorType: FailureCategory | 'ALL_TESTS_PASSED' =
      passedTests === totalTests
        ? 'ALL_TESTS_PASSED'
        : ((p.primaryErrorType as FailureCategory) || failedTests[0]?.failureCategory || (compilationError ? 'COMPILATION_ERROR' : executionError ? 'RUNTIME_ERROR' : 'LOGICAL_ERROR'));

    return {
      problemId: p.questionId,
      problemTitle: p.title,
      pattern: p.pattern || p.topic || 'Algorithms',
      difficulty: p.difficulty || 'Medium',
      submittedCode,
      language: p.language || 'Python',
      testResults: structuredTests,
      passedTests,
      totalTests,
      verdict,
      primaryErrorType,
      executionError,
      compilationError,
      detectedApproach: approachInfo.candidateApproach,
      actualTimeComplexity: approachInfo.candidateTime,
      candidateTimeComplexity: approachInfo.candidateTime,
      actualSpaceComplexity: approachInfo.candidateSpace,
      optimalTimeComplexity: approachInfo.optimalTime,
      optimalSpaceComplexity: approachInfo.optimalSpace,
      failedTests,
      whatYouDidCorrectly,
      whatWentWrong,
      howToFix,
      complexityAnalysis: approachInfo,
      keyLearning,
    };
  }

  /**
   * Extracts test cases from execution records and question metadata
   */
  private static extractStructuredTestResults(p: CodingProblemEvidence): StructuredTestCaseResult[] {
    const results: StructuredTestCaseResult[] = [];
    const rawResults = Array.isArray(p.testCaseResults) ? p.testCaseResults : (Array.isArray((p as any).testCases) ? (p as any).testCases : []);
    const authTCs = Array.isArray(p.authoritativeTestCases) ? p.authoritativeTestCases : [];

    if (rawResults.length > 0) {
      rawResults.forEach((r: any, idx: number) => {
        const testCaseNum = idx + 1;
        const isHidden = r.hidden === true || r.isHidden === true;
        const matchingAuth = authTCs[idx] || authTCs.find((a: any) => a.id === r.testCaseId);

        let input = r.input ?? matchingAuth?.input ?? '';
        let expectedOutput = r.expectedOutput ?? r.expected ?? matchingAuth?.expectedOutput ?? matchingAuth?.expected ?? '';
        let actualOutput = r.studentOutput ?? r.actualOutput ?? r.actual ?? r.stdout ?? '';

        // Standardize string representation
        if (typeof input !== 'string') input = JSON.stringify(input);
        if (typeof expectedOutput !== 'string') expectedOutput = JSON.stringify(expectedOutput);
        if (typeof actualOutput !== 'string') actualOutput = JSON.stringify(actualOutput);

        const passed = r.passed === true || r.status?.id === 3 || r.status === 'Passed';
        const errorType = r.errorType || (r.status?.description?.includes('Error') ? r.status.description : undefined);
        const errorMessage = r.errorMessage || r.stderr || undefined;

        results.push({
          testCaseId: r.testCaseId || `tc-${testCaseNum}`,
          testCaseNumber: testCaseNum,
          visible: true,
          input,
          expectedOutput,
          actualOutput,
          passed,
          executionTime: typeof r.executionTime === 'number' ? r.executionTime : (parseFloat(r.time) || undefined),
          memoryUsage: typeof r.memory === 'number' ? r.memory : undefined,
          errorType,
          errorMessage,
        });
      });
    } else if (authTCs.length > 0) {
      // If runner didn't store per-test results (e.g. compilation error)
      authTCs.forEach((tc: any, idx: number) => {
        const testCaseNum = idx + 1;
        results.push({
          testCaseId: tc.id || tc.testCaseId || `tc-${testCaseNum}`,
          testCaseNumber: testCaseNum,
          visible: true,
          input: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input),
          expectedOutput: typeof tc.expectedOutput === 'string' ? tc.expectedOutput : JSON.stringify(tc.expectedOutput),
          actualOutput: p.compileOutput ? 'Compilation Error' : (p.runtimeError ? 'Runtime Error' : 'No Output'),
          passed: false,
          errorType: p.compileOutput ? 'COMPILATION_ERROR' : (p.runtimeError ? 'RUNTIME_ERROR' : undefined),
        });
      });
    } else {
      // Fallback single test record
      const total = p.testsTotal || 1;
      const passed = p.testsPassed || 0;
      for (let i = 1; i <= total; i++) {
        const isPass = i <= passed;
        results.push({
          testCaseId: `tc-${i}`,
          testCaseNumber: i,
          input: 'Standard test input',
          expectedOutput: 'Expected output',
          actualOutput: isPass ? 'Expected output' : (p.compileOutput || p.runtimeError || 'Wrong answer'),
          passed: isPass,
          visible: true,
        });
      }
    }

    return results;
  }

  /**
   * Analyzes an individual failed test case to classify failure type, locate code, and generate explanation.
   */
  private static analyzeIndividualFailedTest(
    tc: StructuredTestCaseResult,
    sourceCode: string,
    codeLines: string[],
    p: CodingProblemEvidence,
    approachInfo: ComplexityAnalysisResult
  ): FailedTestAnalysis {
    const isHidden = false;

    // 1. Classify failure category
    const failureCategory = this.classifyFailureCategory(tc, p, sourceCode);

    // 2. Locate line/code snippet without hallucination
    const { lineLocation, problematicLogic } = this.locateProblematicCode(
      failureCategory,
      tc,
      sourceCode,
      codeLines,
      p
    );

    // 3. Generate Why It Fails & How To Fix
    const { whyItFails, howToFix, explanation } = this.generateFailureExplanationAndFix(
      failureCategory,
      tc,
      lineLocation,
      problematicLogic,
      p,
      approachInfo,
      isHidden
    );

    return {
      testCaseNumber: tc.testCaseNumber,
      testCaseId: tc.testCaseId,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput: tc.actualOutput,
      failureCategory,
      explanation,
      problematicLogic,
      lineLocation,
      whyItFails,
      howToFix,
      visible: true,
    };
  }

  /**
   * Classifies the failure into one of the 11 supported categories
   */
  private static classifyFailureCategory(
    tc: StructuredTestCaseResult,
    p: CodingProblemEvidence,
    sourceCode: string
  ): FailureCategory {
    const errorMsg = (tc.errorMessage || tc.errorType || p.runtimeError || p.compileOutput || tc.actualOutput || '').toLowerCase();
    const actOut = (tc.actualOutput || '').trim();
    const expOut = (tc.expectedOutput || '').trim();

    // A. Compilation Error
    if (
      p.primaryErrorType === 'COMPILATION_ERROR' ||
      p.finalVerdict === 'COMPILATION_ERROR' ||
      (p as any).verdict === 'COMPILATION_ERROR' ||
      p.compileOutput ||
      errorMsg.includes('compilation error') ||
      errorMsg.includes('syntaxerror') ||
      errorMsg.includes('error: expected')
    ) {
      return 'COMPILATION_ERROR';
    }

    // B. Time Limit Exceeded
    if (
      p.primaryErrorType === 'TIME_LIMIT_EXCEEDED' ||
      p.finalVerdict === 'TIME_LIMIT_EXCEEDED' ||
      (p as any).verdict === 'TIME_LIMIT_EXCEEDED' ||
      tc.errorType === 'TIME_LIMIT_EXCEEDED' ||
      errorMsg.includes('time limit') ||
      errorMsg.includes('timed out') ||
      (tc.executionTime && tc.executionTime > 2.0)
    ) {
      return 'TIME_LIMIT_EXCEEDED';
    }

    // C. Runtime Error
    if (
      p.primaryErrorType === 'RUNTIME_ERROR' ||
      p.finalVerdict === 'RUNTIME_ERROR' ||
      (p as any).verdict === 'RUNTIME_ERROR' ||
      tc.errorType === 'RUNTIME_ERROR'
    ) {
      return 'RUNTIME_ERROR';
    }

    // D. Boundary Error (checked before generic runtime/null pointer if boundary input failed)
    const inp = tc.input.trim();
    const isBoundaryInput =
      inp === '' ||
      inp === '0' ||
      inp === '1' ||
      inp.includes('-') ||
      inp.split(/\s+/).length <= 1 ||
      (inp.split(/\s+/).every((val, _, arr) => val === arr[0]) && inp.split(/\s+/).length > 2);

    if (isBoundaryInput && (p.testsPassed || (p as any).passedTests || 0) > 0) {
      return 'BOUNDARY_ERROR';
    }

    // E. Null Pointer or Invalid Access
    if (
      errorMsg.includes('indexerror') ||
      errorMsg.includes('indexoutofbounds') ||
      errorMsg.includes('out of range') ||
      errorMsg.includes('nullpointerexception') ||
      errorMsg.includes('cannot read properties of null') ||
      errorMsg.includes('cannot read properties of undefined') ||
      errorMsg.includes('segmentation fault') ||
      errorMsg.includes('sigsegv')
    ) {
      return 'NULL_POINTER_OR_INVALID_ACCESS';
    }

    // F. Input Parsing Error
    if (
      errorMsg.includes('valueerror: invalid literal') ||
      errorMsg.includes('nosuchelementexception') ||
      errorMsg.includes('inputmismatchexception') ||
      errorMsg.includes('numberformatexception') ||
      errorMsg.includes('jsondecodeerror')
    ) {
      return 'INPUT_PARSING_ERROR';
    }

    // G. General Runtime Crash
    if (
      errorMsg.includes('zerodivisionerror') ||
      errorMsg.includes('arithmeticexception: / by zero') ||
      errorMsg.includes('recursionerror') ||
      errorMsg.includes('stackoverflowerror') ||
      errorMsg.includes('traceback (most recent call last)') ||
      p.runtimeError
    ) {
      return 'RUNTIME_ERROR';
    }

    // H. Integer Overflow
    // e.g. actual output is negative when large positive expected (> 2^31 - 1)
    const actNum = Number(actOut);
    const expNum = Number(expOut);
    if (!isNaN(actNum) && !isNaN(expNum) && actNum < 0 && expNum > 1000000000) {
      return 'INTEGER_OVERFLOW';
    }

    // I. Output Format Error
    // Ignore whitespace, newlines, brackets, commas, casing
    const stripFormat = (s: string) => s.replace(/[\s,\[\]\(\)'"]/g, '').toLowerCase();
    if (actOut !== expOut && stripFormat(actOut) === stripFormat(expOut)) {
      return 'OUTPUT_FORMAT_ERROR';
    }

    // J. Wrong Algorithm (completely off-target approach and 0 tests passed)
    if ((p.testsPassed || 0) === 0 && (p.testsTotal || 1) > 1 && !sourceCode.includes(p.pattern?.toLowerCase() || '')) {
      return 'WRONG_ALGORITHM';
    }

    // Default: Logical Error (code ran to completion but produced wrong output)
    return 'LOGICAL_ERROR';
  }

  /**
   * Identifies the real code lines and code snippet from the candidate's actual submitted code.
   * NEVER invents line numbers.
   */
  private static locateProblematicCode(
    category: FailureCategory,
    tc: StructuredTestCaseResult,
    sourceCode: string,
    codeLines: string[],
    p: CodingProblemEvidence
  ): { lineLocation: string; problematicLogic: string } {
    if (!sourceCode || codeLines.length === 0) {
      return {
        lineLocation: 'Exact code location could not be determined from the available execution evidence.',
        problematicLogic: 'No submitted source code available.',
      };
    }

    const errText = tc.errorMessage || p.runtimeError || p.compileOutput || tc.actualOutput || '';

    // 1. Traceback line extraction (Python, Java, C++, JS)
    const pyMatch = errText.match(/(?:line|Line)\s+(\d+)/);
    if (pyMatch) {
      const lineNum = parseInt(pyMatch[1], 10);
      if (lineNum >= 1 && lineNum <= codeLines.length) {
        const snippet = this.formatCodeSnippet(codeLines, lineNum);
        return {
          lineLocation: `Line ${lineNum}`,
          problematicLogic: snippet,
        };
      }
    }

    // 2. Output format error: locate the print/console.log/cout/System.out statement
    if (category === 'OUTPUT_FORMAT_ERROR') {
      for (let i = codeLines.length - 1; i >= 0; i--) {
        const line = codeLines[i];
        if (
          line.includes('print(') ||
          line.includes('console.log(') ||
          line.includes('System.out.print') ||
          line.includes('cout <<') ||
          line.includes('printf(')
        ) {
          return {
            lineLocation: `Line ${i + 1}`,
            problematicLogic: this.formatCodeSnippet(codeLines, i + 1),
          };
        }
      }
    }

    // 3. Input parsing error: locate input reading statement
    if (category === 'INPUT_PARSING_ERROR') {
      for (let i = 0; i < codeLines.length; i++) {
        const line = codeLines[i];
        if (
          line.includes('sys.stdin') ||
          line.includes('input(') ||
          line.includes('Scanner') ||
          line.includes('cin >>') ||
          line.includes('readline') ||
          line.includes('readFileSync')
        ) {
          return {
            lineLocation: `Line ${i + 1}`,
            problematicLogic: this.formatCodeSnippet(codeLines, i + 1),
          };
        }
      }
    }

    // 4. Boundary error or Logical error: locate the loop termination condition or main if-condition
    for (let i = 0; i < codeLines.length; i++) {
      const line = codeLines[i].trim();
      if ((line.startsWith('if ') || line.startsWith('if(')) && line.includes('return') && i > 3) {
        return {
          lineLocation: `Line ${i + 1}`,
          problematicLogic: this.formatCodeSnippet(codeLines, i + 1),
        };
      }
    }

    for (let i = 0; i < codeLines.length; i++) {
      const line = codeLines[i].trim();
      if (line.startsWith('for ') || line.startsWith('while ') || line.startsWith('while(') || line.startsWith('for(')) {
        return {
          lineLocation: `Line ${i + 1}`,
          problematicLogic: this.formatCodeSnippet(codeLines, i + 1),
        };
      }
    }

    return {
      lineLocation: 'Main execution block',
      problematicLogic: codeLines.slice(0, Math.min(8, codeLines.length)).map((l, idx) => `${idx + 1} | ${l}`).join('\n'),
    };
  }

  /**
   * Formats a 3-line code snippet centered around targetLine (1-based)
   */
  private static formatCodeSnippet(lines: string[], targetLine: number): string {
    const start = Math.max(0, targetLine - 2);
    const end = Math.min(lines.length, targetLine + 1);
    const snippetLines: string[] = [];

    for (let i = start; i < end; i++) {
      const lineNum = i + 1;
      const marker = lineNum === targetLine ? '>' : ' ';
      snippetLines.push(`${marker} ${lineNum.toString().padStart(3, ' ')} | ${lines[i]}`);
    }

    return snippetLines.join('\n');
  }

  /**
   * Generates evidence-grounded Why It Fails, How To Fix, and Explanation.
   */
  private static generateFailureExplanationAndFix(
    category: FailureCategory,
    tc: StructuredTestCaseResult,
    lineLocation: string,
    problematicLogic: string,
    p: CodingProblemEvidence,
    approachInfo: ComplexityAnalysisResult,
    isHidden: boolean = false
  ): { whyItFails: string; howToFix: string; explanation: string } {
    const inputDisplay = tc.input;
    const expectedDisplay = tc.expectedOutput;
    const actualDisplay = tc.actualOutput;

    switch (category) {
      case 'COMPILATION_ERROR':
        return {
          explanation: `Your code failed to compile. The compiler encountered syntax errors, missing header includes, or unmatched brackets.`,
          whyItFails: `The compilation phase terminated before execution because the compiler encountered invalid syntax or unresolved symbols in ${lineLocation}.`,
          howToFix: `Fix the syntax error shown in the compiler diagnostic message. Verify that all parentheses, braces, variable declarations, and import statements match ${p.language || 'your language'}'s specifications.`,
        };

      case 'TIME_LIMIT_EXCEEDED':
        return {
          explanation: `Your solution exceeded the execution time limit (typically 1.0–2.0s). Your current complexity is ${approachInfo.candidateTime}, while the problem requires ${approachInfo.optimalTime}.`,
          whyItFails: `For input scale defined in problem constraints (${p.constraints?.join(', ') || 'large arrays'}), your ${approachInfo.candidateApproach} performs too many repetitive operations, exceeding the maximum CPU cycle threshold.`,
          howToFix: `Optimize your algorithm to ${approachInfo.optimalApproach} to reduce time complexity to ${approachInfo.optimalTime}. Avoid nested iterations by using a hash table, two-pointer pass, or sliding window.`,
        };

      case 'NULL_POINTER_OR_INVALID_ACCESS':
        return {
          explanation: `Your program crashed with an invalid memory or array index access error (e.g. IndexError / Out of bounds).`,
          whyItFails: `At ${lineLocation}, your code attempts to access an index that is outside the valid range of the data structure (e.g. index >= length, index < 0, or accessing a null reference) when processing input: ${inputDisplay.slice(0, 80)}.`,
          howToFix: `Add boundary guards before accessing array or list elements. Ensure loops terminate at 'len - 1' or '< n' and check that collections are not empty before accessing index 0.`,
        };

      case 'INPUT_PARSING_ERROR':
        return {
          explanation: `Your program failed while reading input tokens from standard input (stdin).`,
          whyItFails: `The input reader at ${lineLocation} expected a specific token format but encountered unexpected characters or reached End-Of-File (EOF) prematurely when parsing: ${inputDisplay.slice(0, 80)}.`,
          howToFix: `Use robust stdin parsing: in Python use 'sys.stdin.read().split()', in Java use 'Scanner.hasNextInt()', and in C++ check 'while (cin >> x)' to consume all tokens cleanly without crashing.`,
        };

      case 'OUTPUT_FORMAT_ERROR':
        return {
          explanation: `Your algorithmic calculation appears correct, but your output formatting did not match the required judge output format.`,
          whyItFails: `Expected output is "${expectedDisplay.slice(0, 40)}", but your program printed "${actualDisplay.slice(0, 40)}". Notice differences in extra spaces, missing newlines, brackets, or capitalization.`,
          howToFix: `Adjust your final print statement at ${lineLocation} to match the exact output format specified in the problem examples. Strip trailing whitespace or format lists as space-separated tokens as required.`,
        };

      case 'INTEGER_OVERFLOW':
        return {
          explanation: `Your program suffered from 32-bit signed integer overflow, resulting in a wrapped negative number.`,
          whyItFails: `The calculation produces a value exceeding 2,147,483,647. Expected "${expectedDisplay.slice(0, 40)}", but your program produced "${actualDisplay.slice(0, 40)}".`,
          howToFix: `Change variable types from 32-bit 'int' to 64-bit 'long' / 'long long' (in Java/C++), or use modulo arithmetic if required by problem constraints.`,
        };

      case 'BOUNDARY_ERROR':
        return {
          explanation: `Your code failed on a boundary / edge-case test condition (e.g. empty input, single element, zero, negative numbers, or duplicate values).`,
          whyItFails: `When tested with boundary input "${inputDisplay.slice(0, 60)}", your logic at ${lineLocation} produced "${actualDisplay.slice(0, 40)}" instead of expected "${expectedDisplay.slice(0, 40)}". The code assumes non-empty inputs or strictly distinct elements.`,
          howToFix: `Add special-case guard conditions at the beginning of your function to handle inputs with 0 or 1 elements, duplicate values, or non-positive numbers before running the main algorithm.`,
        };

      case 'RUNTIME_ERROR':
        return {
          explanation: `Your code terminated abnormally with an unhandled runtime exception.`,
          whyItFails: `Execution halted with an exception (e.g., division by zero, stack overflow, or type error) at ${lineLocation} while processing: ${inputDisplay.slice(0, 60)}.`,
          howToFix: `Inspect the division, recursion base case, or type cast at ${lineLocation}. Ensure denominators are non-zero and recursive calls reach a valid base case.`,
        };

      case 'PARTIALLY_CORRECT':
      case 'LOGICAL_ERROR':
      default:
        return {
          explanation: `Your solution failed Test Case #${tc.testCaseNumber} due to a logical condition or incorrect state transition.`,
          whyItFails: `For input "${inputDisplay.slice(0, 80)}", the problem requires output "${expectedDisplay.slice(0, 40)}", but your code at ${lineLocation} produced "${actualDisplay.slice(0, 40)}". The condition evaluates incorrectly for this combination of inputs.`,
          howToFix: `Trace the execution with input "${inputDisplay.slice(0, 60)}". Review the condition at ${lineLocation} and ensure state variables update correctly after every step.`,
        };
    }
  }

  /**
   * Detects the algorithmic approach and complexity from the submitted code
   */
  private static detectApproachAndComplexity(
    sourceCode: string,
    language: string,
    expectedComplexity: string = 'O(n)',
    expectedSpaceComplexity: string = 'O(1)',
    constraints: string[] = [],
    problemPattern: string = ''
  ): ComplexityAnalysisResult {
    const code = sourceCode.toLowerCase();

    let candidateApproach = 'Linear Iterative Scan';
    let candidateTime = 'O(n)';
    let candidateSpace = 'O(1)';

    // Nested loops check: for inside for, while inside for, etc.
    const forCount = (code.match(/\bfor\b/g) || []).length;
    const hasNestedLoops =
      /for[^{}\n]*{[^{}]*for/s.test(code) ||
      /for[^\n]*:[ \t]*\n[ \t]+for/s.test(code) || // Python indentation
      /while[^{}\n]*{[^{}]*while/s.test(code) ||
      /for[^{}\n]*{[^{}]*while/s.test(code) ||
      (forCount >= 2 && (code.includes('range(len') || code.includes('nums.length') || code.includes('i < n')));

    if (hasNestedLoops) {
      candidateApproach = 'Nested Iteration (Pair/Combination Comparison)';
      candidateTime = 'O(n²)';
      candidateSpace = 'O(1)';
    } else if (code.includes('sort(') || code.includes('sorted(') || code.includes('arrays.sort') || code.includes('std::sort')) {
      candidateApproach = 'Sorting-based Approach';
      candidateTime = 'O(n log n)';
      candidateSpace = code.includes('sort') ? 'O(log n)' : 'O(n)';
    } else if (
      (code.includes('left') && code.includes('right') && (code.includes('left < right') || code.includes('left <= right'))) ||
      (code.includes('low') && code.includes('high') && code.includes('mid'))
    ) {
      if (code.includes('mid') || code.includes('// 2') || code.includes('/ 2')) {
        candidateApproach = 'Binary Search (Halving Search Space)';
        candidateTime = 'O(log n)';
        candidateSpace = 'O(1)';
      } else {
        candidateApproach = 'Two-Pointer Technique (Shrinking Window)';
        candidateTime = 'O(n)';
        candidateSpace = 'O(1)';
      }
    } else if (
      code.includes('map(') ||
      code.includes('new map') ||
      code.includes('hashmap') ||
      code.includes('dict(') ||
      code.includes('defaultdict') ||
      code.includes('unordered_map') ||
      code.includes('set(') ||
      code.includes('hashset')
    ) {
      candidateApproach = 'Hash Table / Frequency Map Lookup';
      candidateTime = 'O(n)';
      candidateSpace = 'O(n)';
    } else if (code.includes('stack') || code.includes('deque') || code.includes('pop()') || code.includes('push(')) {
      candidateApproach = 'Stack-based Traversal';
      candidateTime = 'O(n)';
      candidateSpace = 'O(n)';
    }

    const optimalTime = expectedComplexity || 'O(n)';
    const optimalSpace = expectedSpaceComplexity || 'O(1)';
    const isOptimal = candidateTime.replace(/\s+/g, '') === optimalTime.replace(/\s+/g, '');

    // Constraint evaluation
    const constraintText = (constraints || []).join(' ');
    let reason = '';
    if (isOptimal) {
      reason = `Your solution achieves optimal ${candidateTime} time complexity, which easily executes within the typical 1.0s limit for the problem constraints.`;
    } else if (candidateTime === 'O(n²)' && optimalTime !== 'O(n²)') {
      if (constraintText.includes('10^5') || constraintText.includes('100000') || constraintText.includes('10⁵')) {
        reason = `Problem constraints specify N up to 10⁵. An O(n²) solution requires ~10¹⁰ operations, which will exceed the 1-second execution limit (~10⁸ ops/sec). Switching to ${optimalTime} reduces operations to ~10⁵.`;
      } else {
        reason = `While an O(n²) solution may pass small sample inputs, it does redundant pairwise comparisons. An optimal ${optimalTime} approach eliminates these redundant checks.`;
      }
    } else {
      reason = `Your approach has ${candidateTime} complexity. The optimal algorithm achieves ${optimalTime} by maintaining state during traversal.`;
    }

    const optimalApproachName = this.inferOptimalApproachName(optimalTime, candidateApproach, problemPattern);

    return {
      candidateApproach,
      candidateTime,
      candidateSpace,
      optimalApproach: optimalApproachName,
      optimalTime,
      optimalSpace,
      isOptimal,
      complexityVerdict: isOptimal ? 'OPTIMAL' : 'SUBOPTIMAL',
      reason,
    };
  }

  private static inferOptimalApproachName(optimalTime: string, candidateApproach: string, problemPattern?: string): string {
    const pattern = (problemPattern || '').toLowerCase();
    if (pattern.includes('two pointer') || pattern.includes('two-pointer')) {
      return 'Two-Pointer Technique (Shrinking Window)';
    }
    if (pattern.includes('sliding window')) {
      return 'Sliding Window Technique (Dynamic Window)';
    }
    if (pattern.includes('hash') || pattern.includes('map')) {
      return 'Single Linear Pass with Hash Table Lookup';
    }
    if (pattern.includes('binary search') || (optimalTime.includes('log n') && !optimalTime.includes('n log n'))) {
      return 'Binary Search (Logarithmic Division)';
    }
    if (optimalTime.includes('n log n')) {
      return 'Divide & Conquer / Optimal Sorting';
    }
    if (optimalTime.includes('O(n)')) {
      if (candidateApproach.includes('Nested')) {
        return 'Two-Pointer Technique / Linear Scan with State';
      }
      return 'Single Linear Pass with Hash Lookup';
    }
    if (optimalTime.includes('O(1)')) {
      return 'Direct Mathematical Formula';
    }
    return 'Optimal Algorithmic Pattern';
  }

  /**
   * Generates actionable feedback cards: What was done correctly, What went wrong, How to fix
   */
  private static generateActionableFeedback(
    p: CodingProblemEvidence,
    tests: StructuredTestCaseResult[],
    failedTests: FailedTestAnalysis[],
    approachInfo: ComplexityAnalysisResult,
    compilationError: string | null,
    executionError: string | null
  ): { whatYouDidCorrectly: string[]; whatWentWrong: string[]; howToFix: string[] } {
    const whatYouDidCorrectly: string[] = [];
    const whatWentWrong: string[] = [];
    const howToFix: string[] = [];

    const passedCount = tests.filter((t) => t.passed).length;
    const totalCount = tests.length;

    // What was done correctly
    if (p.submittedCode && p.submittedCode.trim().length > 0) {
      whatYouDidCorrectly.push(`Successfully submitted code structure in ${p.language || 'the selected language'}.`);
    }
    if (!compilationError) {
      whatYouDidCorrectly.push(`Code compiles cleanly without syntax or import errors.`);
    }
    if (passedCount > 0) {
      whatYouDidCorrectly.push(`Correctly solved ${passedCount} of ${totalCount} test cases including baseline examples.`);
    }
    if (approachInfo.candidateApproach.includes('Two-Pointer') || approachInfo.isOptimal) {
      whatYouDidCorrectly.push(`Adopted an optimal linear pattern (${approachInfo.candidateApproach}).`);
    }

    // What went wrong
    if (compilationError) {
      whatWentWrong.push(`Compilation failed: ${compilationError.slice(0, 100)}.`);
    } else if (executionError) {
      whatWentWrong.push(`Runtime crash: ${executionError.slice(0, 100)}.`);
    } else if (p.finalVerdict === 'TIME_LIMIT_EXCEEDED' || (p as any).verdict === 'TIME_LIMIT_EXCEEDED') {
      whatWentWrong.push(`Time limit exceeded: Your code exceeded the execution time limit (typically 1.0–2.0s).`);
    } else if (failedTests.length > 0) {
      if (passedCount > 0 && passedCount < totalCount) {
        whatWentWrong.push(`Solution passed ${passedCount} of ${totalCount} test cases. ${totalCount - passedCount} test case(s) failed.`);
      }
      failedTests.forEach((ft) => {
        if (ft.failureCategory === 'TIME_LIMIT_EXCEEDED') {
          whatWentWrong.push(`Test Case #${ft.testCaseNumber} timed out: Execution exceeded the time limit.`);
        } else {
          whatWentWrong.push(`Test Case #${ft.testCaseNumber} failed (${ft.failureCategory}): Expected "${ft.expectedOutput.slice(0, 30)}", got "${ft.actualOutput.slice(0, 30)}".`);
        }
      });
    }

    if (!approachInfo.isOptimal) {
      whatWentWrong.push(`Algorithmic complexity is ${approachInfo.candidateTime} (${approachInfo.candidateApproach}) instead of optimal ${approachInfo.optimalTime}.`);
    }

    // How to fix
    if (compilationError) {
      howToFix.push(`Resolve compiler syntax errors and verify variable types.`);
      howToFix.push(`Test with a small local example to ensure correct compilation.`);
    } else if (failedTests.length > 0) {
      const firstFailure = failedTests[0];
      howToFix.push(firstFailure.howToFix);
      if (!approachInfo.isOptimal) {
        howToFix.push(`Refactor algorithm to ${approachInfo.optimalApproach} to reach ${approachInfo.optimalTime}.`);
      }
      howToFix.push(`Verify edge cases such as empty input, duplicate elements, and boundary values.`);
    } else {
      howToFix.push(`Solution is accepted! To further improve, review variable naming and modularize logic into clean helper functions.`);
    }

    return { whatYouDidCorrectly, whatWentWrong, howToFix };
  }

  /**
   * Generates a concise key learning concept
   */
  private static generateKeyLearning(p: CodingProblemEvidence, approachInfo: ComplexityAnalysisResult): string {
    const pattern = (p.pattern || p.topic || '').toLowerCase();

    if (pattern.includes('two pointer') || p.title.toLowerCase().includes('container') || p.title.toLowerCase().includes('water')) {
      return 'The Two-Pointer pattern eliminates redundant comparisons by moving the pointer associated with the bottleneck constraint at each step, reducing time complexity from O(n²) to O(n).';
    }
    if (pattern.includes('sliding window')) {
      return 'The Sliding Window technique avoids recalculating overlapping subproblems by expanding and contracting window boundaries dynamically in O(n) time.';
    }
    if (pattern.includes('binary search')) {
      return 'Binary Search halves the search space at each iteration, achieving O(log n) efficiency when the data or answer monotonic property is satisfied.';
    }
    if (pattern.includes('hash') || pattern.includes('map')) {
      return 'Using a Hash Map trades O(n) auxiliary space for O(1) average-time lookups, converting an O(n²) nested search into a single O(n) pass.';
    }
    if (pattern.includes('prefix sum')) {
      return 'Prefix Sum precomputes cumulative state in O(n) time, enabling O(1) range query resolution.';
    }
    return `Mastering ${p.pattern || 'this algorithmic pattern'} allows reducing unnecessary state recalculation and choosing the optimal data structure for problem constraints.`;
  }


  /**
   * Calls Groq LLM to act as a DSA tutor:
   *   - Explains the candidate's actual code
   *   - Provides brute-force and optimal approaches with COMPLETE programs
   *   - Only generates correctedCode when the submission is not accepted
   *   - Derives complexity from the actual submitted code
   * Returns null if the LLM is unavailable (never fabricates).
   */
  private static async callGroqForTutorAnalysis(
    attempt: {
      language: string;
      sourceCode: string | null;
      submissionStatus: 'ACCEPTED' | 'INCORRECT' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR';
      passedCount: number;
      totalCount: number;
      compileError?: string | null;
      runtimeError?: string | null;
      testResults?: any[];
      primaryErrorType?: string | null;
    },
    problemMeta: {
      title: string;
      description?: string;
      constraints?: any[];
      examples?: any[];
      pattern?: string;
      topic?: string;
      difficulty?: string;
      expectedComplexity?: string;
      expectedSpaceComplexity?: string;
      authoritativeTestCases?: any[];
    }
  ): Promise<Omit<CodingAttemptAIAnalysis, 'analysisVersion' | 'model' | 'promptVersion' | 'generatedAt' | 'status' | 'submissionId' | 'attemptNumber' | 'submissionStatus'> | null> {
    if (!_isLLMAvailable()) return null;

    const lang = attempt.language || 'python';
    const sourceCode = attempt.sourceCode || '';
    if (!sourceCode.trim()) return null;

    const isAccepted = attempt.submissionStatus === 'ACCEPTED';
    const isCompilationError = attempt.submissionStatus === 'COMPILATION_ERROR';
    const isRuntimeError = attempt.submissionStatus === 'RUNTIME_ERROR';

    // Collect up to 3 failed test cases as authoritative evidence
    const failedTests = (attempt.testResults || []).filter((t: any) => !t.passed).slice(0, 3);
    const failedEvidence = failedTests.length > 0
      ? failedTests.map((t: any, i: number) =>
          `Failed Test ${i + 1}:\n  Input: ${t.input ?? '(not shown)'}\n  Expected: ${t.expectedOutput ?? '(not shown)'}\n  Actual:   ${t.actualOutput ?? '(empty)'}${t.errorMessage ? `\n  Error: ${t.errorMessage}` : ''}`
        ).join('\n\n')
      : '';

    const constraintsText = Array.isArray(problemMeta.constraints) && problemMeta.constraints.length > 0
      ? problemMeta.constraints.map((c: any) => (typeof c === 'string' ? c : JSON.stringify(c))).join('\n')
      : 'See problem statement';

    const examplesText = Array.isArray(problemMeta.examples) && problemMeta.examples.length > 0
      ? problemMeta.examples.slice(0, 2).map((e: any) =>
          `Input: ${e.input ?? e.inputText ?? JSON.stringify(e)}\nOutput: ${e.output ?? e.expectedOutput ?? e.outputText ?? ''}`
        ).join('\n---\n')
      : '';

    const errorContext = [
      attempt.compileError ? `Compilation Error:\n${attempt.compileError}` : '',
      attempt.runtimeError ? `Runtime Error:\n${attempt.runtimeError}` : '',
    ].filter(Boolean).join('\n');

    const verdictLine = isAccepted
      ? `ACCEPTED â€” ${attempt.passedCount}/${attempt.totalCount} tests passed`
      : isCompilationError
        ? `COMPILATION_ERROR â€” Code did not compile`
        : isRuntimeError
          ? `RUNTIME_ERROR â€” ${attempt.passedCount}/${attempt.totalCount} tests passed before crash`
          : `INCORRECT â€” ${attempt.passedCount}/${attempt.totalCount} tests passed`;

    const expectedTime = problemMeta.expectedComplexity || 'Not specified';
    const expectedSpace = problemMeta.expectedSpaceComplexity || 'Not specified';

    const systemPrompt = `You are an expert DSA tutor and competitive programming coach. Your role is to provide EDUCATIONAL analysis of a candidate's coding submission, NOT just to correct it.

CRITICAL RULES YOU MUST FOLLOW:
1. You MUST explain the candidate's ACTUAL submitted code — do NOT replace it silently.
2. You are NOT the judge. The authoritative execution result is provided. Do NOT override it.
3. submissionStatus is determined by the judge — accept it as ground truth.
4. If submissionStatus is ACCEPTED: correction.required = false, correction.correctedCode = null.
5. If submissionStatus is INCORRECT/COMPILATION_ERROR/RUNTIME_ERROR: correction.required = true, provide correctedCode.
6. correctedCode MUST be a COMPLETE executable stdin/stdout program in ${lang} — never pseudocode or snippets.
7. bruteForce.code and optimalApproach.code MUST be COMPLETE executable programs in ${lang}.
8. Derive complexity from the candidate's ACTUAL code — NEVER contradict the code.
9. Consider expected problem complexity (Time: ${expectedTime}, Space: ${expectedSpace}) as problem context, but derive candidate complexity from their actual implementation.
10. Do NOT invent test results, scores, or execution data.
11. Respond ONLY with a valid JSON object — no markdown fences, no text outside JSON.
12. Properly escape all strings: use \\n for newlines inside JSON string values.
13. If correctedCode or brute-force code is unavailable, set to null — never use placeholders.

REQUIRED JSON SCHEMA:
{
  "submissionAnalysis": {
    "verdict": "<e.g. 'Accepted — 10/10 tests passed'>",
    "explanation": "<Explain what the judge result means and why>",
    "candidateApproach": "<Name and describe the algorithm/pattern the candidate used>",
    "codeExplanation": "<Step-by-step explanation of the candidate's ACTUAL submitted code — variables, loops, logic, data structures>",
    "timeComplexity": "<e.g. O(n) — derived from candidate code>",
    "spaceComplexity": "<e.g. O(n) — derived from candidate code>"
  },
  "bruteForce": {
    "available": true,
    "idea": "<Simple, beginner-friendly explanation of the naive approach>",
    "steps": ["<step 1>", "<step 2>", "..."],
    "code": "<COMPLETE executable ${lang} program solving this ACTUAL problem via brute force, or null>",
    "timeComplexity": "<e.g. O(n²)>",
    "spaceComplexity": "<e.g. O(1)>"
  },
  "optimalApproach": {
    "idea": "<Simple explanation of the best approach>",
    "steps": ["<step 1>", "<step 2>", "..."],
    "code": "<COMPLETE executable ${lang} program using the optimal approach, or null>",
    "timeComplexity": "<e.g. O(n)>",
    "spaceComplexity": "<e.g. O(n)>",
    "whyOptimal": "<How this improves over brute force — with specific complexity comparison>"
  },
  "correction": {
    "required": <true if INCORRECT/COMPILATION_ERROR/RUNTIME_ERROR, false if ACCEPTED>,
    "rootCause": "<Precise explanation of the actual bug based on failed test evidence, or null if ACCEPTED>",
    "correctedCode": "<COMPLETE corrected executable ${lang} program, or null if ACCEPTED or if unable to determine>",
    "explanation": "<Why the corrected code fixes the bug, or null if ACCEPTED>"
  },
  "optimizationReview": {
    "status": "<OPTIMAL or CAN_BE_OPTIMIZED>",
    "explanation": "<If OPTIMAL: confirm. If CAN_BE_OPTIMIZED: state current vs improved complexity and explain why>"
  },
  "keyConcept": "<The key DSA concept this problem teaches>",
  "bugPrevention": "<Concrete actionable advice to avoid this class of bug in the future>"
}`;

    const userPrompt = `=== PROBLEM ===
Title: ${problemMeta.title}
Difficulty: ${problemMeta.difficulty || 'Medium'}
Pattern/Topic: ${problemMeta.pattern || problemMeta.topic || 'Algorithms'}
Expected Optimal Time Complexity: ${expectedTime}
Expected Optimal Space Complexity: ${expectedSpace}
${problemMeta.description ? `\nDescription:\n${problemMeta.description}` : ''}
${constraintsText ? `\nConstraints:\n${constraintsText}` : ''}
${examplesText ? `\nExamples:\n${examplesText}` : ''}

=== CANDIDATE SUBMISSION ===
Language: ${lang}
Submission Status (AUTHORITATIVE — from judge): ${verdictLine}

Candidate's Submitted Code:
\`\`\`${lang}
${sourceCode}
\`\`\`

${errorContext ? `=== ERRORS ===\n${errorContext}\n` : ''}${failedEvidence ? `=== FAILED TEST EVIDENCE (authoritative) ===\n${failedEvidence}\n` : ''}
Provide a complete educational DSA tutor analysis as per the JSON schema.`;

    const executeGroqCall = async (extraPromptNotice = ''): Promise<any | null> => {
      try {
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: extraPromptNotice ? `${userPrompt}\n\nIMPORTANT: ${extraPromptNotice}` : userPrompt },
        ];
        const response = await axios.post(
          _GROQ_API_URL,
          {
            model: _GROQ_MODEL,
            messages,
            max_tokens: 8192,
            temperature: 0.1,
          },
          {
            headers: {
              Authorization: `Bearer ${_getLLMKey()}`,
              'Content-Type': 'application/json',
            },
            timeout: 60000,
          }
        );

        const raw = response.data?.choices?.[0]?.message?.content?.trim() || '';
        if (!raw) return null;

        let jsonStr = raw;
        const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) jsonStr = fenceMatch[1].trim();
        else {
          const start = raw.indexOf('{');
          const end = raw.lastIndexOf('}');
          if (start !== -1 && end !== -1) jsonStr = raw.substring(start, end + 1);
        }

        return JSON.parse(jsonStr);
      } catch (err: any) {
        console.error('[CodingDiagnosticEngine] Groq API call failed:', {
          status: err.response?.status,
          error: err.response?.data?.error || err.message,
          model: _GROQ_MODEL,
        });
        return null;
      }
    };

    try {
      let parsed = await executeGroqCall();
      if (!parsed) {
        // Retry once with strict formatting notice if first call failed
        parsed = await executeGroqCall('Your previous response was not valid JSON. You MUST return ONLY a parseable raw JSON object.');
      }
      if (!parsed) return null;

      // Safety guards — reject stub code
      const isStub = (s: string | null) =>
        !s || s.trim().length < 30 || /^(print\("hello"\)|console\.log\("hello"\)|pass|TODO)/.test(s.trim());

      const cc = parsed.correction?.correctedCode || null;
      const bfCode = parsed.bruteForce?.code || null;
      const optCode = parsed.optimalApproach?.code || null;

      return {
        submissionAnalysis: {
          verdict: parsed.submissionAnalysis?.verdict || verdictLine,
          explanation: parsed.submissionAnalysis?.explanation || '',
          candidateApproach: parsed.submissionAnalysis?.candidateApproach || '',
          codeExplanation: parsed.submissionAnalysis?.codeExplanation || '',
          timeComplexity: parsed.submissionAnalysis?.timeComplexity || 'O(n)',
          spaceComplexity: parsed.submissionAnalysis?.spaceComplexity || 'O(1)',
        },
        bruteForce: {
          available: parsed.bruteForce?.available !== false,
          idea: parsed.bruteForce?.idea || '',
          steps: Array.isArray(parsed.bruteForce?.steps) ? parsed.bruteForce.steps : [],
          code: isStub(bfCode) ? null : bfCode,
          timeComplexity: parsed.bruteForce?.timeComplexity || '',
          spaceComplexity: parsed.bruteForce?.spaceComplexity || '',
        },
        optimalApproach: {
          idea: parsed.optimalApproach?.idea || '',
          steps: Array.isArray(parsed.optimalApproach?.steps) ? parsed.optimalApproach.steps : [],
          code: isStub(optCode) ? null : optCode,
          timeComplexity: parsed.optimalApproach?.timeComplexity || '',
          spaceComplexity: parsed.optimalApproach?.spaceComplexity || '',
          whyOptimal: parsed.optimalApproach?.whyOptimal || '',
        },
        correction: {
          required: parsed.correction?.required === true,
          rootCause: parsed.correction?.rootCause || null,
          correctedCode: isStub(cc) ? null : cc,
          explanation: parsed.correction?.explanation || null,
          verificationStatus: (parsed.correction?.required && !isStub(cc)) ? 'UNVERIFIED' : null,
        },
        optimizationReview: {
          status: parsed.optimizationReview?.status === 'CAN_BE_OPTIMIZED' ? 'CAN_BE_OPTIMIZED' : 'OPTIMAL',
          explanation: parsed.optimizationReview?.explanation || '',
        },
        keyConcept: parsed.keyConcept || '',
        bugPrevention: parsed.bugPrevention || '',
        // Legacy backward-compat
        whyItWorks: isAccepted ? (parsed.submissionAnalysis?.explanation || '') : undefined,
      };
    } catch (err: any) {
      console.warn('[CodingDiagnosticEngine] Tutor LLM call failed:', err?.message || err);
      return null;
    }
  }

  /**
   * Generates comprehensive attempt-specific AI Coding Tutor analysis.
   * Cached on InterviewExecutionRecord.aiAnalysis — never overwritten for existing records.
   *
   * THE JUDGE IS THE SOLE AUTHORITY for passedCount, totalCount, and submission status.
   * This method only reads those values — it never modifies them.
   */
  static async analyzeAttempt(
    attempt: {
      submissionId: string;
      attemptNumber: number;
      language: string;
      sourceCode: string | null;
      status: string;
      passedCount: number;
      totalCount?: number;
      totalTests?: number;
      executionTime?: number | null;
      compileError?: string | null;
      runtimeError?: string | null;
      testResults?: any[];
      primaryErrorType?: string | null;
    },
    problemMeta: {
      problemId: string;
      title: string;
      description?: string;
      pattern?: string;
      topic?: string;
      difficulty?: string;
      constraints?: any[];
      examples?: any[];
      expectedComplexity?: string;
      expectedSpaceComplexity?: string;
      authoritativeTestCases?: any[];
    }
  ): Promise<CodingAttemptAIAnalysis> {
    const totalCount = typeof attempt.totalCount === 'number' ? attempt.totalCount : (attempt.totalTests || 0);

    // ── Submission status comes EXCLUSIVELY from the judge ──────────────────
    let submissionStatus: 'ACCEPTED' | 'INCORRECT' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR';
    if (attempt.compileError) {
      submissionStatus = 'COMPILATION_ERROR';
    } else if (attempt.runtimeError && attempt.passedCount < totalCount) {
      submissionStatus = 'RUNTIME_ERROR';
    } else if (
      attempt.status === 'ACCEPTED' ||
      attempt.status === 'PASSED' ||
      (attempt.passedCount === totalCount && totalCount > 0)
    ) {
      submissionStatus = 'ACCEPTED';
    } else {
      submissionStatus = 'INCORRECT';
    }

    const isAccepted = submissionStatus === 'ACCEPTED';
    const sourceCode = attempt.sourceCode || '';
    const lang = (attempt.language || 'python').toLowerCase();
    const pattern = problemMeta.pattern || problemMeta.topic || 'Algorithms';

    // Run static diagnostic (rule-based — no LLM, no scoring changes)
    const probEvidence: CodingProblemEvidence = {
      questionId: problemMeta.problemId,
      title: problemMeta.title,
      topic: problemMeta.topic || pattern,
      pattern,
      difficulty: problemMeta.difficulty || 'Medium',
      expectedComplexity: problemMeta.expectedComplexity || 'O(n)',
      expectedSpaceComplexity: problemMeta.expectedSpaceComplexity || 'O(1)',
      totalTests: totalCount,
      hasSubmitted: true,
      finalVerdict: isAccepted ? 'ACCEPTED' : (attempt.passedCount > 0 ? 'PARTIALLY_SOLVED' : 'FAILED'),
      finalScore: isAccepted ? 100 : Math.round((attempt.passedCount / Math.max(1, totalCount)) * 100),
      testsPassed: attempt.passedCount,
      testsTotal: totalCount,
      runCount: 0,
      submitCount: 1,
      totalAttempts: attempt.attemptNumber,
      language: attempt.language,
      submittedCode: sourceCode,
      compileOutput: attempt.compileError || null,
      runtimeError: attempt.runtimeError || null,
      stdout: null,
      stderr: attempt.runtimeError || null,
      primaryErrorType: attempt.primaryErrorType || null,
      executionTime: attempt.executionTime || null,
      memory: null,
      testCaseResults: attempt.testResults || null,
      authoritativeTestCases: problemMeta.authoritativeTestCases || [],
      bestResult: {
        attemptNumber: attempt.attemptNumber,
        passedCount: attempt.passedCount,
        totalCount,
        status: attempt.status,
        score: isAccepted ? 100 : Math.round((attempt.passedCount / Math.max(1, totalCount)) * 100),
        verdictText: isAccepted ? 'ACCEPTED' : (attempt.passedCount > 0 ? 'PARTIALLY_SOLVED' : 'FAILED'),
      },
      attempts: [],
      runHistory: [],
      submitHistory: [],
    };

    const diag = this.analyze(probEvidence);
    const approachInfo = diag.complexityAnalysis;

    // ── LLM Tutor Analysis ──────────────────────────────────────────────────
    const tutorResult = await this.callGroqForTutorAnalysis(
      {
        language: attempt.language,
        sourceCode,
        submissionStatus,
        passedCount: attempt.passedCount,
        totalCount,
        compileError: attempt.compileError,
        runtimeError: attempt.runtimeError,
        testResults: attempt.testResults,
        primaryErrorType: attempt.primaryErrorType,
      },
      {
        title: problemMeta.title,
        description: problemMeta.description,
        constraints: problemMeta.constraints,
        examples: problemMeta.examples,
        pattern: problemMeta.pattern,
        topic: problemMeta.topic,
        difficulty: problemMeta.difficulty,
        expectedComplexity: problemMeta.expectedComplexity,
        expectedSpaceComplexity: problemMeta.expectedSpaceComplexity,
        authoritativeTestCases: problemMeta.authoritativeTestCases,
      }
    );

    // ── Build fallback values from rule-based diagnostic ────────────────────
    const verdictLine = isAccepted
      ? `Accepted — ${attempt.passedCount}/${totalCount} tests passed`
      : submissionStatus === 'COMPILATION_ERROR'
        ? `Compilation Error — Code did not compile`
        : submissionStatus === 'RUNTIME_ERROR'
          ? `Runtime Error — ${attempt.passedCount}/${totalCount} tests passed before crash`
          : `Incorrect — ${attempt.passedCount}/${totalCount} tests passed`;

    const fallbackExplanation = isAccepted
      ? `Your algorithm correctly satisfies all test specifications using ${approachInfo.candidateApproach}.`
      : diag.whatWentWrong?.join(' ') || `Submission failed: ${verdictLine}`;

    const fallbackBugCause = diag.failedTests?.[0]?.whyItFails || 'The submitted code produced unexpected output on one or more test cases.';

    const finalKeyConcept = tutorResult?.keyConcept || diag.keyLearning || `${pattern} — Algorithmic Pattern`;
    const finalBugPrevention = tutorResult?.bugPrevention || 'Always verify boundary conditions, edge cases, and input parsing before submitting.';

    // ── Build legacy optimization field for backward-compat ─────────────────
    const isOptimal = approachInfo.isOptimal;
    const legacyOptimization = isAccepted ? {
      currentComplexity: approachInfo.candidateTime || 'O(n)',
      suggestedComplexity: approachInfo.optimalTime || 'O(n)',
      description: isOptimal
        ? 'No meaningful asymptotic improvement was identified.'
        : `Transition from ${approachInfo.candidateApproach} to ${approachInfo.optimalApproach}.`,
      whyBetter: approachInfo.reason || 'Avoids redundant nested iterations.',
      isAlreadyOptimal: isOptimal,
    } : undefined;

    if (tutorResult) {
      // ── Full LLM-powered tutor result ─────────────────────────────────────
      return {
        analysisVersion: TUTOR_ANALYSIS_VERSION,
        model: `groq/${_GROQ_MODEL}`,
        promptVersion: TUTOR_PROMPT_VERSION,
        generatedAt: new Date().toISOString(),
        status: 'COMPLETED',
        submissionId: attempt.submissionId,
        attemptNumber: attempt.attemptNumber,
        submissionStatus,
        submissionAnalysis: tutorResult.submissionAnalysis,
        bruteForce: tutorResult.bruteForce,
        optimalApproach: tutorResult.optimalApproach,
        correction: tutorResult.correction,
        optimizationReview: tutorResult.optimizationReview,
        keyConcept: finalKeyConcept,
        bugPrevention: finalBugPrevention,
        // Legacy
        whyItWorks: tutorResult.whyItWorks,
        optimization: legacyOptimization,
      };
    }

    // ── LLM unavailable: mark UNAVAILABLE honestly (Part 11) ───────────────
    console.warn('[CodingDiagnosticEngine] LLM unavailable — marking status UNAVAILABLE (no fake COMPLETED).');
    return {
      analysisVersion: TUTOR_ANALYSIS_VERSION,
      model: 'CodingDiagnosticEngine-v2 (unavailable)',
      promptVersion: '0.0',
      generatedAt: new Date().toISOString(),
      status: 'UNAVAILABLE',
      submissionId: attempt.submissionId,
      attemptNumber: attempt.attemptNumber,
      submissionStatus,
      submissionAnalysis: {
        verdict: verdictLine,
        explanation: 'AI analysis is currently unavailable for this submission. Your judge result and submission evidence are still available.',
        candidateApproach: null as any,
        codeExplanation: 'AI analysis is currently unavailable for this submission.',
        timeComplexity: null as any,
        spaceComplexity: null as any,
      },
      bruteForce: {
        available: false,
        idea: null as any,
        steps: [],
        code: null,
        timeComplexity: null as any,
        spaceComplexity: null as any,
      },
      optimalApproach: {
        idea: null as any,
        steps: [],
        code: null,
        timeComplexity: null as any,
        spaceComplexity: null as any,
        whyOptimal: null as any,
      },
      correction: {
        required: !isAccepted,
        rootCause: null,
        correctedCode: null,
        explanation: null,
        verificationStatus: null,
      },
      optimizationReview: null as any,
      keyConcept: null as any,
      bugPrevention: null as any,
      whyItWorks: undefined,
      optimization: null as any,
    };
  }
}
