import { DatasetMapper } from './DatasetMapper';
import { NormalizedQuestion } from './NormalizedQuestion';
import { DifficultyLevel, QuestionTypeEnum } from '../../generated/client';
import { generateQuestionHash } from './utils';

export class SQLDatasetMapper implements DatasetMapper {
  canMap(record: any): boolean {
    return 'question' in record && 'expected_sql' in record && 'table_schema' in record;
  }

  map(record: any): NormalizedQuestion {
    if (!record.question || typeof record.question !== 'string') {
      throw new Error("Missing or invalid 'question' field in SQL dataset");
    }

    let difficulty: DifficultyLevel = DifficultyLevel.MEDIUM;
    if (record.difficulty) {
      const d = record.difficulty.toString().toUpperCase();
      if (['EASY', 'MEDIUM', 'HARD', 'EXPERT'].includes(d)) {
        difficulty = d as DifficultyLevel;
      }
    }

    const explanations = [];
    if (record.explanation) {
      explanations.push({ content: record.explanation });
    }

    return {
      title: record.question.substring(0, 255),
      description: record.question,
      questionType: QuestionTypeEnum.SQL,
      datasetName: 'SQL',
      difficulty,
      category: 'SQL',
      topic: record.topic || 'Querying',
      language: 'SQL',
      expectedAnswer: record.expected_sql,
      hash: generateQuestionHash({
        title: record.question.substring(0, 255),
        description: record.question,
        questionType: QuestionTypeEnum.SQL,
        category: 'SQL',
        language: 'SQL',
      }),
      explanations,
      metadata: {
        table_schema: record.table_schema,
        table_id: record.table_id,
        original_id: record.id
      }
    };
  }
}
