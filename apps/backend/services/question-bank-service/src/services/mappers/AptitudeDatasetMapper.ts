import { DatasetMapper } from './DatasetMapper';
import { NormalizedQuestion } from './NormalizedQuestion';
import { DifficultyLevel, QuestionTypeEnum } from '../../generated/client';
import { generateQuestionHash } from './utils';

export class AptitudeDatasetMapper implements DatasetMapper {
  canMap(record: any): boolean {
    return 'question' in record && 'options' in record && 'correct_answer' in record && 'category' in record;
  }

  map(record: any): NormalizedQuestion {
    if (!record.question || typeof record.question !== 'string') {
      throw new Error("Missing or invalid 'question' field in Aptitude dataset");
    }

    let difficulty: DifficultyLevel = DifficultyLevel.MEDIUM;
    if (record.difficulty) {
      const d = record.difficulty.toString().toUpperCase();
      if (['EASY', 'MEDIUM', 'HARD', 'EXPERT'].includes(d)) {
        difficulty = d as DifficultyLevel;
      }
    }

    const tags = [];
    if (Array.isArray(record.keywords)) {
      tags.push(...record.keywords);
    }

    const explanations = [];
    if (record.explanation) {
      explanations.push({ content: record.explanation });
    }

    return {
      title: record.question.substring(0, 255),
      description: record.question,
      questionType: QuestionTypeEnum.APTITUDE,
      datasetName: 'Aptitude',
      difficulty,
      category: 'Aptitude',
      topic: record.topic || 'General Aptitude',
      expectedAnswer: record.correct_answer,
      tags,
      hash: generateQuestionHash({
        title: record.question.substring(0, 255),
        description: record.question,
        questionType: QuestionTypeEnum.APTITUDE,
        category: 'Aptitude',
      }),
      explanations,
      metadata: {
        options: record.options,
        original_id: record.id
      }
    };
  }
}
