import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import {
  useFacultyStudentSummaries,
} from '../../api/faculty';
import type { FacultyStudentInterviewSummary } from '../../api/faculty';
import { StudentInterviewHistoryView } from './components/StudentInterviewHistoryView';

export const FacultyInterviews: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedStudentSummary, setSelectedStudentSummary] = useState<FacultyStudentInterviewSummary | null>(null);

  // Fetch hierarchical student summaries (each unique student appears exactly once)
  const {
    data: studentSummaries = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useFacultyStudentSummaries({
    search: search.trim() || undefined,
  });

  // Filter students locally if needed
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return studentSummaries;
    const q = search.trim().toLowerCase();
    return studentSummaries.filter(
      (s) =>
        s.student.fullName.toLowerCase().includes(q) ||
        s.student.email.toLowerCase().includes(q) ||
        (s.student.rollNumber && s.student.rollNumber.toLowerCase().includes(q)) ||
        (s.student.department && s.student.department.toLowerCase().includes(q))
    );
  }, [studentSummaries, search]);

  // Overall platform statistics
  const totalStudents = studentSummaries.length;
  const totalSessions = studentSummaries.reduce((acc, s) => acc + s.totalSessions, 0);
  const totalInProgress = studentSummaries.reduce((acc, s) => acc + s.inProgressSessions, 0);
  const totalCompleted = studentSummaries.reduce((acc, s) => acc + s.completedSessions, 0);

  // If a student is currently selected, show their full history view
  if (selectedStudentSummary) {
    // Keep reference updated if query refetched
    const currentSummary =
      studentSummaries.find(
        (s) => s.student.identityId === selectedStudentSummary.student.identityId || s.student.email === selectedStudentSummary.student.email
      ) || selectedStudentSummary;

    return (
      <div className="w-full max-w-none pb-12">
        <StudentInterviewHistoryView
          summary={currentSummary}
          onBack={() => setSelectedStudentSummary(null)}
        />
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 min-w-0">
      {/* ── 1. Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Candidate Assessments
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 border border-blue-200 text-blue-700 uppercase font-mono">
              Student Overview
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Student-level interview monitoring. Click any student to review their complete chronological assessment history.
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
            Refresh
          </Button>
        </div>
      </div>

      {/* ── 2. KPI Metrics Strip ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">{totalStudents}</div>
            <div className="text-[12px] text-slate-500 font-medium">Assessed Students</div>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">{totalSessions}</div>
            <div className="text-[12px] text-slate-500 font-medium">Total Sessions</div>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-blue-600 tracking-tight">{totalInProgress}</div>
            <div className="text-[12px] text-slate-500 font-medium">In Progress</div>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-600 tracking-tight">{totalCompleted}</div>
            <div className="text-[12px] text-slate-500 font-medium">Completed</div>
          </div>
        </Card>
      </div>

      {/* ── 3. Search & Filter Bar ────────────────────────────────────────── */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-xl">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by student name, email, roll number, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-[13px] border-slate-200 bg-white"
          />
        </div>
      </Card>

      {/* ── 4. Loading State ──────────────────────────────────────────────── */}
      {isLoading && (
        <Card className="p-6 space-y-4 bg-white border border-slate-200 rounded-xl">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </Card>
      )}

      {/* ── 5. Error State ────────────────────────────────────────────────── */}
      {isError && (
        <div className="p-8 text-center space-y-3 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle className="h-6 w-6 text-rose-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-900">Failed to load student assessments</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {(error as any)?.response?.data?.error?.message || (error as any)?.message}
          </p>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-2">
            Try Again
          </Button>
        </div>
      )}

      {/* ── 6. Student Roster Table (One Row Per Unique Student) ───────────── */}
      {!isLoading && !isError && (
        <>
          {filteredStudents.length > 0 ? (
            <Card className="overflow-hidden border border-slate-200 bg-white shadow-2xs rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase text-[11px] sm:text-[12px] tracking-wider font-mono">
                      <th className="py-3.5 px-4 font-semibold">Student</th>
                      <th className="py-3.5 px-4 font-semibold">Department & Batch</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Total Sessions</th>
                      <th className="py-3.5 px-4 font-semibold text-center">In Progress</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Completed</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Average Score</th>
                      <th className="py-3.5 px-4 font-semibold">Latest Activity</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((summary) => (
                      <tr
                        key={summary.student.identityId || summary.student.email}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group h-[58px]"
                        onClick={() => setSelectedStudentSummary(summary)}
                      >
                        {/* Student Details & Initials */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {getInitials(summary.student.fullName)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors text-[14px]">
                                {summary.student.fullName}
                              </div>
                              <div className="text-[12px] text-slate-500 font-mono truncate">
                                {summary.student.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Department & Batch */}
                        <td className="py-3.5 px-4">
                          <div className="text-[13px] font-medium text-slate-700">
                            {summary.student.department || 'Computer Science & Engineering'}
                          </div>
                          <div className="text-[12px] text-slate-500 font-mono">
                            {summary.student.batch || '2024-2028'} • {summary.student.college || 'Engineering Institute'}
                          </div>
                        </td>

                        {/* Total Sessions */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-bold text-[13px] text-slate-900 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                            {summary.totalSessions}
                          </span>
                        </td>

                        {/* In Progress */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-bold text-[12px] text-blue-700 px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200">
                            {summary.inProgressSessions}
                          </span>
                        </td>

                        {/* Completed */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-bold text-[12px] text-emerald-700 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                            {summary.completedSessions}
                          </span>
                        </td>

                        {/* Average Score */}
                        <td className="py-3.5 px-4 text-center">
                          {summary.averageScore !== null ? (
                            <span className="font-mono font-bold text-[12px] text-blue-700 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200">
                              {summary.averageScore}%
                            </span>
                          ) : (
                            <span className="text-[12px] text-slate-400 font-normal">
                              {summary.averageScoreDisplay}
                            </span>
                          )}
                        </td>

                        {/* Latest Activity */}
                        <td className="py-3.5 px-4 text-[12px] text-slate-500 font-mono whitespace-nowrap">
                          {summary.latestSessionAt ? (
                            new Date(summary.latestSessionAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          ) : (
                            'No sessions'
                          )}
                        </td>

                        {/* View History Button */}
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-[13px] gap-1.5 border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-blue-50 cursor-pointer shadow-2xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudentSummary(summary);
                            }}
                          >
                            <span>View History</span>
                            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center bg-white border border-slate-200 rounded-xl">
              <div className="space-y-4 max-w-sm mx-auto">
                <Users className="h-10 w-10 text-slate-300 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">No student assessments found</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Student interview sessions and practice attempts will appear here automatically as candidates participate.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default FacultyInterviews;
