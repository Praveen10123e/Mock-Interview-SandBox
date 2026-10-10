import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Clock,
  Award,
  Brain,
  Code2,
  MessageSquare,
  Terminal,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  RotateCcw,
  BarChart3,
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
import { useFacultyAnalytics } from '../../api/faculty';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';

export const FacultyAnalytics: React.FC = () => {
  const navigate = useNavigate();

  // Filters State
  const [templateId, setTemplateId] = useState<string>('ALL');
  const [department, setDepartment] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [studentSearch, setStudentSearch] = useState<string>('');

  const { data, isLoading, isError, error, refetch, isFetching } = useFacultyAnalytics({
    templateId: templateId !== 'ALL' ? templateId : undefined,
    department: department !== 'ALL' ? department : undefined,
    dateRange: dateRange !== 'all' ? dateRange : undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  });

  const handleResetFilters = () => {
    setTemplateId('ALL');
    setDepartment('ALL');
    setDateRange('all');
    setStatusFilter('ALL');
    setStudentSearch('');
  };

  const filteredStudentRoster = (data?.studentRoster || []).filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q) ||
      s.rollNumber.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 min-w-0">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Cohort Analytics & Insights
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold font-mono">
              Live Verified Data
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Deep evidence-based performance insights, topic accuracy, coding verdicts & evaluation metrics across all students.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="gap-1.5 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </Button>
        </div>
      </div>

      {/* ── Filters Bar ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-wrap items-center gap-4 text-xs shadow-2xs">
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <Filter className="h-3.5 w-3.5 text-blue-600" />
          Filters:
        </div>

        {/* Template Filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-slate-500">Template:</label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs"
          >
            <option value="ALL">All Assessments</option>
            {data?.filterOptions?.templates?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.type})
              </option>
            ))}
          </select>
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-slate-500">Department:</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs"
          >
            <option value="ALL">All Departments</option>
            {data?.filterOptions?.departments?.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-slate-500">Date Window:</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-slate-500">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs"
          >
            <option value="ALL">All States</option>
            <option value="COMPLETED">Completed</option>
            <option value="RUNNING">In Progress</option>
          </select>
        </div>
      </div>

      {/* ── Loading / Error State ─────────────────────────────────────────── */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-white border border-slate-200" />
          ))}
        </div>
      )}

      {isError && (
        <div className="p-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <div>
            <p className="font-semibold text-slate-900">Failed to load faculty analytics</p>
            <p className="text-xs text-slate-500 mt-0.5">{(error as any)?.message || 'An unexpected error occurred.'}</p>
          </div>
        </div>
      )}

      {/* ── Main Analytics Dashboard ──────────────────────────────────────── */}
      {!isLoading && data && (
        <div className="space-y-8">
          {/* ── KPI Summary Cards (8 cards) ────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Card 1: Total Registered Students */}
            <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[13px] font-semibold uppercase tracking-wider">Registered Students</span>
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{data.overview.totalStudents}</span>
                <span className="text-[12px] text-slate-500 ml-2 font-medium">Candidates</span>
              </div>
            </div>

            {/* Card 2: Completed Assessments */}
            <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[13px] font-semibold uppercase tracking-wider">Completed</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight">{data.overview.completedAssessments}</span>
                <span className="text-[12px] text-slate-500 ml-2 font-medium">Finalized</span>
              </div>
            </div>

            {/* Card 3: In-Progress Assessments */}
            <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[13px] font-semibold uppercase tracking-wider">In-Progress</span>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-bold text-amber-600 tracking-tight">{data.overview.inProgressAssessments}</span>
                <span className="text-[12px] text-slate-500 ml-2 font-medium">Active</span>
              </div>
            </div>

            {/* Card 4: Average Overall Score */}
            <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[13px] font-semibold uppercase tracking-wider">Average Score</span>
                <Award className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-bold text-blue-600 tracking-tight">
                  {data.overview.averageOverallScore !== null ? `${data.overview.averageOverallScore}%` : 'Data unavailable'}
                </span>
                {data.overview.averageOverallScore !== null && (
                  <span className="text-[12px] text-slate-500 ml-2 font-medium">
                    ({data.overview.overallScoresDenominator || data.overview.completedAssessments} reports)
                  </span>
                )}
              </div>
            </div>

            {/* Card 5: Aptitude Accuracy */}
            <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[13px] font-semibold uppercase tracking-wider">Aptitude Accuracy</span>
                <Brain className="h-4 w-4 text-purple-600" />
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-bold text-purple-600 tracking-tight">
                  {data.overview.aptitudeAccuracy !== null ? `${data.overview.aptitudeAccuracy}%` : 'Data unavailable'}
                </span>
                {data.overview.aptitudeAttemptedCount ? (
                  <span className="text-[12px] text-slate-500 ml-2 font-medium">
                    {data.overview.aptitudeCorrectCount}/{data.overview.aptitudeAttemptedCount} correct
                  </span>
                ) : (
                  <span className="text-[12px] text-slate-500 ml-2 font-medium">Questions</span>
                )}
              </div>
            </div>

            {/* Card 6: Submission Acceptance Rate */}
            <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[13px] font-semibold uppercase tracking-wider">Coding Acceptance</span>
                <Code2 className="h-4 w-4 text-blue-600" />
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-bold text-blue-600 tracking-tight">
                  {data.overview.codingAcceptanceRate !== null ? `${data.overview.codingAcceptanceRate}%` : 'Data unavailable'}
                </span>
                {data.overview.codingSubmissionCount ? (
                  <span className="text-[12px] text-slate-500 ml-2 font-medium">
                    {data.overview.codingAcceptedCount}/{data.overview.codingSubmissionCount} solved
                  </span>
                ) : (
                  <span className="text-[12px] text-slate-500 ml-2 font-medium">Submissions</span>
                )}
              </div>
            </div>

            {/* Card 7: HR Completion Rate */}
            <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[13px] font-semibold uppercase tracking-wider">HR Completion</span>
                <MessageSquare className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="mt-3">
                <span className="text-2xl sm:text-3xl font-bold text-indigo-600 tracking-tight">
                  {data.overview.hrCompletionRate !== null ? `${data.overview.hrCompletionRate}%` : (data.hrAnalytics.hasData ? `${data.hrAnalytics.totalResponsesCount} responses` : 'Not evaluated')}
                </span>
                <span className="text-[12px] text-slate-500 ml-2 font-medium">
                  {data.hrAnalytics.completedSessionsCount}/{data.overview.completedAssessments} sessions
                </span>
              </div>
            </div>

            {/* Card 8: Official Code Submissions (RUN vs SUBMIT separated) */}
            <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[13px] font-semibold uppercase tracking-wider">Official Submissions</span>
                <Terminal className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{data.overview.totalSubmissions}</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                  {data.overview.totalRuns} Runs
                </span>
              </div>
            </div>
          </div>

          {/* ── Row 2: Performance Trend & Students Needing Attention ──────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Performance Trend Chart (2 cols) */}
              <div className="lg:col-span-2 bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 sm:p-6 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      Cohort Performance Trend
                    </h3>
                    <p className="text-xs text-slate-500">
                      Average overall assessment scores over time (derived strictly from completed reports).
                    </p>
                  </div>
                  {data.performanceTrend.length > 0 && (
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-semibold">
                      {data.performanceTrend.length} Evaluation Cycles
                    </span>
                  )}
                </div>

                {data.performanceTrend.length > 0 ? (
                  <div className="h-64 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.performanceTrend} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#94a3b8"
                          fontSize={12}
                          tickLine={false}
                          axisLine={{ stroke: '#e2e8f0' }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          stroke="#94a3b8"
                          fontSize={12}
                          tickLine={false}
                          axisLine={{ stroke: '#e2e8f0' }}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderColor: '#e2e8f0',
                            borderRadius: '0.5rem',
                            fontSize: '12px',
                            color: '#0f172a',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                          formatter={(value: any) => [`${value}%`, 'Average Score']}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="averageScore"
                          stroke="#2563eb"
                          strokeWidth={2.5}
                          fill="url(#scoreGradient)"
                          dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#ffffff' }}
                          activeDot={{ r: 6, fill: '#1d4ed8' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 rounded-xl bg-slate-50/60 border border-slate-200 border-dashed flex flex-col items-center justify-center p-6 text-center">
                    <BarChart3 className="h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-xs sm:text-sm font-semibold text-slate-700">Not Enough Trend Data</p>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Performance trend points will populate automatically as more student assessments are completed.
                    </p>
                  </div>
                )}
              </div>

              {/* Students Needing Attention (1 col) */}
              <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 sm:p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Students Needing Attention
                    <span className="ml-auto text-xs px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold font-mono">
                      {data.studentsNeedingAttention.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Evidence-based flags (Overall score &lt;50% or ≥3 failed executions).
                  </p>
                </div>

                <div className="space-y-2.5 overflow-y-auto max-h-64 pr-1">
                  {data.studentsNeedingAttention.length > 0 ? (
                    data.studentsNeedingAttention.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => navigate(`/faculty/students/${st.id}`)}
                        className="p-3 rounded-lg bg-slate-50/70 border border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 cursor-pointer transition-all space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                            {st.name}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-amber-100/80 text-amber-800 border border-amber-300/60">
                            {st.performanceScore}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-tight line-clamp-2">
                          {st.reason}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                          <span>{st.department}</span>
                          <span>Active: {st.lastActive}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-44 rounded-xl bg-slate-50/60 border border-slate-200/80 flex flex-col items-center justify-center p-4 text-center">
                      <CheckCircle2 className="h-7 w-7 text-emerald-500 mb-1.5" />
                      <p className="text-xs sm:text-sm font-semibold text-slate-900">All Students on Track</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        No critical performance flags or repeated submission failures recorded.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Row 3: Round-Specific Deep Dives (Aptitude & Coding) ───────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Aptitude Deep Dive */}
              <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                      <Brain className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900">Aptitude Performance by Topic</h3>
                      <p className="text-xs text-slate-500">Topic-level question accuracy across all candidates</p>
                    </div>
                  </div>
                  {data.aptitudeAnalytics.accuracyPercentage !== null && (
                    <div className="text-right">
                      <span className="text-xs text-slate-500">Overall Accuracy: </span>
                      <span className="text-xs sm:text-sm font-bold text-purple-600 font-mono">
                        {data.aptitudeAnalytics.accuracyPercentage}%
                      </span>
                    </div>
                  )}
                </div>

                {data.aptitudeAnalytics.topicBreakdown.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-200 text-left uppercase text-[11px] font-mono font-semibold">
                          <th className="pb-2.5">Topic Name</th>
                          <th className="pb-2.5 text-center">Attempted</th>
                          <th className="pb-2.5 text-center">Correct</th>
                          <th className="pb-2.5 text-right">Accuracy Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.aptitudeAnalytics.topicBreakdown.map((t) => (
                          <tr key={t.topic} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 font-medium text-slate-900">{t.topic}</td>
                            <td className="py-2.5 text-center text-slate-500 font-mono">{t.attempted}</td>
                            <td className="py-2.5 text-center text-emerald-600 font-mono">{t.correct}</td>
                            <td className="py-2.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-purple-600"
                                    style={{ width: `${Math.min(100, t.accuracy)}%` }}
                                  />
                                </div>
                                <span className="font-mono font-semibold text-slate-900 w-10 text-right">
                                  {t.accuracy}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No aptitude assessment data recorded for this filter.
                  </div>
                )}
              </div>

              {/* Coding Deep Dive */}
              <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                      <Code2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900">Coding Verdict Breakdown</h3>
                      <p className="text-xs text-slate-500">
                        Official Submission outcomes (RUN executions strictly separated)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Acceptance Rate: </span>
                    <span className="text-xs sm:text-sm font-bold text-blue-600 font-mono">
                      {data.codingAnalytics.submissionAcceptanceRate !== null && data.codingAnalytics.submissionAcceptanceRate !== undefined
                        ? `${data.codingAnalytics.submissionAcceptanceRate}%`
                        : (data.codingAnalytics.testPassRate !== null ? `${data.codingAnalytics.testPassRate}%` : '—')}
                    </span>
                  </div>
                </div>

                {data.codingAnalytics.hasData ? (
                  <div className="space-y-4">
                    {/* Execution Modes Comparison */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-500 block">Test Runs (RUN)</span>
                          <span className="text-lg font-bold text-slate-900 font-mono">
                            {data.codingAnalytics.runAttemptsCount}
                          </span>
                          <span className="text-[10px] text-slate-400 block">Local testing</span>
                        </div>
                        <Terminal className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-500 block">Official Submissions (SUBMIT)</span>
                          <span className="text-lg font-bold text-blue-600 font-mono">
                            {data.codingAnalytics.submitAttemptsCount}
                          </span>
                          <span className="text-[10px] text-slate-400 block">Evaluated solutions</span>
                        </div>
                        <Award className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>

                    {/* Verdict Distribution Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                        <span className="text-[10px] text-emerald-800 font-medium block">Accepted (Passed)</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-base font-bold text-emerald-700 font-mono">
                            {data.codingAnalytics.verdictDistribution.accepted}
                          </span>
                          {data.codingAnalytics.verdictPercentages && (
                            <span className="text-[10px] text-emerald-600 font-mono">
                              ({data.codingAnalytics.verdictPercentages.accepted}%)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                        <span className="text-[10px] text-rose-800 font-medium block">Wrong Answer</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-base font-bold text-rose-700 font-mono">
                            {data.codingAnalytics.verdictDistribution.wrongAnswer}
                          </span>
                          {data.codingAnalytics.verdictPercentages && (
                            <span className="text-[10px] text-rose-600 font-mono">
                              ({data.codingAnalytics.verdictPercentages.wrongAnswer}%)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                        <span className="text-[10px] text-amber-800 font-medium block">Compilation Error</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-base font-bold text-amber-700 font-mono">
                            {data.codingAnalytics.verdictDistribution.compilationError}
                          </span>
                          {data.codingAnalytics.verdictPercentages && (
                            <span className="text-[10px] text-amber-600 font-mono">
                              ({data.codingAnalytics.verdictPercentages.compilationError}%)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-200">
                        <span className="text-[10px] text-orange-800 font-medium block">Runtime Error</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-base font-bold text-orange-700 font-mono">
                            {data.codingAnalytics.verdictDistribution.runtimeError}
                          </span>
                          {data.codingAnalytics.verdictPercentages && (
                            <span className="text-[10px] text-orange-600 font-mono">
                              ({data.codingAnalytics.verdictPercentages.runtimeError}%)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                        <span className="text-[10px] text-blue-800 font-medium block">Time Limit Exceeded</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-base font-bold text-blue-700 font-mono">
                            {data.codingAnalytics.verdictDistribution.timeLimitExceeded}
                          </span>
                          {data.codingAnalytics.verdictPercentages && (
                            <span className="text-[10px] text-blue-600 font-mono">
                              ({data.codingAnalytics.verdictPercentages.timeLimitExceeded}%)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-medium block">Test Case Pass Rate</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-base font-bold text-slate-900 font-mono">
                            {data.codingAnalytics.testsPassedCount}/{data.codingAnalytics.totalTestsCount}
                          </span>
                          {data.codingAnalytics.testPassRate !== null && (
                            <span className="text-[10px] text-blue-600 font-mono font-semibold">
                              ({data.codingAnalytics.testPassRate}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No coding execution data recorded for this filter.
                  </div>
                )}
              </div>
            </div>

            {/* ── Row 4: Student Performance Roster Table ───────────────────── */}
            <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    Student Performance Roster
                  </h3>
                  <p className="text-xs text-slate-500">
                    Individual score breakdowns across Aptitude, Coding, HR rounds and Overall evaluation.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search candidate name, email, dept..."
                    className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {filteredStudentRoster.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 text-left uppercase text-[11px] font-mono font-semibold">
                        <th className="py-3 px-3">Candidate Name</th>
                        <th className="py-3 px-3">Department & Batch</th>
                        <th className="py-3 px-3 text-center">Assessments</th>
                        <th className="py-3 px-3 text-center">Aptitude</th>
                        <th className="py-3 px-3 text-center">Coding</th>
                        <th className="py-3 px-3 text-center">HR</th>
                        <th className="py-3 px-3 text-center">Overall</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudentRoster.map((st) => (
                        <tr key={st.studentId} className="hover:bg-slate-50/70 transition-colors h-[54px]">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900 text-[13px] sm:text-[14px]">{st.name}</div>
                            <div className="text-[12px] text-slate-500 font-mono">{st.email}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-slate-800 text-[13px]">{st.department}</div>
                            <div className="text-[12px] text-slate-500">{st.batch} Batch</div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-800 font-semibold text-[13px]">
                            {st.assessmentsCount}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-[13px]">
                            {st.scores.aptitude !== null ? (
                              <span className="text-purple-600 font-semibold">{st.scores.aptitude}%</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-[13px]">
                            {st.scores.coding !== null ? (
                              <span className="text-blue-600 font-semibold">{st.scores.coding}%</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-[13px]">
                            {st.scores.hr !== null ? (
                              <span className="text-pink-600 font-semibold">{st.scores.hr}%</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-[13px]">
                            {st.scores.overall !== null ? (
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[12px] ${
                                  st.scores.overall >= 70
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : st.scores.overall >= 50
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {st.scores.overall}%
                              </span>
                            ) : (
                              <span className="text-slate-400">Not Evaluated</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono uppercase ${
                                st.status === 'NEEDS_ATTENTION'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : st.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {st.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/faculty/students/${st.studentId}`)}
                              className="border-slate-200 hover:bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 rounded-lg h-8 px-3"
                            >
                              View Profile
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-slate-400">
                  No students matched the filter criteria.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
  );
};


