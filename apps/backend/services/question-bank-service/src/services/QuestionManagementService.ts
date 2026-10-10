import { PrismaClient, DifficultyLevel, QuestionStatusEnum, QuestionTypeEnum } from '../generated/client';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export interface CreateQuestionDTO {
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  category: string;
  topic?: string;
  questionType?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  executionMode?: 'STANDARD_IO' | 'FUNCTION';
  constraints?: string[];
  examples?: Array<{ input: string; output: string; explanation?: string }>;
  hints?: string[];
  testCases?: Array<{
    input: any;
    expectedOutput: string;
    visibility?: 'VISIBLE' | 'HIDDEN';
    isHidden?: boolean;
    explanation?: string;
  }>;
  languages?: Record<
    string,
    {
      language: string;
      starterCode?: string;
      functionName?: string;
      signature?: string;
      returnType?: string;
      methodName?: string;
      className?: string;
    }
  >;
  estimatedTime?: number;
  marks?: number;

  // MCQ / Aptitude fields
  options?: string[];
  correctOptionIndex?: number;
  correctAnswer?: string;
  explanation?: string;

  // Theory / HR fields
  expectedAnswer?: string;
  idealAnswer?: string;
  evaluationCriteria?: string[];
  keyPoints?: string[];
}

export class QuestionManagementService {
  /**
   * Validate a question payload before publishing or saving based on questionType
   */
  static validateQuestion(payload: Partial<CreateQuestionDTO>) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!payload.title || payload.title.trim().length < 3) {
      errors.push('Title is required and must be at least 3 characters.');
    }
    if (!payload.description || payload.description.trim().length < 5) {
      errors.push('Question statement is required.');
    }
    if (!payload.difficulty) {
      errors.push('Difficulty level (EASY, MEDIUM, HARD, EXPERT) is required.');
    }
    if (!payload.category || payload.category.trim().length === 0) {
      errors.push('Category is required.');
    }

    const qType = (payload.questionType || 'CODING').toUpperCase();

    // 1. APTITUDE / MCQ Validation
    if (qType === 'APTITUDE' || qType === 'MCQ') {
      const options = payload.options || [];
      if (!options || options.length < 2) {
        errors.push('At least 2 options are required for multiple choice questions.');
      } else {
        options.forEach((opt, idx) => {
          if (!opt || String(opt).trim().length === 0) {
            errors.push(`Option ${String.fromCharCode(65 + idx)} cannot be empty.`);
          }
        });

        if (
          payload.correctOptionIndex === undefined ||
          payload.correctOptionIndex === null ||
          payload.correctOptionIndex < 0 ||
          payload.correctOptionIndex >= options.length
        ) {
          errors.push('Please select a valid correct answer option.');
        }
      }
    }

    // 2. CODING / PROGRAMMING Validation
    else if (qType === 'CODING' || qType === 'PROGRAMMING') {
      const testCases = payload.testCases || [];
      if (testCases.length === 0) {
        errors.push('At least one test case is required for coding questions.');
      } else {
        testCases.forEach((tc, idx) => {
          if (tc.input === undefined || tc.input === null || String(tc.input).trim() === '') {
            errors.push(`Test Case #${idx + 1} is missing input data.`);
          }
          if (
            tc.expectedOutput === undefined ||
            tc.expectedOutput === null ||
            String(tc.expectedOutput).trim() === ''
          ) {
            errors.push(`Test Case #${idx + 1} is missing expected output.`);
          }
        });

        const visibleCount = testCases.filter((tc) => tc.visibility !== 'HIDDEN' && !tc.isHidden).length;
        if (visibleCount === 0) {
          warnings.push('No visible test cases provided. Students will not see sample test results.');
        }
      }

      const mode = payload.executionMode || 'STANDARD_IO';
      if (mode === 'FUNCTION' && (!payload.languages || Object.keys(payload.languages).length === 0)) {
        warnings.push('Function execution mode selected but no custom language function signatures provided.');
      }
    }

    // 3. HR / BEHAVIORAL Validation
    else if (qType === 'HR' || qType === 'BEHAVIORAL') {
      // Basic fields validated above; evaluation rubrics/key points are optional
    }

    // 4. THEORY / DESCRIPTIVE Validation
    else if (qType === 'THEORY' || qType === 'DESCRIPTIVE') {
      // Basic fields validated; expectedAnswer / explanation are optional but encouraged
    }

    const testCases = payload.testCases || [];
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        title: payload.title,
        questionType: qType,
        difficulty: payload.difficulty,
        category: payload.category,
        topic: payload.topic,
        executionMode: qType === 'CODING' ? payload.executionMode || 'STANDARD_IO' : 'N/A',
        totalOptions: payload.options ? payload.options.length : 0,
        correctOptionIndex: payload.correctOptionIndex,
        totalTestCases: testCases.length,
        visibleTestCases: testCases.filter((tc) => tc.visibility !== 'HIDDEN' && !tc.isHidden).length,
        hiddenTestCases: testCases.filter((tc) => tc.visibility === 'HIDDEN' || tc.isHidden).length,
      },
    };
  }

  /**
   * Create a new question
   */
  static async createQuestion(data: CreateQuestionDTO, identityId?: string) {
    // 1. Resolve or create category
    const categoryName = data.category.trim();
    let category = await prisma.questionCategory.findUnique({
      where: { name: categoryName },
    });
    if (!category) {
      category = await prisma.questionCategory.create({
        data: { name: categoryName },
      });
    }

    // 2. Resolve or create topic if provided
    let topic = null;
    if (data.topic && data.topic.trim()) {
      const topicName = data.topic.trim();
      topic = await prisma.questionTopic.findFirst({
        where: { categoryId: category.id, name: topicName },
      });
      if (!topic) {
        topic = await prisma.questionTopic.create({
          data: { categoryId: category.id, name: topicName },
        });
      }
    }

    const rawType = (data.questionType || 'CODING').toUpperCase();
    const qType = rawType in QuestionTypeEnum ? (rawType as QuestionTypeEnum) : QuestionTypeEnum.CODING;
    const isCoding = qType === QuestionTypeEnum.CODING;
    const isMcq = qType === QuestionTypeEnum.APTITUDE || rawType === 'MCQ';

    // 3. Format test cases with visibility normalization (for coding)
    const normalizedTestCases = isCoding
      ? (data.testCases || []).map((tc) => {
          const isHidden = tc.visibility === 'HIDDEN' || tc.isHidden === true;
          return {
            input: tc.input,
            expectedOutput: String(tc.expectedOutput).trim(),
            visibility: isHidden ? 'HIDDEN' : 'VISIBLE',
            isHidden,
            explanation: tc.explanation || '',
          };
        })
      : [];

    // 4. Format examples, constraints, hints
    const formattedExamples = (data.examples || []).map((ex, idx) => ({
      input: typeof ex.input === 'string' ? ex.input : JSON.stringify(ex.input),
      output: typeof ex.output === 'string' ? ex.output : JSON.stringify(ex.output),
      explanation: ex.explanation || '',
      order: idx + 1,
    }));

    const formattedConstraints = (data.constraints || []).map((c, idx) => ({
      constraint: String(c),
      order: idx + 1,
    }));

    const formattedHints = (data.hints || []).map((h, idx) => ({
      hint: String(h),
      order: idx + 1,
    }));

    // Default starter codes for coding questions
    const executionMode = isCoding ? data.executionMode || 'STANDARD_IO' : 'STANDARD_IO';
    const defaultLanguages: Record<string, any> = isCoding
      ? {
          c: {
            language: 'C',
            starterCode:
              executionMode === 'STANDARD_IO'
                ? '#include <stdio.h>\n\nint main() {\n    // Read from standard input and print output\n    return 0;\n}'
                : '/* Implement your solution */',
          },
          cpp: {
            language: 'C++',
            starterCode:
              executionMode === 'STANDARD_IO'
                ? '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Read from standard input and print output\n    return 0;\n}'
                : 'class Solution {\npublic:\n    // Implement your solution\n};',
          },
          java: {
            language: 'Java',
            starterCode:
              executionMode === 'STANDARD_IO'
                ? 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Read from standard input and print output\n    }\n}'
                : 'class Solution {\n    // Implement your solution\n}',
          },
          python: {
            language: 'Python',
            starterCode:
              executionMode === 'STANDARD_IO'
                ? 'import sys\n\ndef main():\n    # Read from standard input and print output\n    pass\n\nif __name__ == "__main__":\n    main()'
                : 'def solution(*args):\n    # Write your solution here\n    pass',
          },
          javascript: {
            language: 'JavaScript',
            starterCode:
              executionMode === 'STANDARD_IO'
                ? 'const fs = require("fs");\nconst input = fs.readFileSync("/dev/stdin", "utf-8");\n// Process input and output result'
                : 'function solution(...args) {\n    // Write your solution here\n}',
          },
        }
      : {};

    const mergedLanguages = { ...defaultLanguages, ...(data.languages || {}) };

    // Format expectedAnswer
    let expectedAnswer = data.expectedAnswer || null;
    if (isMcq && data.options && data.correctOptionIndex !== undefined && data.options[data.correctOptionIndex]) {
      expectedAnswer = data.options[data.correctOptionIndex];
    }

    // Build metadata jsonPayload
    const jsonPayload: Record<string, any> = {
      datasetSource: 'FACULTY_CREATED',
      hints: formattedHints,
    };

    if (isCoding) {
      jsonPayload.execution = {
        executionMode,
        languages: mergedLanguages,
      };
      jsonPayload.testCases = normalizedTestCases;
      jsonPayload.examples = formattedExamples;
      jsonPayload.constraints = formattedConstraints;
    }

    if (isMcq) {
      jsonPayload.options = data.options || [];
      jsonPayload.correctOptionIndex = data.correctOptionIndex ?? 0;
      jsonPayload.explanation = data.explanation || '';
    }

    if (qType === QuestionTypeEnum.HR) {
      jsonPayload.evaluationCriteria = data.evaluationCriteria || [];
      jsonPayload.keyPoints = data.keyPoints || [];
    }

    if (data.explanation) {
      jsonPayload.explanation = data.explanation;
    }

    // 5. Create Question record
    const question = await prisma.question.create({
      data: {
        title: data.title.trim(),
        description: data.description.trim(),
        questionType: qType,
        difficulty: (data.difficulty as DifficultyLevel) || DifficultyLevel.MEDIUM,
        status: (data.status as QuestionStatusEnum) || QuestionStatusEnum.DRAFT,
        categoryId: category.id,
        topicId: topic?.id || null,
        createdBy: identityId || null,
        expectedAnswer,
        idealAnswer: data.idealAnswer || null,
        marks: data.marks || 10,
        estimatedTime: data.estimatedTime || 1800,
        metadata: {
          create: {
            jsonPayload,
          },
        },
      },
      include: {
        category: true,
        topic: true,
        metadata: true,
      },
    });

    return question;
  }

  /**
   * Update an existing question
   */
  static async updateQuestion(id: string, data: Partial<CreateQuestionDTO>, identityId?: string) {
    const existing = await prisma.question.findUnique({
      where: { id },
      include: { metadata: true, category: true, topic: true },
    });

    if (!existing) {
      throw new Error('Question not found');
    }

    // Category resolution
    let categoryId = existing.categoryId;
    if (data.category && data.category.trim()) {
      const categoryName = data.category.trim();
      let category = await prisma.questionCategory.findUnique({
        where: { name: categoryName },
      });
      if (!category) {
        category = await prisma.questionCategory.create({
          data: { name: categoryName },
        });
      }
      categoryId = category.id;
    }

    // Topic resolution
    let topicId = existing.topicId;
    if (data.topic && data.topic.trim()) {
      const topicName = data.topic.trim();
      let topic = await prisma.questionTopic.findFirst({
        where: { categoryId: categoryId || undefined, name: topicName },
      });
      if (!topic && categoryId) {
        topic = await prisma.questionTopic.create({
          data: { categoryId, name: topicName },
        });
      }
      topicId = topic ? topic.id : null;
    }

    // Existing metadata payload
    const existingPayload = (existing.metadata?.jsonPayload as any) || {};

    const rawType = (data.questionType || existing.questionType || 'CODING').toUpperCase();
    const qType = rawType in QuestionTypeEnum ? (rawType as QuestionTypeEnum) : existing.questionType;
    const isCoding = qType === QuestionTypeEnum.CODING;
    const isMcq = qType === QuestionTypeEnum.APTITUDE || rawType === 'MCQ';

    const normalizedTestCases = data.testCases
      ? data.testCases.map((tc) => {
          const isHidden = tc.visibility === 'HIDDEN' || tc.isHidden === true;
          return {
            input: tc.input,
            expectedOutput: String(tc.expectedOutput).trim(),
            visibility: isHidden ? 'HIDDEN' : 'VISIBLE',
            isHidden,
            explanation: tc.explanation || '',
          };
        })
      : existingPayload.testCases || [];

    const executionMode =
      data.executionMode || existingPayload.execution?.executionMode || 'STANDARD_IO';

    const mergedLanguages = {
      ...(existingPayload.execution?.languages || {}),
      ...(data.languages || {}),
    };

    const updatedPayload = {
      ...existingPayload,
      ...(data.hints !== undefined && {
        hints: data.hints.map((h, idx) => ({
          hint: String(h),
          order: idx + 1,
        })),
      }),
    };

    if (isCoding) {
      updatedPayload.execution = {
        ...(existingPayload.execution || {}),
        executionMode,
        languages: mergedLanguages,
      };
      updatedPayload.testCases = normalizedTestCases;
      if (data.examples !== undefined) {
        updatedPayload.examples = data.examples.map((ex, idx) => ({
          input: typeof ex.input === 'string' ? ex.input : JSON.stringify(ex.input),
          output: typeof ex.output === 'string' ? ex.output : JSON.stringify(ex.output),
          explanation: ex.explanation || '',
          order: idx + 1,
        }));
      }
      if (data.constraints !== undefined) {
        updatedPayload.constraints = data.constraints.map((c, idx) => ({
          constraint: String(c),
          order: idx + 1,
        }));
      }
    }

    if (isMcq) {
      if (data.options !== undefined) updatedPayload.options = data.options;
      if (data.correctOptionIndex !== undefined) updatedPayload.correctOptionIndex = data.correctOptionIndex;
      if (data.explanation !== undefined) updatedPayload.explanation = data.explanation;
    }

    if (qType === QuestionTypeEnum.HR) {
      if (data.evaluationCriteria !== undefined) updatedPayload.evaluationCriteria = data.evaluationCriteria;
      if (data.keyPoints !== undefined) updatedPayload.keyPoints = data.keyPoints;
    }

    if (data.explanation !== undefined) {
      updatedPayload.explanation = data.explanation;
    }

    // Expected answer calculation
    let expectedAnswer = data.expectedAnswer !== undefined ? data.expectedAnswer : existing.expectedAnswer;
    if (isMcq && data.options && data.correctOptionIndex !== undefined && data.options[data.correctOptionIndex]) {
      expectedAnswer = data.options[data.correctOptionIndex];
    }

    const updated = await prisma.question.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title.trim() }),
        ...(data.description && { description: data.description.trim() }),
        ...(data.difficulty && { difficulty: data.difficulty as DifficultyLevel }),
        questionType: qType,
        ...(data.status && { status: data.status as QuestionStatusEnum }),
        expectedAnswer,
        ...(data.idealAnswer !== undefined && { idealAnswer: data.idealAnswer }),
        ...(data.marks !== undefined && { marks: data.marks }),
        ...(data.estimatedTime !== undefined && { estimatedTime: data.estimatedTime }),
        categoryId,
        topicId,
        updatedBy: identityId || null,
        version: existing.version + 1,
        metadata: {
          upsert: {
            create: { jsonPayload: updatedPayload },
            update: { jsonPayload: updatedPayload },
          },
        },
      },
      include: {
        category: true,
        topic: true,
        metadata: true,
      },
    });

    return updated;
  }

  /**
   * Safe Delete / Archive
   */
  static async deleteQuestion(id: string) {
    const existing = await prisma.question.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Question not found');
    }

    // Soft delete / archive to preserve history
    return prisma.question.update({
      where: { id },
      data: {
        status: QuestionStatusEnum.ARCHIVED,
        deletedAt: new Date(),
      },
    });
  }
}
