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
import { Skeleton } from '../../components/ui/skeleton';

export const FacultyReports: React.FC = () => {
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

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 min-w-0">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                Assessment Reports Archive
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-semibold font-mono">
                  Verified Snapshots
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Search, review and inspect finalized candidate assessment reports with full round evidence and transcripts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-slate-200 hover:bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="border-slate-200 hover:bg-slate-100 text-xs sm:text-sm font-semibold text-slate-600 flex items-center gap-1.5 h-9"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </Button>
        </div>
      </div>

      {/* ── Search & Filter Toolbar ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, email, department, assessment title..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <label className="text-slate-500 font-medium">Type:</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
            >
              <option value="ALL">All Types</option>
              <option value="MOCK">Mock Interview</option>
              <option value="PRACTICE">Practice</option>
              <option value="ASSESSMENT">Assessment</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-slate-500 font-medium">Score Range:</label>
            <select
              value={selectedScoreFilter}
              onChange={(e) => setSelectedScoreFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
            >
              <option value="ALL">All Scores</option>
              <option value="90+">Top Tier (90% - 100%)</option>
              <option value="75-89">Proficient (75% - 89%)</option>
              <option value="50-74">Passing (50% - 74%)</option>
              <option value="below50">Needs Improvement (&lt; 50%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Summary Count Badge ────────────────────────────────────────────── */}
      {!isLoading && data && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            Showing <strong className="text-slate-800 font-mono font-semibold">{data.totalCount}</strong> completed reports
            {data.unfilteredCount !== data.totalCount && ` (filtered from ${data.unfilteredCount})`}
          </span>
        </div>
      )}

      {/* ── Loading / Error State ─────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl bg-slate-100 border border-slate-200" />
          ))}
        </div>
      )}

      {isError && (
        <div className="p-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
          <div>
            <p className="font-semibold">Failed to load reports archive</p>
            <p className="text-xs text-rose-600 mt-0.5">{(error as any)?.message || 'An unexpected error occurred.'}</p>
          </div>
        </div>
      )}

      {/* ── Reports List Table ────────────────────────────────────────────── */}
      {!isLoading && data && (
        <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl overflow-hidden">
          {data.reports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 text-left uppercase text-[11px] font-mono font-semibold">
                    <th className="py-3.5 px-4">Candidate</th>
                    <th className="py-3.5 px-4">Assessment Title</th>
                    <th className="py-3.5 px-4">Date & Duration</th>
                    <th className="py-3.5 px-4 text-center">Aptitude</th>
                    <th className="py-3.5 px-4 text-center">Coding</th>
                    <th className="py-3.5 px-4 text-center">HR</th>
                    <th className="py-3.5 px-4 text-center">Overall Score</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.reports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50/70 transition-colors h-[58px]">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-[13px] sm:text-[14px]">{rep.student.fullName}</div>
                        <div className="text-[12px] text-slate-500 font-mono">{rep.student.email}</div>
                        <div className="text-[11px] text-slate-400">{rep.student.department} • {rep.student.batch}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 text-[13px] sm:text-[14px]">{rep.title}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono font-semibold">
                            {rep.interviewType}
                          </span>
                          <span className="text-[12px] text-slate-500">
                            {rep.templateName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <div className="text-slate-800 text-[13px] flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {new Date(rep.completedAt).toLocaleDateString()}
                        </div>
                        <div className="text-[12px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {rep.duration} mins
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-[13px]">
                        {rep.scores.aptitude !== null ? (
                          <span className="text-purple-600 font-semibold">{rep.scores.aptitude}%</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-[13px]">
                        {rep.scores.coding !== null ? (
                          <span className="text-blue-600 font-semibold">{rep.scores.coding}%</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-[13px]">
                        {rep.scores.hr !== null ? (
                          <span className="text-pink-600 font-semibold">{rep.scores.hr}%</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-[13px]">
                        {rep.scores.overall !== null ? (
                          <span
                            className={`px-2.5 py-1 rounded font-bold text-[12px] ${
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
                          <span className="text-slate-400">Evaluating</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedReportId(rep.id)}
                          className="border-slate-200 hover:bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 rounded-lg h-8 px-3 ml-auto flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Report
                        </Button>
                      </td>
                    </tr>
                  ))}
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
        </div>
      )}

      {/* ── Report Detail Modal ────────────────────────────────────────────── */}
      {selectedReportId && (
        <ReportDetailModal
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
        />
      )}
    </div>
  );
};

/**
 * Full Evidence-Based Report Viewer Modal
 */
const ReportDetailModal: React.FC<{ reportId: string; onClose: () => void }> = ({ reportId, onClose }) => {
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
        {/* ── Modal Header ─────────────────────────────────────────────────── */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 border border-blue-200 text-blue-700 uppercase font-mono">
                {data?.interviewType || 'MOCK'} ASSESSMENT REPORT
              </span>
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase font-mono">
                FINALIZED SNAPSHOT
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

        {/* ── Tab Navigation ────────────────────────────────────────────────── */}
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

        {/* ── Modal Body Content ────────────────────────────────────────────── */}
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
                        <span className="text-base font-bold text-blue-600 font-mono">
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
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                          completionReason?.includes('Expired')
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-blue-50 border-blue-200 text-blue-700'
                        }`}>
                          {completionReason}
                        </span>
                      </div>
                    </div>

                    {/* Metric Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-semibold">Integrity Status</span>
                        <span className={`text-xs font-bold ${
                          monitoring?.status === 'Review Recommended' ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {monitoring?.status || 'Integrity Verified'}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-semibold">Tab Switches Detected</span>
                        <span className="text-xs font-bold font-mono text-slate-900">
                          {monitoring?.totalSwitches ?? 0}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-semibold">Time Outside Assessment</span>
                        <span className="text-xs font-bold font-mono text-slate-900">
                          {monitoring?.totalAwaySeconds ?? 0}s
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-semibold">Submission Reason</span>
                        <span className="text-xs font-semibold text-slate-900 truncate block" title={completionReason}>
                          {completionReason}
                        </span>
                      </div>
                    </div>

                    {/* Timeline of events */}
                    {monitoring?.events && monitoring.events.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-semibold text-slate-500 block">
                          Chronological Window Visibility Events ({monitoring.events.length})
                        </span>
                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                          {monitoring.events.map((evt: any, idx: number) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2.5">
                                <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-mono text-[9px]">
                                  {idx + 1}
                                </span>
                                <div>
                                  <span className="text-slate-500">
                                    Left: <strong className="text-slate-800 font-mono">{evt.leftAt ? new Date(evt.leftAt).toLocaleTimeString() : 'Unknown'}</strong>
                                  </span>
                                  <span className="mx-1.5 text-slate-400">→</span>
                                  <span className="text-slate-500">
                                    Returned: <strong className="text-slate-800 font-mono">{evt.returnedAt ? new Date(evt.returnedAt).toLocaleTimeString() : 'Concluded'}</strong>
                                  </span>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-mono text-[10px] font-semibold">
                                {evt.durationSeconds ?? 0}s away
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
                    <span className="text-slate-500">
                      Total: {aptQuestions.length} Questions
                    </span>
                  </div>

                  {aptQuestions.length > 0 ? (
                    <div className="space-y-4">
                      {aptQuestions.map((q: any, idx: number) => {
                        const isCorrect = q.isCorrect === true || q.passed === true || q.status === 'CORRECT';
                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl border space-y-3 ${
                              isCorrect
                                ? 'bg-emerald-50/40 border-emerald-200'
                                : 'bg-rose-50/40 border-rose-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 font-mono">Q{idx + 1}.</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-medium">
                                  {q.topic || q.category || 'Quantitative'}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-medium">
                                  {q.difficulty || 'MEDIUM'}
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

                            {/* Explanation */}
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
                    <span className="font-semibold text-slate-900">Submitted Code & Compiler Executions</span>
                    <span className="text-slate-500">Protected Judge0 Evidence</span>
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
                      No HR conversation transcript in snapshot.
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

        {/* ── Modal Footer ─────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              navigate(`/faculty/interviews/summary/${data?.interviewId || reportId}`);
            }}
            className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer rounded-lg h-9 px-3.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            Open Full Interactive Report & AI Chat
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer rounded-lg h-9 px-4">
            Close Report
          </Button>
        </div>
      </div>
    </div>
  );
};
