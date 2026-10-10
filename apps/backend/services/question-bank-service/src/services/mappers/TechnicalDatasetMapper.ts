import { DatasetMapper } from './DatasetMapper';
import { NormalizedQuestion } from './NormalizedQuestion';
import { DifficultyLevel, QuestionTypeEnum } from '../../generated/client';
import { generateQuestionHash } from './utils';

export class TechnicalDatasetMapper implements DatasetMapper {
  canMap(record: any): boolean {
    return 'question' in record && 'technical_topic' in record;
  }

  map(record: any): NormalizedQuestion {
    if (!record.question || typeof record.question !== 'string') {
      throw new Error("Missing or invalid 'question' field in Technical dataset");
    }

    let difficulty: DifficultyLevel = DifficultyLevel.MEDIUM;
    if (record.difficulty) {
      const d = record.difficulty.toString().toUpperCase();
      if (['EASY', 'MEDIUM', 'HARD', 'EXPERT'].includes(d)) {
        difficulty = d as DifficultyLevel;
      }
    }

    const tags = [];
    if (Array.isArray(record.tags)) {
      tags.push(...record.tags);
    }

    return {
      title: record.question.substring(0, 255),
      description: record.question,
      questionType: QuestionTypeEnum.TECHNICAL,
      datasetName: 'Technical',
      difficulty,
      category: 'Technical',
      topic: record.technical_topic || 'General Technical',
      expectedAnswer: record.expected_answer || record.answer,
      tags,
      hash: generateQuestionHash({
        title: record.question.substring(0, 255),
        description: record.question,
        questionType: QuestionTypeEnum.TECHNICAL,
        category: 'Technical',
      }),
      metadata: {
        original_id: record.id
      }
    };
  }
}
