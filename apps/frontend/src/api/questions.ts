import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './axios/instance';

export interface TestCasePayload {
  input: string;
  expectedOutput: string;
  visibility?: 'VISIBLE' | 'HIDDEN';
  isHidden?: boolean;
  explanation?: string;
}

export interface QuestionLanguageConfig {
  language: string;
  starterCode?: string;
  functionName?: string;
  signature?: string;
  returnType?: string;
  methodName?: string;
  className?: string;
}

export interface CreateQuestionPayload {
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  category: string;
  topic?: string;
  questionType?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  executionMode?: 'STANDARD_IO' | 'FUNCTION';
  constraints?: string[];
  examples?: Array<{ input: string; output: string; explanation?: string }>;
  hints?: string[];
  testCases?: TestCasePayload[];
  languages?: Record<string, QuestionLanguageConfig>;
  estimatedTime?: number;
  marks?: number;
  options?: string[];
  correctOptionIndex?: number;
  correctAnswer?: string;
  explanation?: string;
  expectedAnswer?: string;
  idealAnswer?: string;
  evaluationCriteria?: string[];
  keyPoints?: string[];
}

export interface QuestionFilterParams {
  keyword?: string;
  search?: string;
  categoryId?: string;
  category?: string;
  topicId?: string;
  topic?: string;
  difficulty?: string;
  questionType?: string;
  status?: string;
  language?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  excludeTypes?: string[];
}

export const EXCLUDED_QUESTION_TYPES = ['SQL'];

export const useQuestions = (params: QuestionFilterParams = {}) => {
  return useQuery({
    queryKey: ['questions', params],
    queryFn: async () => {
      const keyword = params.search || params.keyword;
      const apiParams = {
        ...params,
        keyword: keyword || undefined,
        excludeTypes: EXCLUDED_QUESTION_TYPES,
      };
      const response = await api.get('/questions', { params: apiParams });
      return response.data;
    },
    staleTime: 15_000,
  });
};

export const useQuestionById = (id: string | undefined) => {
  return useQuery({
    queryKey: ['questions', id],
    queryFn: async () => {
      const response = await api.get(`/questions/${id}`);
      return response.data?.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/questions/categories', {
        params: { excludeTypes: EXCLUDED_QUESTION_TYPES },
      });
      return response.data?.data || [];
    },
    staleTime: 120_000,
  });
};

export const useTopics = () => {
  return useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const response = await api.get('/questions/topics', {
        params: { excludeTypes: EXCLUDED_QUESTION_TYPES },
      });
      return response.data?.data || [];
    },
    staleTime: 120_000,
  });
};

export const useLanguages = () => {
  return useQuery({
    queryKey: ['languages'],
    queryFn: async () => {
      const response = await api.get('/questions/languages');
      return response.data?.data || [];
    },
    staleTime: 120_000,
  });
};

export const useStatistics = () => {
  return useQuery({
    queryKey: ['statistics'],
    queryFn: async () => {
      const response = await api.get('/questions/statistics', {
        params: { excludeTypes: EXCLUDED_QUESTION_TYPES },
      });
      return response.data?.data;
    },
    staleTime: 60_000,
  });
};

// ── MUTATIONS (FACULTY QUESTION MANAGEMENT) ──────────────────────────────────

export const useCreateQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateQuestionPayload) => {
      const response = await api.post('/questions', payload);
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
  });
};

export const useUpdateQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateQuestionPayload> }) => {
      const response = await api.put(`/questions/${id}`, data);
      return response.data?.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['questions', variables.id] });
    },
  });
};

export const useDeleteQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/questions/${id}`);
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
};

export const useValidateQuestion = () => {
  return useMutation({
    mutationFn: async (payload: Partial<CreateQuestionPayload>) => {
      const response = await api.post('/questions/validate', payload);
      return response.data?.data;
    },
  });
};
