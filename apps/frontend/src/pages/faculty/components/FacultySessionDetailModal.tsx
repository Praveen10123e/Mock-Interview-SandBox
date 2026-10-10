import React, { useState } from 'react';
import {
  X,
  User,
  Award,
  CheckCircle2,
  AlertCircle,
  Brain,
  Code2,
  MessageSquare,
  Terminal,
  Activity,
  Layers,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { useFacultySessionDetail } from '../../../api/faculty';
import type { FacultySubmissionItem } from '../../../api/faculty';
import { SubmissionDetailModal } from './SubmissionDetailModal';

interface FacultySessionDetailModalProps {
  sessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FacultySessionDetailModal: React.FC<FacultySessionDetailModalProps> = ({
  sessionId,
  isOpen,
  onClose,
}) => {
  const [selectedSubmission, setSelectedSubmission] = useState<FacultySubmissionItem | null>(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const { data: session, isLoading, isError, error, refetch } = useFacultySessionDetail(
    sessionId || undefined
  );

  if (!isOpen || !sessionId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-accent/15 border border-accent/30 text-accent uppercase font-mono">
                {session?.template.interviewType || 'MOCK INTERVIEW'}
              </span>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${
                  session?.state === 'COMPLETED'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : session?.state === 'RUNNING'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {session?.state || 'LOADING'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-text-primary truncate">
              {session?.template.name || 'Assessment Session Details'}
            </h2>
            <p className="text-xs text-text-secondary">
              Session ID: <span className="font-mono">{sessionId}</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-lg shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Body Content ─────────────────────────────────────────────────── */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6 text-xs text-text-primary">
          {isLoading && (
            <div className="space-y-4 py-8">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-36 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          )}

          {isError && (
            <div className="p-8 text-center space-y-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
              <AlertCircle className="h-6 w-6 text-rose-400 mx-auto" />
              <h3 className="text-sm font-semibold text-text-primary">Failed to load session details</h3>
              <p className="text-xs text-text-secondary max-w-md mx-auto">
                {(error as any)?.response?.data?.error?.message || (error as any)?.message}
              </p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-2">
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !isError && session && (
            <>
              {/* 1. Student Information Card */}
              <div className="p-4 rounded-xl border border-border bg-surface-elevated/40 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-text-secondary uppercase tracking-wider">
                  <User className="h-4 w-4 text-accent" />
                  Student Information
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-text-muted block text-[11px]">Full Name</span>
                    <span className="font-bold text-text-primary text-sm">{session.student.fullName}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px]">Email Address</span>
                    <span className="font-mono text-text-primary truncate block">{session.student.email}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px]">Department / College</span>
                    <span className="font-semibold text-text-primary truncate block">
                      {session.student.department} ({session.student.college})
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[11px]">Batch / Roll No</span>
                    <span className="font-semibold text-text-primary">
                      {session.student.batch} • {session.student.rollNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Assessment Progress Stages */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-text-secondary uppercase tracking-wider">
                  <Layers className="h-4 w-4 text-accent" />
                  3-Stage Assessment Progress
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Stage 1: Aptitude */}
                  <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-blue-400">
                        <Brain className="h-4 w-4" />
                        Stage 1: Aptitude
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {session.progress.aptitude.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Total Questions:</span>
                        <span className="font-mono font-bold text-text-primary">
                          {session.progress.aptitude.totalQuestions}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Aptitude Correct:</span>
                        <span className="font-mono font-bold text-blue-400">
                          {session.progress.aptitude.correctCount !== undefined && session.progress.aptitude.correctCount !== null
                            ? `${session.progress.aptitude.correctCount} / ${session.progress.aptitude.totalQuestions} (${session.progress.aptitude.score ?? Math.round((session.progress.aptitude.correctCount / session.progress.aptitude.totalQuestions) * 100)}%)`
                            : session.progress.aptitude.score !== null
                            ? `${session.progress.aptitude.score}%`
                            : 'Pending'}
                        </span>
                      </div>
                    </div>

                    {session.progress.aptitude.questions.length > 0 && (
                      <div className="pt-2 border-t border-blue-500/20 space-y-1">
                        <span className="text-[10px] text-text-muted block font-semibold">Assigned Questions:</span>
                        <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                          {session.progress.aptitude.questions.map((q) => (
                            <div key={q.questionId} className="text-[10px] text-text-secondary truncate flex items-center gap-1">
                              <span className="font-mono text-accent">#{q.order}</span> {q.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stage 2: Coding */}
                  <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                        <Code2 className="h-4 w-4" />
                        Stage 2: Coding
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {session.progress.coding.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Total Problems:</span>
                        <span className="font-mono font-bold text-text-primary">
                          {session.progress.coding.totalProblems}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Passed Problems:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {session.progress.coding.passedProblems} / {session.progress.coding.totalProblems}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Submissions:</span>
                        <span className="font-mono font-bold text-text-primary">
                          {session.progress.coding.submissions.length} attempts
                        </span>
                      </div>
                    </div>

                    {session.progress.coding.problems.length > 0 && (
                      <div className="pt-2 border-t border-emerald-500/20 space-y-1">
                        <span className="text-[10px] text-text-muted block font-semibold">Assigned Problems:</span>
                        <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                          {session.progress.coding.problems.map((p) => (
                            <div key={p.questionId} className="text-[10px] text-text-secondary truncate flex items-center gap-1">
                              <span className="font-mono text-emerald-400">#{p.order}</span> {p.title} ({p.difficulty})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stage 3: HR Interview */}
                  <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-purple-400">
                        <MessageSquare className="h-4 w-4" />
                        Stage 3: HR Interview
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {session.progress.hr.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Mode:</span>
                        <span className="font-semibold text-text-primary">{session.progress.hr.mode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">HR Score:</span>
                        <span className="font-mono font-bold text-purple-400">
                          {session.progress.hr.score !== null ? `${session.progress.hr.score}%` : 'Conversational Evaluation'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-purple-500/20 space-y-1 text-[11px]">
                      <span className="text-[10px] text-text-muted block font-semibold">Initial Scenario / Prompt:</span>
                      <p className="text-[10px] text-text-secondary leading-relaxed line-clamp-3">
                        {session.progress.hr.prompt}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Coding Submissions Roster */}
              {session.progress.coding.submissions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs text-text-secondary uppercase tracking-wider">
                      <Terminal className="h-4 w-4 text-emerald-400" />
                      Code Execution & Submission History ({session.progress.coding.submissions.length})
                    </div>
                    <span className="text-[10px] text-text-muted">
                      Click any row to inspect submitted source code and runtime logs
                    </span>
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden bg-surface-elevated/30">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border bg-surface-elevated/60 text-text-muted text-[10px] uppercase font-mono">
                          <th className="py-2.5 px-3">Problem</th>
                          <th className="py-2.5 px-3">Language</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Test Cases Passed</th>
                          <th className="py-2.5 px-3">Execution Time</th>
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                        {session.progress.coding.submissions.map((sub) => (
                          <tr
                            key={sub.id}
                            className="hover:bg-surface-elevated/60 transition-colors cursor-pointer group"
                            onClick={() => {
                              setSelectedSubmission(sub);
                              setIsSubModalOpen(true);
                            }}
                          >
                            <td className="py-2.5 px-3 text-text-primary font-sans font-semibold truncate max-w-[180px]">
                              {sub.questionTitle}
                            </td>
                            <td className="py-2.5 px-3 text-text-secondary uppercase text-[10px]">
                              {sub.language}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  sub.runMode === 'SUBMIT'
                                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                }`}
                              >
                                {sub.runMode}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  sub.status === 'ACCEPTED' || sub.status === 'PASSED' || sub.status === 'RUN_PASSED'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : sub.status === 'COMPILATION_ERROR' || sub.primaryErrorType === 'COMPILATION_ERROR'
                                    ? 'bg-amber-500/10 text-amber-400'
                                    : 'bg-rose-500/10 text-rose-400'
                                }`}
                              >
                                {sub.statusDescription || sub.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-text-primary font-bold">
                              {sub.passedCount} / {sub.totalCount}
                            </td>
                            <td className="py-2.5 px-3 text-text-muted">{sub.executionTime}s</td>
                            <td className="py-2.5 px-3 text-text-muted text-[10px]">
                              {new Date(sub.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px] px-2 py-0 gap-1 text-accent border-accent/30 hover:bg-accent/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSubmission(sub);
                                  setIsSubModalOpen(true);
                                }}
                              >
                                <Code2 className="h-3 w-3" />
                                View Code
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. Overall Evaluation & Final Result */}
              <div className="p-4 rounded-xl border border-border bg-surface-elevated/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-text-secondary uppercase tracking-wider">
                    <Award className="h-4 w-4 text-accent" />
                    Overall Performance Evaluation
                  </div>
                  <span className="text-xs font-semibold text-accent">
                    {session.evaluation.statusMessage}
                  </span>
                </div>

                {session.evaluation.hasEvaluationData && session.evaluation.overallScore !== null ? (
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-accent/10 border border-accent/20">
                      <div className="text-3xl font-extrabold font-mono text-accent">
                        {session.evaluation.overallScore}%
                      </div>
                      <div className="text-xs text-text-secondary leading-relaxed">
                        Composite performance across quantitative problem solving, live compiler code execution, and conversational HR behavioral evaluation.
                      </div>
                    </div>

                    {/* Strengths & Areas to Improve */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {session.evaluation.strengths?.length > 0 && (
                        <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
                          <span className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
                          </span>
                          <ul className="list-disc pl-4 text-[11px] text-text-secondary space-y-0.5">
                            {session.evaluation.strengths.map((s: string, idx: number) => (
                              <li key={idx}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {session.evaluation.areasToImprove?.length > 0 && (
                        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1.5">
                          <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5" /> Areas to Improve
                          </span>
                          <ul className="list-disc pl-4 text-[11px] text-text-secondary space-y-0.5">
                            {session.evaluation.areasToImprove.map((a: string, idx: number) => (
                              <li key={idx}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-border text-center space-y-1 text-text-muted">
                    <Activity className="h-6 w-6 mx-auto opacity-40" />
                    <p className="font-semibold text-xs text-text-secondary">{session.evaluation.statusMessage}</p>
                    <p className="text-[11px]">Comprehensive score will be calculated once candidate completes all stages.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            Read-only candidate assessment evaluation view.
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg h-9 px-4">
            Close
          </Button>
        </div>
      </div>

      {/* ── Individual Submission Details Modal ────────────────────────────── */}
      <SubmissionDetailModal
        submission={selectedSubmission}
        isOpen={isSubModalOpen}
        onClose={() => {
          setIsSubModalOpen(false);
          setSelectedSubmission(null);
        }}
      />
    </div>
  );
};

export default FacultySessionDetailModal;
