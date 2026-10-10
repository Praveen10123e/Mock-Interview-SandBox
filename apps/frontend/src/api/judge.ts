import { useMutation } from '@tanstack/react-query';
import api from './axios/instance';

export interface ExecuteCodePayload {
  executionMode?: 'INTERVIEW' | 'PRACTICE';
  runMode?: 'RUN' | 'SUBMIT';
  interviewId?: string;
  questionRefId?: string;
  sourceCode: string;
  languageId: number;
  customInput?: string;
  signal?: AbortSignal;
}

export interface ExecuteCodeResponse {
  stdout: string | null;
  time: string;
  memory: number;
  stderr: string | null;
  compile_output?: string | null;
  compileOutput?: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
  results?: Array<{
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
  }>;
  success?: boolean;
  available?: boolean;
  exit_code?: number;
}

export const executeCode = async (payload: ExecuteCodePayload) => {
  const { signal, ...data } = payload;
  const res = await api.post('/judge/execute', data, { signal });
  return res.data;
};

export const useExecuteCode = () => {
  return useMutation({
    mutationFn: async (payload: ExecuteCodePayload) => {
      // Route through interview service to ensure test cases are injected
      const interviewId = payload.interviewId || 'practice-session';
      const { signal, ...data } = payload;
      const response = await api.post<ExecuteCodeResponse>(`/interviews/${interviewId}/execute`, data, { signal });
      return response.data;
    },
  });
};
