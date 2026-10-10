import { create } from 'zustand';
import type {
  InterviewSessionData,
  InterviewState,
  InterviewAnswer,
} from '../types/interview.types';

interface InterviewSessionStore extends InterviewSessionData {
  // Actions
  initializeSession: (data: Partial<InterviewSessionData>) => void;
  setRemainingTime: (time: number) => void;
  tickTimer: () => void;
  setState: (state: InterviewState) => void;

  // Navigation
  setCurrentQuestionIndex: (index: number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;

  // Answers
  setAnswer: (questionRefId: string, value: string, isDraft: boolean) => void;
  toggleMarkForReview: (questionRefId: string) => void;

  // Selectors/Computed
  getCurrentQuestion: () => any;
  getCurrentAnswer: () => InterviewAnswer | undefined;

  // Judge0 Execution
  selectedLanguageId: number; // e.g. 71 for Python
  customInput: string;
  executionLoading: boolean;
  executionResult: any;

  setSelectedLanguageId: (id: number) => void;
  setCustomInput: (input: string) => void;
  setExecutionLoading: (loading: boolean) => void;
  setExecutionResult: (result: any) => void;
}

export const useInterviewSessionStore = create<InterviewSessionStore>((set, get) => ({
  sessionId: '',
  interviewId: '',
  title: '',
  state: 'WAITING',
  remainingTime: 3600,
  elapsedTime: 0,
  questions: [],
  currentQuestionIndex: 0,
  answers: {},
  markedForReview: {},

  selectedLanguageId: 71, // default to Python
  customInput: '',
  executionLoading: false,
  executionResult: null,

  initializeSession: (data) => set({ ...data }),

  setRemainingTime: (time) => set({ remainingTime: time }),

  tickTimer: () =>
    set((state) => ({
      remainingTime: Math.max(0, state.remainingTime - 1),
      elapsedTime: state.elapsedTime + 1,
    })),

  setState: (newState) => set({ state: newState }),

  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),

  nextQuestion: () =>
    set((state) => ({
      currentQuestionIndex: Math.min(state.currentQuestionIndex + 1, state.questions.length - 1),
    })),

  previousQuestion: () =>
    set((state) => ({
      currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0),
    })),

  setAnswer: (questionRefId, value, isDraft) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [questionRefId]: {
          questionRefId,
          value,
          isDraft,
          savedAt: new Date().toISOString(),
        },
      },
    })),

  toggleMarkForReview: (questionRefId) =>
    set((state) => ({
      markedForReview: {
        ...state.markedForReview,
        [questionRefId]: !state.markedForReview[questionRefId],
      },
    })),

  getCurrentQuestion: () => {
    const state = get();
    return state.questions[state.currentQuestionIndex] || null;
  },

  getCurrentAnswer: () => {
    const state = get();
    const currentQ = state.questions[state.currentQuestionIndex];
    if (!currentQ) return undefined;
    return state.answers[currentQ.id];
  },

  setSelectedLanguageId: (id) => set({ selectedLanguageId: id }),
  setCustomInput: (input) => set({ customInput: input }),
  setExecutionLoading: (loading) => set({ executionLoading: loading }),
  setExecutionResult: (result) => set({ executionResult: result }),
}));
