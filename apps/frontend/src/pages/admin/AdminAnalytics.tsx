import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Calendar,
  Filter,
  RefreshCw,
  RotateCcw,
  Code2,
  Brain,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { useAdminAnalytics } from '../../api/admin';

const VERDICT_COLORS: Record<string, string> = {
  accepted: '#10b981', // emerald
  wrongAnswer: '#f43f5e', // rose
  compilationError: '#f59e0b', // amber
  runtimeError: '#8b5cf6', // purple
  timeLimitExceeded: '#64748b', // slate
};

export const AdminAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<string>('all');
  const [assessmentType, setAssessmentType] = useState<string>('ALL');

  const { data, isLoading, isError, error, refetch, isFetching } = useAdminAnalytics({
    dateRange,
    assessmentType: assessmentType !== 'ALL' ? assessmentType : undefined,
  });

  const handleResetFilters = () => {
    setDateRange('all');
    setAssessmentType('ALL');
  };

  const overview = data?.overview || {
    totalUsers: 0,
    totalStudents: 0,
    totalFaculty: 0,
    totalInterviews: 0,
    completedInterviews: 0,
    inProgressInterviews: 0,
    completionRate: 0,
    averageOverallScore: 0,
    totalSubmissions: 0,
    totalTestRuns: 0,
    submissionAcceptanceRate: 0,
    testCasePassRate: 0,
  };

  const rounds = data?.performanceByRound || {
    aptitude: 0,
    coding: 0,
    hr: 0,
    overall: 0,
  };

  const timelineTrend = data?.timelineTrend || [];
  const codingAnalytics = data?.codingAnalytics || {
    totalSubmissions: 0,
    totalRuns: 0,
    acceptanceRate: 0,
    testCasePassRate: 0,
    totalTestsPassed: 0,
    totalTestsCount: 0,
    verdictDistribution: {
      accepted: 0,
      wrongAnswer: 0,
      compilationError: 0,
      runtimeError: 0,
      timeLimitExceeded: 0,
    },
    languages: [],
  };

  const proctoring = data?.proctoring || {
    totalTabSwitches: 0,
    totalAwaySeconds: 0,
    sessionsWithViolations: 0,
    averageSwitchesPerSession: 0,
  };

  // Format verdict data for chart
  const verdictChartData = [
    { name: 'Accepted', count: codingAnalytics.verdictDistribution.accepted, key: 'accepted' },
    { name: 'Wrong Answer', count: codingAnalytics.verdictDistribution.wrongAnswer, key: 'wrongAnswer' },
    { name: 'Compile Error', count: codingAnalytics.verdictDistribution.compilationError, key: 'compilationError' },
    { name: 'Runtime Error', count: codingAnalytics.verdictDistribution.runtimeError, key: 'runtimeError' },
    { name: 'Time Limit', count: codingAnalytics.verdictDistribution.timeLimitExceeded, key: 'timeLimitExceeded' },
  ].filter((d) => d.count > 0 || overview.totalSubmissions === 0);

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto w-full pb-16 min-w-0">
      {/* ── 1. Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Platform Analytics
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-mono">
              Aggregated Metrics
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Authoritative performance trends, coding telemetry, and integrity metrics calculated from PostgreSQL session records.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs sm:text-sm font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="gap-1.5 text-xs sm:text-sm font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer shadow-2xs h-9"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────────── */}
      {isError && (
        <Card className="p-4 border-rose-200 bg-rose-50 text-rose-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Unable to load analytics</p>
              <p className="text-xs text-rose-600">{(error as any)?.message || 'Analytics service query failed'}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="border-rose-300 text-rose-700 bg-white hover:bg-rose-100 cursor-pointer">
            Retry
          </Button>
        </Card>
      )}

      {/* ── 2. Filter Bar ─────────────────────────────────────────────────── */}
      <Card className="p-4 border-slate-200 bg-white rounded-xl shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Analytics Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time History</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Assessment Types</option>
                <option value="PRACTICE">Practice Interviews</option>
                <option value="TEMPLATE">Template Assessments</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 3. Top Key Statistics (4 KPI Cards matching Users page) ────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5 border-slate-200 bg-white rounded-xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Mean Overall Score
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {isLoading ? '...' : `${overview.averageOverallScore}%`}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Across {overview.completedInterviews} completed assessments
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 border-slate-200 bg-white rounded-xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Completion Rate
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {isLoading ? '...' : `${overview.completionRate}%`}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              {overview.completedInterviews} of {overview.totalInterviews} sessions finalized
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 border-slate-200 bg-white rounded-xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Code Submissions
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Code2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {isLoading ? '...' : overview.totalSubmissions.toLocaleString()}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              {overview.submissionAcceptanceRate}% acceptance rate
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 border-slate-200 bg-white rounded-xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Integrity Violations
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {isLoading ? '...' : proctoring.totalTabSwitches}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Across {proctoring.sessionsWithViolations} flagged candidate sessions
            </p>
          </div>
        </Card>
      </div>

      {/* ── 4. Round Performance Component Breakdown ───────────────────────── */}
      <Card className="p-5 sm:p-6 border-slate-200 bg-white rounded-xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900">Curricular Round Performance Breakdown</h3>
            <p className="text-xs text-slate-500">Normalized candidate score averages across evaluation dimensions.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-amber-600" /> Aptitude Round
              </span>
              <span className="text-sm font-bold font-mono text-slate-900">{rounds.aptitude}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, rounds.aptitude)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">Quantitative, verbal & logical reasoning</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-blue-600" /> Coding Round
              </span>
              <span className="text-sm font-bold font-mono text-slate-900">{rounds.coding}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, rounds.coding)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">Full program algorithm & test execution</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-purple-600" /> HR Behavioral Round
              </span>
              <span className="text-sm font-bold font-mono text-slate-900">{rounds.hr}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, rounds.hr)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">STAR response rubrics & dialogue evaluations</p>
          </div>
        </div>
      </Card>

      {/* ── 5. Platform Activity Trend AreaChart ────────────────────────────── */}
      <Card className="p-5 sm:p-6 border-slate-200 bg-white rounded-xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900">Historical Evaluation & Score Progression</h3>
            <p className="text-xs text-slate-500">Timeline of assessment activity and cohort mean performance.</p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {timelineTrend.length} Data Points
          </span>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : timelineTrend.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No session activity recorded for the selected filter period.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-2.5 border border-slate-200 rounded-lg shadow-md text-xs space-y-1">
                          <div className="font-semibold text-slate-800">{d.date}</div>
                          <div className="text-blue-600 font-mono">Average Score: {d.averageScore}%</div>
                          <div className="text-slate-500 font-mono">Sessions: {d.interviewsCount}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="averageScore"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#scoreGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* ── 6. Coding Submissions & Language Analytics ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verdict Distribution BarChart */}
        <Card className="p-5 sm:p-6 border-slate-200 bg-white rounded-xl shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900">Official Verdict Distribution</h3>
              <p className="text-xs text-slate-500">Submission evaluations across test case outcomes.</p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {codingAnalytics.totalSubmissions} Total
            </span>
          </div>

          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-xl" />
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={verdictChartData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white p-2 border border-slate-200 rounded shadow-xs text-xs">
                            <span className="font-semibold text-slate-800">{d.name}: </span>
                            <span className="font-mono text-blue-600 font-bold">{d.count} submissions</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {verdictChartData.map((entry) => (
                      <Cell key={entry.name} fill={VERDICT_COLORS[entry.key] || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Programming Languages Usage */}
        <Card className="p-5 sm:p-6 border-slate-200 bg-white rounded-xl shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900">Programming Language Adoption</h3>
              <p className="text-xs text-slate-500">Distribution of compiler execution runtimes utilized.</p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {codingAnalytics.languages.length} Compilers
            </span>
          </div>

          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-xl" />
          ) : codingAnalytics.languages.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">No language telemetry available.</div>
          ) : (
            <div className="space-y-3 pt-2">
              {codingAnalytics.languages.map((lang) => (
                <div key={lang.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{lang.name}</span>
                    <span className="font-mono text-slate-500">
                      {lang.count} submissions ({lang.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, lang.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
