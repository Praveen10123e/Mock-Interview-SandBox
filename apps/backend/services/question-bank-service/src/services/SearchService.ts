import { PrismaClient, Prisma } from '../generated/client';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

// Condition to strictly restrict all active queries to our curated & faculty-created questions
const CURATED_SOURCE_CONDITION: Prisma.QuestionWhereInput = {
  deletedAt: null,
  OR: [
    { source: { name: { startsWith: 'Curated' } } },
    { createdBy: { not: null } },
    { metadata: { jsonPayload: { path: ['datasetSource'], equals: 'FACULTY_CREATED' } } },
  ],
};

export class SearchService {
  /**
   * Search and filter questions strictly across the curated dataset and faculty-created questions.
   * Total questions in curated dataset = 45 (+ any faculty created).
   */
  static async searchQuestions(query: {
    keyword?: string;
    categoryId?: string;
    category?: string;
    topicId?: string;
    topic?: string;
    difficulty?: string;
    language?: string;
    questionType?: string;
    status?: string;
    excludeTypes?: string | string[];
    isFaculty?: boolean;
    page?: number;
    limit?: number;
  }) {
    const {
      keyword,
      categoryId,
      category,
      topicId,
      topic,
      difficulty,
      language,
      questionType,
      status,
      excludeTypes,
      isFaculty = false,
      page = 1,
      limit = 15,
    } = query;

    const skip = (page - 1) * limit;

    const whereClause: Prisma.QuestionWhereInput = {
      ...CURATED_SOURCE_CONDITION,
    };

    // Status filtering
    if (isFaculty) {
      if (status && status !== 'ALL') {
        whereClause.status = status as any;
      }
    } else {
      whereClause.status = 'PUBLISHED';
    }

    if (keyword && keyword.trim()) {
      const q = keyword.trim();
      whereClause.AND = whereClause.AND || [];
      (whereClause.AND as any[]).push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    // Category filtering (ID or name)
    const effectiveCategory = (categoryId || category || '').trim();
    if (effectiveCategory && effectiveCategory !== 'ALL') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveCategory);
      if (isUuid) {
        whereClause.categoryId = effectiveCategory;
      } else {
        whereClause.AND = whereClause.AND || [];
        (whereClause.AND as any[]).push({
          category: { name: { equals: effectiveCategory, mode: 'insensitive' } },
        });
      }
    }

    // Topic filtering (ID or name with DP abbreviation normalization)
    const effectiveTopic = (topicId || topic || '').trim();
    if (effectiveTopic && effectiveTopic !== 'ALL') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveTopic);
      if (isUuid) {
        whereClause.topicId = effectiveTopic;
      } else {
        const normalizedVariants = [effectiveTopic];
        if (effectiveTopic.includes('DP')) {
          normalizedVariants.push(effectiveTopic.replace(/\bDP\b/g, 'Dynamic Programming'));
        }
        if (effectiveTopic.toLowerCase().includes('dynamic programming')) {
          normalizedVariants.push(effectiveTopic.replace(/Dynamic Programming/gi, 'DP'));
        }

        whereClause.AND = whereClause.AND || [];
        (whereClause.AND as any[]).push({
          OR: [
            { topic: { name: { in: normalizedVariants, mode: 'insensitive' } } },
            { tags: { some: { name: { in: normalizedVariants, mode: 'insensitive' } } } },
          ],
        });
      }
    }

    if (difficulty && difficulty !== 'ALL') whereClause.difficulty = difficulty as any;
    if (questionType && questionType !== 'ALL') whereClause.questionType = questionType as any;

    if (excludeTypes) {
      const excluded = Array.isArray(excludeTypes) ? excludeTypes : [excludeTypes];
      if (excluded.length > 0) {
        whereClause.AND = whereClause.AND || [];
        (whereClause.AND as any[]).push({ questionType: { notIn: excluded as any[] } });
      }
    }

    if (language && language !== 'ALL') {
      whereClause.language = {
        name: { equals: language, mode: 'insensitive' },
      };
    }

    const [total, questions] = await Promise.all([
      prisma.question.count({ where: whereClause }),
      prisma.question.findMany({
        where: whereClause,
        include: {
          category: true,
          topic: true,
          language: true,
          tags: true,
          companies: true,
          metadata: true,
          examples: true,
          explanations: true,
          constraints: true,
          hints: true,
          source: true,
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Sanitize test cases for students / public
    const sanitizedQuestions = questions.map((q) => {
      const rawPayload = (q.metadata?.jsonPayload as any) || {};
      const testCases = rawPayload.testCases || [];

      const visibleCount = testCases.filter((tc: any) => tc.visibility !== 'HIDDEN' && !tc.isHidden).length;
      const hiddenCount = testCases.filter((tc: any) => tc.visibility === 'HIDDEN' || tc.isHidden).length;

      let payloadToReturn = { ...rawPayload };
      if (q.questionType === 'CODING') {
        const defaultMode = rawPayload.execution?.executionMode || 'STANDARD_IO';
        payloadToReturn.execution = {
          ...(rawPayload.execution || {}),
          executionMode: defaultMode,
        };
      }

      if (!isFaculty) {
        // Strip hidden test cases completely
        const sanitizedTestCases = testCases
          .filter((tc: any) => tc.visibility !== 'HIDDEN' && !tc.isHidden)
          .map((tc: any) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            visibility: 'VISIBLE',
          }));

        payloadToReturn = {
          ...payloadToReturn,
          testCases: sanitizedTestCases,
        };
      }

      const options = Array.isArray(payloadToReturn.options) && payloadToReturn.options.length > 0
        ? payloadToReturn.options
        : ((q as any).options || []);
      const correctOptionIndex = typeof payloadToReturn.correctOptionIndex === 'number'
        ? payloadToReturn.correctOptionIndex
        : (typeof (q as any).correctOptionIndex === 'number' ? (q as any).correctOptionIndex : undefined);
      const explanation = (q.explanations && q.explanations.length > 0)
        ? q.explanations[0].content
        : (payloadToReturn.explanation || null);

      return {
        ...q,
        options,
        correctOptionIndex,
        correctAnswer: correctOptionIndex,
        explanation,
        storedExplanation: explanation,
        testCaseStats: {
          total: testCases.length,
          visibleCount,
          hiddenCount,
        },
        metadata: q.metadata
          ? {
            ...q.metadata,
            jsonPayload: payloadToReturn,
          }
          : null,
      };
    });

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.max(1, Math.ceil(total / limit)),
      data: sanitizedQuestions,
    };
  }

  static async getCategories(excludeTypes?: string | string[]) {
    const excluded = excludeTypes ? (Array.isArray(excludeTypes) ? excludeTypes : [excludeTypes]) : [];
    const categories = await prisma.questionCategory.findMany({
      where: {
        questions: {
          some: {
            ...CURATED_SOURCE_CONDITION,
            ...(excluded.length > 0 && { questionType: { notIn: excluded as any[] } }),
          },
        },
      },
      include: {
        _count: {
          select: {
            questions: {
              where: {
                ...CURATED_SOURCE_CONDITION,
                ...(excluded.length > 0 && { questionType: { notIn: excluded as any[] } }),
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories;
  }

  static async getTopics(excludeTypes?: string | string[]) {
    const excluded = excludeTypes ? (Array.isArray(excludeTypes) ? excludeTypes : [excludeTypes]) : [];
    return prisma.questionTopic.findMany({
      where: {
        questions: {
          some: {
            ...CURATED_SOURCE_CONDITION,
            ...(excluded.length > 0 && { questionType: { notIn: excluded as any[] } }),
          },
        },
      },
      include: {
        category: true,
        _count: {
          select: {
            questions: {
              where: {
                ...CURATED_SOURCE_CONDITION,
                ...(excluded.length > 0 && { questionType: { notIn: excluded as any[] } }),
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getLanguages() {
    return prisma.programmingLanguage.findMany();
  }

  static async getTags() {
    return prisma.questionTag.findMany();
  }

  static async getQuestionById(id: string, isFaculty: boolean = false) {
    const question = await prisma.question.findFirst({
      where: {
        OR: [
          { id },
          { metadata: { originalId: id } },
        ],
        deletedAt: null,
        ...(!isFaculty && { status: 'PUBLISHED' }),
      },
      include: {
        category: true,
        topic: true,
        language: true,
        tags: true,
        companies: true,
        metadata: true,
        explanations: true,
        hints: true,
        examples: true,
        constraints: true,
      },
    });

    if (!question) return null;

    const rawPayload = (question.metadata?.jsonPayload as any) || {};
    const testCases = rawPayload.testCases || [];

    const visibleCount = testCases.filter((tc: any) => tc.visibility !== 'HIDDEN' && !tc.isHidden).length;
    const hiddenCount = testCases.filter((tc: any) => tc.visibility === 'HIDDEN' || tc.isHidden).length;

    let payloadToReturn = { ...rawPayload };
    if (question.questionType === 'CODING') {
      const defaultMode = rawPayload.execution?.executionMode || 'STANDARD_IO';
      payloadToReturn.execution = {
        ...(rawPayload.execution || {}),
        executionMode: defaultMode,
      };
    }

    if (!isFaculty) {
      // Strip hidden test cases completely
      const sanitizedTestCases = testCases
        .filter((tc: any) => tc.visibility !== 'HIDDEN' && !tc.isHidden)
        .map((tc: any, idx: number) => ({
          testCaseId: tc.testCaseId || `${question.id}-tc-${idx + 1}`,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          visible: true,
          visibility: 'VISIBLE',
          weight: tc.weight ?? 1,
        }));

      payloadToReturn = {
        ...payloadToReturn,
        testCases: sanitizedTestCases,
      };
    }

    const effectiveExamples = (question.examples && question.examples.length > 0)
      ? question.examples
      : (rawPayload.examples || []).map((ex: any, idx: number) => ({
          id: `ex-${idx + 1}`,
          input: typeof ex.input === 'string' ? ex.input : JSON.stringify(ex.input),
          output: typeof ex.output === 'string' ? ex.output : JSON.stringify(ex.output),
          explanation: ex.explanation || null,
        }));

    const effectiveConstraints = (question.constraints && question.constraints.length > 0)
      ? question.constraints
      : (rawPayload.constraints || []).map((c: any, idx: number) => ({
          id: `c-${idx + 1}`,
          constraint: typeof c === 'string' ? c : (c.constraint || JSON.stringify(c)),
        }));

    const effectiveHints = (question.hints && question.hints.length > 0)
      ? question.hints
      : (rawPayload.hints || []).map((h: any, idx: number) => ({
          id: `h-${idx + 1}`,
          hint: typeof h === 'string' ? h : (h.hint || JSON.stringify(h)),
        }));

    const options = Array.isArray(payloadToReturn.options) && payloadToReturn.options.length > 0
      ? payloadToReturn.options
      : ((question as any).options || []);
    const correctOptionIndex = typeof payloadToReturn.correctOptionIndex === 'number'
      ? payloadToReturn.correctOptionIndex
      : (typeof (question as any).correctOptionIndex === 'number' ? (question as any).correctOptionIndex : undefined);
    const explanation = (question.explanations && question.explanations.length > 0)
      ? question.explanations[0].content
      : (payloadToReturn.explanation || null);

    return {
      ...question,
      options,
      correctOptionIndex,
      correctAnswer: correctOptionIndex,
      explanation,
      storedExplanation: explanation,
      inputFormat: rawPayload.inputFormat || '',
      outputFormat: rawPayload.outputFormat || '',
      submissionFormat: rawPayload.submissionFormat || 'full_program',
      candidateStarterCode: rawPayload.candidateStarterCode || 'empty',
      examples: effectiveExamples,
      constraints: effectiveConstraints,
      hints: effectiveHints,
      testCases: payloadToReturn.testCases || [],
      testCaseStats: {
        total: testCases.length,
        visibleCount,
        hiddenCount,
      },
      metadata: question.metadata
        ? {
            ...question.metadata,
            jsonPayload: payloadToReturn,
          }
        : null,
    };
  }

  static async getStatistics(excludeTypes?: string | string[]) {
    const excluded = excludeTypes ? (Array.isArray(excludeTypes) ? excludeTypes : [excludeTypes]) : [];
    const whereClause: Prisma.QuestionWhereInput = {
      ...CURATED_SOURCE_CONDITION,
    };
    if (excluded.length > 0) {
      whereClause.questionType = { notIn: excluded as any[] };
    }

    const totalQuestions = await prisma.question.count({ where: whereClause });
    const categoriesCount = (await this.getCategories(excludeTypes)).length;
    const topicsCount = (await this.getTopics(excludeTypes)).length;
    const languagesCount = await prisma.programmingLanguage.count();

    const difficultyDist = await prisma.question.groupBy({
      by: ['difficulty'],
      where: whereClause,
      _count: { _all: true },
    });
    const typeDist = await prisma.question.groupBy({
      by: ['questionType'],
      where: whereClause,
      _count: { _all: true },
    });

    const categoryDist = await prisma.question.groupBy({
      by: ['categoryId'],
      where: whereClause,
      _count: { _all: true },
    });

    const datasetDistribution = await Promise.all(
      categoryDist.map(async (c) => {
        if (!c.categoryId) return { name: 'Unknown', count: c._count._all };
        const cat = await prisma.questionCategory.findUnique({ where: { id: c.categoryId } });
        return { name: cat?.name || 'Unknown', count: c._count._all };
      })
    );

    return {
      totalQuestions,
      categoriesCount,
      topicsCount,
      languagesCount,
      difficultyDistribution: difficultyDist,
      typeDistribution: typeDist,
      datasetDistribution,
    };
  }
}
