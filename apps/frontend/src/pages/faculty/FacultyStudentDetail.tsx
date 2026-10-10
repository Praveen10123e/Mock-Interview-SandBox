import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mail,
  Phone,
  Building,
  GraduationCap,
  Calendar,
  Code2,
  Clock,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { useFacultyStudentDetail } from '../../api/faculty';

export const FacultyStudentDetail: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch, isFetching } = useFacultyStudentDetail(studentId);

  // Helper for 2-letter initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return `${parts[0][0]}${parts[0][1]}`.toUpperCase();
    }
    return (name[0] || 'S').toUpperCase();
  };

  // ── Loading Skeleton ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full max-w-none space-y-6 pb-12">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-6 w-48 rounded-md" />
        </div>
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-text-primary">Failed to load student details</h2>
          <p className="text-xs text-text-secondary max-w-md">
            {(error as any)?.response?.data?.message ||
              (error as any)?.message ||
              'The requested student profile could not be accessed.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/faculty/students')} variant="outline" size="sm">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Students
          </Button>
          <Button onClick={() => refetch()} variant="default" size="sm">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  const { profile, codingPerformance, interviewPerformance, recentActivity } = data;
  const initials = getInitials(profile.fullName);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 min-w-0">
      {/* ── 1. Top Navigation & Breadcrumbs ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/faculty/students')}
            className="h-9 px-3 text-[13px] font-medium border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Students</span>
          </Button>
          <span className="text-slate-400 text-xs">/</span>
          <span className="text-slate-900 font-semibold text-[13px] truncate max-w-[200px]">
            {profile.fullName}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-9 px-3 text-[13px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* ── 2. Student Profile Hero Card ────────────────────────────────────── */}
      <Card className="p-6 md:p-8 bg-white border border-slate-200/80 shadow-2xs rounded-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Initials Avatar */}
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-xl md:text-2xl shadow-2xs shrink-0">
              {initials}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {profile.fullName}
                </h1>
                <span className="px-2.5 py-0.5 text-[12px] font-semibold bg-blue-50 border border-blue-200 text-blue-700 rounded-full uppercase tracking-wider">
                  {profile.role}
                </span>
                <span className="px-2.5 py-0.5 text-[12px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full">
                  {profile.placementStatus}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[13px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {profile.email}
                </span>
                {profile.phone && profile.phone !== '—' && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {profile.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Batch {profile.batch}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:items-end text-[13px] text-slate-500 space-y-1 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 w-full md:w-auto">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <Building className="h-3.5 w-3.5 text-blue-600" />
              {profile.college}
            </span>
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
              {profile.department}
            </span>
            {profile.rollNumber && profile.rollNumber !== '—' && (
              <span className="font-mono text-[12px] text-slate-400">
                Roll No: {profile.rollNumber}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* ── 3. Performance Cards Grid ───────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Coding Performance Card */}
        <Card className="p-5 md:p-6 bg-white border border-slate-200/80 shadow-2xs rounded-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider font-mono">
                Coding Performance
              </h2>
            </div>
            <span className="text-[12px] font-mono text-slate-500">
              {codingPerformance.totalSubmissions} Submissions
            </span>
          </div>

          {codingPerformance.hasCodingData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-center">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {codingPerformance.totalSubmissions}
                  </div>
                  <div className="text-[12px] text-slate-500 mt-0.5">Total Attempts</div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-center">
                  <div className="text-2xl font-bold text-emerald-600 tracking-tight">
                    {codingPerformance.acceptedSubmissions}
                  </div>
                  <div className="text-[12px] text-slate-500 mt-0.5">Passed Solutions</div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-center">
                  <div className="text-2xl font-bold text-blue-600 font-mono tracking-tight">
                    {codingPerformance.acceptanceRate !== null
                      ? `${codingPerformance.acceptanceRate}%`
                      : '—'}
                  </div>
                  <div className="text-[12px] text-slate-500 mt-0.5">Acceptance Rate</div>
                </div>
              </div>

              {codingPerformance.submissions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-[12px] font-semibold text-slate-600 uppercase font-mono">
                    Recent Code Executions
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {codingPerformance.submissions.slice(0, 5).map((sub) => (
                      <div
                        key={sub.id}
                        className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-slate-900 truncate">
                            {sub.questionTitle}
                          </div>
                          <div className="text-[12px] text-slate-500 flex items-center gap-2">
                            <span className="uppercase font-mono text-blue-600">{sub.language}</span>
                            <span>•</span>
                            <span>
                              {sub.passedCount}/{sub.totalCount} tests passed
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 text-[11px] sm:text-[12px] font-semibold rounded-full uppercase shrink-0 border ${
                            sub.status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center space-y-2">
              <Code2 className="h-6 w-6 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">
                Not enough coding data available
              </p>
              <p className="text-[12px] text-slate-400 max-w-xs mx-auto">
                Coding execution metrics will be recorded once the candidate submits problem solutions.
              </p>
            </div>
          )}
        </Card>

        {/* Interview Performance Card */}
        <Card className="p-5 md:p-6 bg-white border border-slate-200/80 shadow-2xs rounded-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider font-mono">
                Interview Performance
              </h2>
            </div>
            <span className="text-[12px] font-mono text-slate-500">
              {interviewPerformance.totalInterviews} Sessions
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-center">
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {interviewPerformance.totalInterviews}
                </div>
                <div className="text-[12px] text-slate-500 mt-0.5">Total Sessions</div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-center">
                <div className="text-2xl font-bold text-emerald-600 tracking-tight">
                  {interviewPerformance.completedInterviews}
                </div>
                <div className="text-[12px] text-slate-500 mt-0.5">Completed</div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-center">
                {interviewPerformance.hasInterviewData ? (
                  <>
                    <div className="text-2xl font-bold text-blue-600 font-mono tracking-tight">
                      {interviewPerformance.averageScore}%
                    </div>
                    <div className="text-[12px] text-slate-500 mt-0.5">Average Score</div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-semibold text-slate-400 mt-1.5">No data</div>
                    <div className="text-[12px] text-slate-500 mt-0.5">Average Score</div>
                  </>
                )}
              </div>
            </div>

            {interviewPerformance.interviews.length > 0 ? (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-[12px] font-semibold text-slate-600 uppercase font-mono">
                  Interview Sessions Log
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {interviewPerformance.interviews.map((iv) => (
                    <div
                      key={iv.id}
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-slate-900 truncate">{iv.title}</div>
                        <div className="text-[12px] text-slate-500 flex items-center gap-2">
                          <span className="uppercase text-blue-600 font-mono">
                            {iv.interviewType}
                          </span>
                          <span>•</span>
                          <span>{new Date(iv.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {iv.score !== null && (
                          <span className="font-bold text-blue-600 font-mono text-[13px]">
                            {iv.score}%
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 text-[11px] sm:text-[12px] font-semibold rounded-full uppercase shrink-0 border ${
                            iv.state === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {iv.state}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-1">
                <p className="text-xs font-semibold text-slate-700">
                  Not enough assessment data available yet
                </p>
                <p className="text-[12px] text-slate-400 max-w-xs mx-auto">
                  Interview evaluations will appear here once the student participates in mock interviews.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── 4. Recent Student Activity Timeline ─────────────────────────────── */}
      <Card className="p-5 md:p-6 bg-white border border-slate-200/80 shadow-2xs rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider font-mono">
              Recent Activity Timeline
            </h2>
          </div>
          <span className="text-[12px] font-mono text-slate-500">
            {recentActivity.length} Events Logged
          </span>
        </div>

        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((event) => (
              <div
                key={event.id}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    {event.type === 'INTERVIEW' ? (
                      <Calendar className="h-3.5 w-3.5 text-blue-600" />
                    ) : (
                      <Code2 className="h-3.5 w-3.5 text-indigo-600" />
                    )}
                    <span className="text-[13px] sm:text-[14px] font-semibold text-slate-900">{event.title}</span>
                  </div>
                  <div className="text-[12px] text-slate-600 pl-5">{event.detail}</div>
                </div>

                <div className="flex flex-col items-end shrink-0 space-y-1">
                  <span
                    className={`px-2.5 py-0.5 text-[11px] sm:text-[12px] font-semibold rounded-full uppercase border ${
                      event.status === 'COMPLETED' || event.status === 'ACCEPTED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : event.status === 'RUNNING'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {event.status}
                  </span>
                  <span className="text-[11px] sm:text-[12px] text-slate-400 font-mono">
                    {new Date(event.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center space-y-2">
            <Clock className="h-6 w-6 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No recent student activity</p>
            <p className="text-[12px] text-slate-400 max-w-xs mx-auto">
              Real-time activity records will populate here as the candidate interacts with the sandbox.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default FacultyStudentDetail;
