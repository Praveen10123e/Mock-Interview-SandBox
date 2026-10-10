import { DatasetMapper } from './DatasetMapper';
import { NormalizedQuestion } from './NormalizedQuestion';
import { DifficultyLevel, QuestionTypeEnum } from '../../generated/client';
import { generateQuestionHash } from './utils';

/**
 * Mapper for the curated hr.json dataset.
 * Structure: { id, category, difficulty, question, evaluationCriteria[] }
 * Signature fields: 'id' starts with 'HR-', has 'evaluationCriteria', has 'question'
 */
export class CuratedHRMapper implements DatasetMapper {
  canMap(record: any): boolean {
    return (
      typeof record.id === 'string' &&
      record.id.startsWith('HR-') &&
      'question' in record &&
      'evaluationCriteria' in record
    );
  }

  map(record: any): NormalizedQuestion {
    if (!record.question || typeof record.question !== 'string') {
      throw new Error(`Missing 'question' in curated HR record: ${record.id}`);
    }

    let difficulty: DifficultyLevel = DifficultyLevel.MEDIUM;
    if (record.difficulty) {
      const d = record.difficulty.toString().toUpperCase();
      if (['EASY', 'MEDIUM', 'HARD', 'EXPERT'].includes(d)) {
        difficulty = d as DifficultyLevel;
      }
    }

    const category = record.category || 'General / Introduction';

    // evaluationCriteria stored as explanation content
    const evaluationText = Array.isArray(record.evaluationCriteria)
      ? record.evaluationCriteria.join('\n• ')
      : '';
    const explanations = evaluationText
      ? [{ content: `Evaluation Criteria:\n• ${evaluationText}` }]
      : [];

    return {
      title: record.question.substring(0, 255),
      description: record.question,
      questionType: QuestionTypeEnum.HR,
      datasetName: 'Curated HR Set v1',
      difficulty,
      category: 'HR',
      topic: category,
      tags: [category],
      explanations,
      originalId: record.id,
      metadata: {
        originalId: record.id,
        category,
        evaluationCriteria: record.evaluationCriteria || [],
        datasetSource: 'CURATED_DEMO',
      },
      hash: generateQuestionHash({
        title: record.question.substring(0, 255),
        description: record.question,
        questionType: QuestionTypeEnum.HR,
        category: 'HR',
      }),
    };
  }
}
