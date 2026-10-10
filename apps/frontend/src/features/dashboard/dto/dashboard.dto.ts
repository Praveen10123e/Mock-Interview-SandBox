export interface ProfileCompletionDTO {
  percentage: number;
  missingSections: string[];
  suggestions: string[];
}

export interface ProfileSummaryDTO {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  careerProfile: any | null;
  nmProfile: any | null;
  skills: any[];
  education: any[];
  resumes: any[];
}

export interface DashboardActivityDTO {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

export interface DashboardStatisticsDTO {
  totalInterviews: number;
  averageScore: number;
  codingAccuracy: number;
  communicationScore: number;
  behaviorScore: number;
  interviewHours: number;
}

export interface DashboardDTO {
  summary: ProfileSummaryDTO | null;
  completion: ProfileCompletionDTO;
  activity: DashboardActivityDTO[];
  statistics: DashboardStatisticsDTO | null;
}
