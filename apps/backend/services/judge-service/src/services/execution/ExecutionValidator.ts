export class ExecutionValidator {
  /**
   * Pure stdin/stdout validation:
   * Only verify that source code is a valid non-empty string.
   * No starter code signature checks, no required function names, no wrapper requirements.
   */
  static validateSourceCode(sourceCode: string): { isValid: boolean; message?: string } {
    if (!sourceCode || typeof sourceCode !== 'string' || !sourceCode.trim()) {
      return {
        isValid: false,
        message: 'Source code cannot be empty.',
      };
    }
    return { isValid: true };
  }
}
