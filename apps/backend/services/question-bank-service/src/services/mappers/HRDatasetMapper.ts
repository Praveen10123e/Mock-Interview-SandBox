import { DatasetMapper } from './DatasetMapper';
import { NormalizedQuestion } from './NormalizedQuestion';
import { DifficultyLevel, QuestionTypeEnum } from '../../generated/client';
import { generateQuestionHash } from './utils';

export class HRDatasetMapper implements DatasetMapper {
  canMap(record: any): boolean {
    // Unique signature for HR dataset
    return 'question' in record && 'role' in record && 'ideal_answer' in record && 'keywords' in record;
  }

  map(record: any): NormalizedQuestion {
    if (!record.question || typeof record.question !== 'string') {
      throw new Error("Missing or invalid 'question' field in HR dataset");
    }

    let difficulty: DifficultyLevel = DifficultyLevel.MEDIUM;
    if (record.difficulty) {
      const d = record.difficulty.toString().toUpperCase();
      if (['EASY', 'MEDIUM', 'HARD', 'EXPERT'].includes(d)) {
        difficulty = d as DifficultyLevel;
      }
    }

    const tags = [];
    if (record.role) tags.push(`Role:${record.role}`);
    if (record.experience) tags.push(`Experience:${record.experience}`);
    if (Array.isArray(record.keywords)) tags.push(...record.keywords);

    return {
      title: record.question.substring(0, 255),
      description: record.question,
      questionType: QuestionTypeEnum.HR,
      datasetName: 'HR',
      difficulty,
      category: 'HR',
      topic: record.source_type || 'General',
      idealAnswer: record.ideal_answer,
      tags: tags,
      hash: generateQuestionHash({
        title: record.question.substring(0, 255),
        description: record.question,
        questionType: QuestionTypeEnum.HR,
        category: 'HR',
      }),
      metadata: {
        role: record.role,
        experience: record.experience,
        source_type: record.source_type,
        keywords: record.keywords,
      }
    };
  }
}
