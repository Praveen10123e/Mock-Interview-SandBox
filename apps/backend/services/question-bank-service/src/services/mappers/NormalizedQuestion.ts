import { DifficultyLevel, QuestionTypeEnum } from '../../generated/client';

export interface NormalizedQuestion {
  title: string;
  description: string;
  questionType: QuestionTypeEnum;
  difficulty: DifficultyLevel;
  hash?: string;
  datasetName: string;
  
  // Relations mapped by name
  category?: string;
  topic?: string;
  subTopic?: string;
  language?: string;
  
  // Arrays
  tags?: string[];
  companies?: string[];
  
  // Answers & Details
  expectedAnswer?: string | null;
  idealAnswer?: string | null;
  estimatedTime?: number; // seconds
  marks?: number;
  
  // Question Meta Sub-tables
  examples?: Array<{ input?: string; output?: string; explanation?: string; order: number }>;
  constraints?: Array<{ constraint: string; order: number }>;
  hints?: Array<{ hint: string; order: number }>;
  explanations?: Array<{ content: string }>;
  
  // Dataset specific payload to store in QuestionMetadata
  metadata?: any;
  originalId?: string;
}
