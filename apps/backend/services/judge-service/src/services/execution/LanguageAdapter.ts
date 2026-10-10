import { ExecutionLanguageConfig, ParameterConfig } from './ExecutionTypes';
import { TestCase } from './ExecutionContract';

export interface LanguageAdapter {
  /**
   * Generates the wrapper code for a language that correctly sets up argument parsing
   * and invokes the user's function.
   * 
   * @param sourceCode The user's submitted code
   * @param testCases The list of test cases to run
   * @param config The metadata defining the function signature (name, params, returnType)
   * @returns The fully wrapped executable source code
   */
  buildWrapper(sourceCode: string, testCases: TestCase[], config: ExecutionLanguageConfig): string;
}
