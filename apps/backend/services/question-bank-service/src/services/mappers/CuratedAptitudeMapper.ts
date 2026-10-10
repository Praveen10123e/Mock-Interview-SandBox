import { DatasetMapper } from './DatasetMapper';
import { NormalizedQuestion } from './NormalizedQuestion';
import { DifficultyLevel, QuestionTypeEnum } from '../../generated/client';
import { generateQuestionHash } from './utils';

/**
 * Mapper for the curated aptitude.json dataset.
 * Structure: { id, topic, difficulty, question, options, correctOptionIndex, explanation }
 * Signature fields: 'id' starts with 'APT-', has 'options' array, has 'correctOptionIndex'
 */
export class CuratedAptitudeMapper implements DatasetMapper {
  canMap(record: any): boolean {
    return (
      typeof record.id === 'string' &&
      record.id.startsWith('APT-') &&
      'question' in record &&
      'options' in record &&
      'correctOptionIndex' in record
    );
  }

  map(record: any): NormalizedQuestion {
    if (!record.question || typeof record.question !== 'string') {
      throw new Error(`Missing 'question' in curated aptitude record: ${record.id}`);
    }
    if (!Array.isArray(record.options) || record.options.length === 0) {
      throw new Error(`Missing 'options' in curated aptitude record: ${record.id}`);
    }

    let difficulty: DifficultyLevel = DifficultyLevel.MEDIUM;
    if (record.difficulty) {
      const d = record.difficulty.toString().toUpperCase();
      if (['EASY', 'MEDIUM', 'HARD', 'EXPERT'].includes(d)) {
        difficulty = d as DifficultyLevel;
      }
    }

    const explanations = record.explanation
      ? [{ content: record.explanation }]
      : [];

    const topic = record.topic || 'General Aptitude';
    const correctOption = record.options[record.correctOptionIndex] || '';

    return {
      title: record.question.substring(0, 255),
      description: record.question,
      questionType: QuestionTypeEnum.APTITUDE,
      datasetName: 'Curated Aptitude Set v1',
      difficulty,
      category: 'Aptitude',
      topic,
      expectedAnswer: correctOption,
      tags: [topic],
      explanations,
      originalId: record.id,
      metadata: {
        originalId: record.id,
        options: record.options,
        correctOptionIndex: record.correctOptionIndex,
        datasetSource: 'CURATED_DEMO',
      },
      hash: generateQuestionHash({
        title: record.question.substring(0, 255),
        description: record.question,
        questionType: QuestionTypeEnum.APTITUDE,
        category: 'Aptitude',
      }),
    };
  }
}
