import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Search,
  RefreshCw,
  FileText,
  CheckCircle2,
  Calendar,
  Clock,
  Award,
  Brain,
  Code2,
  MessageSquare,
  Eye,
  X,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { useFacultyReports, useFacultyReportDetail } from '../../api/faculty';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';

export const AdminReports: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedScoreFilter, setSelectedScoreFilter] = useState<string>('ALL');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Score Min/Max mapping
  let scoreMin: number | undefined;
  let scoreMax: number | undefined;
  if (selectedScoreFilter === '90+') scoreMin = 90;
  else if (selectedScoreFilter === '75-89') { scoreMin = 75; scoreMax = 89; }
  else if (selectedScoreFilter === '50-74') { scoreMin = 50; scoreMax = 74; }
  else if (selectedScoreFilter === 'below50') { scoreMax = 49; }

  const { data, isLoading, isError, error, refetch, isFetching } = useFacultyReports({
    search: searchTerm.trim() || undefined,
    interviewType: selectedType !== 'ALL' ? selectedType : undefined,
    scoreMin,
    scoreMax,
  });

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedType('ALL');
    setSelectedScoreFilter('ALL');
  };

  const totalReportsCount = data?.totalCount || 0;
  const reportsList = data?.reports || [];
  const topTierCount = reportsList.filter((r) => (r.scores.overall ?? 0) >= 90).length;
  const proficientCount = reportsList.filter((r) => (r.scores.overall ?? 0) >= 70 && (r.scores.overall ?? 0) < 90).length;
  const needsReviewCount = reportsList.filter((r) => (r.scores.overall ?? 0) < 50 && r.scores.overall !== null).length;

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto w-full pb-16 min-w-0">
      {/* ── 1. Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Assessment Reports
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-mono">
              {totalReportsCount} Verified Reports
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Search, review, and inspect finalized candidate assessment reports with full round evidence and transcripts.
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

      {/* ── 2. Top Summary KPI Cards (4 Cards) ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Evaluated */}
        <Card className="p-4 sm:p-5 bg-white border border-slate-200/80 shadow-2xs rounded-xl flex flex-col justify-between hover:border-slate-300 transition-all min-h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Reports</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{totalReportsCount}</span>
            <span className="text-[12px] text-slate-500 block mt-0.5">Authoritative session reports</span>
          </div>
        </Card>

        {/* Top Tier (90%+) */}
        <Card className="p-4 sm:p-5 bg-white border border-slate-200/80 shadow-2xs rounded-xl flex flex-col justify-between hover:border-slate-300 transition-all min-h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Tier (90%+)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight">{topTierCount}</span>
            <span className="text-[12px] text-slate-500 block mt-0.5">Exceptional candidate mastery</span>
          </div>
        </Card>

        {/* Proficient (70-89%) */}
        <Card className="p-4 sm:p-5 bg-white border border-slate-200/80 shadow-2xs rounded-xl flex flex-col justify-between hover:border-slate-300 transition-all min-h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Proficient (70–89%)</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-teal-600 tracking-tight">{proficientCount}</span>
            <span className="text-[12px] text-slate-500 block mt-0.5">Solid technical competencies</span>
          </div>
        </Card>

        {/* Needs Improvement (<50%) */}
        <Card className="p-4 sm:p-5 bg-white border border-slate-200/80 shadow-2xs rounded-xl flex flex-col justify-between hover:border-slate-300 transition-all min-h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Needs Attention (&lt;50%)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-amber-600 tracking-tight">{needsReviewCount}</span>
            <span className="text-[12px] text-slate-500 block mt-0.5">Recommended for coaching</span>
          </div>
        </Card>
      </div>

      {/* ── 3. Filters & Search Toolbar ────────────────────────────────────── */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-xl w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(300px,2fr)_180px_200px] gap-3 w-full">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name, email, department, assessment title..."
              className="w-full h-10 pl-9 pr-3 text-[13px] bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
            >
              <option value="ALL">Type: All Types</option>
              <option value="MOCK">Mock Interview</option>
              <option value="PRACTICE">Practice</option>
              <option value="ASSESSMENT">Assessment</option>
            </select>
          </div>

          {/* Score Range Filter */}
          <div>
            <select
              value={selectedScoreFilter}
              onChange={(e) => setSelectedScoreFilter(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
            >
              <option value="ALL">Score: All Scores</option>
              <option value="90+">Top Tier (90% – 100%)</option>
              <option value="75-89">Proficient (75% – 89%)</option>
              <option value="50-74">Passing (50% – 74%)</option>
              <option value="below50">Needs Improvement (&lt; 50%)</option>
            </select>
          </div>
        </div>

        {(searchTerm.trim() || selectedType !== 'ALL' || selectedScoreFilter !== 'ALL') && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Filters active on reports archive</span>
            <button onClick={handleResetFilters} className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer">
              Reset Filters
            </button>
          </div>
        )}
      </Card>

      {/* ── 4. Loading / Error State ───────────────────────────────────────── */}
      {isLoading && (
        <Card className="p-6 space-y-3 bg-white border border-slate-200 rounded-xl">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </Card>
      )}

      {isError && (
        <div className="p-8 text-center space-y-3 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertTriangle className="h-6 w-6 text-rose-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-900">Failed to load reports archive</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {(error as any)?.message || 'An unexpected error occurred while connecting to the reports engine.'}
          </p>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-2 text-xs">
            Try Again
          </Button>
        </div>
      )}

      {/* ── 5. Reports Table ──────────────────────────────────────────────── */}
      {!isLoading && !isError && data && (
        <Card className="overflow-hidden border border-slate-200 bg-white shadow-2xs rounded-xl w-full">
          {reportsList.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse table-fixed min-w-[960px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase text-[11px] sm:text-[12px] tracking-wider font-mono">
                    <th className="py-3.5 px-4 font-semibold w-[26%]">Candidate</th>
                    <th className="py-3.5 px-4 font-semibold w-[24%]">Assessment Title</th>
                    <th className="py-3.5 px-4 font-semibold w-[14%]">Date & Duration</th>
                    <th className="py-3.5 px-4 font-semibold w-[8%] text-center">Aptitude</th>
                    <th className="py-3.5 px-4 font-semibold w-[8%] text-center">Coding</th>
                    <th className="py-3.5 px-4 font-semibold w-[8%] text-center">HR</th>
                    <th className="py-3.5 px-4 font-semibold w-[12%] text-center">Overall Score</th>
                    <th className="py-3.5 px-4 font-semibold w-[10%] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportsList.map((rep) => {
                    const initials = rep.student?.fullName
                      ? rep.student.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                      : 'ST';

                    return (
                      <tr key={rep.id} className="hover:bg-slate-50/70 transition-colors h-[64px]">
                        {/* Candidate */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate text-[13px] sm:text-[14px]">
                                {rep.student.fullName}
                              </div>
                              <div className="text-[12px] text-slate-500 truncate font-mono">
                                {rep.student.email}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {rep.student.department} • {rep.student.batch}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Title */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 truncate text-[13px]">
                            {rep.title}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {rep.interviewType}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate">
                              {rep.templateName}
                            </span>
                          </div>
                        </td>

                        {/* Date & Duration */}
                        <td className="py-3 px-4 text-slate-500">
                          <div className="text-slate-800 text-[12px] font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {new Date(rep.completedAt).toLocaleDateString()}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {rep.duration} mins
                          </div>
                        </td>

                        {/* Aptitude */}
                        <td className="py-3 px-4 text-center font-mono text-[13px]">
                          {rep.scores.aptitude !== null ? (
                            <span className="text-purple-600 font-bold">{rep.scores.aptitude}%</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Coding */}
                        <td className="py-3 px-4 text-center font-mono text-[13px]">
                          {rep.scores.coding !== null ? (
                            <span className="text-teal-600 font-bold">{rep.scores.coding}%</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* HR */}
                        <td className="py-3 px-4 text-center font-mono text-[13px]">
                          {rep.scores.hr !== null ? (
                            <span className="text-pink-600 font-bold">{rep.scores.hr}%</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Overall Score */}
                        <td className="py-3 px-4 text-center font-mono">
                          {rep.scores.overall !== null ? (
                            <span
                              className={`px-2.5 py-1 rounded font-bold text-[12px] inline-block ${
                                rep.scores.overall >= 70
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : rep.scores.overall >= 50
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {rep.scores.overall}%
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">Evaluating</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReportId(rep.id)}
                            className="border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-blue-600 rounded-lg h-8 px-2.5 ml-auto flex items-center gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Report</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <FileText className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs sm:text-sm font-semibold text-slate-800">No Completed Reports Found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No student assessment sessions matching your search or filters have been completed yet.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* ── 6. Report Detail Modal ────────────────────────────────────────── */}
      {selectedReportId && (
        <AdminReportDetailModal
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
        />
      )}
    </div>
  );
};

/**
 * Full Evidence-Based Report Viewer Modal for Admin Panel
 */
const AdminReportDetailModal: React.FC<{ reportId: string; onClose: () => void }> = ({ reportId, onClose }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'aptitude' | 'coding' | 'hr' | 'recommendations'>('overview');
  const { data, isLoading, isError, error } = useFacultyReportDetail(reportId);

  const report = data?.report;
  const student = data?.student;

  const rawMonitoring = report?.monitoring || data?.monitoring;
  const monitoringEvents = rawMonitoring?.events || [];
  const monitoringTotalSwitches = typeof rawMonitoring?.totalSwitches === 'number'
    ? rawMonitoring.totalSwitches
    : typeof rawMonitoring?.tabSwitches === 'number'
    ? rawMonitoring.tabSwitches
    : monitoringEvents.length;
  const monitoringTotalAwaySeconds = typeof rawMonitoring?.totalAwaySeconds === 'number'
    ? rawMonitoring.totalAwaySeconds
    : typeof rawMonitoring?.totalTimeAwaySeconds === 'number'
    ? rawMonitoring.totalTimeAwaySeconds
    : monitoringEvents.reduce((sum: number, ev: any) => sum + (ev.durationSeconds || 0), 0);
  const monitoringStatus = rawMonitoring?.status || rawMonitoring?.monitoringStatus || (
    monitoringTotalSwitches > 2 || monitoringTotalAwaySeconds > 30 ? 'Review Recommended' : 'Integrity Verified'
  );

  const monitoring = {
    status: monitoringStatus,
    totalSwitches: monitoringTotalSwitches,
    totalAwaySeconds: monitoringTotalAwaySeconds,
    tabSwitches: monitoringTotalSwitches,
    totalTimeAwaySeconds: monitoringTotalAwaySeconds,
    events: monitoringEvents,
    explanation: rawMonitoring?.explanation || (
      monitoringTotalSwitches === 0 ? 'Assessment completed with continuous focus.' : `${monitoringTotalSwitches} visibility events recorded.`
    ),
  };
  const completionReason =
    data?.completionReason ||
    report?.completionDetails?.completionReason ||
    report?.completionReason ||
    'Manually Submitted';

  const aptQuestions = report?.aptitudeAnalysis || report?.stages?.aptitude?.questions || [];
  const codProblems = report?.codingAnalysis || report?.coding?.problems || [];
  const hrDialogue = report?.hrAnalysis?.transcript || report?.stages?.hr?.transcript || [];
  const strengths = report?.strengths || report?.recommendations?.strengths || [];
  const areasToImprove = report?.areasToImprove || report?.recommendations?.improvements || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 border border-blue-200 text-blue-700 uppercase font-mono">
                {data?.interviewType || 'MOCK'} ASSESSMENT REPORT
              </span>
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase font-mono">
                VERIFIED SNAPSHOT
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">{data?.title || 'Assessment Report'}</h2>
            <p className="text-xs text-slate-500">
              Candidate: <strong className="text-slate-800">{student?.fullName}</strong> ({student?.email}) • {student?.department}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 border-b border-slate-200 bg-white flex items-center gap-2 overflow-x-auto text-xs sm:text-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            Executive Overview
          </button>
          <button
            onClick={() => setActiveTab('aptitude')}
            className={`py-3 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'aptitude'
                ? 'border-purple-600 text-purple-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Brain className="h-3.5 w-3.5" />
            Aptitude Review ({aptQuestions.length})
          </button>
          <button
            onClick={() => setActiveTab('coding')}
            className={`py-3 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'coding'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            Coding Deep-Dive
          </button>
          <button
            onClick={() => setActiveTab('hr')}
            className={`py-3 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'hr'
                ? 'border-pink-600 text-pink-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            HR Transcript
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`py-3 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'recommendations'
                ? 'border-emerald-600 text-emerald-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Strengths & Improvements
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs sm:text-sm">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-32 rounded-xl bg-slate-100" />
              <Skeleton className="h-48 rounded-xl bg-slate-100" />
            </div>
          )}

          {isError && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700">
              Failed to load report snapshot: {(error as any)?.message}
            </div>
          )}

          {!isLoading && report && (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Readiness Banner */}
                  <div className="p-5 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                        Industry Readiness Score
                      </span>
                      <div className="text-3xl font-extrabold text-blue-600 font-mono">
                        {report.overallScore ?? report.metrics?.overallProficiencyScore ?? 0}%
                      </div>
                      <p className="text-xs text-slate-500">
                        Comprehensive evaluation composite computed across verified execution evidence.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Aptitude</span>
                        <span className="text-base font-bold text-purple-600 font-mono">
                          {report.scores?.aptitude ?? report.summary?.aptitudeScore ?? '—'}%
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Coding</span>
                        <span className="text-base font-bold text-teal-600 font-mono">
                          {report.scores?.coding ?? report.summary?.codingScore ?? '—'}%
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">HR Dialogue</span>
                        <span className="text-base font-bold text-pink-600 font-mono">
                          {report.scores?.hr ?? report.summary?.hrScore ?? '—'}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Evidence Highlights */}
                  {report.summaryHighlights && (
                    <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200 space-y-2">
                      <h4 className="font-semibold text-slate-900">Assessment Evidence Summary</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                        <div>
                          <strong className="text-slate-800 block">Aptitude:</strong>
                          {report.summaryHighlights.aptitudeAccuracy || 'Recorded choices analyzed'}
                        </div>
                        <div>
                          <strong className="text-slate-800 block">Coding:</strong>
                          {report.summaryHighlights.codingSuccess || 'Submissions & tests verified'}
                        </div>
                        <div>
                          <strong className="text-slate-800 block">Behavioral:</strong>
                          {report.summaryHighlights.hrExcellence || 'Dialogue recorded'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Assessment Integrity & Monitoring */}
                  <div className="p-5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${
                          monitoring?.status === 'Review Recommended'
                            ? 'bg-amber-50 border-amber-200 text-amber-600'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                        }`}>
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                              Assessment Integrity & Monitoring
                            </h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                              Monitoring Active
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Integrity monitoring tracks window focus to ensure a fair assessment environment. Tab switches do not penalize test scores.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 ${
                          monitoring?.status === 'Review Recommended'
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            monitoring?.status === 'Review Recommended' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          {monitoring?.status || 'Integrity Verified'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border bg-slate-50 border-slate-200 text-slate-600">
                          {completionReason}
                        </span>
                      </div>
                    </div>

                    {monitoringEvents.length > 0 ? (
                      <div className="space-y-2">
                        <span className="text-[11px] text-slate-500 font-semibold block">Visibility Change Events Log ({monitoringEvents.length})</span>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {monitoringEvents.map((evt: any, i: number) => (
                            <div key={i} className="p-2 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between">
                              <span className="font-medium text-slate-800">Event #{i + 1}</span>
                              <span className="text-slate-500">
                                {evt.durationSeconds ? `${evt.durationSeconds}s away` : 'Focus changed'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span>Integrity monitoring detected no window visibility changes. Assessment was completed in continuous focus.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: APTITUDE REVIEW */}
              {activeTab === 'aptitude' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                    <span className="font-semibold text-slate-900">Questions & Candidate Answers</span>
                    <span className="text-slate-500">Total: {aptQuestions.length} Questions</span>
                  </div>

                  {aptQuestions.length > 0 ? (
                    <div className="space-y-4">
                      {aptQuestions.map((q: any, idx: number) => {
                        const isCorrect = q.isCorrect === true || q.passed === true || q.status === 'CORRECT';
                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl border space-y-3 ${
                              isCorrect ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 font-mono">Q{idx + 1}.</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-medium">
                                  {q.topic || q.category || 'Quantitative'}
                                </span>
                              </div>
                              <span
                                className={`px-2.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                                  isCorrect
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                              >
                                {isCorrect ? 'CORRECT (+1)' : 'INCORRECT (0)'}
                              </span>
                            </div>

                            <p className="text-slate-900 text-xs sm:text-sm font-medium leading-relaxed">
                              {q.questionText || q.question}
                            </p>

                            {/* Options */}
                            {Array.isArray(q.options) && q.options.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {q.options.map((opt: string, optIdx: number) => {
                                  const optLabel = String.fromCharCode(65 + optIdx);
                                  const isSelected = q.candidateAnswer === optLabel || q.userSelectedOption === optLabel || q.selectedAnswer === optLabel || q.candidateAnswer === opt;
                                  const isActualCorrect = q.correctAnswer === optLabel || q.correctOption === optLabel || q.correctAnswer === opt;

                                  return (
                                    <div
                                      key={optIdx}
                                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                                        isActualCorrect
                                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                                          : isSelected
                                          ? 'bg-rose-50 border-rose-300 text-rose-800 font-medium'
                                          : 'bg-white border-slate-200 text-slate-600'
                                      }`}
                                    >
                                      <span>
                                        <strong className="mr-1.5 font-mono">{optLabel}.</strong>
                                        {opt}
                                      </span>
                                      {isActualCorrect && <span className="text-[10px] text-emerald-700 font-mono">✓ Correct</span>}
                                      {isSelected && !isActualCorrect && <span className="text-[10px] text-rose-700 font-mono">✗ Chosen</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {q.explanation && (
                              <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 space-y-1">
                                <strong className="text-slate-800 block">Explanation & Method:</strong>
                                <p>{q.explanation}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400">
                      No aptitude questions data in snapshot.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CODING DEEP-DIVE */}
              {activeTab === 'coding' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                    <span className="font-semibold text-slate-900">Submitted Code & Execution Evidence</span>
                    <span className="text-slate-500">Historical Submissions (Judge0 Evidence)</span>
                  </div>

                  {(codProblems.length > 0 ? codProblems : (report?.stages?.coding?.questions || [])).length > 0 ? (
                    <div className="space-y-4">
                      {(codProblems.length > 0 ? codProblems : (report?.stages?.coding?.questions || [])).map((prob: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 font-mono">Problem {idx + 1}:</span>
                              <span className="text-slate-800 font-medium">{prob.title || 'Coding Problem'}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                                {prob.difficulty || 'MEDIUM'}
                              </span>
                            </div>
                            <span
                              className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                                prob.status === 'PASSED' || prob.accepted
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {prob.status || (prob.accepted ? 'ACCEPTED' : 'ATTEMPTED')}
                            </span>
                          </div>

                          {prob.submittedCode && (
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-500 uppercase font-mono">
                                Submitted Source Code ({prob.language || 'Code'}):
                              </span>
                              <pre className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-64">
                                {prob.submittedCode}
                              </pre>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                            <span>Tests Passed: <strong className="text-slate-800 font-mono">{prob.testsPassed ?? prob.passedCount ?? '—'} / {prob.totalTests ?? prob.totalCount ?? '—'}</strong></span>
                            <span>Attempts: <strong className="text-slate-800 font-mono">{prob.attemptCount ?? 1}</strong></span>
                            {prob.executionTime && <span>Time: <strong className="text-slate-800 font-mono">{prob.executionTime}s</strong></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400">
                      No code submissions recorded for this assessment.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: HR TRANSCRIPT */}
              {activeTab === 'hr' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                    <span className="font-semibold text-slate-900">Chronological Behavioral Dialogue</span>
                    <span className="text-slate-500">Interview Transcript</span>
                  </div>

                  {hrDialogue.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {hrDialogue.map((msg: any, idx: number) => {
                        const isAi = msg.role === 'interviewer' || msg.role === 'assistant' || msg.sender === 'AI';
                        return (
                          <div
                            key={idx}
                            className={`p-3.5 rounded-xl border flex flex-col gap-1 ${
                              isAi
                                ? 'bg-slate-50/80 border-slate-200 mr-8'
                                : 'bg-blue-50/70 border-blue-200 ml-8'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                              <span className={isAi ? 'text-purple-600 font-semibold' : 'text-blue-600 font-semibold'}>
                                {isAi ? 'AI Interviewer' : `${student?.fullName || 'Candidate'}`}
                              </span>
                              {msg.timestamp && <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>}
                            </div>
                            <p className="text-slate-800 text-xs sm:text-sm leading-relaxed">{msg.content || msg.message}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400">
                      Evidence unavailable
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: AI STRENGTHS & RECOMMENDATIONS */}
              {activeTab === 'recommendations' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs sm:text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Key Candidate Strengths
                      </div>
                      {strengths.length > 0 ? (
                        <ul className="space-y-2 text-xs text-slate-700">
                          {strengths.map((str: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-600 font-bold">•</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-500">Solid baseline proficiency across core modules.</p>
                      )}
                    </div>

                    {/* Areas for Improvement */}
                    <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
                      <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs sm:text-sm">
                        <Sparkles className="h-4 w-4 text-amber-600" />
                        Targeted Growth Areas
                      </div>
                      {areasToImprove.length > 0 ? (
                        <ul className="space-y-2 text-xs text-slate-700">
                          {areasToImprove.map((imp: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-amber-600 font-bold">•</span>
                              <span>{imp}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-500">Continue targeted practice on edge case algorithmic optimization.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              navigate(`/admin/interviews/summary/${data?.interviewId || reportId}`);
            }}
            className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer rounded-lg h-9 px-3.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            Open Full Interactive Report & AI Chat
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer rounded-lg h-9 px-4"
          >
            Close Report
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
