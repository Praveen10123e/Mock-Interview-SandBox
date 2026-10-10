import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Brain,
  Code2,
  MessageSquare,
  Eye,
  Search,
  Dices,
  Hand,
  Layers,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import type { FacultyStudentInterviewSummary } from '../../../api/faculty';
import { FacultySessionDetailModal } from './FacultySessionDetailModal';

interface StudentInterviewHistoryViewProps {
  summary: FacultyStudentInterviewSummary;
  onBack: () => void;
}

export const StudentInterviewHistoryView: React.FC<StudentInterviewHistoryViewProps> = ({
  summary,
  onBack,
}) => {
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'PRACTICE' | 'MOCK' | 'COMPLETED' | 'IN_PROGRESS'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const student = summary.student;
  const sessions = summary.sessions;

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Tab filter
      if (selectedTab === 'PRACTICE' && s.template.id) return false;
      if (selectedTab === 'MOCK' && !s.template.id) return false;
      if (selectedTab === 'COMPLETED' && s.overallStatus !== 'COMPLETED' && s.overallStatus !== 'EVALUATED') return false;
      if (selectedTab === 'IN_PROGRESS' && s.overallStatus !== 'IN_PROGRESS') return false;

      // Keyword search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchTitle = s.template.name.toLowerCase().includes(q);
        const matchStatus = s.overallStatus.toLowerCase().includes(q);
        return matchTitle || matchStatus;
      }
      return true;
    });
  }, [sessions, selectedTab, search]);

  const practiceCount = sessions.filter((s) => !s.template.id).length;
  const mockCount = sessions.filter((s) => !!s.template.id).length;
  const completedCount = summary.completedSessions;
  const inProgressCount = summary.inProgressSessions;

  const handleOpenDetail = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setIsDetailOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* ── 1. Navigation Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="gap-2 text-[13px] font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="h-4 w-4 text-blue-600" />
          Back to All Students
        </Button>

        <span className="text-[12px] text-slate-500 font-mono">
          Student ID: <strong className="text-slate-800">{student.rollNumber || student.identityId.substring(0, 8)}</strong>
        </span>
      </div>

      {/* ── 2. Student Hero Profile Banner ────────────────────────────────── */}
      <Card className="p-5 sm:p-6 bg-white border border-slate-200/80 shadow-2xs rounded-xl overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 font-bold text-lg flex items-center justify-center shrink-0 shadow-2xs">
              {getInitials(student.fullName)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {student.fullName}
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase font-mono">
                  Active Student
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">{student.email}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap pt-0.5">
                <span>{student.department}</span>
                <span>•</span>
                <span>{student.college}</span>
                <span>•</span>
                <span className="font-mono">{student.batch}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip inside Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-[90px]">
              <div className="text-lg font-bold font-mono text-slate-900">{summary.totalSessions}</div>
              <div className="text-[11px] text-slate-500 font-medium">Total Sessions</div>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-center min-w-[90px]">
              <div className="text-lg font-bold font-mono text-blue-700">{summary.inProgressSessions}</div>
              <div className="text-[11px] text-blue-600 font-medium">In Progress</div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center min-w-[90px]">
              <div className="text-lg font-bold font-mono text-emerald-700">{summary.completedSessions}</div>
              <div className="text-[11px] text-emerald-600 font-medium">Completed</div>
            </div>

            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-center min-w-[90px]">
              <div className="text-lg font-bold font-mono text-purple-700 truncate">
                {summary.averageScore !== null ? `${summary.averageScore}%` : summary.averageScoreDisplay}
              </div>
              <div className="text-[11px] text-purple-600 font-medium">Average Score</div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 3. Filters & Tabs ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto text-xs">
          <button
            onClick={() => setSelectedTab('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap text-xs ${
              selectedTab === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Sessions ({sessions.length})
          </button>
          <button
            onClick={() => setSelectedTab('PRACTICE')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap text-xs ${
              selectedTab === 'PRACTICE'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Practice ({practiceCount})
          </button>
          <button
            onClick={() => setSelectedTab('MOCK')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap text-xs ${
              selectedTab === 'MOCK'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mock Tests ({mockCount})
          </button>
          <button
            onClick={() => setSelectedTab('IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap text-xs ${
              selectedTab === 'IN_PROGRESS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            onClick={() => setSelectedTab('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap text-xs ${
              selectedTab === 'COMPLETED'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Search within student's sessions */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-[13px] border-slate-200 bg-white"
          />
        </div>
      </div>

      {/* ── 4. Chronological Session History List ─────────────────────────── */}
      <div className="space-y-3">
        {filteredSessions.length > 0 ? (
          filteredSessions.map((session, index) => (
            <Card
              key={session.id}
              className="p-4 sm:p-5 bg-white border border-slate-200/80 hover:border-blue-300 transition-all shadow-2xs rounded-xl cursor-pointer group"
              onClick={() => handleOpenDetail(session.id)}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Session Title & Metadata */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
                      Attempt #{sessions.length - index}
                    </span>

                    <span className="px-2.5 py-0.5 text-[11px] sm:text-[12px] font-semibold rounded-md bg-blue-50 border border-blue-200 text-blue-700 uppercase font-mono">
                      {session.template.interviewType || 'PRACTICE'}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 text-[11px] sm:text-[12px] font-semibold rounded-md uppercase font-mono border ${
                        session.overallStatus === 'EVALUATED'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : session.overallStatus === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : session.overallStatus === 'IN_PROGRESS'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {session.overallStatus}
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      {session.template.selectionMode === 'RANDOM' ? (
                        <Dices className="h-3.5 w-3.5 text-blue-600" />
                      ) : (
                        <Hand className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      {session.template.selectionMode}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {session.template.name}
                  </h3>

                  <div className="flex items-center gap-3 text-[12px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(session.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* 3-Stage Progress Strip */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0 py-2 sm:py-0 border-t lg:border-t-0 border-slate-100">
                  {/* Stage 1: Aptitude */}
                  <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100 min-w-[110px]">
                    <span className="text-[11px] font-semibold text-blue-700 flex items-center gap-1 mb-0.5">
                      <Brain className="h-3.5 w-3.5" /> Stage 1
                    </span>
                    <div className="text-[13px] font-mono font-bold text-slate-900">
                      {session.stages.aptitude.correctCount !== undefined && session.stages.aptitude.correctCount !== null
                        ? `${session.stages.aptitude.correctCount} / ${session.stages.aptitude.totalQuestions} Correct`
                        : session.stages.aptitude.score !== null
                        ? `${session.stages.aptitude.score}%`
                        : `${session.stages.aptitude.totalQuestions} Qs`}
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">
                      {session.stages.aptitude.status}
                    </span>
                  </div>

                  {/* Stage 2: Coding */}
                  <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 min-w-[110px]">
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 mb-0.5">
                      <Code2 className="h-3.5 w-3.5" /> Stage 2
                    </span>
                    <div className="text-[13px] font-mono font-bold text-slate-900">
                      {session.stages.coding.passedProblems} / {session.stages.coding.totalProblems} Solved
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {session.stages.coding.totalSubmissions} attempts
                    </span>
                  </div>

                  {/* Stage 3: HR */}
                  <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 min-w-[110px]">
                    <span className="text-[11px] font-semibold text-purple-700 flex items-center gap-1 mb-0.5">
                      <MessageSquare className="h-3.5 w-3.5" /> Stage 3
                    </span>
                    <div className="text-[13px] font-semibold text-slate-900 truncate">
                      Conversational
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">
                      {session.stages.hr.status}
                    </span>
                  </div>
                </div>

                {/* Score & View Details Action */}
                <div className="flex items-center justify-between lg:flex-col lg:items-end gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block font-mono">Overall Result</span>
                    <div className="text-sm font-bold font-mono text-blue-700">
                      {session.scoreDisplay}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[13px] gap-1.5 border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-blue-50 cursor-pointer shadow-2xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDetail(session.id);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-10 text-center bg-white border border-slate-200 space-y-2 rounded-xl text-slate-500">
            <Layers className="h-8 w-8 mx-auto text-slate-300" />
            <h4 className="text-sm font-bold text-slate-900">No sessions match your filter</h4>
            <p className="text-xs">Try selecting a different tab or clearing your search filter.</p>
          </Card>
        )}
      </div>

      {/* ── 5. Session Detail Modal ───────────────────────────────────────── */}
      <FacultySessionDetailModal
        sessionId={selectedSessionId}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedSessionId(null);
        }}
      />
    </div>
  );
};

export default StudentInterviewHistoryView;
