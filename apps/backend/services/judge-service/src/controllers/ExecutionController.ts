import { Request, Response } from 'express';
import { ExecutionEngine } from '../services/execution/ExecutionEngine';
import { ExecutionQueue } from '../services/execution/ExecutionQueue';
import { Judge0Client } from '../services/Judge0Client';
import { z } from 'zod';

const ExecuteSchema = z.object({
  executionMode: z.enum(['INTERVIEW', 'PRACTICE']).optional().default('PRACTICE'),
  runMode: z.enum(['RUN', 'SUBMIT', 'SAMPLE', 'CUSTOM', 'CUSTOM_RUN']).optional().default('SUBMIT'),
  // STDIN_PROGRAM: student writes a complete standalone program (default, only supported mode).
  // FUNCTION_CALL: legacy adapter mode — rejected by ExecutionEngine.
  executionType: z.enum(['STDIN_PROGRAM', 'FUNCTION_CALL']).optional().default('STDIN_PROGRAM'),
  interviewId: z.string().uuid().optional(),
  questionRefId: z.string().optional(),
  questionId: z.string().optional(),
  languageId: z.number().int(),
  sourceCode: z.string().min(1).max(100000),
  customInput: z.string().optional(),
  testCases: z.array(z.object({
    id: z.string().optional(),
    input: z.any().optional(),
    stdin: z.string().optional(),
    displayInput: z.string().optional(),
    expectedOutput: z.any().optional(),
    expected: z.any().optional(),
    hidden: z.boolean().optional(),
    visible: z.boolean().optional(),
    weight: z.number().optional(),
  })).optional(),
  execution: z.any().optional(),
}).superRefine((data, ctx) => {
  if (data.executionMode === 'INTERVIEW') {
    if (!data.interviewId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'interviewId is required in INTERVIEW mode', path: ['interviewId'] });
    }
    if (!data.questionRefId && !data.questionId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'questionRefId is required in INTERVIEW mode', path: ['questionRefId'] });
    }
  }
});

export class ExecutionController {
  static async execute(req: Request, res: Response) {
    try {
      const studentId = req.headers['x-identity-id'] as string;
      if (!studentId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing identity context' });
      }

      const payload = ExecuteSchema.parse(req.body);

      const acquired = ExecutionQueue.tryAcquire(studentId);
      if (!acquired) {
        return res.status(429).json({
          success: false,
          errorType: 'EXECUTION_CAPACITY_EXCEEDED',
          message: 'Execution capacity is currently full. Please try again shortly.',
          retryAfter: 5
        });
      }

      try {
        const result = await ExecutionEngine.execute({
          ...payload,
          studentId,
        } as any);

        return res.status(200).json(result);
      } finally {
        ExecutionQueue.release(studentId);
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          errorType: 'VALIDATION_ERROR',
          message: 'Validation Error',
          errors: error.errors,
        });
      }

      // Propagate structured errors from ExecutionEngine (INVALID_QUESTION_CONFIGURATION etc.)
      if (error.errorType) {
        return res.status(200).json({
          success: false,
          errorType: error.errorType,
          message: error.message,
        });
      }

      console.error('[Judge] Execution Error:', error.message);
      return res.status(200).json({
        success: false,
        errorType: 'COMPILER_SERVICE_UNAVAILABLE',
        message: 'The execution service encountered an error. Please try again.',
      });
    }
  }

  static async getLanguages(req: Request, res: Response) {
    try {
      const languages = await Judge0Client.getLanguages();
      return res.status(200).json({ success: true, data: languages });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to fetch languages' });
    }
  }
}
