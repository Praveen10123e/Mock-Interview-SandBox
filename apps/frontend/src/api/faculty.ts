import api from './axios/instance';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface FacultyDashboardData {
  faculty: {
    id: string;
    identityId: string;
    name: string;
    college: string;
    department: string;
    designation: string;
  };
  metrics: {
    totalStudents: number;
    activeStudents: number;
    assessments: number;
    totalSubmissions: number;
    averagePerformance: number;
    hasEnoughPerformanceData: boolean;
  };
  performanceTrend: Array<{
    date: string;
    averageScore: number;
    count: number;
  }>;
  studentsNeedingAttention: Array<{
    id: string;
    identityId: string;
    name: string;
    department: string;
    batch: string;
    performanceScore: string;
    reason: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  recentActivity: Array<{
    id: string;
    studentName: string;
    activityTitle: string;
    status: string;
    timestamp: string;
  }>;
}

export interface StudentListItem {
  id: string;
  identityId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  department: string;
  college: string;
  batch: string;
  rollNumber: string;
  codingActivity: {
    totalSubmissions: number;
    hasData: boolean;
  };
  interviewActivity: {
    totalInterviews: number;
    completedInterviews: number;
    hasData: boolean;
  };
  performance: {
    averageScore: number | null;
    hasEnoughData: boolean;
  };
  status: 'ACTIVE' | 'INACTIVE' | 'NEEDS_ATTENTION';
  lastActiveAt: string | null;
}

export interface FacultyStudentsResponse {
  students: StudentListItem[];
  totalCount: number;
  unfilteredCount: number;
  departments: string[];
  batches: string[];
}

export interface StudentFilterParams {
  search?: string;
  department?: string;
  batch?: string;
  status?: string;
}

export interface StudentDetailData {
  profile: {
    id: string;
    identityId: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    avatarUrl: string | null;
    college: string;
    department: string;
    batch: string;
    rollNumber: string;
    placementStatus: string;
    role: string;
    createdAt: string;
  };
  codingPerformance: {
    totalSubmissions: number;
    acceptedSubmissions: number;
    acceptanceRate: number | null;
    hasCodingData: boolean;
    submissions: Array<{
      id: string;
      questionTitle: string;
      language: string;
      runMode: string;
      status: string;
      passedCount: number;
      totalCount: number;
      score: number;
      timestamp: string;
    }>;
  };
  interviewPerformance: {
    totalInterviews: number;
    completedInterviews: number;
    averageScore: number | null;
    hasInterviewData: boolean;
    interviews: Array<{
      id: string;
      title: string;
      interviewType: string;
      difficulty: string;
      state: string;
      score: number | null;
      startedAt: string;
      finishedAt: string | null;
      createdAt: string;
    }>;
  };
  recentActivity: Array<{
    id: string;
    type: 'INTERVIEW' | 'CODE_SUBMISSION';
    title: string;
    detail: string;
    status: string;
    timestamp: string;
  }>;
}

export interface FacultyInterviewSessionItem {
  id: string;
  interviewId: string;
  student: {
    identityId: string;
    profileId?: string | null;
    fullName: string;
    email: string;
    department?: string;
    college?: string;
    batch?: string;
    rollNumber?: string;
  };
  template: {
    id?: string | null;
    name: string;
    interviewType: string;
    difficulty: string;
    selectionMode: string;
  };
  stages: {
    aptitude: {
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
      totalQuestions: number;
      attemptedCount: number;
      correctCount?: number | null;
      score?: number | null;
    };
    coding: {
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
      totalProblems: number;
      attemptedCount: number;
      passedProblems: number;
      totalSubmissions: number;
      score?: number | null;
    };
    hr: {
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
      mode: string;
      interactionsCount: number;
      evaluated: boolean;
      score?: number | null;
    };
  };
  overallStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED' | 'EVALUATED';
  overallScore: number | null;
  scoreDisplay: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface FacultyInterviewFilterParams {
  search?: string;
  status?: string;
  templateId?: string;
  date?: string;
}

export interface FacultyTestCaseResult {
  id: string;
  order: number;
  status: 'PASSED' | 'FAILED';
  passed: boolean;
  hidden: boolean;
  input: string;
  expectedOutput: string;
  studentOutput: string;
  executionTime: number;
  memory: number;
  errorMessage?: string | null;
}

export interface FacultySubmissionItem {
  id: string;
  questionRefId?: string;
  questionTitle: string;
  language: string;
  runMode: 'RUN' | 'SUBMIT';
  status: string;
  statusDescription?: string | null;
  primaryErrorType?: string | null;
  passedCount: number;
  totalCount: number;
  score: number;
  executionTime: number;
  memory?: number;
  compileOutput?: string | null;
  stdout?: string | null;
  stderr?: string | null;
  sourceCode?: string | null;
  testCaseResults?: FacultyTestCaseResult[];
  attemptNumber?: number;
  timestamp: string;
}

export interface FacultyInterviewDetailData {
  id: string;
  interviewId: string;
  title: string;
  interviewType: string;
  difficulty: string;
  state: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  student: {
    identityId: string;
    profileId?: string | null;
    fullName: string;
    email: string;
    phone: string;
    college: string;
    department: string;
    batch: string;
    rollNumber: string;
  };
  template: {
    id?: string | null;
    name: string;
    interviewType: string;
    difficulty: string;
    duration: number;
    selectionMode: string;
  };
  progress: {
    aptitude: {
      status: string;
      totalQuestions: number;
      correctCount?: number | null;
      score: number | null;
      questions: Array<{
        order: number;
        questionId: string;
        title: string;
        difficulty: string;
        category: string;
        topic: string;
      }>;
    };
    coding: {
      status: string;
      totalProblems: number;
      passedProblems: number;
      attemptedProblems: number;
      score: number | null;
      problems: Array<{
        order: number;
        questionId: string;
        title: string;
        difficulty: string;
        category: string;
      }>;
      submissions: FacultySubmissionItem[];
    };
    hr: {
      status: string;
      mode: string;
      prompt: string;
      score: number | null;
      interactionsCount: number;
    };
  };
  evaluation: {
    hasEvaluationData: boolean;
    overallScore: number | null;
    rawScore?: number;
    strengths: string[];
    areasToImprove: string[];
    proficiency?: any;
    scoringExplanation: Array<{
      round: string;
      explanation: string;
    }>;
    statusMessage: string;
  };
  timelines: Array<{
    id: string;
    previousState?: string | null;
    newState: string;
    reason?: string | null;
    changedAt: string;
  }>;
}

export interface FacultyStudentInterviewSummary {
  student: {
    identityId: string;
    profileId?: string | null;
    fullName: string;
    email: string;
    department?: string;
    college?: string;
    batch?: string;
    rollNumber?: string;
  };
  totalSessions: number;
  completedSessions: number;
  inProgressSessions: number;
  abandonedSessions: number;
  averageScore: number | null;
  averageScoreDisplay: string;
  latestSessionAt: string | null;
  sessions: FacultyInterviewSessionItem[];
}

export interface FacultyAnalyticsData {
  overview: {
    totalStudents: number;
    completedAssessments: number;
    inProgressAssessments: number;
    totalAssessments?: number;
    averageOverallScore: number | null;
    overallScoresDenominator?: number;
    aptitudeAccuracy?: number | null;
    aptitudeCorrectCount?: number;
    aptitudeAttemptedCount?: number;
    codingAcceptanceRate?: number | null;
    codingAcceptedCount?: number;
    codingSubmissionCount?: number;
    codingTestPassRate?: number | null;
    hrCompletionRate?: number | null;
    hrCandidateResponsesCount?: number;
    averageAptitudeScore: number | null;
    averageCodingScore: number | null;
    averageHrScore: number | null;
    totalSubmissions: number;
    totalRuns: number;
    totalExecutions?: number;
    hasEnoughData: boolean;
  };
  performanceTrend: Array<{
    date: string;
    averageScore: number;
    count: number;
  }>;
  aptitudeAnalytics: {
    averageScore: number | null;
    accuracyPercentage: number | null;
    attemptedCount: number;
    correctCount: number;
    incorrectCount: number;
    topicBreakdown: Array<{
      topic: string;
      attempted: number;
      correct: number;
      accuracy: number;
    }>;
    difficultyBreakdown: Array<{
      difficulty: string;
      attempted: number;
      correct: number;
      accuracy: number;
    }>;
    hasData: boolean;
  };
  codingAnalytics: {
    problemsAssigned: number;
    problemsSubmitted: number;
    problemsAccepted: number;
    submissionAcceptanceRate?: number | null;
    verdictDistribution: {
      accepted: number;
      wrongAnswer: number;
      compilationError: number;
      runtimeError: number;
      timeLimitExceeded: number;
    };
    verdictPercentages?: {
      accepted: number;
      wrongAnswer: number;
      compilationError: number;
      runtimeError: number;
      timeLimitExceeded: number;
    };
    runAttemptsCount: number;
    submitAttemptsCount: number;
    totalExecutions: number;
    testsPassedCount: number;
    totalTestsCount: number;
    testPassRate: number | null;
    hasData: boolean;
  };
  hrAnalytics: {
    completedSessionsCount: number;
    totalCompletedAssessments?: number;
    completionRate?: number | null;
    totalResponsesCount: number;
    averageScore: number | null;
    hasData: boolean;
  };
  studentRoster: Array<{
    studentId: string;
    identityId: string;
    name: string;
    email: string;
    department: string;
    college: string;
    batch: string;
    rollNumber: string;
    assessmentsCount: number;
    completedCount: number;
    scores: {
      aptitude: number | null;
      coding: number | null;
      hr: number | null;
      overall: number | null;
    };
    status: 'ACTIVE' | 'INACTIVE' | 'NEEDS_ATTENTION';
    lastActivityAt: string | null;
  }>;
  studentsNeedingAttention: Array<{
    id: string;
    identityId: string;
    name: string;
    department: string;
    batch: string;
    performanceScore: string;
    reason: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    lastActive: string;
  }>;
  filterOptions: {
    templates: Array<{ id: string; name: string; type: string }>;
    departments: string[];
  };
}

export interface FacultyReportItem {
  id: string;
  interviewId: string;
  sessionId: string;
  title: string;
  templateName: string;
  interviewType: string;
  difficulty: string;
  student: {
    id: string;
    identityId: string;
    fullName: string;
    email: string;
    department: string;
    batch: string;
    college: string;
    rollNumber: string;
  };
  completedAt: string;
  startedAt: string;
  duration: number;
  scores: {
    aptitude: number | null;
    coding: number | null;
    hr: number | null;
    overall: number | null;
  };
  status: string;
  hasReport: boolean;
}

export interface FacultyReportsResponse {
  reports: FacultyReportItem[];
  totalCount: number;
  unfilteredCount: number;
}

export interface FacultyReportDetailData {
  interviewId: string;
  sessionId: string;
  title: string;
  interviewType: string;
  difficulty: string;
  state: string;
  student: {
    identityId: string;
    fullName: string;
    email: string;
    department: string;
    college: string;
    batch: string;
    rollNumber: string;
  };
  report: any;
  monitoring?: any;
  completionReason?: string;
  completedAt: string;
  finalizedAt?: string;
}

export interface FacultyProfileData {
  id: string;
  identityId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  college: string;
  department: string;
  designation: string;
  employeeId: string;
  roles: string[];
  accountStatus: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface UpdateFacultyProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  department?: string;
  designation?: string;
  college?: string;
  employeeId?: string;
}

export const facultyApi = {
  getDashboard: async (): Promise<FacultyDashboardData> => {
    const response = await api.get('/users/faculty/dashboard');
    return response.data?.data ?? response.data;
  },
  getStudents: async (params: StudentFilterParams = {}): Promise<FacultyStudentsResponse> => {
    const response = await api.get('/users/faculty/students', { params });
    return response.data?.data ?? response.data;
  },
  getStudentDetail: async (studentId: string): Promise<StudentDetailData> => {
    const response = await api.get(`/users/faculty/students/${studentId}`);
    return response.data?.data ?? response.data;
  },
  getSessions: async (params: FacultyInterviewFilterParams = {}): Promise<FacultyInterviewSessionItem[]> => {
    const response = await api.get('/interviews/faculty/sessions', { params });
    return response.data?.data ?? response.data;
  },
  getStudentSummaries: async (params: FacultyInterviewFilterParams = {}): Promise<FacultyStudentInterviewSummary[]> => {
    const response = await api.get('/interviews/faculty/sessions/students', { params });
    return response.data?.data ?? response.data;
  },
  getSessionDetail: async (sessionId: string): Promise<FacultyInterviewDetailData> => {
    const response = await api.get(`/interviews/faculty/sessions/${sessionId}`);
    return response.data?.data ?? response.data;
  },
  getAnalytics: async (params: { templateId?: string; department?: string; dateRange?: string; status?: string } = {}): Promise<FacultyAnalyticsData> => {
    const response = await api.get('/interviews/faculty/sessions/analytics', { params });
    return response.data?.data ?? response.data;
  },
  getReports: async (params: { search?: string; templateId?: string; interviewType?: string; date?: string; scoreMin?: number; scoreMax?: number } = {}): Promise<FacultyReportsResponse> => {
    const response = await api.get('/interviews/faculty/sessions/reports', { params });
    return response.data?.data ?? response.data;
  },
  getReportDetail: async (sessionId: string): Promise<FacultyReportDetailData> => {
    const response = await api.get(`/interviews/faculty/sessions/reports/${sessionId}`);
    return response.data?.data ?? response.data;
  },
  getProfile: async (): Promise<FacultyProfileData> => {
    const response = await api.get('/users/faculty/profile');
    return response.data?.data ?? response.data;
  },
  updateProfile: async (data: UpdateFacultyProfileInput): Promise<FacultyProfileData> => {
    const response = await api.put('/users/faculty/profile', data);
    return response.data?.data ?? response.data;
  },
};

export const useFacultyDashboard = () => {
  return useQuery<FacultyDashboardData>({
    queryKey: ['faculty', 'dashboard'],
    queryFn: facultyApi.getDashboard,
    staleTime: 30_000,
    retry: 2,
  });
};

export const useFacultyStudents = (params: StudentFilterParams = {}) => {
  return useQuery<FacultyStudentsResponse>({
    queryKey: ['faculty', 'students', params],
    queryFn: () => facultyApi.getStudents(params),
    staleTime: 15_000,
  });
};

export const useFacultyStudentDetail = (studentId: string | undefined) => {
  return useQuery<StudentDetailData>({
    queryKey: ['faculty', 'student', studentId],
    queryFn: () => facultyApi.getStudentDetail(studentId!),
    enabled: !!studentId,
    staleTime: 30_000,
  });
};

export const useFacultySessions = (params: FacultyInterviewFilterParams = {}) => {
  return useQuery<FacultyInterviewSessionItem[]>({
    queryKey: ['faculty', 'sessions', params],
    queryFn: () => facultyApi.getSessions(params),
    staleTime: 10_000,
  });
};

export const useFacultyStudentSummaries = (params: FacultyInterviewFilterParams = {}) => {
  return useQuery<FacultyStudentInterviewSummary[]>({
    queryKey: ['faculty', 'student-interview-summaries', params],
    queryFn: () => facultyApi.getStudentSummaries(params),
    staleTime: 10_000,
  });
};

export const useFacultySessionDetail = (sessionId: string | undefined) => {
  return useQuery<FacultyInterviewDetailData>({
    queryKey: ['faculty', 'session-detail', sessionId],
    queryFn: () => facultyApi.getSessionDetail(sessionId!),
    enabled: !!sessionId,
    staleTime: 15_000,
  });
};

export const useFacultyAnalytics = (params: { templateId?: string; department?: string; dateRange?: string; status?: string } = {}) => {
  return useQuery<FacultyAnalyticsData>({
    queryKey: ['faculty', 'analytics', params],
    queryFn: () => facultyApi.getAnalytics(params),
    staleTime: 15_000,
  });
};

export const useFacultyReports = (params: { search?: string; templateId?: string; interviewType?: string; date?: string; scoreMin?: number; scoreMax?: number } = {}) => {
  return useQuery<FacultyReportsResponse>({
    queryKey: ['faculty', 'reports', params],
    queryFn: () => facultyApi.getReports(params),
    staleTime: 15_000,
  });
};

export const useFacultyReportDetail = (sessionId: string | undefined) => {
  return useQuery<FacultyReportDetailData>({
    queryKey: ['faculty', 'report-detail', sessionId],
    queryFn: () => facultyApi.getReportDetail(sessionId!),
    enabled: !!sessionId,
    staleTime: 30_000,
  });
};

export const useFacultyProfile = () => {
  return useQuery<FacultyProfileData>({
    queryKey: ['faculty', 'profile'],
    queryFn: facultyApi.getProfile,
    staleTime: 60_000,
  });
};

export const useUpdateFacultyProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: facultyApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty', 'profile'] });
    },
  });
};
