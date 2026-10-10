import { formatExampleText } from './formatExampleText';

export const normalizeInterviewQuestion = (question: any) => {
  if (!question) return null;

  let meta = question?.metadata;
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
  }

  let payload = meta?.jsonPayload || meta || {};
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (e) { payload = {}; }
  }

  // Aptitude uses explanations[0]?.content for explanation if not in payload
  const explanation = payload.explanation || (question?.explanations && question?.explanations[0]?.content) || '';

  const options = payload.options || [];
  const correctOptionIndex = payload.correctOptionIndex;

  const valid = Array.isArray(options) && options.length >= 2 && typeof correctOptionIndex === 'number' && correctOptionIndex >= 0;

  return {
    valid,
    reason: valid ? null : "APTITUDE_OPTIONS_MISSING",
    id: question?.id,
    originalId: payload.originalId || question?.id,
    questionType: question?.questionType,
    title: question?.title,
    description: question?.description,
    difficulty: question?.difficulty,
    topic: question?.topic?.name || 'General',
    category: question?.category?.name || 'Category',
    options,
    correctOptionIndex: valid ? correctOptionIndex : -1,
    explanation,
    examples: (payload.examples || question?.examples || []).map((ex: any) => ({
      ...ex,
      input: formatExampleText(ex.input),
      output: formatExampleText(ex.output),
      explanation: ex.explanation ? formatExampleText(ex.explanation) : '',
    })),
    constraints: (payload.constraints || question?.constraints || []).map((c: any) => typeof c === 'string' ? c : (c.constraint || JSON.stringify(c))),
    hints: (payload.hints || question?.hints || []).map((h: any) => typeof h === 'string' ? h : (h.hint || JSON.stringify(h))),
    evaluationCriteria: payload.evaluationCriteria || [],
    testCases: Array.isArray(payload.testCases) ? payload.testCases : (Array.isArray(question?.testCases) ? question.testCases : []),
    inputFormat: payload.inputFormat || payload.input_format || question?.inputFormat || question?.input_format || '',
    outputFormat: payload.outputFormat || payload.output_format || question?.outputFormat || question?.output_format || '',
    candidateStarterCode: payload.candidateStarterCode || payload.candidate_starter_code || question?.candidateStarterCode || question?.candidate_starter_code || '',
    metadata: question?.metadata || { jsonPayload: payload },
  };
};
