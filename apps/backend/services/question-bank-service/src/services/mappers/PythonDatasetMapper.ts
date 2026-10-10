import { DatasetMapper } from './DatasetMapper';
import { NormalizedQuestion } from './NormalizedQuestion';
import { DifficultyLevel, QuestionTypeEnum } from '../../generated/client';
import { generateQuestionHash } from './utils';

export class PythonDatasetMapper implements DatasetMapper {
  canMap(record: any): boolean {
    return 'title' in record && 'problem_description' in record && 'starter_code' in record;
  }

  map(record: any): NormalizedQuestion {
    if (!record.title || typeof record.title !== 'string') {
      throw new Error("Missing or invalid 'title' field in Python dataset");
    }
    if (!record.problem_description) {
      throw new Error("Missing 'problem_description' field in Python dataset");
    }

    let difficulty: DifficultyLevel = DifficultyLevel.MEDIUM;
    if (record.difficulty) {
      const d = record.difficulty.toString().toUpperCase();
      if (['EASY', 'MEDIUM', 'HARD', 'EXPERT'].includes(d)) {
        difficulty = d as DifficultyLevel;
      }
    }

    const tags = [];
    if (Array.isArray(record.topic)) {
      tags.push(...record.topic);
    }

    const explanations = [];
    if (record.explanation) {
      explanations.push({ content: record.explanation });
    }

    return {
      title: record.title.substring(0, 255),
      description: record.problem_description,
      questionType: QuestionTypeEnum.CODING,
      datasetName: 'Programming',
      difficulty,
      category: 'Programming',
      topic: Array.isArray(record.topic) && record.topic.length > 0 ? record.topic[0] : 'Algorithms',
      language: 'Python',
      expectedAnswer: record.expected_solution,
      tags,
      hash: generateQuestionHash({
        title: record.title.substring(0, 255),
        description: record.problem_description,
        questionType: QuestionTypeEnum.CODING,
        category: 'Programming',
        language: 'Python',
      }),
      explanations,
      metadata: {
        starter_code: record.starter_code,
        entry_point: record.entry_point,
        test_cases: record.test_cases,
        original_id: record.id
      }
    };
  }
}
