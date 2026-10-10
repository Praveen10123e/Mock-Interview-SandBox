import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './axios/instance';

export interface AdminProfile {
  fullName: string;
  email: string;
  designation: string;
  department: string;
  roles: string[];
}

export interface AdminOverview {
  totalStudents: number;
  totalFaculty: number;
  totalAdmins: number;
  totalUsers: number;
  totalAssessments: number;
  completedAssessments: number;
  inProgressAssessments: number;
  averageOverallScore: number | null;
  averageAptitudeScore: number | null;
  averageCodingScore: number | null;
  averageHrScore: number | null;
  totalOfficialSubmissions: number;
  totalTestRuns: number;
  totalExecutions: number;
  submissionAcceptanceRate: number | null;
  testCasePassRate: number | null;
  hasEnoughData: boolean;
}

export interface AdminCodingAnalytics {
  officialSubmissionsCount: number;
  testRunsCount: number;
  totalExecutions: number;
  acceptedSubmissions: number;
  submissionAcceptanceRate: number | null;
  testsPassedCount: number;
  totalTestsCount: number;
  testCasePassRate: number | null;
  verdictDistribution: {
    accepted: number;
    wrongAnswer: number;
    compilationError: number;
    runtimeError: number;
    timeLimitExceeded: number;
  };
}

export interface AdminQuestionBankStats {
  totalQuestions: number;
  publishedQuestions: number;
  draftQuestions: number;
  archivedQuestions: number;
  categoriesCount: number;
  categories: Array<{
    name: string;
    count: number;
  }>;
}

export interface AdminTemplatesStats {
  totalTemplates: number;
  publishedCount: number;
  draftCount: number;
  archivedCount: number;
}

export interface AdminPerformanceTrendItem {
  date: string;
  averageScore: number;
  assessmentsCount: number;
}

export interface AdminActivityItem {
  id: string;
  type: 'ASSESSMENT_COMPLETED' | 'CODE_SUBMITTED' | 'TEMPLATE_CREATED' | 'USER_REGISTERED';
  title: string;
  description: string;
  timestamp: string;
  badge?: string;
  badgeVariant?: 'success' | 'warning' | 'info' | 'neutral';
}

export interface AdminServiceHealthProbe {
  name: string;
  port: number;
  status: 'Healthy' | 'Degraded' | 'Unreachable';
  latency: string;
}

export interface AdminSystemHealth {
  services: AdminServiceHealthProbe[];
  overallStatus: 'OPTIMAL' | 'OPERATIONAL' | 'DEGRADED';
  databaseStatus: string;
}

export interface AdminAttentionItem {
  id: string;
  title: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  count: number;
}

export interface AdminDashboardData {
  adminProfile: AdminProfile;
  overview: AdminOverview;
  codingAnalytics: AdminCodingAnalytics;
  questionBank: AdminQuestionBankStats;
  templates: AdminTemplatesStats;
  performanceTrend: AdminPerformanceTrendItem[];
  recentActivities: AdminActivityItem[];
  systemHealth: AdminSystemHealth;
  attentionItems: AdminAttentionItem[];
  metadata: {
    dataStatus: string;
    scope: string;
    generatedAt: string;
  };
}

// ─── ADMIN USERS DATA TYPES ──────────────────────────────────────────────────

export interface AdminUsersOverviewData {
  totalUsers: number;
  totalStudents: number;
  totalFaculty: number;
  totalAdmins: number;
  totalSuperAdmins: number;
  activeUsers: number;
  departments: string[];
}

export interface AdminUserItem {
  id: string;
  profileId: string | null;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  /** Effective (highest-precedence) role. SUPER_ADMIN wins over ADMINISTRATOR. */
  role: 'SUPER_ADMIN' | 'ADMINISTRATOR' | 'FACULTY' | 'STUDENT';
  /** All raw role names this identity holds in auth_db */
  roles: string[];
  department: string;
  designation: string | null;
  college: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'BANNED' | 'PENDING_VERIFICATION';
  failedLoginAttempts: number;
  assessmentsCount: number;
  completedAssessmentsCount: number;
  averageScore: number | null;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
  /** True when this identity holds the SUPER_ADMIN role. Account mutations are blocked server-side. */
  isProtected: boolean;
}

export interface AdminUserListParams {
  search?: string;
  role?: string;
  status?: string;
  department?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminUserListResponse {
  users: AdminUserItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface AdminUserDetailInterview {
  id: string;
  title: string;
  state: string;
  score: number | null;
  startedAt: string;
  finishedAt: string | null;
  configuration: {
    interviewType?: string;
    difficulty?: string;
  };
}

export interface AdminUserDetail {
  id: string;
  profileId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  /** Effective (highest-precedence) role. SUPER_ADMIN wins over ADMINISTRATOR. */
  role: 'SUPER_ADMIN' | 'ADMINISTRATOR' | 'FACULTY' | 'STUDENT';
  /** All raw role names this identity holds in auth_db */
  roles: string[];
  status: string;
  failedLoginAttempts: number;
  createdAt: string;
  updatedAt: string;
  /** True when this identity holds the SUPER_ADMIN role. Account mutations are blocked server-side. */
  isProtected: boolean;
  profile: {
    department: string;
    designation: string | null;
    college: string;
    rollNumber: string | null;
    registerNumber: string | null;
    employeeId: string | null;
    batch: string | null;
  };
  assessmentSummary: {
    totalAssessments: number;
    completedAssessments: number;
    inProgressAssessments: number;
    averageScore: number | null;
  };
  interviewsHistory: AdminUserDetailInterview[];
}

// ─── ADMIN DASHBOARD QUERIES ─────────────────────────────────────────────────

export const getAdminDashboard = async (): Promise<AdminDashboardData> => {
  try {
    const res = await api.get<{ success: boolean; data: AdminDashboardData }>('/admin/dashboard');
    return (res.data as any).data || res.data;
  } catch {
    const res = await api.get<{ success: boolean; data: AdminDashboardData }>('/interviews/admin/dashboard');
    return (res.data as any).data || res.data;
  }
};

export const useAdminDashboard = () => {
  return useQuery<AdminDashboardData>({
    queryKey: ['admin', 'dashboard'],
    queryFn: getAdminDashboard,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
};

// ─── ADMIN USERS QUERIES & MUTATIONS ─────────────────────────────────────────

export const getAdminUsersOverview = async (): Promise<AdminUsersOverviewData> => {
  const res = await api.get<{ success: boolean; data: AdminUsersOverviewData }>(
    '/users/admin/users/overview'
  );
  return (res.data as any).data || res.data;
};

export const useAdminUsersOverview = () => {
  return useQuery<AdminUsersOverviewData>({
    queryKey: ['admin', 'users', 'overview'],
    queryFn: getAdminUsersOverview,
    staleTime: 30000,
  });
};

export const getAdminUsers = async (
  params: AdminUserListParams
): Promise<AdminUserListResponse> => {
  const res = await api.get<{ success: boolean; data: AdminUserListResponse }>(
    '/users/admin/users',
    { params }
  );
  const data = (res.data as any).data || res.data;
  return {
    users: data.users || [],
    pagination: data.pagination || {
      page: params.page || 1,
      limit: params.limit || 10,
      total: (data.users || []).length,
      totalPages: 1,
      hasMore: false,
    },
  };
};

export const useAdminUsers = (params: AdminUserListParams) => {
  return useQuery<AdminUserListResponse>({
    queryKey: ['admin', 'users', params],
    queryFn: () => getAdminUsers(params),
    placeholderData: (previousData) => previousData,
    staleTime: 10000,
  });
};

export const getAdminUserDetail = async (identityId: string): Promise<AdminUserDetail> => {
  const res = await api.get<{ success: boolean; data: AdminUserDetail }>(
    `/users/admin/users/${identityId}`
  );
  return (res.data as any).data || res.data;
};

export const useAdminUserDetail = (identityId: string | null) => {
  return useQuery<AdminUserDetail>({
    queryKey: ['admin', 'users', 'detail', identityId],
    queryFn: () => getAdminUserDetail(identityId!),
    enabled: Boolean(identityId),
  });
};

export const useUpdateAdminUserProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        department?: string;
        designation?: string;
        college?: string;
      };
    }) => {
      const res = await api.patch(`/users/admin/users/${id}/profile`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'detail', variables.id] });
    },
  });
};

export const useUpdateAdminUserStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/users/admin/users/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'detail', variables.id] });
    },
  });
};

export const useCreateAdminUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      firstName: string;
      lastName?: string;
      email: string;
      password?: string;
      role: 'STUDENT' | 'FACULTY';
      department?: string;
      designation?: string;
      college?: string;
    }) => {
      const res = await api.post('/users/admin/users', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'overview'] });
    },
  });
};

export const useResetAdminUserPassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password?: string }) => {
      const res = await api.post(`/users/admin/users/${id}/reset-password`, { password });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'detail', variables.id] });
    },
  });
};

// ─── ADMIN DATASETS QUERIES & MUTATIONS ──────────────────────────────────────

export interface AdminDatasetItem {
  id: string;
  name: string;
  type: string;
  category: string;
  questionCount: number;
  difficultyDistribution: Record<string, number>;
  status: 'ACTIVE' | 'ARCHIVED';
  version: string;
  source: string;
  lastUpdated: string;
  description: string;
}

export interface AdminDatasetsResponse {
  summary: {
    totalDatasets: number;
    totalQuestions: number;
    codingQuestions: number;
    aptitudeQuestions: number;
    hrQuestions: number;
    sqlQuestions: number;
  };
  datasets: AdminDatasetItem[];
}

export interface AdminDatasetDetailResponse {
  dataset: {
    id: string;
    name: string;
    questionCount: number;
    difficultyDistribution: Record<string, number>;
    typeDistribution: Record<string, number>;
    status: string;
  };
  questions: Array<{
    id: string;
    title: string;
    description: string;
    questionType: string;
    difficulty: string;
    status: string;
    category: string;
    topic?: string;
    marks: number;
    estimatedTime: number;
    testCasesCount: number;
    testCases: Array<{
      testCaseId: string;
      input: string;
      expectedOutput: string;
      visibility: string;
    }>;
    executionMode: string;
    constraints: string[];
    examples: Array<{
      input: string;
      output: string;
      explanation?: string;
    }>;
  }>;
}

export interface AdminImportBatch {
  id: string;
  filename: string;
  status: string;
  totalRecords: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errorMessage?: string | null;
  startedAt: string;
  completedAt?: string | null;
}

export const getAdminDatasets = async (): Promise<AdminDatasetsResponse> => {
  const res = await api.get<{ success: boolean; data: AdminDatasetsResponse }>('/questions/datasets');
  return (res.data as any).data || res.data;
};

export const useAdminDatasets = () => {
  return useQuery<AdminDatasetsResponse>({
    queryKey: ['admin', 'datasets'],
    queryFn: getAdminDatasets,
    staleTime: 30000,
  });
};

export const getAdminDatasetDetail = async (id: string): Promise<AdminDatasetDetailResponse> => {
  const res = await api.get<{ success: boolean; data: AdminDatasetDetailResponse }>(`/questions/datasets/${id}`);
  return (res.data as any).data || res.data;
};

export const useAdminDatasetDetail = (id: string | null) => {
  return useQuery<AdminDatasetDetailResponse>({
    queryKey: ['admin', 'datasets', 'detail', id],
    queryFn: () => getAdminDatasetDetail(id!),
    enabled: Boolean(id),
  });
};

export const getAdminDatasetBatches = async (): Promise<AdminImportBatch[]> => {
  const res = await api.get<{ success: boolean; data: AdminImportBatch[] }>('/questions/datasets/batches');
  return (res.data as any).data || res.data;
};

export const useAdminDatasetBatches = () => {
  return useQuery<AdminImportBatch[]>({
    queryKey: ['admin', 'datasets', 'batches'],
    queryFn: getAdminDatasetBatches,
    staleTime: 30000,
  });
};

export const validateDatasetQuestions = async (questions: any[]) => {
  const res = await api.post('/questions/datasets/validate', { questions });
  return (res.data as any).data || res.data;
};

export const exportDatasetQuestions = async (id: string) => {
  const res = await api.get(`/questions/datasets/${id}/export`);
  return (res.data as any).data || res.data;
};

// ─── ADMIN SYSTEM QUERIES ────────────────────────────────────────────────────

export interface SystemServiceProbe {
  name: string;
  port: number;
  status: 'Healthy' | 'Degraded' | 'Unreachable';
  latency: string;
  url: string;
  lastChecked: string;
}

export interface SystemHealthData {
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  database: {
    status: 'CONNECTED' | 'DISCONNECTED';
    engine: string;
    latency: string;
    activePoolConnections: number;
    host: string;
  };
  redis: {
    status: string;
    isUsed: boolean;
    reason: string;
  };
  services: SystemServiceProbe[];
  systemInfo: {
    applicationName: string;
    version: string;
    environment: string;
    nodeVersion: string;
    platform: string;
    architecture: string;
    uptime: string;
    memoryUsage: {
      rss: string;
      heapUsed: string;
      heapTotal: string;
    };
    gatewayPrefix: string;
    totalRegisteredServices: number;
    activeHealthyServices: number;
    lastChecked: string;
  };
}

export const getAdminSystemHealth = async (): Promise<SystemHealthData> => {
  const res = await api.get<{ success: boolean; data: SystemHealthData }>('/admin/system');
  return (res.data as any).data || res.data;
};

export const useAdminSystemHealth = () => {
  return useQuery<SystemHealthData>({
    queryKey: ['admin', 'system', 'health'],
    queryFn: getAdminSystemHealth,
    staleTime: 10000,
    refetchInterval: 30000, // Safe background polling every 30s
  });
};

// ─── ADMIN ANALYTICS QUERIES ─────────────────────────────────────────────────

export interface AdminAnalyticsData {
  dateRange: string;
  overview: {
    totalUsers: number;
    totalStudents: number;
    totalFaculty: number;
    totalInterviews: number;
    completedInterviews: number;
    inProgressInterviews: number;
    completionRate: number;
    averageOverallScore: number;
    totalSubmissions: number;
    totalTestRuns: number;
    submissionAcceptanceRate: number;
    testCasePassRate: number;
  };
  performanceByRound: {
    aptitude: number;
    coding: number;
    hr: number;
    overall: number;
  };
  timelineTrend: Array<{
    date: string;
    interviewsCount: number;
    completedCount: number;
    averageScore: number;
  }>;
  codingAnalytics: {
    totalSubmissions: number;
    totalRuns: number;
    acceptanceRate: number;
    testCasePassRate: number;
    totalTestsPassed: number;
    totalTestsCount: number;
    verdictDistribution: {
      accepted: number;
      wrongAnswer: number;
      compilationError: number;
      runtimeError: number;
      timeLimitExceeded: number;
    };
    languages: Array<{
      name: string;
      count: number;
      percentage: number;
    }>;
  };
  questionBank: {
    totalPublished: number;
    byType: Record<string, number>;
    byDifficulty: Record<string, number>;
  };
  proctoring: {
    totalTabSwitches: number;
    totalAwaySeconds: number;
    sessionsWithViolations: number;
    averageSwitchesPerSession: number;
  };
  generatedAt: string;
}

export const getAdminAnalytics = async (params: {
  dateRange?: string;
  assessmentType?: string;
} = {}): Promise<AdminAnalyticsData> => {
  const res = await api.get<{ success: boolean; data: AdminAnalyticsData }>('/admin/analytics', { params });
  return (res.data as any).data || res.data;
};

export const useAdminAnalytics = (params: { dateRange?: string; assessmentType?: string } = {}) => {
  return useQuery<AdminAnalyticsData>({
    queryKey: ['admin', 'analytics', params],
    queryFn: () => getAdminAnalytics(params),
    staleTime: 15000,
  });
};
