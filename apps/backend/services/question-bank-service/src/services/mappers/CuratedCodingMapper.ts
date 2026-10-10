import { DatasetMapper } from './DatasetMapper';
import { NormalizedQuestion } from './NormalizedQuestion';
import { DifficultyLevel, QuestionTypeEnum } from '../../generated/client';
import { generateQuestionHash } from './utils';

/**
 * Mapper for the curated coding datasets:
 * Supports Full-Program Coding Interview Dataset (stdin/stdout model)
 * as well as legacy curated coding schema if encountered.
 */
export class CuratedCodingMapper implements DatasetMapper {
  canMap(record: any): boolean {
    return (
      (('problem_id' in record && typeof record.problem_id === 'string') ||
        (typeof record.id === 'string' && record.id.startsWith('COD-'))) &&
      'title' in record &&
      'description' in record &&
      ('hidden_test_cases' in record || 'testCases' in record || 'submission_format' in record)
    );
  }

  map(record: any): NormalizedQuestion {
    const problemId = record.problem_id || record.id;
    if (!record.title || typeof record.title !== 'string') {
      throw new Error(`Missing 'title' in curated coding record: ${problemId}`);
    }
    if (!record.description) {
      throw new Error(`Missing 'description' in curated coding record: ${problemId}`);
    }

    let difficulty: DifficultyLevel = DifficultyLevel.MEDIUM;
    if (record.difficulty) {
      const d = record.difficulty.toString().toUpperCase();
      if (['EASY', 'MEDIUM', 'HARD', 'EXPERT'].includes(d)) {
        difficulty = d as DifficultyLevel;
      }
    }

    const examples = Array.isArray(record.examples)
      ? record.examples.map((ex: any, i: number) => ({
          input: typeof ex.input === 'string' ? ex.input : JSON.stringify(ex.input),
          output: typeof ex.output === 'string' ? ex.output : (ex.output !== undefined ? String(ex.output) : ''),
          explanation: ex.explanation || '',
          order: i + 1,
        }))
      : [];

    const constraints = Array.isArray(record.constraints)
      ? record.constraints.map((c: any, i: number) => ({
          constraint: typeof c === 'string' ? c : (c.constraint || JSON.stringify(c)),
          order: i + 1,
        }))
      : [];

    const hints = Array.isArray(record.skills_evaluated)
      ? record.skills_evaluated.map((s: string, i: number) => ({ hint: `Skill evaluated: ${s}`, order: i + 1 }))
      : Array.isArray(record.hints)
      ? record.hints.map((h: any, i: number) => ({ hint: typeof h === 'string' ? h : h.hint, order: i + 1 }))
      : [];

    const topic = record.pattern || record.topic || 'Algorithms';

    // Build standard unified visible testCases list
    const allTestCases: Array<{
      testCaseId: string;
      input: string;
      expectedOutput: string;
      visible: boolean;
      weight: number;
    }> = [];

    // 1. Examples test cases
    if (Array.isArray(record.examples)) {
      record.examples.forEach((ex: any, i: number) => {
        const stdin = typeof ex.input === 'string' ? ex.input : JSON.stringify(ex.input);
        const expected = typeof ex.output === 'string' ? ex.output : (ex.output !== undefined ? String(ex.output) : '');
        allTestCases.push({
          testCaseId: `${problemId}-tc-${allTestCases.length + 1}`,
          input: stdin,
          expectedOutput: expected,
          visible: true,
          weight: 1,
        });
      });
    }

    // 2. Additional test cases from dataset (convert legacy source field to standard visible cases)
    const rawAdditionalCases = Array.isArray(record.hidden_test_cases)
      ? record.hidden_test_cases
      : Array.isArray(record.testCases)
      ? record.testCases
      : [];

    rawAdditionalCases.forEach((tc: any) => {
      const stdin = typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input);
      const expected = tc.expected_output !== undefined
        ? String(tc.expected_output)
        : String(tc.expectedOutput ?? tc.output ?? '');
      allTestCases.push({
        testCaseId: `${problemId}-tc-${allTestCases.length + 1}`,
        input: stdin,
        expectedOutput: expected,
        visible: true,
        weight: 1,
      });
    });

    return {
      title: record.title.substring(0, 255),
      description: record.description,
      questionType: QuestionTypeEnum.CODING,
      datasetName: 'Curated - Full-Program Coding Interview Dataset',
      difficulty,
      category: 'Programming',
      topic,
      language: 'Multi-Language',
      tags: [topic],
      examples,
      constraints,
      hints,
      originalId: problemId,
      metadata: {
        problemId,
        originalId: problemId,
        pattern: topic,
        inputFormat: record.input_format || '',
        outputFormat: record.output_format || '',
        constraints: record.constraints || constraints.map((c: any) => c.constraint),
        examples: record.examples || examples,
        skillsEvaluated: record.skills_evaluated || [],
        submissionFormat: record.submission_format || 'full_program',
        candidateStarterCode: record.candidate_starter_code || 'empty',
        executionType: 'STDIN_PROGRAM',
        testCases: allTestCases,
        datasetSource: 'CURATED_FULL_PROGRAM',
        execution: {
          executionMode: 'STANDARD_IO',
          type: 'stdin_stdout',
        },
      },
      hash: generateQuestionHash({
        title: record.title.substring(0, 255),
        description: record.description,
        questionType: QuestionTypeEnum.CODING,
        category: 'Programming',
        language: 'Multi-Language',
      }),
    };
  }
}
