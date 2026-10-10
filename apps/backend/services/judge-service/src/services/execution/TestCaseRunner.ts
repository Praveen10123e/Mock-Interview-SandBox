import { Judge0Client } from '../Judge0Client';

export interface SingleExecutionResult {
  success: boolean;
  status?: {
    id: number;
    description: string;
  };
  stdout: string;
  stderr: string;
  compile_output?: string;
  time?: string;
  memory?: number;
  errorType?: string;
  message?: string;
}

const MAX_POLLING_ATTEMPTS = 20;
const BASE_POLLING_INTERVAL_MS = 250;
const MAX_POLLING_INTERVAL_MS = 1500;

export class TestCaseRunner {
  /**
   * Run candidate's source code directly on Judge0 with standard input (stdin).
   */
  static async runSingle(
    sourceCode: string,
    languageId: number,
    stdin?: string
  ): Promise<SingleExecutionResult> {
    // For Java (62), Judge0 requires the public class to be named 'Main'
    let effectiveCode = sourceCode;
    if (languageId === 62 && !effectiveCode.includes('public class Main')) {
      effectiveCode = effectiveCode.replace(/public\s+class\s+([A-Za-z0-9_]+)/g, 'public class Main');
    }

    let submitData: any;
    try {
      submitData = await Judge0Client.submitCode(effectiveCode, languageId, stdin);
    } catch (error: any) {
      console.error('[Judge] Judge0 submission error:', error.response?.data || error.message);
      return {
        success: false,
        errorType: 'COMPILER_SERVICE_UNAVAILABLE',
        message: 'Failed to submit code to execution engine.',
        stdout: '',
        stderr: 'Execution service unavailable.',
      };
    }

    let result: any = null;

    // Fast-path: Judge0 with wait=true returned the finished execution synchronously!
    if (submitData && submitData.status && submitData.status.id > 2) {
      result = submitData;
    } else if (submitData && submitData.token) {
      // Fallback path: asynchronous polling if still queued / executing
      const token = submitData.token;
      let currentInterval = BASE_POLLING_INTERVAL_MS;

      for (let attempt = 0; attempt < MAX_POLLING_ATTEMPTS; attempt++) {
        await new Promise((r) => setTimeout(r, currentInterval));
        try {
          const statusResponse = await Judge0Client.getSubmission(token);
          if (statusResponse && statusResponse.status && statusResponse.status.id > 2) {
            result = statusResponse;
            break;
          }
        } catch (pollErr) {
          console.error('[Judge] Polling error:', pollErr);
        }

        currentInterval = Math.min(
          Math.round(currentInterval * 1.3),
          MAX_POLLING_INTERVAL_MS
        );
      }
    }

    if (!result) {
      return {
        success: false,
        errorType: 'EXECUTION_TIMEOUT',
        message: 'Execution timed out waiting for result from Judge0.',
        stdout: '',
        stderr: 'Time Limit Exceeded.',
        status: { id: 5, description: 'Time Limit Exceeded' },
      };
    }

    // Status 6: Compilation Error (C, C++, Java) or Python SyntaxError / IndentationError
    const isSyntaxOrCompileError =
      result.status?.id === 6 ||
      (result.stderr &&
        (result.stderr.includes('SyntaxError') ||
          result.stderr.includes('IndentationError') ||
          result.stderr.includes('TabError')));

    if (isSyntaxOrCompileError) {
      const output = result.compile_output || result.stderr || result.message || 'Compilation failed.';
      return {
        success: false,
        errorType: 'COMPILATION_ERROR',
        message: output,
        compile_output: output,
        stdout: '',
        stderr: output,
        status: { id: 6, description: 'Compilation Error' },
      };
    }

    // Status 5: Time Limit Exceeded
    if (result.status?.id === 5) {
      return {
        success: false,
        errorType: 'USER_CODE_TIME_LIMIT_EXCEEDED',
        message: 'Your code exceeded the execution time limit.',
        stdout: result.stdout || '',
        stderr: 'Time Limit Exceeded',
        time: result.time,
        memory: result.memory,
        status: result.status,
      };
    }

    // Status 7-12: Runtime Error
    if (result.status?.id >= 7 && result.status?.id <= 12) {
      return {
        success: false,
        errorType: 'RUNTIME_ERROR',
        message: result.stderr || result.message || 'A runtime error occurred.',
        stdout: result.stdout || '',
        stderr: result.stderr || result.message || 'Runtime Error',
        time: result.time,
        memory: result.memory,
        status: result.status,
      };
    }

    // Status 3 or 4: Accepted
    if (result.status?.id === 3 || result.status?.id === 4) {
      return {
        success: true,
        status: result.status,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        time: result.time,
        memory: result.memory,
      };
    }

    return {
      success: false,
      errorType: 'RUNTIME_ERROR',
      message: result.stderr || result.message || 'Unknown execution error.',
      stdout: result.stdout || '',
      stderr: result.stderr || 'Execution Error',
      status: result.status,
      time: result.time,
      memory: result.memory,
    };
  }
}
