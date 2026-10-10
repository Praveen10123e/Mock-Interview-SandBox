import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2, Lock, Clock, AlertCircle, AlertTriangle, ChevronLeft, ChevronRight,
  RotateCcw, Shield, XCircle, Loader2, Maximize2
} from 'lucide-react';
import { ReportWorkspace } from '../components/ReportWorkspace';
import { isBrowserFullscreen, requestAssessmentFullscreen, exitAssessmentFullscreen } from '../utils/fullscreen';

import api from '../../../api/axios/instance';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { normalizeInterviewQuestion } from '../../../utils/normalizeQuestion';
import { CodingRound } from '../components/CodingRound';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { useAuthStore } from '../../../store/AuthStore';
import { useProfile } from '../../../hooks/useProfile';

// ── New HR Interview Module ──────────────────────────────────
import { HREntryCard } from '../components/hr/HREntryCard';
import { HRInterviewRoom } from '../components/hr/HRInterviewRoom';
import { HRCompletionScreen } from '../components/hr/HRCompletionScreen';
import { HRInterviewAPI } from '../services/hrInterview.service';
import type { HRQuestion } from '../services/hrInterview.service';


// ============================================================
// TYPES
// ============================================================

type RoundStatus = 'LOCKED' | 'ACTIVE' | 'COMPLETED';

interface RoundState {
  aptitude: RoundStatus;
  coding: RoundStatus;
  hr: RoundStatus;
  report: RoundStatus;
}

interface AptitudeTelemetry {
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number;
  completed: boolean;
  answers?: Record<string, number>;
}

interface CodingTelemetry {
  question1Completed: boolean;
  question2Completed: boolean;
  executions: number;
  completed: boolean;
  results: { q1: string | null; q2: string | null };
}

interface HRTelemetry {
  transcript: string;
  followUps: number;
  completed: boolean;
}

interface SessionTelemetry {
  aptitude: AptitudeTelemetry;
  coding: CodingTelemetry;
  hr: HRTelemetry;
}

const initialTelemetry: SessionTelemetry = {
  aptitude: { total: 0, correct: 0, incorrect: 0, unanswered: 0, score: 0, completed: false },
  coding: { question1Completed: false, question2Completed: false, executions: 0, completed: false, results: { q1: null, q2: null } },
  hr: { transcript: '', followUps: 0, completed: false },
};

// ============================================================
// UTILITY
// ============================================================

const formatTime = (seconds: number): string => {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
};

const difficultyClass = (d?: string) => {
  const norm = (d || '').toUpperCase();
  if (norm === 'EASY') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (norm === 'MEDIUM') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
};

// ============================================================
// HEADER COMPONENT
// ============================================================

// ============================================================
// HEADER COMPONENT
// ============================================================

const InterviewHeader = ({
  sessionId: _sessionId,
  timeLeft,
  roundState,
  activeRound,
  tabSwitchesCount,
  onLockedClick,
  onFinish,
  isSubmitting,
  isTimeExpired,
  userName,
}: {
  sessionId: string;
  timeLeft: number;
  roundState: RoundState;
  activeRound: 'aptitude' | 'coding' | 'hr' | 'report';
  tabSwitchesCount: number;
  onLockedClick: () => void;
  onFinish: () => void;
  isSubmitting: boolean;
  isTimeExpired: boolean;
  userName?: string;
}) => {
  const rounds = [
    { key: 'aptitude', label: '1 Aptitude' },
    { key: 'coding', label: '2 Coding' },
    { key: 'hr', label: '3 HR Interview' },
    { key: 'report', label: '4 Review' },
  ] as const;

  const isLow = timeLeft < 300;
  const displayName = userName || 'Candidate';
  const initialLetter = displayName.charAt(0).toUpperCase() || 'C';

  return (
    <header className="h-14 border-b border-[#E2E8F0] bg-white flex items-center justify-between px-4 sm:px-6 shrink-0 z-20 shadow-2xs">
      {/* Left: NM Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded-md bg-[#111827] flex items-center justify-center text-white font-bold text-xs shadow-xs tracking-wider select-none">
          NM
        </div>
        <div className="flex flex-col">
          <div className="font-bold text-xs sm:text-sm text-[#0F172A] leading-tight">NM Interview</div>
          <div className="text-[10px] text-[#64748B] font-medium leading-none mt-0.5">Mock • Practice • Improvement</div>
        </div>
      </div>

      {/* Center: Compact Assessment Stages */}
      <div className="hidden md:flex items-center gap-1.5">
        {rounds.map((r, i) => {
          const status = roundState[r.key];
          const isCurrent = r.key === activeRound;
          return (
            <React.Fragment key={r.key}>
              <button
                onClick={status === 'LOCKED' ? onLockedClick : undefined}
                disabled={status === 'LOCKED'}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-[#111827] text-white font-semibold shadow-xs'
                    : status === 'COMPLETED'
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/80 font-medium hover:bg-emerald-100/70'
                    : 'text-slate-400 cursor-not-allowed font-normal'
                }`}
              >
                {status === 'COMPLETED' && !isCurrent && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />}
                {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                {status === 'LOCKED' && <Lock className="w-3 h-3 shrink-0 text-slate-400" />}
                <span>{r.label}</span>
              </button>
              {i < rounds.length - 1 && (
                <span className="text-slate-300 text-xs select-none">›</span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Right: Monitoring + Timer + End Interview + Candidate Info */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Monitoring Pill */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors ${
          tabSwitchesCount > 0
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569]'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            tabSwitchesCount > 0 ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
          }`} />
          <span className="font-medium">Monitoring Active</span>
          <span className="text-slate-300">•</span>
          <span>Visibility Events: <strong className={`font-mono font-bold ${
            tabSwitchesCount > 0 ? 'text-amber-900' : 'text-[#0F172A]'
          }`}>{tabSwitchesCount}</strong></span>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold px-2.5 py-1 rounded-md border shadow-2xs ${
          isLow ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' : 'bg-slate-100 text-slate-800 border-slate-200'
        }`}>
          <Clock className="h-3.5 w-3.5 text-slate-600 shrink-0" />
          <span>{formatTime(timeLeft)}</span>
        </div>

        {/* End Interview */}
        {activeRound !== 'report' && (
          <Button
            variant="secondary"
            size="sm"
            className="h-7.5 px-3 text-xs font-semibold rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] hover:text-rose-600 shadow-2xs cursor-pointer"
            onClick={onFinish}
            disabled={isSubmitting || isTimeExpired}
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'End Interview'}
          </Button>
        )}

        {/* Candidate Profile */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#E2E8F0]">
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold ring-1 ring-slate-200 shadow-2xs">
            {initialLetter}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-[#0F172A] leading-tight truncate max-w-[100px]">{displayName}</span>
            <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider">STUDENT</span>
          </div>
        </div>
      </div>
    </header>
  );
};

// ============================================================
// APTITUDE WORKSPACE
// ============================================================

const AptitudeWorkspace = ({
  questions,
  sessionId,
  onComplete,
  telemetry,
  setTelemetry,
}: {
  questions: any[];
  sessionId: string;
  onComplete: (result: AptitudeTelemetry) => void;
  telemetry: AptitudeTelemetry;
  setTelemetry: (t: AptitudeTelemetry) => void;
}) => {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>(() => telemetry.answers || {});
  const total = questions.length;
  const question = questions[index];
  const q = normalizeInterviewQuestion(question);
  const selectedOption = q?.id != null ? answers[q.id] : undefined;

  useEffect(() => {
    if (telemetry.answers && Object.keys(telemetry.answers).length > 0) {
      setAnswers(prev => ({ ...prev, ...telemetry.answers }));
    }
  }, [telemetry.answers]);

  const handleSelect = (optIdx: number) => {
    if (!q?.id) return;
    setAnswers(prev => ({ ...prev, [q.id]: optIdx }));
    if (sessionId) {
      api.post(`/interviews/${sessionId}/aptitude/answer`, {
        questionId: q.id,
        selectedOptionIndex: optIdx,
      }).catch(console.warn);
    }
  };

  const handleSubmit = async () => {
    let correct = 0, incorrect = 0, unanswered = 0;
    questions.forEach(raw => {
      const nq = normalizeInterviewQuestion(raw);
      if (!nq) return;
      const ans = answers[nq.id];
      if (ans === undefined || ans === null) unanswered++;
      else if (ans === nq.correctOptionIndex) correct++;
      else incorrect++;
    });
    const score = Math.round((correct / total) * 100);
    const result: AptitudeTelemetry = { total, correct, incorrect, unanswered, score, completed: true, answers };
    setTelemetry(result);
    onComplete(result);
  };

  if (!q) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Unable to load question data.</p>
        </div>
      </div>
    );
  }

  if (!q.valid) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm">
          <XCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-1 text-slate-900">Question Configuration Error</h3>
          <p className="text-slate-600 text-sm">This question is missing required options. Please contact support.</p>
          <p className="text-slate-400 text-xs mt-2 font-mono">ID: {q.id}</p>
        </div>
      </div>
    );
  }

  const progress = Math.round(((index + 1) / total) * 100);

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
      {/* Subtle assessment progress indicator */}
      <div className="h-0.5 bg-[#E2E8F0] shrink-0 w-full">
        <div
          className="h-full bg-[#111827] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Question Area - Centered workspace */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
        <div className="w-full max-w-[1150px] mx-auto flex flex-col justify-start">
          {/* Question Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-7 shadow-xs">
            {/* Question Header / Meta */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  Aptitude Assessment
                </span>
                <span className="text-slate-300">•</span>
                <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
                  Question {index + 1} <span className="text-[#64748B] font-normal text-sm">of {total}</span>
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {q.difficulty && (
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${difficultyClass(q.difficulty)}`}>
                    {q.difficulty.toUpperCase()}
                  </span>
                )}
                {q.topic && (
                  <span className="text-xs text-[#475569] bg-[#F8FAFC] border border-[#CBD5E1] px-2.5 py-0.5 rounded font-medium">
                    {typeof q.topic === 'string' ? q.topic : (q.topic?.name || 'General')}
                  </span>
                )}
              </div>
            </div>

            {/* Question Title & Description */}
            <div className="mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-[#0F172A] leading-relaxed">
                {q.title}
              </h3>
              {q.description && q.description !== q.title && (
                <div
                  className="mt-2 text-sm sm:text-base text-[#334155] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: q.description.replace(/\n/g, '<br/>') }}
                />
              )}
            </div>

            {/* Multiple-Choice Answer Cards */}
            <div className="space-y-2.5 mb-1" role="radiogroup" aria-label="Answer options">
              {q.options.map((opt: string, i: number) => {
                const isSelected = selectedOption === i;
                const letter = String.fromCharCode(65 + i);
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelect(i)}
                    className={`w-full flex items-center gap-3.5 px-4 py-2.5 sm:py-3 rounded-lg border text-left transition-colors cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] ${
                      isSelected
                        ? 'bg-[#F8FAFC] border-[#111827] ring-1 ring-[#111827] text-[#0F172A]'
                        : 'bg-white border-[#CBD5E1] hover:bg-[#F8FAFC] hover:border-[#94A3B8] text-[#0F172A]'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md border flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#111827] border-[#111827] text-white'
                          : 'bg-white border-[#CBD5E1] text-[#475569] group-hover:border-[#94A3B8] group-hover:text-[#0F172A]'
                      }`}
                    >
                      {letter}
                    </div>
                    <span className={`text-sm sm:text-base flex-1 ${isSelected ? 'font-semibold text-[#0F172A]' : 'font-normal text-[#1E293B]'}`}>
                      {opt}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-[#111827] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls Bar - Directly below Question Card with small spacing */}
          <div className="mt-3.5 sm:mt-4 bg-white border border-[#E2E8F0] rounded-xl px-4 sm:px-6 py-2.5 sm:py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Left: Previous Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIndex(p => Math.max(0, p - 1))}
              disabled={index === 0}
              className="h-9 px-4 text-xs font-semibold rounded-md border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] hover:text-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 mr-1.5" /> Previous
            </Button>

            {/* Center/Left: Question Navigation Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider hidden sm:inline-block mr-1">
                Questions:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {questions.map((raw, i) => {
                  const nq = normalizeInterviewQuestion(raw);
                  const answered = nq?.id != null && answers[nq.id] !== undefined;
                  const isCurrent = i === index;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIndex(i)}
                      aria-label={`Question ${i + 1}`}
                      className={`w-8 h-8 rounded-md text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center ${
                        isCurrent
                          ? 'bg-[#111827] border-[#111827] text-white shadow-xs'
                          : answered
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-semibold'
                          : 'bg-white border-[#CBD5E1] text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] hover:border-[#94A3B8]'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Next or Submit Button */}
            {index < total - 1 ? (
              <Button
                type="button"
                onClick={() => setIndex(p => p + 1)}
                className="h-9 px-6 text-xs font-semibold rounded-md bg-[#111827] hover:bg-[#1F2937] text-white shadow-xs border border-[#111827] cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                className="h-9 px-6 text-xs font-semibold rounded-md bg-[#111827] hover:bg-[#1F2937] text-white shadow-xs border border-[#111827] cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Submit Assessment
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// HR SESSION ORCHESTRATOR
// Stages: entry → room → completion
// ============================================================

type HRStage = 'entry' | 'room' | 'completion';

const HRSessionOrchestrator = ({
  interviewId,
  onComplete,
}: {
  interviewId: string;
  onComplete: (result: HRTelemetry) => void;
}) => {
  const [stage, setStage] = useState<HRStage>('entry');
  const [hrQuestions, setHrQuestions] = useState<HRQuestion[]>([]);
  const videoStream: MediaStream | null = null;
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState('');
  const preloadedQuestionsRef = useRef<HRQuestion[] | null>(null);

  // Preload questions as soon as entry card is displayed
  useEffect(() => {
    let active = true;
    HRInterviewAPI.initSession(interviewId, 'Software Engineer')
      .then((res) => {
        if (!active) return;
        const sessionData = res.data || res;
        const questions: HRQuestion[] = sessionData.questions || [];
        const main = questions.filter((q: HRQuestion) => q.questionType === 'MAIN');
        preloadedQuestionsRef.current = main;
        setHrQuestions(main);
        console.log('[HR-TTS-TRACE] INIT_SESSION_COMPLETED (preloaded):', main.length, 'questions');
      })
      .catch((err) => {
        console.warn('Preloading HR questions caught:', err);
      });
    return () => {
      active = false;
    };
  }, [interviewId]);

  const handleStartAssessment = async () => {
    // If questions are already preloaded, enter the room SYNCHRONOUSLY within the active user gesture!
    if (preloadedQuestionsRef.current && preloadedQuestionsRef.current.length > 0) {
      console.log('[HR-TTS-TRACE] INIT_SESSION_COMPLETED (synchronous transition):', preloadedQuestionsRef.current.length);
      setStage('room');
      // Fire startSession in the background without blocking the UI transition
      HRInterviewAPI.startSession(interviewId).catch(() => {});
      return;
    }

    // Fallback if user clicked before preloading finished
    setIsInitializing(true);
    setInitError('');
    try {
      const res = await HRInterviewAPI.initSession(interviewId, 'Software Engineer');
      const sessionData = res.data || res;
      const questions: HRQuestion[] = sessionData.questions || [];
      const main = questions.filter((q: HRQuestion) => q.questionType === 'MAIN');
      console.log('[Q1-DEBUG] session initialization completed (on-demand):', main.length);
      setHrQuestions(main);
      await HRInterviewAPI.startSession(interviewId).catch(() => {});
      setStage('room');
    } catch (err: any) {
      setInitError('Failed to load interview questions. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  };

  // ── Stage: Entry Card ──────────────────────────────────────
  if (stage === 'entry') {
    return <HREntryCard onStart={handleStartAssessment} />;
  }

  // ── Initializing overlay ───────────────────────────────────
  if (isInitializing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#F8FAFC] text-[#0F172A] p-6">
        <Loader2 className="w-8 h-8 animate-spin text-[#111827]" />
        <p className="text-sm font-semibold">Preparing your interview room…</p>
        <p className="text-xs text-[#64748B]">Configuring AI interviewer and loading behavioral questions</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#F8FAFC] text-[#0F172A] p-6">
        <AlertCircle className="w-8 h-8 text-rose-500" />
        <p className="text-sm font-semibold">{initError}</p>
        <button
          className="h-9 px-4 text-xs font-semibold rounded-md bg-[#111827] text-white hover:bg-[#1F2937] shadow-xs cursor-pointer"
          onClick={handleStartAssessment}
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Stage: Live Interview Room ─────────────────────────────
  if (stage === 'room') {
    return (
      <HRInterviewRoom
        interviewId={interviewId}
        questions={hrQuestions}
        videoStream={videoStream}
        onComplete={async () => {
          try {
            await HRInterviewAPI.completeHR(interviewId);
          } catch (err) {
            console.warn('HR complete API error:', err);
          }
          setStage('completion');
        }}
        onExit={() => setStage('entry')}
      />
    );
  }

  // ── Stage: Completion + AI Evaluation Progress ────────────
  if (stage === 'completion') {
    return (
      <HRCompletionScreen
        interviewId={interviewId}
        onViewReport={() => {
          onComplete({ transcript: '', followUps: 0, completed: true });
        }}
      />
    );
  }

  return null;
};

// ============================================================
// REPORT WORKSPACE
// ============================================================

// Internal ReportWorkspace has been extracted to ../components/ReportWorkspace.tsx

// ============================================================
// LOCKED ROUND TOAST
// ============================================================

const LockedToast = ({ visible, onHide }: { visible: boolean; onHide: () => void }) => {
  useEffect(() => { if (visible) { const t = setTimeout(onHide, 2500); return () => clearTimeout(t); } }, [visible]);
  if (!visible) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-rose-50 border border-rose-200 text-rose-800 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 backdrop-blur">
      <Lock className="w-4 h-4 text-rose-600 shrink-0" />
      Complete the current round first to proceed.
    </div>
  );
};

// ============================================================
// FINISH CONFIRM DIALOG
// ============================================================
const FinishDialog = ({
  open,
  roundState,
  onCancel,
  onConfirm,
  isSubmitting,
}: {
  open: boolean;
  roundState: RoundState;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-lg font-bold mb-1 text-slate-900">Submit Assessment?</h3>
        <p className="text-slate-500 text-xs mb-4 leading-relaxed">
          Are you sure you want to submit your assessment? You will not be able to continue after submission.
        </p>
        <div className="space-y-2 mb-6">
          {[
            { label: 'Aptitude', status: roundState.aptitude },
            { label: 'Coding', status: roundState.coding },
            { label: 'HR Interview', status: roundState.hr },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
              <span className="text-slate-700 font-medium">{r.label}</span>
              <span
                className={
                  r.status === 'COMPLETED'
                    ? 'text-emerald-700 font-semibold'
                    : r.status === 'ACTIVE'
                    ? 'text-[#0F172A] font-bold'
                    : 'text-[#94A3B8]'
                }
              >
                {r.status === 'COMPLETED'
                  ? '✓ Completed'
                  : r.status === 'ACTIVE'
                  ? '● In Progress'
                  : '○ Not Started'}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-[#CBD5E1] text-[#0F172A] hover:bg-[#F8FAFC] text-xs font-semibold"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Continue
          </Button>
          <Button
            className="flex-1 bg-[#111827] hover:bg-[#1F2937] text-white text-xs font-semibold shadow-xs"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN SESSION COMPONENT
// ============================================================

export const InterviewSession = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { data: profile } = useProfile();
  const candidateName = profile?.fullName || user?.name || user?.email?.split('@')[0] || 'Candidate';

  const [timeLeft, setTimeLeft] = useState<number>(3600);
  const [expiresAtTime, setExpiresAtTime] = useState<number | null>(null);
  const [tabSwitchesCount, setTabSwitchesCount] = useState<number>(0);
  const [isTimeExpired, setIsTimeExpired] = useState<boolean>(false);
  const [showAutoSubmitModal, setShowAutoSubmitModal] = useState<boolean>(false);
  const [showTabSwitchAlert, setShowTabSwitchAlert] = useState<boolean>(false);
  const [focusLostToast, setFocusLostToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [showLockedToast, setShowLockedToast] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => isBrowserFullscreen());
  const [fullscreenError, setFullscreenError] = useState<string>('');

  // Round state machine
  const [roundState, setRoundState] = useState<RoundState>({
    aptitude: 'ACTIVE',
    coding: 'LOCKED',
    hr: 'LOCKED',
    report: 'LOCKED',
  });

  const [activeRound, setActiveRound] = useState<'aptitude' | 'coding' | 'hr' | 'report'>('aptitude');

  // Telemetry
  const [telemetry, setTelemetry] = useState<SessionTelemetry>(initialTelemetry);
  const telemetryRef = useRef<SessionTelemetry>(initialTelemetry);
  useEffect(() => {
    telemetryRef.current = telemetry;
  }, [telemetry]);

  const [sessionReport, setSessionReport] = useState<any>(null);

  // 1. Fetch complete session runtime state (Restores active stage on reload/refresh)
  const { data: sessionStateRes, refetch: refetchState } = useQuery({
    queryKey: ['sessionState', id],
    queryFn: async () => {
      const res = await api.get(`/interviews/${id}/state`);
      return res.data?.data;
    },
    enabled: !!id,
    staleTime: 5000,
  });

  // Auto-expire handler (when deadline expires)
  const autoExpiredRef = useRef(false);
  const handleAutoExpire = useCallback(async () => {
    if (autoExpiredRef.current) return;
    autoExpiredRef.current = true;
    setIsTimeExpired(true);
    setTimeLeft(0);
    setShowAutoSubmitModal(true);

    try {
      if (id) {
        const res = await api.post(`/interviews/${id}/finalize`, {
          completionReason: 'TIME_EXPIRED',
          telemetry: telemetryRef.current,
        });
        if (res.data) {
          setSessionReport(res.data);
        }
      }
    } catch (err: any) {
      console.warn('Auto-finalize response:', err);
    }
    await exitAssessmentFullscreen();
    setRoundState({ aptitude: 'COMPLETED', coding: 'COMPLETED', hr: 'COMPLETED', report: 'ACTIVE' });
    setActiveRound('report');
  }, [id]);

  // Restore state when sessionStateRes arrives
  const answersRestoredRef = useRef(false);
  useEffect(() => {
    if (sessionStateRes) {
      if (typeof sessionStateRes.tabSwitchesCount === 'number') {
        setTabSwitchesCount((prev) => Math.max(prev, sessionStateRes.tabSwitchesCount));
      }
      if (sessionStateRes.isFinalized || sessionStateRes.state === 'COMPLETED') {
        setIsTimeExpired(true);
        setTimeLeft(0);
        setActiveRound('report');
        setRoundState({ aptitude: 'COMPLETED', coding: 'COMPLETED', hr: 'COMPLETED', report: 'ACTIVE' });
        if (sessionStateRes.reportSnapshot) {
          setSessionReport(sessionStateRes.reportSnapshot);
        }
      } else if (sessionStateRes.expiresAt) {
        const exp = new Date(sessionStateRes.expiresAt).getTime();
        setExpiresAtTime(exp);
        const rem = Math.max(0, Math.floor((exp - Date.now()) / 1000));
        setTimeLeft(rem);
        if (rem <= 0) {
          handleAutoExpire();
        } else {
          if (sessionStateRes.roundState) {
            setRoundState(sessionStateRes.roundState);
          }
          if (sessionStateRes.activeRound) {
            setActiveRound(sessionStateRes.activeRound);
          }
        }
      } else {
        if (sessionStateRes.roundState) {
          setRoundState(sessionStateRes.roundState);
        }
        if (sessionStateRes.activeRound) {
          setActiveRound(sessionStateRes.activeRound);
        }
        if (typeof sessionStateRes.timeRemainingSeconds === 'number') {
          setTimeLeft(sessionStateRes.timeRemainingSeconds);
        }
      }

      if (sessionStateRes.aptitude?.answers && !answersRestoredRef.current) {
        answersRestoredRef.current = true;
        setTelemetry((prev) => ({
          ...prev,
          aptitude: {
            ...prev.aptitude,
            ...sessionStateRes.aptitude,
            answers: sessionStateRes.aptitude.answers,
          },
        }));
      }
    }
  }, [sessionStateRes, handleAutoExpire]);

  // Authoritative Countdown: calculated from expiresAtTime - Date.now()
  useEffect(() => {
    if (expiresAtTime === null || activeRound === 'report' || isTimeExpired) return;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAtTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && !isTimeExpired) {
        handleAutoExpire();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAtTime, activeRound, isTimeExpired, handleAutoExpire]);

  // Real Page Visibility & Window Focus listener (detects tab switches and app defocus)
  const hiddenTimestampRef = useRef<number | null>(null);
  const isAwayRef = useRef<boolean>(false);

  useEffect(() => {
    if (!focusLostToast) return;
    const timer = setTimeout(() => {
      setFocusLostToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [focusLostToast]);

  const handleAway = useCallback(async () => {
    if (isAwayRef.current) return;
    isAwayRef.current = true;
    const now = Date.now();
    hiddenTimestampRef.current = now;

    // Count the visibility loss / tab switch event immediately
    setTabSwitchesCount((prev) => prev + 1);

    try {
      const res = await api.post(`/interviews/${id}/tab-switch`, {
        eventType: 'SWITCH_AWAY',
        leftAt: new Date(now).toISOString(),
      });
      if (typeof res.data?.tabSwitchesCount === 'number') {
        setTabSwitchesCount((prev) => Math.max(prev, res.data.tabSwitchesCount));
      }
    } catch (e) {
      console.warn('Tab switch away log error:', e);
    }
  }, [id]);

  const handleReturn = useCallback(async () => {
    if (!isAwayRef.current) return;
    isAwayRef.current = false;
    const now = Date.now();
    const leftTime = hiddenTimestampRef.current || now - 1000;
    const durationSec = Math.max(1, Math.round((now - leftTime) / 1000));
    hiddenTimestampRef.current = null;

    // Play audio warning tone via Web Audio API
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (_) {}

    // Prompt prominent Alert Dialog immediately
    setShowTabSwitchAlert(true);
    setFocusLostToast(
      'Assessment Focus Lost: You navigated away from the assessment window. This activity has been recorded.'
    );

    try {
      const res = await api.post(`/interviews/${id}/tab-switch`, {
        eventType: 'RETURN',
        returnedAt: new Date(now).toISOString(),
        durationSeconds: durationSec,
      });
      if (typeof res.data?.tabSwitchesCount === 'number') {
        setTabSwitchesCount((prev) => Math.max(prev, res.data.tabSwitchesCount));
      }
    } catch (e) {
      console.warn('Tab switch return log error:', e);
    }
  }, [id]);

  // Fullscreen change listener (enforces continuous proctored fullscreen)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = isBrowserFullscreen();
      setIsFullscreen(active);
      if (!active && activeRound !== 'report' && !isTimeExpired) {
        // Fullscreen exited during active assessment
        handleAway();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [activeRound, isTimeExpired, handleAway]);

  // Visibility change & window focus listener
  useEffect(() => {
    if (!id || activeRound === 'report' || isTimeExpired) return;

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        handleAway();
      } else if (!document.hidden || document.visibilityState === 'visible') {
        if (isAwayRef.current) {
          handleReturn();
        }
      }
    };

    let blurTimer: any = null;
    const handleWindowBlur = () => {
      blurTimer = setTimeout(() => {
        if (!document.hasFocus() || document.hidden || document.visibilityState === 'hidden') {
          handleAway();
        }
      }, 150);
    };

    const handleWindowFocus = () => {
      if (blurTimer) clearTimeout(blurTimer);
      if (isAwayRef.current) {
        handleReturn();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      if (blurTimer) clearTimeout(blurTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [id, activeRound, isTimeExpired, handleAway, handleReturn]);

  // 2. Fetch assigned questions
  const { data: sessionQuestionsRes, isLoading, isError, refetch } = useQuery({
    queryKey: ['sessionQuestions', id],
    queryFn: async () => {
      const res = await api.get(`/interviews/${id}/questions`);
      return res.data?.data;
    },
    enabled: !!id,
    staleTime: Infinity,
    retry: 2,
  });

  const aptitudeQuestions: any[] = sessionQuestionsRes?.aptitude || [];
  const codingQuestions: any[] = sessionQuestionsRes?.coding || [];

  const handleAptitudeComplete = useCallback(async (result: AptitudeTelemetry) => {
    setTelemetry((prev) => ({ ...prev, aptitude: result }));
    try {
      if (id) await api.post(`/interviews/${id}/aptitude`, result);
    } catch (err) {
      console.warn('Failed to record aptitude telemetry:', err);
    }
    setRoundState({ aptitude: 'COMPLETED', coding: 'ACTIVE', hr: 'LOCKED', report: 'LOCKED' });
    setActiveRound('coding');
    refetchState();
  }, [id, refetchState]);

  const handleCodingComplete = useCallback(async (result: CodingTelemetry) => {
    setTelemetry((prev) => ({ ...prev, coding: result }));
    try {
      if (id) await api.post(`/interviews/${id}/coding/complete`);
    } catch (err) {
      console.warn('Coding stage complete record:', err);
    }
    setRoundState({ aptitude: 'COMPLETED', coding: 'COMPLETED', hr: 'ACTIVE', report: 'LOCKED' });
    setActiveRound('hr');
    refetchState();
  }, [id, refetchState]);

  const handleHRComplete = useCallback(async (result: HRTelemetry) => {
    setTelemetry((prev) => ({ ...prev, hr: result }));
    try {
      // The HR API already called completeHR() inside HRSessionOrchestrator;
      // here we only finalize the overall interview session.
      if (id) {
        const res = await api.post(`/interviews/${id}/finalize`, {
          completionReason: 'MANUAL_SUBMISSION',
          telemetry: { ...telemetry, hr: result },
        });
        if (res.data) {
          setSessionReport(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to finalize session:', err);
    }
    await exitAssessmentFullscreen();
    setRoundState({ aptitude: 'COMPLETED', coding: 'COMPLETED', hr: 'COMPLETED', report: 'ACTIVE' });
    setActiveRound('report');
    refetchState();
  }, [id, telemetry, refetchState]);

  const handleManualSubmit = async () => {
    setShowFinishDialog(false);
    setIsSubmitting(true);
    try {
      if (id) {
        const res = await api.post(`/interviews/${id}/finalize`, {
          completionReason: 'MANUAL_SUBMISSION',
          telemetry,
        });
        if (res.data) {
          setSessionReport(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to finalize session:', err);
    } finally {
      setIsSubmitting(false);
    }
    await exitAssessmentFullscreen();
    setRoundState({ aptitude: 'COMPLETED', coding: 'COMPLETED', hr: 'COMPLETED', report: 'ACTIVE' });
    setActiveRound('report');
    refetchState();
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col">
        <div className="h-16 border-b border-slate-200 bg-white" />
        <div className="flex-1 p-6 flex gap-4">
          <Skeleton className="w-full max-w-sm h-full rounded-2xl bg-slate-200" />
          <Skeleton className="flex-1 h-full rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (isError || (!isLoading && !sessionQuestionsRes)) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <div className="text-rose-500 mb-2">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Failed to load interview questions</h2>
        <p className="text-slate-500 text-sm">Unable to retrieve assigned questions for this session.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 mt-2 border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl">
          <RotateCcw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] overflow-hidden">
      <InterviewHeader
        sessionId={id || ''}
        timeLeft={timeLeft}
        roundState={roundState}
        activeRound={activeRound}
        tabSwitchesCount={tabSwitchesCount}
        onLockedClick={() => setShowLockedToast(true)}
        onFinish={() => setShowFinishDialog(true)}
        isSubmitting={isSubmitting}
        isTimeExpired={isTimeExpired}
        userName={candidateName}
      />

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeRound === 'aptitude' && aptitudeQuestions.length > 0 && (
          <AptitudeWorkspace
            questions={aptitudeQuestions}
            sessionId={id || ''}
            onComplete={handleAptitudeComplete}
            telemetry={telemetry.aptitude}
            setTelemetry={(t) => setTelemetry(prev => ({ ...prev, aptitude: t }))}
          />
        )}

        {activeRound === 'coding' && codingQuestions.length > 0 && (
          <CodingRound
            questions={codingQuestions}
            sessionId={id || ''}
            timeLeft={timeLeft}
            onComplete={(result) => handleCodingComplete({ ...telemetry.coding, ...result, completed: true })}
          />
        )}

        {activeRound === 'hr' && (
          <HRSessionOrchestrator
            interviewId={id || ''}
            onComplete={handleHRComplete}
          />
        )}

        {activeRound === 'report' && (
          <ReportWorkspace interviewId={id!} sessionData={sessionReport} />
        )}

        {/* Edge case: active round but no data */}
        {activeRound === 'aptitude' && !isLoading && aptitudeQuestions.length === 0 && (
          <div className="flex-1 flex items-center justify-center flex-col gap-4">
            <div className="text-slate-400 opacity-50 mb-2">
              <AlertCircle className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600">No aptitude questions found for this session.</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()} className="gap-2"><RotateCcw className="w-4 h-4" /> Retry</Button>
          </div>
        )}
      </main>

      {/* Focus Lost Toast */}
      {focusLostToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-amber-50 border border-amber-300 text-amber-900 px-5 py-3 rounded-xl shadow-xl text-xs flex items-center justify-between gap-4 backdrop-blur max-w-lg">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">{focusLostToast}</span>
          </div>
          <button
            onClick={() => setFocusLostToast(null)}
            className="text-amber-600 hover:text-amber-900 p-1 rounded-md text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* Assessment Integrity / Tab Switch Alert Modal */}
      <Dialog open={showTabSwitchAlert} onOpenChange={() => setShowTabSwitchAlert(false)}>
        <DialogContent className="sm:max-w-md bg-white border-2 border-rose-300 text-slate-900 shadow-2xl p-6 rounded-2xl z-50">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3 mx-auto ring-8 ring-rose-50">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <DialogTitle className="text-center text-lg font-bold text-slate-900">
              Assessment Integrity Alert: Tab Switch Detected
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-slate-600 mt-2">
              You navigated away from the assessment window. This violation has been recorded by the proctoring monitor and added to your evaluation report.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Visibility Events</span>
            <span className="font-mono text-base font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
              {tabSwitchesCount}
            </span>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl shadow-xs cursor-pointer"
              onClick={() => setShowTabSwitchAlert(false)}
            >
              I Understand & Resume Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto Submit Modal on Deadline Expiration */}
      <Dialog open={showAutoSubmitModal} onOpenChange={() => setShowAutoSubmitModal(false)}>
        <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Clock className="w-5 h-5 text-rose-600" />
              Assessment Time Completed
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Your responses have been automatically submitted. Your assessment report is being generated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
              onClick={() => setShowAutoSubmitModal(false)}
            >
              View Full Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LockedToast visible={showLockedToast} onHide={() => setShowLockedToast(false)} />

      <FinishDialog
        open={showFinishDialog}
        roundState={roundState}
        onCancel={() => setShowFinishDialog(false)}
        onConfirm={handleManualSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Fullscreen Mode Required / Exit Detection Blocking Overlay */}
      {!isFullscreen && activeRound !== 'report' && !isTimeExpired && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-rose-300 text-slate-900 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4 ring-8 ring-rose-50">
              <Maximize2 className="w-7 h-7 text-rose-600" />
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              Fullscreen Mode Required
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              This proctored assessment requires full-screen mode to ensure academic integrity.
              Exiting full-screen is monitored and recorded on your evaluation record.
            </p>

            {fullscreenError && (
              <div className="w-full mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{fullscreenError}</span>
              </div>
            )}

            <div className="w-full my-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 uppercase tracking-wider">
                Integrity / Visibility Events
              </span>
              <span className="font-mono text-sm font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                {tabSwitchesCount}
              </span>
            </div>

            <Button
              size="lg"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2"
              onClick={async () => {
                const ok = await requestAssessmentFullscreen();
                if (!ok) {
                  setFullscreenError('Fullscreen permission is required to continue the assessment. Please allow fullscreen in your browser.');
                } else {
                  setFullscreenError('');
                  setIsFullscreen(true);
                  handleReturn();
                }
              }}
            >
              <Maximize2 className="w-4 h-4" />
              <span>{fullscreenError ? 'Try Again' : 'Return to Fullscreen'}</span>
            </Button>

            <p className="text-[11px] text-slate-400 mt-3">
              Assessment stage: <strong className="capitalize">{activeRound}</strong> • Time remaining: <strong>{formatTime(timeLeft)}</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
