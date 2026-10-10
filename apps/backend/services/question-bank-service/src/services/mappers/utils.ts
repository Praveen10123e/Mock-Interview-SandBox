import crypto from 'crypto';

export function generateQuestionHash(fields: {
  title: string;
  description: string;
  questionType: string;
  category?: string;
  language?: string;
}): string {
  const data = `${fields.title}|${fields.description}|${fields.questionType}|${fields.category || ''}|${fields.language || ''}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}
