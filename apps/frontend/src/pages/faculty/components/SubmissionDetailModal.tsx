import React, { useState } from 'react';
import {
  X,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  FileCode,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Play,
  Send,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { formatExampleText } from '../../../utils/formatExampleText';
import type { FacultySubmissionItem } from '../../../api/faculty';

interface SubmissionDetailModalProps {
  submission: FacultySubmissionItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({
  submission,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'result' | 'testcases'>('code');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !submission) return null;

  const handleCopyCode = () => {
    if (submission.sourceCode) {
      navigator.clipboard.writeText(submission.sourceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isPassed =
    submission.status === 'ACCEPTED' ||
    submission.status === 'PASSED' ||
    submission.status === 'RUN_PASSED';

  const isCompileError =
    submission.primaryErrorType === 'COMPILATION_ERROR' ||
    submission.status === 'COMPILATION_ERROR' ||
    !!submission.compileOutput;

  const isTimeout =
    submission.primaryErrorType === 'TIME_LIMIT_EXCEEDED' ||
    submission.status === 'TIME_LIMIT_EXCEEDED';

  const isMemoryLimit =
    submission.primaryErrorType === 'MEMORY_LIMIT_EXCEEDED' ||
    submission.status === 'MEMORY_LIMIT_EXCEEDED';

  const testCases = submission.testCaseResults || [];

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* ── Modal Header ─────────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Badge: RUN vs SUBMIT */}
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase font-mono flex items-center gap-1 ${
                  submission.runMode === 'SUBMIT'
                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                }`}
              >
                {submission.runMode === 'SUBMIT' ? <Send className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {submission.runMode === 'SUBMIT' ? 'Official Submission' : 'Code Run (Test)'}
              </span>

              {/* Status Badge */}
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase font-mono ${
                  isPassed
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : isCompileError
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {submission.statusDescription || submission.status}
              </span>

              {/* Language Badge */}
              <span className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-surface border border-border text-text-secondary uppercase">
                {submission.language}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-text-primary truncate">
              {submission.questionTitle}
            </h2>
            <div className="flex items-center gap-3 text-[11px] text-text-muted flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(submission.timestamp).toLocaleString()}
              </span>
              <span>•</span>
              <span>
                Time: <strong className="font-mono text-text-secondary">{submission.executionTime}s</strong>
              </span>
              {submission.memory !== undefined && submission.memory > 0 && (
                <>
                  <span>•</span>
                  <span>
                    Memory: <strong className="font-mono text-text-secondary">{submission.memory} KB</strong>
                  </span>
                </>
              )}
              <span>•</span>
              <span>
                Test Cases:{' '}
                <strong className={isPassed ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                  {submission.passedCount} / {submission.totalCount} Passed
                </strong>
              </span>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-lg shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Navigation Tabs ───────────────────────────────────────────────── */}
        <div className="flex border-b border-border bg-surface-elevated/40 px-4">
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'code'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            Student Submitted Code
          </button>
          <button
            onClick={() => setActiveTab('result')}
            className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'result'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            Execution Result
            {!isPassed && <span className="h-2 w-2 rounded-full bg-rose-500 inline-block"></span>}
          </button>
          <button
            onClick={() => setActiveTab('testcases')}
            className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'testcases'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Test Cases ({submission.passedCount}/{submission.totalCount})
          </button>
        </div>

        {/* ── Tab Contents ──────────────────────────────────────────────────── */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* TAB 1: CODE */}
          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-[11px] font-semibold">
                  Exact code executed by student ({submission.sourceCode?.length || 0} characters)
                </span>
                {submission.sourceCode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                    className="h-7 text-[11px] gap-1 px-2.5 cursor-pointer"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy Code'}
                  </Button>
                )}
              </div>

              {submission.sourceCode ? (
                <div className="relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden font-mono text-[11px]">
                  <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-100 border-b border-slate-200 text-slate-600 text-[10px]">
                    <span>source_code.{submission.language.toLowerCase() === 'python' ? 'py' : submission.language.toLowerCase() === 'java' ? 'java' : submission.language.toLowerCase() === 'cpp' ? 'cpp' : 'js'}</span>
                    <span className="uppercase">{submission.language}</span>
                  </div>
                  <pre className="p-4 text-slate-800 overflow-x-auto leading-relaxed whitespace-pre font-mono selection:bg-accent/30 max-h-[420px]">
                    <code>{submission.sourceCode}</code>
                  </pre>
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-border rounded-xl bg-surface-elevated/20 text-text-muted space-y-1.5">
                  <FileCode className="h-8 w-8 mx-auto opacity-40" />
                  <p className="font-semibold text-text-secondary">Source code is not available for this historical execution.</p>
                  <p className="text-[11px]">All future runs and submissions persist exact source code.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXECUTION RESULT */}
          {activeTab === 'result' && (
            <div className="space-y-4">
              {/* Status Overview Card */}
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  isPassed
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : isCompileError
                    ? 'bg-amber-500/10 border-amber-500/20'
                    : 'bg-rose-500/10 border-rose-500/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isPassed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-rose-400" />
                    )}
                    <div>
                      <h3 className="font-bold text-sm text-text-primary">
                        {submission.statusDescription || submission.status}
                      </h3>
                      <p className="text-[11px] text-text-muted">
                        {isPassed
                          ? 'Execution completed successfully and passed all test cases.'
                          : isCompileError
                          ? 'Compilation failed during build.'
                          : isTimeout
                          ? 'Execution exceeded maximum allowed time limit.'
                          : isMemoryLimit
                          ? 'Execution exceeded memory allocation limit.'
                          : 'Execution failed or produced wrong output on test cases.'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-lg font-bold text-text-primary">
                      {submission.passedCount}/{submission.totalCount}
                    </span>
                    <span className="text-[10px] text-text-muted block">Test Cases</span>
                  </div>
                </div>
              </div>

              {/* Compilation Error Output */}
              {submission.compileOutput && (
                <div className="space-y-1.5">
                  <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Compilation Error:
                  </span>
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-[#16130d] font-mono text-[11px] text-amber-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {submission.compileOutput}
                  </div>
                </div>
              )}

              {/* Runtime Stderr Error Output */}
              {submission.stderr && (
                <div className="space-y-1.5">
                  <span className="font-bold text-rose-400 text-xs flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5" />
                    Runtime Error / Traceback:
                  </span>
                  <div className="p-3.5 rounded-xl border border-rose-500/30 bg-[#1a0f12] font-mono text-[11px] text-rose-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {submission.stderr}
                  </div>
                </div>
              )}

              {/* Program stdout */}
              {submission.stdout && (
                <div className="space-y-1.5">
                  <span className="font-bold text-text-secondary text-xs flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5" />
                    Standard Output (stdout):
                  </span>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-[11px] text-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {submission.stdout}
                  </div>
                </div>
              )}

              {!submission.compileOutput && !submission.stderr && !submission.stdout && (
                <div className="p-6 text-center border border-dashed border-border rounded-xl bg-surface-elevated/20 text-text-muted">
                  <p className="font-semibold text-text-secondary">
                    {isPassed ? 'Clean execution without error logs.' : 'No detailed error information was recorded.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TEST CASES */}
          {activeTab === 'testcases' && (
            <div className="space-y-3">
              {testCases.length > 0 ? (
                <div className="space-y-2.5">
                  {testCases.map((tc, idx) => (
                    <div
                      key={tc.id || idx}
                      className={`p-3.5 rounded-xl border transition-colors ${
                        tc.passed
                          ? 'bg-surface-elevated/40 border-border'
                          : 'bg-rose-500/5 border-rose-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {tc.passed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-rose-400" />
                          )}
                          <span className="font-bold text-xs text-text-primary">
                            Test Case #{tc.order || idx + 1}
                          </span>
                          {tc.hidden && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-surface border border-border text-text-muted">
                              Hidden Test Case
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                            tc.passed
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {tc.status}
                        </span>
                      </div>

                      {/* Inputs & Outputs Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono pt-1">
                        <div className="p-2 rounded-lg bg-surface border border-border/60">
                          <span className="text-text-muted block text-[10px] font-sans font-semibold mb-0.5">
                            Input:
                          </span>
                          <pre className="text-text-primary whitespace-pre-wrap font-mono text-[11px] leading-relaxed break-all m-0">
                            {formatExampleText(tc.input) || '<Empty>'}
                          </pre>
                        </div>

                        <div className="p-2 rounded-lg bg-surface border border-border/60">
                          <span className="text-text-muted block text-[10px] font-sans font-semibold mb-0.5">
                            Expected Output:
                          </span>
                          <pre className="text-emerald-400 whitespace-pre-wrap font-mono text-[11px] leading-relaxed break-all m-0">
                            {formatExampleText(tc.expectedOutput) || '<Empty>'}
                          </pre>
                        </div>

                        <div className="p-2 rounded-lg bg-surface border border-border/60">
                          <span className="text-text-muted block text-[10px] font-sans font-semibold mb-0.5">
                            Student Output:
                          </span>
                          <pre className={`${tc.passed ? 'text-emerald-400' : 'text-rose-400'} whitespace-pre-wrap font-mono text-[11px] leading-relaxed break-all m-0`}>
                            {formatExampleText(tc.studentOutput) || '<No output>'}
                          </pre>
                        </div>
                      </div>

                      {tc.errorMessage && (
                        <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-[10px]">
                          {tc.errorMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-border rounded-xl bg-surface-elevated/20 text-text-muted space-y-1">
                  <Layers className="h-8 w-8 mx-auto opacity-40" />
                  <p className="font-semibold text-text-secondary">No individual test case breakdown recorded for this attempt.</p>
                  <p className="text-[11px]">Passed: {submission.passedCount} / {submission.totalCount}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Modal Footer ─────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs">
          <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            Protected Faculty Execution Inspector
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg h-9 px-4">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetailModal;
