import { PrismaClient } from '../generated/client';
import axios from 'axios';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

const QUESTION_BANK_URL = process.env.QUESTION_BANK_SERVICE_URL || 'http://localhost:3005';

export type SelectionMode = 'RANDOM' | 'MANUAL';

export interface HRStageConfig {
  mode: 'CONVERSATIONAL';
  initialQuestionId?: string | null;
  initialPrompt?: string;
  allowFollowUp?: boolean;
  maxFollowUps?: number;
  evaluationRubrics?: string[];
  [key: string]: any;
}

export interface AssessmentStructure {
  selectionMode: SelectionMode;
  aptitude: {
    mode: SelectionMode;
    count: number;
    minRequired: number;
    isValid: boolean;
  };
  coding: {
    mode: SelectionMode;
    count: number;
    distribution: string;
    minRequired: number;
    isValid: boolean;
  };
  hr: {
    mode: 'CONVERSATIONAL';
    label: string;
    initialQuestionId?: string | null;
    initialPrompt?: string;
    allowFollowUp: boolean;
    isValid: boolean;
  };
  summary: string;
  totalFixedQuestions: number;
  isPublishable: boolean;
}

export interface CreateTemplateDTO {
  name: string;
  description?: string;
  interviewType?: string;
  duration?: number;
  difficulty?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  selectionMode?: SelectionMode;
  programmingLanguage?: string;
  defaultConfiguration?: {
    selectionMode?: SelectionMode;
    allowSkipping?: boolean;
    randomizeOrder?: boolean;
    timePerQuestion?: number;
    categories?: string[];
    hrConfig?: HRStageConfig;
    [key: string]: any;
  };
  aptitudeQuestionIds?: string[];
  codingQuestionIds?: string[];
  hrConfig?: HRStageConfig;
  questionIds?: string[];
  questions?: Array<{ questionId: string; order?: number }>;
}

export class TemplateService {
  /**
   * Enrich template with question metadata from Question Bank
   */
  public static async enrichQuestions(questionRefs: Array<{ questionId: string; order: number }>) {
    if (!questionRefs || questionRefs.length === 0) return [];

    const enriched = await Promise.all(
      questionRefs.map(async (ref) => {
        try {
          const res = await axios.get(`${QUESTION_BANK_URL}/${ref.questionId}`, {
            headers: { 'x-user-role': 'FACULTY' },
          });
          const q = res.data?.data;
          if (!q) {
            return {
              questionId: ref.questionId,
              order: ref.order,
              title: 'Curated Question',
              questionType: 'GENERAL',
              difficulty: 'MEDIUM',
              category: 'General',
            };
          }
          return {
            questionId: q.id,
            order: ref.order,
            title: q.title,
            description: q.description,
            questionType: q.questionType || 'CODING',
            difficulty: q.difficulty || 'MEDIUM',
            category: q.category?.name || q.category || 'General',
            topic: q.topic?.name || q.topic || 'General',
            testCaseStats: q.testCaseStats,
            metadata: q.metadata,
          };
        } catch {
          return {
            questionId: ref.questionId,
            order: ref.order,
            title: 'Question',
            questionType: 'GENERAL',
            difficulty: 'MEDIUM',
            category: 'General',
          };
        }
      })
    );

    return enriched.sort((a, b) => a.order - b.order);
  }

  /**
   * Compute structured assessment composition from questions, config, and mode
   */
  public static computeAssessmentStructure(
    enrichedQuestions: any[],
    defaultConfiguration?: any
  ): AssessmentStructure {
    const cfg = defaultConfiguration || {};
    const selectionMode: SelectionMode = cfg.selectionMode === 'MANUAL' ? 'MANUAL' : (cfg.selectionMode || (enrichedQuestions.length > 0 ? 'MANUAL' : 'RANDOM'));

    const aptitudeQuestions = enrichedQuestions.filter((q) => q.questionType === 'APTITUDE');
    const codingQuestions = enrichedQuestions.filter((q) => q.questionType === 'CODING');

    const hrConfig: HRStageConfig = cfg.hrConfig || {
      mode: 'CONVERSATIONAL',
      allowFollowUp: true,
      initialPrompt: 'Tell me about yourself, your background, and key software projects you have built.',
    };

    const isHrValid = hrConfig.mode === 'CONVERSATIONAL' && hrConfig.allowFollowUp !== false;

    if (selectionMode === 'RANDOM') {
      return {
        selectionMode: 'RANDOM',
        aptitude: {
          mode: 'RANDOM',
          count: 5,
          minRequired: 5,
          isValid: true,
        },
        coding: {
          mode: 'RANDOM',
          count: 2,
          distribution: '1 Easy + 1 Medium/Hard',
          minRequired: 2,
          isValid: true,
        },
        hr: {
          mode: 'CONVERSATIONAL',
          label: 'Conversational',
          initialQuestionId: hrConfig.initialQuestionId || null,
          initialPrompt: hrConfig.initialPrompt,
          allowFollowUp: hrConfig.allowFollowUp !== false,
          isValid: isHrValid,
        },
        summary: 'Random • 5 Aptitude • 2 Coding (1 Easy, 1 Med/Hard) • Conversational HR',
        totalFixedQuestions: 7,
        isPublishable: isHrValid,
      };
    }

    // MANUAL Mode
    const aptCount = aptitudeQuestions.length;
    const codCount = codingQuestions.length;
    const isAptValid = aptCount >= 5;
    const isCodValid = codCount >= 2;

    return {
      selectionMode: 'MANUAL',
      aptitude: {
        mode: 'MANUAL',
        count: aptCount,
        minRequired: 5,
        isValid: isAptValid,
      },
      coding: {
        mode: 'MANUAL',
        count: codCount,
        distribution: 'Faculty Selected',
        minRequired: 2,
        isValid: isCodValid,
      },
      hr: {
        mode: 'CONVERSATIONAL',
        label: 'Conversational',
        initialQuestionId: hrConfig.initialQuestionId || null,
        initialPrompt: hrConfig.initialPrompt,
        allowFollowUp: hrConfig.allowFollowUp !== false,
        isValid: isHrValid,
      },
      summary: `Manual • ${aptCount} Aptitude • ${codCount} Coding • Conversational HR`,
      totalFixedQuestions: aptCount + codCount,
      isPublishable: isAptValid && isCodValid && isHrValid,
    };
  }

  /**
   * Validate stage rules for Published templates based on selection mode
   */
  private static async validateStageRules(
    enrichedQuestions: any[],
    defaultConfiguration?: any,
    status: string = 'DRAFT'
  ) {
    if (status !== 'PUBLISHED') return;

    const cfg = defaultConfiguration || {};
    const selectionMode: SelectionMode = cfg.selectionMode || 'RANDOM';

    const hrConfig = cfg.hrConfig;
    if (hrConfig && hrConfig.mode && hrConfig.mode !== 'CONVERSATIONAL') {
      throw new Error('Configure the HR interview stage as a Conversational AI interview.');
    }

    if (selectionMode === 'RANDOM') {
      // In Random mode, verify the database has enough curated questions
      try {
        const [aptRes, codRes] = await Promise.all([
          axios.get(`${QUESTION_BANK_URL}/?questionType=APTITUDE&limit=50`),
          axios.get(`${QUESTION_BANK_URL}/?questionType=CODING&limit=50`),
        ]);
        const apts = aptRes.data?.data || [];
        const cods = codRes.data?.data || [];
        if (apts.length < 5) {
          throw new Error('Curated Question Bank contains fewer than 5 Aptitude questions.');
        }
        const easyCod = cods.filter((q: any) => q.difficulty === 'EASY');
        const medHardCod = cods.filter((q: any) => q.difficulty === 'MEDIUM' || q.difficulty === 'HARD');
        if (easyCod.length < 1 || medHardCod.length < 1) {
          throw new Error('Curated Question Bank must contain at least 1 Easy and 1 Medium/Hard Coding problem.');
        }
      } catch (err: any) {
        if (err.message && !err.message.includes('Curated Question Bank')) {
          console.warn('[Validation] Curated question check error:', err.message);
        } else {
          throw err;
        }
      }
      return;
    }

    // MANUAL Mode Validation
    const aptCount = enrichedQuestions.filter((q) => q.questionType === 'APTITUDE').length;
    const codCount = enrichedQuestions.filter((q) => q.questionType === 'CODING').length;

    if (aptCount < 5) {
      throw new Error(`Select at least 5 aptitude questions. (Currently selected: ${aptCount})`);
    }

    if (codCount < 2) {
      throw new Error(`Select at least 2 coding problems. (Currently selected: ${codCount})`);
    }
  }

  /**
   * List interview templates with role-aware filtering
   */
  static async listTemplates(query: {
    search?: string;
    status?: string;
    interviewType?: string;
    isFaculty?: boolean;
    identityId?: string;
  }) {
    const { search, status, interviewType, isFaculty = false } = query;

    const andConditions: any[] = [{ isActive: true }];

    if (isFaculty) {
      if (status && status !== 'ALL') {
        andConditions.push({ status });
      } else {
        andConditions.push({ status: { not: 'ARCHIVED' } });
      }
    } else {
      andConditions.push({ status: 'PUBLISHED' });
    }

    if (interviewType && interviewType !== 'ALL') {
      andConditions.push({ interviewType: { equals: interviewType, mode: 'insensitive' } });
    }

    if (search && search.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    const whereClause = { AND: andConditions };

    const templates = await prisma.interviewTemplate.findMany({
      where: whereClause,
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich templates with question breakdown and categories
    const enrichedList = await Promise.all(
      templates.map(async (tmpl) => {
        const enrichedQuestions = await this.enrichQuestions(tmpl.questions);
        const categories = Array.from(
          new Set(enrichedQuestions.map((q) => q.category).filter(Boolean))
        );
        const typeBreakdown = enrichedQuestions.reduce((acc: any, q) => {
          const t = q.questionType || 'OTHER';
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        }, {});

        const assessmentStructure = this.computeAssessmentStructure(
          enrichedQuestions,
          tmpl.defaultConfiguration
        );

        return {
          id: tmpl.id,
          name: tmpl.name,
          description: tmpl.description,
          interviewType: tmpl.interviewType,
          difficulty: tmpl.difficulty,
          duration: tmpl.duration,
          questionCount: assessmentStructure.totalFixedQuestions,
          programmingLanguage: tmpl.programmingLanguage,
          defaultConfiguration: tmpl.defaultConfiguration,
          status: tmpl.status,
          isActive: tmpl.isActive,
          createdBy: tmpl.createdBy,
          createdAt: tmpl.createdAt,
          updatedAt: tmpl.updatedAt,
          categories,
          typeBreakdown,
          assessmentStructure,
          questions: enrichedQuestions,
        };
      })
    );

    return enrichedList;
  }

  /**
   * Get single template by ID with complete enriched questions
   */
  static async getTemplateById(id: string, isFaculty: boolean = false) {
    const template = await prisma.interviewTemplate.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!template) return null;
    if (!isFaculty && (template.status !== 'PUBLISHED' || !template.isActive)) {
      return null;
    }

    const enrichedQuestions = await this.enrichQuestions(template.questions);
    const categories = Array.from(
      new Set(enrichedQuestions.map((q) => q.category).filter(Boolean))
    );
    const typeBreakdown = enrichedQuestions.reduce((acc: any, q) => {
      const t = q.questionType || 'OTHER';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    const assessmentStructure = this.computeAssessmentStructure(
      enrichedQuestions,
      template.defaultConfiguration
    );

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      interviewType: template.interviewType,
      difficulty: template.difficulty,
      duration: template.duration,
      questionCount: assessmentStructure.totalFixedQuestions,
      programmingLanguage: template.programmingLanguage,
      defaultConfiguration: template.defaultConfiguration,
      status: template.status,
      isActive: template.isActive,
      createdBy: template.createdBy,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      categories,
      typeBreakdown,
      assessmentStructure,
      questions: enrichedQuestions,
    };
  }

  /**
   * Create a new interview template
   */
  static async createTemplate(data: CreateTemplateDTO, identityId?: string) {
    if (!data.name || !data.name.trim()) {
      throw new Error('Template name is required.');
    }

    const selectionMode: SelectionMode =
      data.selectionMode ||
      data.defaultConfiguration?.selectionMode ||
      (data.aptitudeQuestionIds?.length || data.codingQuestionIds?.length || data.questions?.length ? 'MANUAL' : 'RANDOM');

    // Support stage-based IDs (aptitudeQuestionIds + codingQuestionIds) or flat questionIds
    let combinedQuestionIds: string[] = [];
    if (selectionMode === 'MANUAL') {
      if (data.aptitudeQuestionIds || data.codingQuestionIds) {
        const aptIds = Array.isArray(data.aptitudeQuestionIds) ? data.aptitudeQuestionIds : [];
        const codIds = Array.isArray(data.codingQuestionIds) ? data.codingQuestionIds : [];
        combinedQuestionIds = [...aptIds, ...codIds];
      } else if (data.questions && Array.isArray(data.questions)) {
        combinedQuestionIds = data.questions.map((q) => q.questionId).filter(Boolean);
      } else if (data.questionIds && Array.isArray(data.questionIds)) {
        combinedQuestionIds = data.questionIds;
      }
    }

    const uniqueQuestionIds = Array.from(new Set(combinedQuestionIds));
    const rawQuestions = uniqueQuestionIds.map((id, idx) => ({ questionId: id, order: idx + 1 }));

    // Prepare defaultConfiguration with selectionMode and HR Conversational settings
    const hrConfig: HRStageConfig = data.hrConfig ||
      data.defaultConfiguration?.hrConfig || {
        mode: 'CONVERSATIONAL',
        allowFollowUp: true,
        initialPrompt: 'Tell me about yourself, your background, and key software projects you have built.',
      };

    const finalConfig = {
      ...(data.defaultConfiguration || {}),
      selectionMode,
      hrConfig,
    };

    const status = data.status || 'DRAFT';

    // Enrich questions to validate stage counts
    const enrichedQuestions = await this.enrichQuestions(rawQuestions);
    await this.validateStageRules(enrichedQuestions, finalConfig, status);

    const template = await prisma.interviewTemplate.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || '',
        interviewType: (data.interviewType || 'MOCK').toUpperCase(),
        difficulty: (data.difficulty || 'MIXED').toUpperCase(),
        duration: data.duration || 60,
        questionCount: selectionMode === 'RANDOM' ? 7 : rawQuestions.length,
        programmingLanguage: data.programmingLanguage || null,
        defaultConfiguration: finalConfig,
        status,
        createdBy: identityId || null,
        questions: {
          create: rawQuestions.map((q) => ({
            questionId: q.questionId,
            order: q.order,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return this.getTemplateById(template.id, true);
  }

  /**
   * Update an existing interview template
   */
  static async updateTemplate(id: string, data: Partial<CreateTemplateDTO>, identityId?: string) {
    const existing = await prisma.interviewTemplate.findUnique({
      where: { id },
      include: { questions: true },
    });

    if (!existing) {
      throw new Error('Template not found.');
    }

    const existingCfg = (existing.defaultConfiguration as any) || {};
    const selectionMode: SelectionMode =
      data.selectionMode ||
      data.defaultConfiguration?.selectionMode ||
      existingCfg.selectionMode ||
      'MANUAL';

    let combinedQuestionIds: string[] | null = null;
    if (selectionMode === 'MANUAL') {
      if (data.aptitudeQuestionIds !== undefined || data.codingQuestionIds !== undefined) {
        const aptIds = Array.isArray(data.aptitudeQuestionIds) ? data.aptitudeQuestionIds : [];
        const codIds = Array.isArray(data.codingQuestionIds) ? data.codingQuestionIds : [];
        combinedQuestionIds = [...aptIds, ...codIds];
      } else if (data.questions && Array.isArray(data.questions)) {
        combinedQuestionIds = data.questions.map((q) => q.questionId).filter(Boolean);
      } else if (data.questionIds && Array.isArray(data.questionIds)) {
        combinedQuestionIds = data.questionIds;
      }
    } else {
      // In RANDOM mode, question references are dynamically generated at session creation time
      combinedQuestionIds = [];
    }

    let rawQuestions: Array<{ questionId: string; order: number }> | null = null;
    if (combinedQuestionIds !== null) {
      const unique = Array.from(new Set(combinedQuestionIds));
      rawQuestions = unique.map((qId, idx) => ({ questionId: qId, order: idx + 1 }));
    }

    const nextStatus = data.status || existing.status;
    const finalConfig = {
      ...existingCfg,
      ...(data.defaultConfiguration || {}),
      selectionMode,
      ...(data.hrConfig ? { hrConfig: data.hrConfig } : {}),
    };

    // If updating questions, validate stage rules against updated questions
    const questionsToValidate = rawQuestions
      ? await this.enrichQuestions(rawQuestions)
      : await this.enrichQuestions(existing.questions);

    await this.validateStageRules(questionsToValidate, finalConfig, nextStatus);

    await prisma.$transaction(async (tx) => {
      if (rawQuestions !== null) {
        // Replace existing question references
        await tx.templateQuestionReference.deleteMany({
          where: { templateId: id },
        });

        if (rawQuestions.length > 0) {
          await tx.templateQuestionReference.createMany({
            data: rawQuestions.map((q) => ({
              templateId: id,
              questionId: q.questionId,
              order: q.order,
            })),
          });
        }
      }

      await tx.interviewTemplate.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.description !== undefined && { description: data.description.trim() }),
          ...(data.interviewType && { interviewType: data.interviewType.toUpperCase() }),
          ...(data.difficulty && { difficulty: data.difficulty.toUpperCase() }),
          ...(data.duration !== undefined && { duration: data.duration }),
          ...(data.status && { status: data.status }),
          ...(data.programmingLanguage !== undefined && { programmingLanguage: data.programmingLanguage }),
          defaultConfiguration: finalConfig,
          questionCount: selectionMode === 'RANDOM' ? 7 : (rawQuestions ? rawQuestions.length : existing.questions.length),
        },
      });
    });

    return this.getTemplateById(id, true);
  }

  /**
   * Duplicate template with all its question references
   */
  static async duplicateTemplate(id: string, identityId?: string) {
    const existing = await prisma.interviewTemplate.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!existing) {
      throw new Error('Template not found to duplicate.');
    }

    const duplicatedName = `Copy of ${existing.name}`;

    const duplicate = await prisma.interviewTemplate.create({
      data: {
        name: duplicatedName,
        description: existing.description,
        interviewType: existing.interviewType,
        difficulty: existing.difficulty,
        duration: existing.duration,
        questionCount: existing.questions.length,
        programmingLanguage: existing.programmingLanguage,
        defaultConfiguration: existing.defaultConfiguration as any,
        status: 'DRAFT',
        createdBy: identityId || null,
        questions: {
          create: existing.questions.map((q) => ({
            questionId: q.questionId,
            order: q.order,
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    return this.getTemplateById(duplicate.id, true);
  }

  /**
   * Delete / Archive template (does NOT delete Question Bank questions)
   */
  static async deleteTemplate(id: string) {
    const existing = await prisma.interviewTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Template not found.');
    }

    // Soft delete / archive to preserve historical interview references
    await prisma.interviewTemplate.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        isActive: false,
      },
    });

    return { success: true, id, message: 'Template safely archived.' };
  }
}
