import api from '../../../api/axios/instance';
import { useQuery } from '@tanstack/react-query';

export interface CompletionResponse {
  success: boolean;
  data: {
    completionPercentage: number;
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface QuestionStatisticsResponse {
  success: boolean;
  data: {
    totalQuestions: number;
    byDifficulty: Record<string, number>;
    byCategory: Record<string, number>;
    byTopic: Record<string, number>;
    byLanguage?: Record<string, number>;
  };
}

// ─── API Calls ─────────────────────────────────────────────────────────────

export const fetchProfileCompletion = async (): Promise<CompletionResponse> => {
  const { data } = await api.get('/users/me/completion');
  return data;
};

export const fetchQuestionStatistics = async (): Promise<QuestionStatisticsResponse> => {
  const { data } = await api.get('/questions/statistics');
  return data;
};

// ─── React Query Hooks ─────────────────────────────────────────────────────

export const useProfileCompletion = () => {
  return useQuery({
    queryKey: ['profile', 'completion'],
    queryFn: fetchProfileCompletion,
  });
};

export const useQuestionStatistics = () => {
  return useQuery({
    queryKey: ['questions', 'statistics'],
    queryFn: fetchQuestionStatistics,
  });
};
