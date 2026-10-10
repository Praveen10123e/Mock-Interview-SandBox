import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './axios/instance';

export interface TemplateQuestionDetail {
  questionId: string;
  order: number;
  title: string;
  description?: string;
  questionType: string;
  difficulty: string;
  category: string;
  topic?: string;
  testCaseStats?: {
    total: number;
    visibleCount: number;
    hiddenCount: number;
  };
  metadata?: any;
}

export type SelectionMode = 'MANUAL' | 'RANDOM';

export interface HRStageConfig {
  mode: 'CONVERSATIONAL';
  initialQuestionId?: string | null;
  initialPrompt?: string;
  allowFollowUp?: boolean;
  maxFollowUps?: number;
  evaluationRubrics?: string[];
  [key: string]: any;
}

export interface AssessmentStructure {
  selectionMode?: SelectionMode;
  aptitude: {
    count: number;
    minRequired: number;
    isValid: boolean;
  };
  coding: {
    count: number;
    minRequired: number;
    isValid: boolean;
  };
  hr: {
    mode: 'CONVERSATIONAL';
    label: string;
    initialQuestionId?: string | null;
    initialPrompt?: string;
    allowFollowUp: boolean;
    isValid: boolean;
  };
  summary: string;
  totalFixedQuestions: number;
  isPublishable: boolean;
}

export interface InterviewTemplateItem {
  id: string;
  name: string;
  description: string;
  interviewType: string;
  difficulty: string;
  duration: number;
  questionCount: number;
  programmingLanguage?: string | null;
  selectionMode?: SelectionMode;
  defaultConfiguration?: {
    selectionMode?: SelectionMode;
    allowSkipping?: boolean;
    randomizeOrder?: boolean;
    timePerQuestion?: number;
    categories?: string[];
    hrConfig?: HRStageConfig;
    [key: string]: any;
  };
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isActive: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  categories: string[];
  typeBreakdown: Record<string, number>;
  assessmentStructure?: AssessmentStructure;
  questions: TemplateQuestionDetail[];
}

export interface TemplateFilterParams {
  search?: string;
  status?: string;
  interviewType?: string;
}

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  interviewType?: string;
  duration?: number;
  difficulty?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  programmingLanguage?: string;
  selectionMode?: SelectionMode;
  defaultConfiguration?: {
    selectionMode?: SelectionMode;
    allowSkipping?: boolean;
    randomizeOrder?: boolean;
    timePerQuestion?: number;
    categories?: string[];
    hrConfig?: HRStageConfig;
    [key: string]: any;
  };
  aptitudeQuestionIds?: string[];
  codingQuestionIds?: string[];
  hrConfig?: HRStageConfig;
  questionIds?: string[];
  questions?: Array<{ questionId: string; order?: number }>;
}

export const useTemplates = (params: TemplateFilterParams = {}) => {
  return useQuery<InterviewTemplateItem[]>({
    queryKey: ['templates', params],
    queryFn: async () => {
      const response = await api.get('/templates', { params });
      return response.data?.data || [];
    },
    staleTime: 15_000,
  });
};

export const useTemplateById = (id: string | undefined) => {
  return useQuery<InterviewTemplateItem>({
    queryKey: ['templates', id],
    queryFn: async () => {
      const response = await api.get(`/templates/${id}`);
      return response.data?.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTemplatePayload) => {
      const response = await api.post('/templates', payload);
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
};

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateTemplatePayload> }) => {
      const response = await api.put(`/templates/${id}`, data);
      return response.data?.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates', variables.id] });
    },
  });
};

export const useDuplicateTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/templates/${id}/duplicate`);
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/templates/${id}`);
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
};
