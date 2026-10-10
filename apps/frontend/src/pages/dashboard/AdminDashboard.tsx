import React from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  Award,
  Terminal,
  Code2,
  BookOpen,
  Server,
  Activity,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Zap,
  TrendingUp,
  Layers,
  Database,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useAdminDashboard } from '../../api/admin';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';

// Custom tooltip for the Performance AreaChart matching student/faculty design language
const AdminChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-md text-xs space-y-1">
        <div className="font-semibold text-slate-800">{data.date}</div>
        <div className="flex items-center gap-1.5 text-blue-600 font-bold">
          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
          Average Score: {data.averageScore}%
        </div>
        {data.count !== undefined && (
          <div className="text-[11px] text-slate-500">
            {data.count} evaluation session{data.count === 1 ? '' : 's'} recorded
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const AdminDashboard: React.FC = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminDashboard();

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 min-w-0">
      {/* ── 1. Page Header ─────────────────────────────────────────────────── */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              System Administration
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 rounded-md font-mono">
              Super Admin
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Monitor users, assessments, interview activity, platform performance, and system health.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* ── Loading State ───────────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl bg-white border border-slate-200" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-72 rounded-xl bg-white border border-slate-200 lg:col-span-2" />
            <Skeleton className="h-72 rounded-xl bg-white border border-slate-200" />
          </div>
        </div>
      )}

      {/* ── Error State ─────────────────────────────────────────────────── */}
      {isError && (
        <div className="p-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-semibold text-rose-900">Failed to load system administrative metrics</p>
              <p className="text-xs text-rose-700 mt-0.5">
                {(error as any)?.response?.data?.error?.message || (error as any)?.message || 'An unexpected error occurred.'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs border-rose-200 hover:bg-rose-100 text-rose-800">
            Try Again
          </Button>
        </div>
      )}

      {/* ── Authenticated Admin Banner ──────────────────────────────────── */}
      {!isLoading && data && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-bold font-mono text-lg shrink-0 shadow-xs">
              SA
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">{data.adminProfile.fullName}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  AUTHORIZED
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {data.adminProfile.email} • {data.adminProfile.designation} • {data.adminProfile.department}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Scope: <strong className="text-slate-900 font-semibold">Platform-Wide</strong></span>
          </div>
        </div>
      )}

      {/* ── Main Dashboard Content ──────────────────────────────────────── */}
      {!isLoading && data && (
        <div className="space-y-8">
          {/* ── 8 Platform KPI Cards ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
            {/* Card 1: Total Registered Users */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[13px] sm:text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Total Registered Users</span>
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                  <Users className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{data.overview.totalUsers}</span>
                <span className="text-[12px] sm:text-[13px] text-slate-500 block mt-1 font-medium">
                  {data.overview.totalStudents} Students • {data.overview.totalFaculty} Faculty • {data.overview.totalAdmins} Admin
                </span>
              </div>
            </div>

            {/* Card 2: Completed Assessments */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[13px] sm:text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Completed Assessments</span>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{data.overview.completedAssessments}</span>
                <span className="text-[12px] sm:text-[13px] text-slate-500 block mt-1 font-medium">
                  Finalized Sessions across Cohorts
                </span>
              </div>
            </div>

            {/* Card 3: In-Progress Assessments */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[13px] sm:text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Active In-Progress</span>
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                  <Clock className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{data.overview.inProgressAssessments}</span>
                <span className="text-[12px] sm:text-[13px] text-slate-500 block mt-1 font-medium">
                  Active Evaluation Sessions
                </span>
              </div>
            </div>

            {/* Card 4: Platform Average Score */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[13px] sm:text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Platform Average Score</span>
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                  <Award className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-bold text-blue-600 tracking-tight">
                  {data.overview.averageOverallScore !== null ? `${data.overview.averageOverallScore}%` : 'Data unavailable'}
                </span>
                <span className="text-[12px] sm:text-[13px] text-slate-500 block mt-1 font-medium">
                  Cohort Mean Finalized Score
                </span>
              </div>
            </div>

            {/* Card 5: Official Code Submissions */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[13px] sm:text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Official Submissions</span>
                <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center shrink-0">
                  <Terminal className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{data.overview.totalOfficialSubmissions}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                  {data.overview.totalTestRuns} Runs
                </span>
              </div>
            </div>

            {/* Card 6: Submission Acceptance Rate */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[13px] sm:text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Coding Acceptance</span>
                <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
                  <Code2 className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-bold text-teal-600 tracking-tight">
                  {data.overview.submissionAcceptanceRate !== null ? `${data.overview.submissionAcceptanceRate}%` : 'Data unavailable'}
                </span>
                <span className="text-[12px] sm:text-[13px] text-slate-500 block mt-1 font-medium">
                  {data.codingAnalytics.acceptedSubmissions}/{data.overview.totalOfficialSubmissions} Solved Official
                </span>
              </div>
            </div>

            {/* Card 7: Published Questions */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[13px] sm:text-[14px] font-semibold text-slate-500 uppercase tracking-wider">Published Questions</span>
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
                  <BookOpen className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-bold text-purple-600 tracking-tight">{data.questionBank.publishedQuestions}</span>
                <span className="text-[12px] sm:text-[13px] text-slate-500 block mt-1 font-medium">
                  Curated ({data.questionBank.totalQuestions.toLocaleString()} total in DB)
                </span>
              </div>
            </div>

            {/* Card 8: System Health Status */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[13px] sm:text-[14px] font-semibold text-slate-500 uppercase tracking-wider">System Health</span>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <Activity className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-emerald-600 font-mono tracking-tight">{data.systemHealth.overallStatus}</span>
                <span className="text-[11px] text-slate-500 font-medium">6 Services</span>
              </div>
            </div>
          </div>

          {/* ── Row 1: Platform Performance Trend & Assessment Lifecycle ──── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Activity Trend AreaChart */}
            <div className="lg:col-span-2 bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Platform Assessment Activity & Score Trend</h3>
                </div>
                <span className="text-xs text-slate-500">
                  {data.performanceTrend.length} Historical Evaluation Dates
                </span>
              </div>

              {data.performanceTrend.length > 0 ? (
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.performanceTrend}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="adminTrendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                      />
                      <Tooltip content={<AdminChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="averageScore"
                        name="Avg Score (%)"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#adminTrendGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <p className="text-xs font-medium text-slate-700">No performance data yet</p>
                  <p className="text-xs text-slate-400 max-w-sm">Complete more assessments to generate platform-wide performance analytics.</p>
                </div>
              )}
            </div>

            {/* Right 1 Col: Assessment Lifecycle & Score Breakdown */}
            <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-600" />
                  Lifecycle & Round Scores
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Platform-wide evaluation averages
                </p>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Total Sessions Initiated</span>
                    <span className="font-mono text-slate-900 font-bold">{data.overview.totalAssessments}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${(data.overview.completedAssessments / (data.overview.totalAssessments || 1)) * 100}%`,
                      }}
                      title={`Completed: ${data.overview.completedAssessments}`}
                    />
                    <div
                      className="h-full bg-amber-500"
                      style={{
                        width: `${(data.overview.inProgressAssessments / (data.overview.totalAssessments || 1)) * 100}%`,
                      }}
                      title={`In-Progress: ${data.overview.inProgressAssessments}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed ({data.overview.completedAssessments})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> In Progress ({data.overview.inProgressAssessments})</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Aptitude Component Mean:</span>
                    <span className="font-mono text-purple-700 font-bold">
                      {data.overview.averageAptitudeScore !== null ? `${data.overview.averageAptitudeScore}%` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Coding Component Mean:</span>
                    <span className="font-mono text-teal-700 font-bold">
                      {data.overview.averageCodingScore !== null ? `${data.overview.averageCodingScore}%` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">HR Behavioral Component Mean:</span>
                    <span className="font-mono text-pink-700 font-bold">
                      {data.overview.averageHrScore !== null ? `${data.overview.averageHrScore}%` : '—'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                  Interview Templates: <strong className="text-slate-900 font-semibold">{data.templates.publishedCount} published</strong> ({data.templates.totalTemplates} total)
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 2: Coding Infrastructure & Question Bank Breakdown ─────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Coding & Execution Ecosystem */}
            <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-teal-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Coding & Execution Ecosystem</h3>
                </div>
                <span className="text-xs text-slate-500 font-mono font-medium">
                  {data.codingAnalytics.totalExecutions} Total Executions
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 block font-medium">Test Runs (RUN)</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">{data.codingAnalytics.testRunsCount}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Local candidate runs</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 block font-medium">Official Submissions</span>
                  <span className="text-lg font-bold text-teal-700 font-mono">
                    {data.codingAnalytics.officialSubmissionsCount}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Evaluated solutions</span>
                </div>
              </div>

              {/* Verdict Distribution Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 font-semibold block uppercase">Accepted</span>
                  <span className="font-bold text-emerald-700 font-mono text-sm">{data.codingAnalytics.verdictDistribution.accepted}</span>
                </div>
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200">
                  <span className="text-[10px] text-rose-800 font-semibold block uppercase">Wrong Ans</span>
                  <span className="font-bold text-rose-700 font-mono text-sm">{data.codingAnalytics.verdictDistribution.wrongAnswer}</span>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="text-[10px] text-amber-800 font-semibold block uppercase">Compile Err</span>
                  <span className="font-bold text-amber-700 font-mono text-sm">{data.codingAnalytics.verdictDistribution.compilationError}</span>
                </div>
                <div className="p-2 rounded-lg bg-orange-50 border border-orange-200">
                  <span className="text-[10px] text-orange-800 font-semibold block uppercase">Runtime Err</span>
                  <span className="font-bold text-orange-700 font-mono text-sm">{data.codingAnalytics.verdictDistribution.runtimeError}</span>
                </div>
                <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                  <span className="text-[10px] text-blue-800 font-semibold block uppercase">TLE</span>
                  <span className="font-bold text-blue-700 font-mono text-sm">{data.codingAnalytics.verdictDistribution.timeLimitExceeded}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Test Case Aggregate Pass Rate</span>
                <span className="font-mono text-slate-900 font-bold">
                  {data.codingAnalytics.testsPassedCount}/{data.codingAnalytics.totalTestsCount} ({data.codingAnalytics.testCasePassRate ?? 0}%)
                </span>
              </div>
            </div>

            {/* Right: Question Bank & Curricular Datasets */}
            <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Question Bank & Curricula</h3>
                </div>
                <span className="text-xs text-purple-700 font-mono font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {data.questionBank.publishedQuestions} Curated Active
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 block font-medium">Curated Benchmark</span>
                    <span className="text-lg font-bold text-purple-700 font-mono">{data.questionBank.publishedQuestions}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 block font-medium">Total Database Records</span>
                    <span className="text-lg font-bold text-slate-900 font-mono">{data.questionBank.totalQuestions.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500 block mb-2 font-semibold">Top Curricular Categories</span>
                  <div className="grid grid-cols-2 gap-2">
                    {data.questionBank.categories.map((c) => (
                      <div key={c.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-slate-800 font-medium truncate pr-2">{c.name}</span>
                        <span className="font-mono text-slate-500 text-xs font-semibold">{c.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 3: Live System Health & Microservices Architecture ───────── */}
          <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">Live Microservices & Platform Health</h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 font-mono font-bold">ALL SERVICES OPERATIONAL</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {data.systemHealth.services.map((svc) => (
                <div key={svc.name} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate">{svc.name}</span>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        svc.status === 'Healthy' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
                    <span>Port {svc.port}</span>
                    <span className="text-emerald-600 font-bold">{svc.latency}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
              <span className="flex items-center gap-2 font-medium">
                <Database className="h-3.5 w-3.5 text-blue-600" />
                Database Cluster: <strong className="text-slate-900">auth_db, user_db, interview_db, question_db</strong>
              </span>
              <span className="text-emerald-700 font-mono font-semibold">PostgreSQL Connected (Port 5432)</span>
            </div>
          </div>

          {/* ── Row 4: Operational Attention & Recent Activity ───────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Operational Attention */}
            <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Operational Signals & Alerts
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Evidence-based system notifications and cohort indicators
                </p>
              </div>

              <div className="space-y-3">
                {data.attentionItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border space-y-1 text-xs ${
                      item.severity === 'HIGH'
                        ? 'border-rose-200 bg-rose-50 text-rose-800'
                        : item.severity === 'MEDIUM'
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-blue-200 bg-blue-50 text-blue-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>{item.title}</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white border border-current font-bold">
                        {item.count} items
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Recent Platform Activity */}
            <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  Recent Platform Activity Stream
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time assessment completions, submissions, and events
                </p>
              </div>

              <div className="space-y-2.5">
                {data.recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5 min-w-0 pr-3">
                      <span className="font-semibold text-slate-900 truncate block">{act.title}</span>
                      <p className="text-[11px] text-slate-500 truncate">{act.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {act.badge && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold block ${
                            act.badgeVariant === 'success'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {act.badge}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
