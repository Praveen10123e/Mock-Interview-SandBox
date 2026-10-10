import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SavedState {
  code: string;
  languageId: number;
  languageName: string;
}

interface WorkspaceState {
  // Global Settings
  theme: 'vs-dark' | 'light';
  setTheme: (theme: 'vs-dark' | 'light') => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  wordWrap: 'on' | 'off';
  setWordWrap: (wrap: 'on' | 'off') => void;
  
  // Current Question State (not persisted directly to avoid mixing questions)
  code: string;
  setCode: (code: string) => void;
  languageId: number;
  setLanguageId: (id: number) => void;
  languageName: string;
  setLanguageName: (name: string) => void;
  customInput: string;
  setCustomInput: (input: string) => void;
  
  // Persistence per question
  savedCodes: Record<string, SavedState>;
  saveCodeForQuestion: (questionId: string, state: SavedState) => void;
  loadCodeForQuestion: (questionId: string) => SavedState | null;

  // Execution State
  isRunning: boolean;
  setIsRunning: (isRunning: boolean) => void;
  output: string | null;
  setOutput: (output: string | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
  judgeResponse: any | null;
  setJudgeResponse: (res: any | null) => void;
  executionMetrics: { time: string; memory: number } | null;
  setExecutionMetrics: (metrics: { time: string; memory: number } | null) => void;
  
  // UI State
  isFullscreen: boolean;
  setIsFullscreen: (isFullscreen: boolean) => void;
  activeConsoleTab: 'testcases' | 'results' | 'customInput' | 'attempts';
  setActiveConsoleTab: (tab: 'testcases' | 'results' | 'customInput' | 'attempts') => void;
  selectedTestCaseIndex: number;
  setSelectedTestCaseIndex: (index: number) => void;
  lastRunMode: 'RUN' | 'SUBMIT' | 'CUSTOM_RUN' | null;
  setLastRunMode: (mode: 'RUN' | 'SUBMIT' | 'CUSTOM_RUN' | null) => void;

  // Attempt History per Question
  attemptsHistory: Record<string, any[]>;
  addAttemptForQuestion: (questionId: string, attempt: any) => void;
  getAttemptsForQuestion: (questionId: string) => any[];

  resetWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      theme: 'vs-dark',
      setTheme: (theme) => set({ theme }),
      fontSize: 14,
      setFontSize: (fontSize) => set({ fontSize }),
      wordWrap: 'on',
      setWordWrap: (wordWrap) => set({ wordWrap }),
      
      code: '',
      setCode: (code) => set({ code }),
      languageId: 71, // default to Python
      setLanguageId: (id) => set({ languageId: id }),
      languageName: 'python',
      setLanguageName: (name) => set({ languageName: name }),
      customInput: '',
      setCustomInput: (input) => set({ customInput: input }),
      
      savedCodes: {},
      saveCodeForQuestion: (questionId, state) => set((prev) => ({
        savedCodes: {
          ...prev.savedCodes,
          [questionId]: state
        }
      })),
      loadCodeForQuestion: (questionId) => {
        return get().savedCodes[questionId] || null;
      },
      
      isRunning: false,
      setIsRunning: (isRunning) => set({ isRunning }),
      output: null,
      setOutput: (output) => set({ output }),
      error: null,
      setError: (error) => set({ error }),
      judgeResponse: null,
      setJudgeResponse: (res) => set({ judgeResponse: res }),
      executionMetrics: null,
      setExecutionMetrics: (metrics) => set({ executionMetrics: metrics }),
      
      isFullscreen: false,
      setIsFullscreen: (isFullscreen) => set({ isFullscreen }),
      activeConsoleTab: 'testcases',
      setActiveConsoleTab: (activeConsoleTab) => set({ activeConsoleTab }),
      selectedTestCaseIndex: 0,
      setSelectedTestCaseIndex: (selectedTestCaseIndex) => set({ selectedTestCaseIndex }),
      lastRunMode: null,
      setLastRunMode: (lastRunMode) => set({ lastRunMode }),

      attemptsHistory: {},
      addAttemptForQuestion: (questionId, attempt) => set((prev) => {
        const list = prev.attemptsHistory[questionId] || [];
        return {
          attemptsHistory: {
            ...prev.attemptsHistory,
            [questionId]: [attempt, ...list],
          }
        };
      }),
      getAttemptsForQuestion: (questionId) => {
        return get().attemptsHistory[questionId] || [];
      },

      resetWorkspace: () => set({
        code: '',
        output: null,
        error: null,
        judgeResponse: null,
        executionMetrics: null,
      }),
    }),
    {
      name: 'workspace-storage',
      // Only persist themes, settings, saved code, and attempts history.
      partialize: (state) => ({ 
        theme: state.theme, 
        fontSize: state.fontSize, 
        wordWrap: state.wordWrap,
        savedCodes: state.savedCodes,
        attemptsHistory: state.attemptsHistory,
      }),
    }
  )
);
