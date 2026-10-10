import api from '../../../api/axios/instance';
import type { InterviewSessionData } from '../types/interview.types';

const API_URL = '/interviews'; // Assuming the gateway proxies to interview-service

export const InterviewService = {
  getInterviews: async (): Promise<any[]> => {
    const response = await api.get(`${API_URL}`);
    return response.data;
  },

  getInterview: async (id: string): Promise<any> => {
    const response = await api.get(`${API_URL}/${id}`);
    return response.data;
  },

  startInterview: async (id: string): Promise<InterviewSessionData> => {
    const response = await api.post(`${API_URL}/${id}/start`);
    return response.data;
  },

  pauseInterview: async (id: string): Promise<any> => {
    const response = await api.post(`${API_URL}/${id}/pause`);
    return response.data;
  },

  resumeInterview: async (id: string): Promise<any> => {
    const response = await api.post(`${API_URL}/${id}/resume`);
    return response.data;
  },

  finishInterview: async (id: string): Promise<any> => {
    const response = await api.post(`${API_URL}/${id}/finish`);
    return response.data;
  },

  saveAnswer: async (id: string, questionRefId: string, value: string): Promise<any> => {
    const response = await api.post(`${API_URL}/${id}/answer`, {
      questionRefId,
      value,
    });
    return response.data;
  },

  sendHeartbeat: async (id: string, sessionId: string): Promise<any> => {
    const response = await api.post(`${API_URL}/${id}/heartbeat`, { sessionId });
    return response.data;
  },

  executeCode: async (id: string, payload: any): Promise<any> => {
    const response = await api.post(`${API_URL}/${id}/execute`, payload);
    return response.data;
  },

  aiFollowUp: async (id: string, payload: any): Promise<any> => {
    const response = await api.post(`${API_URL}/${id}/ai/follow-up`, payload);
    return response.data;
  },
};
