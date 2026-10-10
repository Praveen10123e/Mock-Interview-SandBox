import { ExecutionPayload, ExecutionResult, TestCase, TestCaseResult } from './ExecutionContract';
import { ExecutionValidator } from './ExecutionValidator';
import { TestCaseRunner } from './TestCaseRunner';

// ============================================================
// LANGUAGE LOOKUP
// ============================================================
const JUDGE0_LANG_KEY: Record<number, string> = {
  71: 'python',
  93: 'javascript',
  63: 'javascript',
  62: 'java',
  54: 'cpp',
  50: 'c',
};

// ============================================================
// TYPE DEFINITIONS
// ============================================================
export interface NormalizedTestInput {
  displayInput: string;   // What the UI shows to the candidate
  stdin: string;          // EXACT text sent to Judge0 stdin
}

// ============================================================
// CHAR ARRAY DETECTION
// A value is a char array if it's an array of single-character strings
// ============================================================
function isCharArray(val: any): boolean {
  return (
    Array.isArray(val) &&
    val.length > 0 &&
    val.every((item: any) => typeof item === 'string' && item.length === 1)
  );
}

function argToStdinLine(arg: any): string {
  // Char array: ["h","e","l","l","o"] → "hello"
  if (isCharArray(arg)) {
    return (arg as string[]).join('');
  }
  // 1D array of numbers: [7, 1, 5, 3, 6, 4] → "6\n7 1 5 3 6 4"
  if (Array.isArray(arg) && arg.length > 0 && arg.every((item) => typeof item === 'number')) {
    return `${arg.length}\n${arg.join(' ')}`;
  }
  // 1D array of strings: ["leet", "code"] → "2\nleet\ncode"
  if (Array.isArray(arg) && arg.length > 0 && arg.every((item) => typeof item === 'string')) {
    return `${arg.length}\n${arg.join('\n')}`;
  }
  // 2D array: serialize directly as JSON representation without inferring matrix dimensions
  if (Array.isArray(arg) && arg.length > 0 && Array.isArray(arg[0])) {
    return JSON.stringify(arg);
  }
  // Empty array
  if (Array.isArray(arg) && arg.length === 0) {
    return '0';
  }
  // Primitive string: "hello" → "hello" (no JSON quoting)
  if (typeof arg === 'string') {
    return arg;
  }
  // Number, boolean, etc.
  if (typeof arg === 'number' || typeof arg === 'boolean') {
    return String(arg);
  }
  // Arrays and objects → JSON
  return JSON.stringify(arg);
}

// ============================================================
// PARSE RAW INPUT → ORDERED ARG LIST
// Handles all database storage formats:
//   - Primitive: 5 → [5]
//   - Plain string: "hello" → ["hello"]
//   - Char array stored direct: ["h","e","l","l","o"] → [["h","e","l","l","o"]]
//   - arg0/arg1 wrappers: {arg0: [...]} → [[...]]
//   - named params: {nums: [...], target: 9} → [[...], 9]
//   - args list: {args: [...]} → [...]
// ============================================================
function extractArgs(rawInput: any): any[] {
  let parsed = rawInput;

  // If it's a JSON string, parse it first
  if (typeof rawInput === 'string') {
    const trimmed = rawInput.trim();
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        // plain string, treat as single arg
        return [rawInput];
      }
    } else {
      return [rawInput];
    }
  }

  if (parsed === null || parsed === undefined) return [];

  // Plain array (including char arrays)
  if (Array.isArray(parsed)) {
    return [parsed];
  }

  if (typeof parsed === 'object') {
    // {args: [...]} wrapper
    if (Array.isArray(parsed.args)) {
      return parsed.args;
    }

    const keys = Object.keys(parsed);

    // {arg0: ..., arg1: ...} numeric wrapper
    if (keys.length > 0 && keys.every((k) => /^arg\d+$/i.test(k))) {
      const sorted = keys.sort((a, b) => {
        const na = parseInt(a.replace(/arg/i, ''), 10);
        const nb = parseInt(b.replace(/arg/i, ''), 10);
        return na - nb;
      });
      return sorted.map((k) => parsed[k]);
    }

    // {input: ...} meta-wrapper
    if (parsed.input !== undefined) {
      return extractArgs(parsed.input);
    }

    // Named parameter object: {nums: [...], target: 9}
    return Object.values(parsed);
  }

  // Primitive (number, boolean)
  return [parsed];
}

// ============================================================
// NORMALIZE TEST INPUT
// Takes the raw database test case input and returns:
//   displayInput: human-readable representation for UI
//   stdin: EXACT text that will be sent to Judge0
// ============================================================
export function normalizeTestInput(rawInput: any, executionType: string = 'STDIN_PROGRAM'): NormalizedTestInput {
  // CONTRACT: For STDIN_PROGRAM, if rawInput is already a string, preserve it EXACTLY unchanged.
  // There must be ZERO input transformation between testCases[].input and Judge0 stdin.
  if (typeof rawInput === 'string') {
    return { displayInput: rawInput, stdin: rawInput };
  }

  if (rawInput === null || rawInput === undefined) {
    return { displayInput: '', stdin: '' };
  }

  // If rawInput is an object, check for single-key parameter wrappers
  if (typeof rawInput === 'object' && !Array.isArray(rawInput)) {
    const keys = Object.keys(rawInput);
    if (keys.length === 1 && (keys[0] === 'intervals' || keys[0] === 'arg0' || keys[0] === 'input')) {
      const inner = rawInput[keys[0]];
      if (typeof inner === 'string') {
        return { displayInput: inner, stdin: inner };
      }
      const jsonStr = JSON.stringify(inner);
      return { displayInput: jsonStr, stdin: jsonStr };
    }
  }

  const args = extractArgs(rawInput);

  if (args.length === 0) {
    return { displayInput: '', stdin: '' };
  }

  // Build stdin: each arg on its own line
  const stdinLines = args.map(argToStdinLine);
  const stdin = stdinLines.join('\n');

  // Build display: show logical representation for UI
  // For char arrays, show ["h","e","l","l","o"] in the UI (logical form)
  // but stdin gets "hello"
  const displayLines = args.map((arg) => {
    if (isCharArray(arg)) return JSON.stringify(arg);
    if (typeof arg === 'string') return arg;
    return JSON.stringify(arg);
  });
  const displayInput = displayLines.join('\n');

  return { displayInput, stdin };
}

// ============================================================
// NORMALIZE DISPLAY OUTPUT
// Formats the expected/actual output for UI display
// ============================================================
export function normalizeDisplayOutput(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // Try parse JSON or Python-style single-quoted arrays
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      // Try standard JSON first
      try {
        const p = JSON.parse(trimmed);
        return JSON.stringify(p);
      } catch {
        // Try Python single-quote conversion
        if (trimmed.includes("'") && !trimmed.includes('"')) {
          const jsonStr = trimmed.replace(/'/g, '"');
          try {
            const p = JSON.parse(jsonStr);
            return JSON.stringify(p);
          } catch {
            return trimmed;
          }
        }
        return trimmed;
      }
    }
    return trimmed;
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return String(val);
}

// ============================================================
// STRING NORMALIZATION FOR COMPARISON
// Normalize line endings, trim, etc.
// ============================================================
function normalizeString(str: any): string {
  if (str === null || str === undefined) return '';
  const s = typeof str === 'string' ? str : JSON.stringify(str);
  return s
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

// ============================================================
// DEEP EQUALITY FOR JSON STRUCTURES
// ============================================================
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null || typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// ============================================================
// PARSE PYTHON-STYLE SINGLE-QUOTE STRINGS TO JSON
// e.g. ['o','l','l','e','h'] → ["o","l","l","e","h"]
// ============================================================
function parsePythonLikeArray(str: string): any | null {
  if (str.includes("'") && !str.includes('"')) {
    const jsonStr = str.replace(/'/g, '"');
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }
  return null;
}

// ============================================================
// ARE OUTPUTS EQUAL - DETERMINISTIC CONTRACT-BASED COMPARISON
//
// Comparison strategy (in order):
// 1. Exact normalized string match
// 2. Case-insensitive boolean match (true/false)
// 3. Both parse as valid JSON → deep equality
// 4. Expected is Python-style array → convert and compare
// 5. Expected is JSON array of single chars AND actual is plain string
//    → join expected chars and compare (char-array-as-string)
// 6. Both are numbers → float tolerance 1e-5
// 7. Multiline text comparison
// ============================================================
export function areOutputsEqual(actual: string | null | undefined, expected: any): boolean {
  if (actual === null || actual === undefined) {
    return expected === null || expected === undefined || String(expected).trim() === '';
  }

  const normActual = normalizeString(actual);
  const normExpected = normalizeString(expected);

  // 1. Exact match
  if (normActual === normExpected) return true;

  // 2. Boolean case-insensitive
  const la = normActual.toLowerCase();
  const le = normExpected.toLowerCase();
  if ((le === 'true' || le === 'false') && la === le) return true;

  // 3. Try JSON deep equality
  let parsedActual: any = null;
  let parsedExpected: any = null;
  let actualIsJson = false;
  let expectedIsJson = false;

  const tryParseActual = normActual;
  if (
    (tryParseActual.startsWith('[') && tryParseActual.endsWith(']')) ||
    (tryParseActual.startsWith('{') && tryParseActual.endsWith('}'))
  ) {
    try {
      parsedActual = JSON.parse(tryParseActual);
      actualIsJson = true;
    } catch { /* not JSON */ }
  }

  let tryParseExpected = normExpected;
  if (typeof expected === 'object' && expected !== null) {
    parsedExpected = expected;
    expectedIsJson = true;
  } else {
    if (
      (tryParseExpected.startsWith('[') && tryParseExpected.endsWith(']')) ||
      (tryParseExpected.startsWith('{') && tryParseExpected.endsWith('}'))
    ) {
      try {
        parsedExpected = JSON.parse(tryParseExpected);
        expectedIsJson = true;
      } catch {
        // Try Python single-quote arrays
        const pythonParsed = parsePythonLikeArray(tryParseExpected);
        if (pythonParsed !== null) {
          parsedExpected = pythonParsed;
          expectedIsJson = true;
        }
      }
    } else {
      // Not a JSON-shaped string — try Python single-quote
      const pythonParsed = parsePythonLikeArray(tryParseExpected);
      if (pythonParsed !== null) {
        parsedExpected = pythonParsed;
        expectedIsJson = true;
      }
    }
  }

  // JSON vs JSON deep comparison
  if (actualIsJson && expectedIsJson) {
    if (deepEqual(parsedActual, parsedExpected)) return true;
  }

  // 4. Array vs Space-Separated tokens comparison (e.g. "0 1" vs "[0,1]")
  const spaceTokensActual = normActual.split(/\s+/).filter(Boolean);
  if (expectedIsJson && Array.isArray(parsedExpected)) {
    if (parsedExpected.length === spaceTokensActual.length) {
      const allMatch = parsedExpected.every((expVal: any, idx: number) => {
        return String(expVal).trim() === spaceTokensActual[idx];
      });
      if (allMatch) return true;
    }
  }

  if (actualIsJson && Array.isArray(parsedActual)) {
    const spaceTokensExpected = normExpected.split(/\s+/).filter(Boolean);
    if (parsedActual.length === spaceTokensExpected.length) {
      const allMatch = parsedActual.every((actVal: any, idx: number) => {
        return String(actVal).trim() === spaceTokensExpected[idx];
      });
      if (allMatch) return true;
    }
  }

  // 5. CHAR ARRAY AS STRING:
  // Expected = char array like ["o","l","l","e","h"] or ['o','l','l','e','h']
  // Actual   = plain string like "olleh"
  // → join expected chars and compare
  if (expectedIsJson && parsedExpected !== null) {
    if (
      Array.isArray(parsedExpected) &&
      parsedExpected.length > 0 &&
      parsedExpected.every((x: any) => typeof x === 'string' && x.length === 1)
    ) {
      const joinedExpected = (parsedExpected as string[]).join('');
      if (normActual === joinedExpected) return true;
    }
  }

  // Also handle: actual = JSON char array, expected = plain string
  if (actualIsJson && parsedActual !== null) {
    if (
      Array.isArray(parsedActual) &&
      parsedActual.length > 0 &&
      parsedActual.every((x: any) => typeof x === 'string' && x.length === 1)
    ) {
      const joinedActual = (parsedActual as string[]).join('');
      if (joinedActual === normExpected) return true;
    }
  }

  // 6. Numeric comparison with tolerance
  const numA = Number(normActual.replace(/,/g, ''));
  const numE = Number(normExpected.replace(/,/g, ''));
  if (
    !isNaN(numA) && !isNaN(numE) &&
    normActual.trim() !== '' && normExpected.trim() !== ''
  ) {
    if (Number.isInteger(numA) && Number.isInteger(numE)) {
      if (numA === numE) return true;
    } else {
      if (Math.abs(numA - numE) <= 1e-5) return true;
    }
  }

  // 7. Multiline text (per-line comparison)
  const linesActual = normActual.split('\n').map((l) => l.trimEnd());
  const linesExpected = normExpected.split('\n').map((l) => l.trimEnd());
  if (linesActual.length === linesExpected.length && linesActual.length > 1) {
    if (linesActual.every((l, i) => l === linesExpected[i])) return true;
  }

  // 8. Order-preserving whitespace-separated tokens comparison (preserves order, handles whitespace variations and float tolerance)
  const actualTokens = normActual.split(/\s+/).filter(Boolean);
  const expectedTokens = normExpected.split(/\s+/).filter(Boolean);
  if (actualTokens.length === expectedTokens.length && actualTokens.length > 0) {
    const tokensMatch = actualTokens.every((tok, idx) => {
      const expTok = expectedTokens[idx];
      if (tok === expTok) return true;
      const numAct = Number(tok);
      const numExp = Number(expTok);
      if (!isNaN(numAct) && !isNaN(numExp) && Math.abs(numAct - numExp) <= 1e-5) return true;
      return false;
    });
    if (tokensMatch) return true;
  }

  return false;
}

// ============================================================
// MAIN EXECUTION ENGINE
// Pure competitive-programming stdin/stdout model.
//
// CONTRACT:
//   sourceCode  → sent verbatim to Judge0 (NO wrapping, NO modification)
//   tc.stdin    → sent verbatim as Judge0 stdin
//   stdout      → compared against tc.expectedOutput
//
// starterCode is a display hint for the editor only.
// It is NEVER used here. Only sourceCode (student submission) matters.
// ============================================================
export class ExecutionEngine {
  static async execute(payload: ExecutionPayload): Promise<ExecutionResult> {
    // ── Execution Type Guard ─────────────────────────────────────────────────
    // This engine ONLY supports STDIN_PROGRAM mode.
    // sourceCode is sent verbatim to Judge0. No wrapping. No function injection.
    const executionType = (payload as any).executionType ?? 'STDIN_PROGRAM';
    if (executionType === 'FUNCTION_CALL') {
      return {
        success: false,
        errorType: 'INVALID_QUESTION_CONFIGURATION',
        message:
          'FUNCTION_CALL execution type is not supported. Set executionType to STDIN_PROGRAM in the question dataset.',
      };
    }
    // ────────────────────────────────────────────────────────────────────────

    const {
      runMode = 'SUBMIT',
      languageId,
      sourceCode,
      customInput,
      testCases: rawTestCases,
      examples,
    } = payload;

    const langKey = JUDGE0_LANG_KEY[languageId] || 'python';

    // Source code validation
    const validation = ExecutionValidator.validateSourceCode(sourceCode);
    if (!validation.isValid) {
      return {
        success: false,
        errorType: 'INVALID_QUESTION_CONFIGURATION',
        message: validation.message || 'Source code is required.',
      };
    }

    // ============================================================
    // 1. PURE CUSTOM INPUT MODE (Sandbox & Debugging)
    // Does NOT load expected outputs, does NOT compare against test cases,
    // does NOT calculate scores or verdicts.
    // ============================================================
    const isExplicitCustom = (runMode as string) === 'CUSTOM' || (runMode as string) === 'CUSTOM_RUN';
    const isImplicitCustom = customInput !== undefined && customInput !== null && String(customInput).trim().length > 0 && runMode !== 'SUBMIT';

    if (isExplicitCustom || isImplicitCustom) {
      const stdinText = customInput !== undefined && customInput !== null ? String(customInput) : '';
      const runnerResult = await TestCaseRunner.runSingle(sourceCode, languageId, stdinText);
      const singleTime = runnerResult.time ? parseFloat(runnerResult.time) || 0 : 0;

      // Status 6: Compilation Error (C, C++, Java) or Python Syntax/Indentation error
      if (runnerResult.errorType === 'COMPILATION_ERROR' || runnerResult.status?.id === 6) {
        return {
          success: false,
          runMode: 'CUSTOM',
          executionStatus: 'COMPILATION_ERROR',
          errorType: 'COMPILATION_ERROR',
          message: runnerResult.message || 'Compilation failed.',
          compileOutput: runnerResult.compile_output || runnerResult.stderr || '',
          stdout: '',
          stderr: runnerResult.stderr || runnerResult.compile_output || '',
          customInput: stdinText,
          language: langKey,
          time: runnerResult.time || '0.000',
          totalExecutionTime: singleTime,
          memory: runnerResult.memory || 0,
          peakMemory: runnerResult.memory || 0,
          status: runnerResult.status || { id: 6, description: 'Compilation Error' },
        };
      }

      // Status 5: Time Limit Exceeded
      if (runnerResult.errorType === 'USER_CODE_TIME_LIMIT_EXCEEDED' || runnerResult.status?.id === 5) {
        return {
          success: false,
          runMode: 'CUSTOM',
          executionStatus: 'TIME_LIMIT_EXCEEDED',
          errorType: 'TIME_LIMIT_EXCEEDED',
          message: 'Your code exceeded the execution time limit.',
          stdout: runnerResult.stdout || '',
          stderr: 'Time Limit Exceeded',
          customInput: stdinText,
          language: langKey,
          time: runnerResult.time || '0.000',
          totalExecutionTime: singleTime,
          memory: runnerResult.memory || 0,
          peakMemory: runnerResult.memory || 0,
          status: runnerResult.status || { id: 5, description: 'Time Limit Exceeded' },
        };
      }

      // Status 7-12: Runtime Error
      if (!runnerResult.success || (runnerResult.status?.id && runnerResult.status.id >= 7)) {
        return {
          success: false,
          runMode: 'CUSTOM',
          executionStatus: 'RUNTIME_ERROR',
          errorType: 'RUNTIME_ERROR',
          message: runnerResult.stderr || runnerResult.message || 'A runtime error occurred.',
          stdout: runnerResult.stdout || '',
          stderr: runnerResult.stderr || runnerResult.message || 'Runtime Error',
          customInput: stdinText,
          language: langKey,
          time: runnerResult.time || '0.000',
          totalExecutionTime: singleTime,
          memory: runnerResult.memory || 0,
          peakMemory: runnerResult.memory || 0,
          status: runnerResult.status || { id: 11, description: 'Runtime Error' },
        };
      }

      // Pure Execution Success
      return {
        success: true,
        runMode: 'CUSTOM',
        executionStatus: 'SUCCESS',
        language: langKey,
        stdout: runnerResult.stdout || '',
        stderr: runnerResult.stderr || '',
        customInput: stdinText,
        time: runnerResult.time || '0.000',
        totalExecutionTime: singleTime,
        memory: runnerResult.memory || 0,
        peakMemory: runnerResult.memory || 0,
        status: runnerResult.status || { id: 3, description: 'Accepted' },
      };
    }

    // Determine active test cases based on RUN vs SUBMIT
    let activeCases: TestCase[] = [];
    if (rawTestCases && rawTestCases.length > 0) {
      if (runMode === 'RUN' || (runMode as any) === 'SAMPLE') {
        activeCases = rawTestCases.slice(0, 2);
      } else {
        activeCases = rawTestCases;
      }
    }

    // No test cases → run once with empty stdin
    if (activeCases.length === 0) {
      const runnerResult = await TestCaseRunner.runSingle(sourceCode, languageId, '');
      if (!runnerResult.success && runnerResult.errorType === 'COMPILATION_ERROR') {
        return {
          success: false,
          errorType: 'COMPILATION_ERROR',
          message: runnerResult.message || 'Compilation failed.',
          compileOutput: runnerResult.compile_output,
        };
      }
      const singleTime = runnerResult.time ? parseFloat(runnerResult.time) || 0 : 0;
      return {
        success: runnerResult.success,
        runMode,
        language: langKey,
        stdout: runnerResult.stdout,
        stderr: runnerResult.stderr,
        time: runnerResult.time || '0.000',
        totalExecutionTime: singleTime,
        memory: runnerResult.memory || 0,
        peakMemory: runnerResult.memory || 0,
        status: runnerResult.status,
      };
    }

    // Run test cases (concurrent execution with early compilation failure check)
    const results: TestCaseResult[] = [];
    const scores = this.calculateScores(activeCases);
    let earnedScore = 0;
    let totalPossible = 0;
    let passedCount = 0;
    let totalTime = 0;
    let maxMemory = 0;

    const prepareCase = (tc: TestCase, index: number) => {
      const rawInput = tc.input;
      const rawExpected = tc.expectedOutput !== undefined ? tc.expectedOutput : tc.expected;

      let stdin = '';
      let cleanDisplayInput = '';

      if (tc.stdin !== undefined && tc.stdin !== null) {
        stdin = String(tc.stdin);
        cleanDisplayInput = tc.displayInput !== undefined ? String(tc.displayInput) : (typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput));
      } else if (executionType === 'STDIN_PROGRAM' && typeof rawInput === 'string') {
        stdin = rawInput;
        cleanDisplayInput = tc.displayInput !== undefined ? String(tc.displayInput) : rawInput;
      } else {
        const normalizedInput = normalizeTestInput(rawInput, executionType);
        cleanDisplayInput = tc.displayInput || normalizedInput.displayInput;
        stdin = normalizedInput.stdin;
      }

      const cleanExpected = normalizeDisplayOutput(rawExpected);
      return { tc, rawInput, rawExpected, stdin, cleanDisplayInput, cleanExpected, index };
    };

    const executeOneCase = async (prepared: ReturnType<typeof prepareCase>) => {
      const { tc, rawInput, rawExpected, stdin, cleanDisplayInput, cleanExpected, index } = prepared;

      console.log(`\n========== EXECUTION DEBUG ==========`);
      console.log(`MODE: ${runMode}`);
      console.log(`TEST CASE ID: ${tc.id || tc.testCaseId || String(index + 1)}`);
      console.log(`LANGUAGE: ${langKey.toUpperCase()}`);
      console.log(`LOGICAL INPUT: ${JSON.stringify(rawInput)}`);
      console.log(`GENERATED STDIN (exact):\n${stdin}`);
      console.log(`JUDGE0 STDIN EXACT:\n${stdin}`);
      console.log(`LOGICAL EXPECTED OUTPUT: ${JSON.stringify(rawExpected)}`);
      console.log(`====================================`);

      const exec = await TestCaseRunner.runSingle(sourceCode, languageId, stdin);
      const isMatch = exec.success && areOutputsEqual(exec.stdout, rawExpected);

      console.log(`\n========== EXECUTION RESULT ==========`);
      console.log(`STATUS: ${exec.success ? 'OK' : exec.errorType || 'FAILED'}`);
      console.log(`ACTUAL STDOUT: ${JSON.stringify(exec.stdout)}`);
      console.log(`STDERR: ${JSON.stringify(exec.stderr)}`);
      console.log(`EXECUTION TIME: ${exec.time}`);
      console.log(`MEMORY: ${exec.memory}`);
      console.log(`COMPARISON RESULT: ${isMatch ? 'PASS' : 'FAIL'}`);
      console.log(`======================================`);

      const execTimeNum = exec.time ? parseFloat(exec.time) || 0 : 0;
      const actualDisplay = exec.stderr && !exec.success
        ? `${exec.stdout ? exec.stdout + '\n' : ''}${exec.stderr}`
        : normalizeDisplayOutput(exec.stdout);

      let tcStatus: 'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED' | 'PLATFORM_ERROR' = 'WRONG_ANSWER';
      if (!exec.success) {
        if (exec.errorType === 'COMPILER_SERVICE_UNAVAILABLE') {
          tcStatus = 'PLATFORM_ERROR';
        } else if (
          exec.errorType === 'USER_CODE_TIME_LIMIT_EXCEEDED' ||
          exec.errorType === 'TIME_LIMIT_EXCEEDED' ||
          exec.errorType === 'EXECUTION_TIMEOUT'
        ) {
          tcStatus = 'TIME_LIMIT_EXCEEDED';
        } else {
          tcStatus = 'RUNTIME_ERROR';
        }
      } else if (isMatch) {
        tcStatus = 'ACCEPTED';
      } else {
        tcStatus = 'WRONG_ANSWER';
      }

      const tcScore = scores[index] || 0;
      const tcResult: TestCaseResult = {
        testCaseId: tc.id || tc.testCaseId || String(index + 1),
        index: index + 1,
        status: tcStatus,
        passed: isMatch,
        executionTime: execTimeNum,
        time: exec.time || execTimeNum.toFixed(3),
        memory: exec.memory || 0,
        input: cleanDisplayInput,
        expectedOutput: cleanExpected,
        expected: cleanExpected,
        actualOutput: actualDisplay,
        actual: actualDisplay,
        visible: true,
        score: tcScore,
      };

      return { exec, isMatch, execTimeNum, tcScore, tcResult };
    };

    // Step 1: Run the first test case to detect syntax/compilation errors fast!
    const firstCase = prepareCase(activeCases[0], 0);
    const firstOutcome = await executeOneCase(firstCase);

    if (firstOutcome.exec.errorType === 'COMPILATION_ERROR') {
      return {
        success: false,
        errorType: 'COMPILATION_ERROR',
        message: firstOutcome.exec.compile_output || firstOutcome.exec.message || 'Compilation failed.',
        compileOutput: firstOutcome.exec.compile_output,
        language: langKey,
        runMode,
      };
    }

    // Step 2: Execute remaining test cases concurrently (batch size 4)
    let remainingOutcomes: Array<Awaited<ReturnType<typeof executeOneCase>>> = [];
    if (activeCases.length > 1) {
      const remainingCases = activeCases.slice(1).map((tc, idx) => prepareCase(tc, idx + 1));
      const CONCURRENCY_LIMIT = 4;
      for (let i = 0; i < remainingCases.length; i += CONCURRENCY_LIMIT) {
        const batch = remainingCases.slice(i, i + CONCURRENCY_LIMIT);
        const batchOutcomes = await Promise.all(batch.map(executeOneCase));
        remainingOutcomes.push(...batchOutcomes);
      }
    }

    // Abort if any test case encountered a compilation error
    const compError = remainingOutcomes.find((o) => o.exec.errorType === 'COMPILATION_ERROR');
    if (compError) {
      return {
        success: false,
        errorType: 'COMPILATION_ERROR',
        message: compError.exec.compile_output || compError.exec.message || 'Compilation failed.',
        compileOutput: compError.exec.compile_output,
        language: langKey,
        runMode,
      };
    }

    const allOutcomes = [firstOutcome, ...remainingOutcomes];
    for (const outcome of allOutcomes) {
      results.push(outcome.tcResult);
      totalPossible += outcome.tcScore;
      if (outcome.isMatch) {
        earnedScore += outcome.tcScore;
        passedCount++;
      }
      totalTime += outcome.execTimeNum;
      if (outcome.exec.memory) maxMemory = Math.max(maxMemory, outcome.exec.memory);
    }

    const allPassed = passedCount === activeCases.length;

    return {
      success: true,
      runMode,
      language: langKey,
      passedCount,
      totalCount: activeCases.length,
      allPassed,
      score: Math.round(earnedScore),
      totalScore: Math.round(totalPossible),
      results,
      time: totalTime > 0 ? totalTime.toFixed(3) : '0.000',
      totalExecutionTime: totalTime > 0 ? parseFloat(totalTime.toFixed(3)) : 0,
      memory: maxMemory,
      peakMemory: maxMemory,
      stdout: results
        .map((r, i) => `Test Case ${i + 1}: ${r.passed ? 'ACCEPTED' : r.status} (${r.executionTime}s)`)
        .join('\n'),
    };
  }

  private static calculateScores(testCases: TestCase[]): number[] {
    const n = testCases.length;
    if (n === 0) return [];
    const hasWeights = testCases.every((tc) => typeof tc.weight === 'number');
    if (hasWeights) return testCases.map((tc) => tc.weight as number);
    const base = Math.floor(100 / n);
    const remainder = 100 - base * n;
    return testCases.map((_, i) => (i === n - 1 ? base + remainder : base));
  }
}
