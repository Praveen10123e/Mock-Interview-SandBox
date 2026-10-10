/**
 * CodingRound.tsx - Tier-1 Professional Light UI Coding Round Workspace
 *
 * Layout:
 *   [LEFT: ~40% Problem Specifications (scrollable, generous spacing)]
 *   [DIVIDER: Resizable vertical split divider]
 *   [RIGHT: ~60% IDE Editor + Action Bar + Results Console]
 *
 * Features:
 *   - Reference UX/layout inspired by top tier assessment platforms
 *   - Pure light theme (#ffffff surfaces, #f8fafc canvas, #0f172a typography)
 *   - Problem Tabs: Question, Hints, AI Explain, Submissions + Bookmark
 *   - Listen to Question (TTS / Web Speech API fallback, non-blocking, multi-state)
 *   - Formatted Problem Statement, Input/Output Format, Constraints, Examples with copy
 *   - Language selector with starter code preservation & dataset functionName matching
 *   - Light Monaco Editor with JetBrains Mono, line numbers, shortcuts (Ctrl+Enter to Run)
 *   - Run Code vs Submit Solution distinct actions
 *   - Output & Test Results console with progress bar, expandable test case cards
 *   - Custom input (stdin) execution support
 *   - Multi-question navigation support with state persistence
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Editor from "@monaco-editor/react";
import {
  Play, Send, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Maximize2, Minimize2, Terminal,
  Code2, Volume2, VolumeX, Copy, Check, Bookmark,
  History, RotateCcw, Settings
} from "lucide-react";
import api from "../../../api/axios/instance";
import { normalizeInterviewQuestion } from "../../../utils/normalizeQuestion";
import { formatExampleText } from "../../../utils/formatExampleText";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestResult {
  index: number;
  passed: boolean;
  status?: string;
  input?: string;
  expected?: string;
  actual?: string;
  stderr?: string;          // per-test runtime error / exception text
  compileOutput?: string;   // per-test compile error (rare but possible)
  hidden?: boolean;
  time?: number | string | null;
  executionTime?: number | string | null;
  memory?: number | null;
  score?: number;
}

type RunMode = "RUN" | "SUBMIT" | "CUSTOM" | "CUSTOM_RUN";

type ErrorType =
  | "COMPILATION_ERROR"
  | "RUNTIME_ERROR"
  | "WRAPPER_ERROR"
  | "INVALID_QUESTION_CONFIGURATION"
  | "COMPILER_SERVICE_UNAVAILABLE"
  | "TIME_LIMIT_EXCEEDED"
  | "USER_CODE_TIME_LIMIT_EXCEEDED"
  | "EXECUTION_TIMEOUT"
  | "NETWORK_ERROR";

interface ExecutionResult {
  success: boolean;
  errorType?: ErrorType;
  executionStatus?: string;
  message?: string;
  customInput?: string;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  status?: { id: number; description: string };
  results?: TestResult[];
  score?: number;
  totalScore?: number;
  passedCount?: number;
  totalCount?: number;
  allPassed?: boolean;
  time?: number | null;
  memory?: number | null;
  language?: string;
  runMode?: RunMode;
}

interface CodingQuestion {
  id: string;
  title: string;
  difficulty?: string;
  topic?: string;
  description?: string;
  inputFormat?: string;
  outputFormat?: string;
  input_format?: string;
  output_format?: string;
  submissionFormat?: string;
  candidateStarterCode?: string;
  candidate_starter_code?: string;
  skills_evaluated?: string[];
  examples?: Array<{ input: string; output: string; explanation?: string }>;
  constraints?: string[];
  metadata?: {
    starterCode?: Record<string, string>;
    jsonPayload?: {
      executionType?: 'STDIN_PROGRAM' | 'FUNCTION_CALL';
      problemStatement?: string;
      inputFormat?: string;
      outputFormat?: string;
      input_format?: string;
      output_format?: string;
      hints?: string[];
      constraints?: string[];
      examples?: Array<{ input: string; output: string; explanation?: string }>;
      skillsEvaluated?: string[];
      skills_evaluated?: string[];
      candidateStarterCode?: string;
      candidate_starter_code?: string;
      starterCode?: Record<string, string>;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

// ─── Language Configuration ──────────────────────────────────────────────────

const LANGUAGES = [
  { key: "java",       label: "Java",       monacoLang: "java",       judge0Id: 62, icon: "☕" },
  { key: "python",     label: "Python",     monacoLang: "python",     judge0Id: 71, icon: "🐍" },
  { key: "cpp",        label: "C++",        monacoLang: "cpp",        judge0Id: 54, icon: "⚡" },
  { key: "javascript", label: "JavaScript", monacoLang: "javascript", judge0Id: 93, icon: "📜" },
  { key: "c",          label: "C",          monacoLang: "c",          judge0Id: 50, icon: "🔷" },
] as const;

type LangKey = typeof LANGUAGES[number]["key"];



function getStarterCode(question: CodingQuestion | null, langKey: LangKey): string {
  // Priority 1: If dataset specifies empty candidate starter code, start with completely empty editor
  const candidateStarter =
    question?.metadata?.jsonPayload?.candidateStarterCode ||
    (question as any)?.candidateStarterCode ||
    (question as any)?.candidate_starter_code;
  if (candidateStarter === "empty") {
    return "";
  }

  // Priority 2: Dataset-level problem-specific starter code (if explicitly provided)
  const p1 = question?.metadata?.jsonPayload?.starterCode?.[langKey];
  if (p1 && p1.trim()) return p1;

  // Priority 3: Raw metadata starter code
  const p2 = (question?.metadata as any)?.starterCode?.[langKey];
  if (p2 && p2.trim()) return p2;

  // Default: completely empty editor per Section 4 specifications
  return "";
}

// ─── sessionStorage Code Persistence ─────────────────────────────────────────
// All three functions are module-level (no hooks) and safe to call from anywhere.
// Key format: coding-code:{sessionId}:{questionId}:{language}
// sessionStorage survives component unmount/remount for the lifetime of the browser tab,
// including the transient navigation between coding and HR rounds.

function codingStorageKey(sessionId: string, questionId: string, lang: string): string {
  return `coding-code:${sessionId}:${questionId}:${lang}`;
}

function loadPersistedCode(sessionId: string, questionId: string, lang: string): string | null {
  try {
    return sessionStorage.getItem(codingStorageKey(sessionId, questionId, lang));
  } catch {
    return null;
  }
}

function persistCode(sessionId: string, questionId: string, lang: string, code: string): void {
  try {
    sessionStorage.setItem(codingStorageKey(sessionId, questionId, lang), code);
  } catch {}
}

// ─── Format Utilities ─────────────────────────────────────────────────────────

function formatTime(time: any): string {
  if (time === null || time === undefined || time === "") return "0 ms";
  const num = typeof time === "number" ? time : parseFloat(String(time));
  if (isNaN(num)) return `${time} ms`;
  if (num < 1) return `${Math.round(num * 1000)} ms`;
  return `${num.toFixed(2)} s`;
}



// ─── Copy Button Component ───────────────────────────────────────────────────

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback if clipboard denied
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
      title="Copy to clipboard"
      aria-label="Copy code or input"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

// ─── Left Problem Panel ───────────────────────────────────────────────────────

interface ProblemPanelProps {
  question: CodingQuestion;
  onBookmarkToggle?: () => void;
  isBookmarked?: boolean;
  attemptsHistory?: any[];
}

const ProblemPanel: React.FC<ProblemPanelProps> = ({ question, onBookmarkToggle, isBookmarked, attemptsHistory = [] }) => {
  const [activeTab, setActiveTab] = useState<"question" | "submissions">("question");
  const [selectedExampleIndex, setSelectedExampleIndex] = useState(0);

  // Speech synthesis state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasSpokenOnce, setHasSpokenOnce] = useState(false);

  const jsonPayload = question.metadata?.jsonPayload || {};
  const problemStatement =
    jsonPayload.problemStatement ||
    question.description ||
    "Write a complete executable program to solve the problem according to standard input and output specifications.";

  const inputFormat =
    (question as any).inputFormat ||
    (question as any).input_format ||
    jsonPayload.inputFormat ||
    jsonPayload.input_format ||
    "Standard input provided via stdin.";

  const outputFormat =
    (question as any).outputFormat ||
    (question as any).output_format ||
    jsonPayload.outputFormat ||
    jsonPayload.output_format ||
    "Print the required answer to standard output.";

  const constraintsList =
    question.constraints && question.constraints.length > 0
      ? question.constraints
      : jsonPayload.constraints && jsonPayload.constraints.length > 0
      ? jsonPayload.constraints
      : [];

  const examplesList =
    question.examples && question.examples.length > 0
      ? question.examples
      : jsonPayload.examples && jsonPayload.examples.length > 0
      ? jsonPayload.examples
      : [];

  // Stop speech when question changes or unmounts
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [question.id]);

  const handleToggleSpeech = () => {
    if (!("speechSynthesis" in window)) {
      alert("Text-to-Speech is not supported in this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanSpeech = [
      `Question: ${question.title}.`,
      `Difficulty: ${question.difficulty || "Easy"}.`,
      `Problem Statement: ${problemStatement.replace(/[`*]/g, "")}`,
      `Input Format: ${inputFormat.replace(/[`*]/g, "")}`,
      `Output Format: ${outputFormat.replace(/[`*]/g, "")}`,
      `Constraints: ${constraintsList.join(". ")}.`,
    ].join(" ");

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 0.96;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setHasSpokenOnce(true);
    };
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const difficultyCls =
    question.difficulty === "HARD"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : question.difficulty === "MEDIUM"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const tags = [
    typeof question.topic === "string" ? question.topic : "Data Structures",
    "Algorithms",
    "Binary Search",
  ].filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 overflow-hidden select-text">
      {/* ── Top Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab("question")}
            className={`py-3.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "question"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Code2 className="w-4 h-4" />
            Question
          </button>
          <button
            onClick={() => setActiveTab("submissions")}
            className={`py-3.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === "submissions"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            Submissions
          </button>
        </div>

        <button
          onClick={onBookmarkToggle}
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            isBookmarked
              ? "bg-amber-50 border-amber-200 text-amber-600"
              : "border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50"
          }`}
          title={isBookmarked ? "Remove bookmark" : "Bookmark question"}
        >
          <Bookmark className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* ── Scrollable Tab Content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-7 text-slate-800 scrollbar-thin">
        {activeTab === "question" && (
          <>
            {/* Header: Title, Tags, Listen to Question */}
            <div className="space-y-3 pb-2 border-b border-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug">
                      {question.title}
                    </h1>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${difficultyCls}`}>
                      {question.difficulty?.toLowerCase() || "Easy"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 border border-slate-200 text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Listen to Question Button (Clean Secondary) */}
                <button
                  onClick={handleToggleSpeech}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                    isSpeaking
                      ? "bg-[#111827] text-white border-[#111827] animate-pulse"
                      : "bg-white text-[#0F172A] border-[#CBD5E1] hover:bg-[#F8FAFC] hover:border-[#94A3B8]"
                  }`}
                  title="Listen to problem narration"
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span>AI Voice Speaking...</span>
                    </>
                  ) : hasSpokenOnce ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Listen Again</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span>Listen to Question</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Section 1: Problem Statement */}
            <section className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-sans">
                Problem Statement
              </h2>
              <div className="text-[15px] leading-[1.7] text-slate-700 space-y-3">
                {problemStatement.split("\n\n").map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            </section>

            {/* Section 2: Input Format */}
            <section className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-sans">
                Input Format
              </h2>
              <div className="text-sm leading-relaxed text-slate-700 space-y-1.5">
                {inputFormat.split("\n").map((line: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-400 mt-1 shrink-0">•</span>
                    <span className="font-mono text-xs text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80">
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 3: Output Format */}
            <section className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-sans">
                Output Format
              </h2>
              <div className="text-sm leading-relaxed text-slate-700 space-y-1.5">
                {outputFormat.split("\n").map((line: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-400 mt-1 shrink-0">•</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 4: Constraints */}
            <section className="space-y-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-sans">
                Constraints
              </h2>
              <ul className="space-y-1.5 text-sm text-slate-700">
                {constraintsList.map((c, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-slate-400 shrink-0">•</span>
                    <code className="text-xs font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80">
                      {c}
                    </code>
                  </li>
                ))}
              </ul>
            </section>

            {/* Section 5: Examples */}
            <section className="space-y-3 pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-sans">
                Examples
              </h2>

              {/* Example Selectors */}
              <div className="flex items-center gap-2">
                {examplesList.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedExampleIndex(i)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedExampleIndex === i
                        ? "bg-[#111827] text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200"
                    }`}
                  >
                    Example {i + 1}
                  </button>
                ))}
              </div>

              {/* Example Card */}
              {examplesList[selectedExampleIndex] && (() => {
                const ex = examplesList[selectedExampleIndex];
                const formattedInput = formatExampleText(ex.input);
                const formattedOutput = formatExampleText(ex.output);
                return (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3 font-mono text-xs relative group shadow-xs">
                    <div className="absolute top-3 right-3">
                      <CopyButton
                        text={`Input:\n${formattedInput}\n\nOutput:\n${formattedOutput}`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-sans font-semibold text-[11px] uppercase tracking-wider">Input:</span>
                        <CopyButton text={formattedInput} />
                      </div>
                      <pre className="text-slate-900 font-mono font-medium bg-white p-2.5 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed overflow-x-auto text-xs m-0">
                        {formattedInput}
                      </pre>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-sans font-semibold text-[11px] uppercase tracking-wider">Output:</span>
                        <CopyButton text={formattedOutput} />
                      </div>
                      <pre className="text-emerald-700 font-mono font-bold bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200 whitespace-pre-wrap leading-relaxed overflow-x-auto text-xs m-0">
                        {formattedOutput}
                      </pre>
                    </div>

                    {ex.explanation && (
                      <div className="space-y-1 pt-1 border-t border-slate-200/60 font-sans text-xs">
                        <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider block">Explanation:</span>
                        <span className="text-slate-700 leading-relaxed block whitespace-pre-wrap">
                          {formatExampleText(ex.explanation)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </section>
          </>
        )}



        {activeTab === "submissions" && (() => {
          const submitAttempts = attemptsHistory.filter((a: any) => a.runMode === "SUBMIT");
          let bestSubmit: any = null;
          submitAttempts.forEach((att: any) => {
            if (
              !bestSubmit ||
              att.passedCount > bestSubmit.passedCount ||
              (att.passedCount === bestSubmit.passedCount && att.attemptNumber >= bestSubmit.attemptNumber)
            ) {
              bestSubmit = att;
            }
          });

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold text-slate-900">Submission History</h2>
                </div>
                {submitAttempts.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {submitAttempts.length} Official Attempt{submitAttempts.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {bestSubmit && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      Authoritative Best Result
                    </span>
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {bestSubmit.status === 'ACCEPTED' || (bestSubmit.passedCount === bestSubmit.totalCount && bestSubmit.totalCount > 0) ? 'ACCEPTED' : bestSubmit.status}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-emerald-950 font-mono">
                    {bestSubmit.passedCount} / {bestSubmit.totalCount} Test Cases Passed
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Calculated deterministically from official submission attempts.
                  </p>
                </div>
              )}

              {submitAttempts.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    All Official Attempts
                  </h4>
                  {submitAttempts.map((att: any, idx: number) => {
                    const isBest = bestSubmit?.id === att.id || bestSubmit?.attemptNumber === att.attemptNumber;
                    return (
                      <div
                        key={att.id || idx}
                        className={`p-3 rounded-xl border transition-all text-xs font-mono flex items-center justify-between ${
                          isBest ? "border-emerald-300 bg-emerald-50/40 shadow-2xs" : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-slate-500 font-bold">#{att.attemptNumber || idx + 1}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            att.status === 'ACCEPTED' || att.status === 'PASSED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {att.status}
                          </span>
                          <span className="text-slate-500 font-sans capitalize">{att.language}</span>
                          {isBest && (
                            <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              Best
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-slate-600">
                          <span className="font-bold text-slate-900">
                            {att.passedCount} / {att.totalCount} passed
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(att.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-slate-400 italic pt-1">
                    * Run Code executions are temporary validation runs and are not recorded as attempts.
                  </p>
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-2">
                  <p className="text-xs font-semibold text-slate-700">No official submissions recorded yet.</p>
                  <p className="text-[11px] text-slate-500">
                    Click <strong>Submit Solution</strong> to evaluate all visible test cases and record an official attempt.
                  </p>
                  <p className="text-[10px] text-slate-400 italic">
                    Note: "Run Code" executes the first 2 visible test cases for quick validation only and does not record an attempt.
                  </p>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

// ─── Main CodingRound Component ───────────────────────────────────────────────

export const CodingRound = ({
  questions,
  sessionId,
  onComplete,
  timeLeft: _timeLeft,
}: {
  questions: any[];
  sessionId: string;
  onComplete?: (result: any) => void;
  timeLeft?: number;
}) => {
  const normalizedQuestions = useMemo(
    () => questions.map(normalizeInterviewQuestion).filter(Boolean) as CodingQuestion[],
    [questions]
  );

  const [qIndex, setQIndex] = useState(0);

  const question: CodingQuestion | null =
    normalizedQuestions.length > 0
      ? normalizedQuestions[Math.min(qIndex, normalizedQuestions.length - 1)] ?? null
      : null;

  const [selectedLang, setSelectedLang] = useState<LangKey>("java");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [execResult, setExecResult] = useState<ExecutionResult | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [activeConsoleTab, setActiveConsoleTab] = useState<"results" | "customInput" | "history">("results");
  const [attemptsHistory, setAttemptsHistory] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<number>>(new Set());
  const [bookmarked, setBookmarked] = useState<Record<number, boolean>>({});
  const [showPassedCases, setShowPassedCases] = useState(false);

  // Resizable split divider state
  const [leftWidthPercent, setLeftWidthPercent] = useState<number>(39);
  const isDraggingRef = useRef(false);

  // ── Code state — persisted to sessionStorage per question+language ───────────
  // Priority on initialization: sessionStorage (student's work) → starterCode → minimal template.
  // setCode writes to both React state and sessionStorage on every keystroke so
  // the code is never lost on unmount, HR navigation, or re-render.
  const [code, setCodeLocal] = useState(() => getStarterCode(question, selectedLang));

  const setCode = useCallback((val: string) => {
    setCodeLocal(val);
    if (question?.id) persistCode(sessionId, question.id, selectedLang, val);
  }, [question?.id, selectedLang, sessionId]);

  // Initialize editor when the active question or language changes.
  // Dependency is question?.id (a stable string), NOT question (a new object every render).
  // This prevents spurious re-runs when the questions array is re-fetched with a new
  // object identity (e.g. after refetchState()), which would otherwise wipe student code.
  useEffect(() => {
    if (!question?.id) return;
    const persisted = loadPersistedCode(sessionId, question.id, selectedLang);
    if (persisted !== null) {
      // Student has previously typed code for this question+language — restore it exactly.
      setCodeLocal(persisted);
    } else {
      // First time opening this question+language — seed with starterCode.
      const starter = getStarterCode(question, selectedLang);
      setCodeLocal(starter);
      persistCode(sessionId, question.id, selectedLang, starter);
    }
    setExecResult(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, selectedLang, question?.id, sessionId]);

  // Fetch attempts history for current problem
  const loadAttempts = useCallback(async () => {
    if (!sessionId || !question?.id) return;
    try {
      const res = await api.get(`/interviews/${sessionId}/coding/attempts/${question.id}`);
      const atts = res.data?.data || [];
      setAttemptsHistory(atts);
      if (atts.some((a: any) => a.runMode === "SUBMIT")) {
        setSubmittedQuestions(prev => new Set([...prev, qIndex]));
      }
    } catch (err) {
      console.warn("Failed to load attempts history", err);
    }
  }, [sessionId, question?.id, qIndex]);

  useEffect(() => {
    loadAttempts();
  }, [loadAttempts]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Execute Execution Callbacks ───────────────────────────────────────────

  const execute = useCallback(async (runMode: RunMode) => {
    if (!code.trim() || !question) return;
    const isCustomRun = runMode === "RUN" && customInput.trim().length > 0;
    const effectiveRunMode: any = isCustomRun ? "CUSTOM" : runMode;

    const setter = runMode === "RUN" ? setIsRunning : setIsSubmitting;
    setter(true);
    setExecResult(null);
    setShowPassedCases(false);
    setActiveConsoleTab("results");

    const langConfig = LANGUAGES.find(l => l.key === selectedLang);
    const endpoint = runMode === "RUN" ? "run" : "submit";

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const res = await api.post(
        `/interviews/${sessionId}/${endpoint}`,
        {
          questionRefId: question.id,
          languageId: langConfig?.judge0Id ?? 62,
          sourceCode: code,
          runMode: effectiveRunMode,
          customInput: isCustomRun ? customInput : undefined,
        },
        {
          signal: abortControllerRef.current.signal,
        }
      );

      const data: ExecutionResult = res.data;
      setExecResult(data);

      if (runMode === 'SUBMIT') {
        setSubmittedQuestions(prev => new Set([...prev, qIndex]));
        loadAttempts();
        // NOTE: onComplete (→ HR stage transition) is NOT called here.
        // The student explicitly completes the coding round via the
        // "Complete Coding & Proceed to HR" button, which is enabled
        // only after ALL assigned coding questions have been submitted.
      }
    } catch (err: any) {
      if (err.name === "AbortError" || err.message?.includes("canceled")) {
        return;
      }
      setExecResult({
        success: false,
        runMode: effectiveRunMode,
        errorType: "NETWORK_ERROR",
        message: err?.response?.data?.message || err.message || "Network error occurred during execution",
      });
    } finally {
      setter(false);
      abortControllerRef.current = null;
    }
  }, [code, question, sessionId, selectedLang, qIndex, customInput, loadAttempts]);

  // Resizer mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const totalWidth = window.innerWidth;
      const newPercent = Math.max(28, Math.min(60, (ev.clientX / totalWidth) * 100));
      setLeftWidthPercent(newPercent);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, []);

  const handleResetCode = () => {
    if (window.confirm("Reset editor to original starter code? Any unsaved edits will be cleared.")) {
      const starter = getStarterCode(question, selectedLang);
      setCode(starter);
    }
  };

  const handleBookmarkToggle = () => {
    setBookmarked(prev => ({ ...prev, [qIndex]: !prev[qIndex] }));
  };

  if (normalizedQuestions.length === 0 || !question) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="text-center text-slate-500 text-sm">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          Coding question data unavailable for this assessment.
        </div>
      </div>
    );
  }

  // Calculate test cases passed / total
  const passedCount = execResult?.passedCount ?? (execResult?.results ? execResult.results.filter(r => r.passed).length : 0);
  const totalCount = execResult?.totalCount ?? (execResult?.results ? execResult.results.length : 0);
  const passPercentage = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  // "Complete Coding" gate — all assigned questions must be submitted
  const allCodingSubmitted =
    normalizedQuestions.length > 0 &&
    submittedQuestions.size >= normalizedQuestions.length;

  return (
    <div className={`flex flex-col bg-slate-100 text-slate-900 ${isFullscreen ? "fixed inset-0 z-50 bg-white" : "flex-1 h-full"} overflow-hidden`}>
      {/* ── Multi-Question Header Bar (if more than 1 question assigned) ─────────── */}
      {normalizedQuestions.length > 1 && (
        <div className="h-10 shrink-0 flex items-center justify-between px-6 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span>Coding Question</span>
            <strong className="text-slate-900">{qIndex + 1}</strong>
            <span>of</span>
            <strong className="text-slate-900">{normalizedQuestions.length}</strong>
          </div>

          <div className="flex items-center gap-1.5">
            {normalizedQuestions.map((_, i) => {
              const done = submittedQuestions.has(i);
              return (
                <button
                  key={i}
                  onClick={() => setQIndex(i)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                    qIndex === i
                      ? "bg-[#111827] border-[#111827] text-white shadow-xs"
                      : done
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-white border-[#CBD5E1] text-[#0F172A] hover:bg-[#F8FAFC]"
                  }`}
                >
                  {done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  <span>Problem {i + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Split Screen: Left Problem Panel + Right Editor ───────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT: Problem Specifications (~40%) */}
        <div
          style={{ width: `${leftWidthPercent}%` }}
          className="shrink-0 h-full overflow-hidden flex flex-col"
        >
          <ProblemPanel
            question={question}
            onBookmarkToggle={handleBookmarkToggle}
            isBookmarked={!!bookmarked[qIndex]}
            attemptsHistory={attemptsHistory}
          />
        </div>

        {/* RESIZABLE VERTICAL DIVIDER */}
        <div
          onMouseDown={handleMouseDown}
          className="w-1.5 hover:w-2 bg-slate-200 hover:bg-blue-400 active:bg-blue-600 cursor-col-resize transition-all shrink-0 z-20 flex items-center justify-center group"
          title="Drag to resize panels"
        >
          <div className="w-0.5 h-6 bg-slate-400 group-hover:bg-white rounded-full" />
        </div>

        {/* RIGHT: Monaco Editor + Action Bar + Results Console (~60%) */}
        <div className="flex-1 h-full flex flex-col overflow-hidden bg-white">
          {/* Top Editor Toolbar */}
          <div className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-slate-200 bg-white z-10 shadow-2xs">
            {/* Language Selector Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="lang-select" className="sr-only">Programming Language</label>
              <div className="relative flex items-center">
                <select
                  id="lang-select"
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value as LangKey)}
                  className="h-8 pl-3 pr-8 rounded-lg border border-slate-200 bg-white hover:border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none shadow-xs"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.key} value={l.key}>
                      {l.icon} {l.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <span className="text-[10px]">▼</span>
                </div>
              </div>
            </div>

            {/* Utility Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleResetCode}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-600 transition-colors cursor-pointer"
                title="Reset code to starter template"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Code</span>
              </button>

              <button
                onClick={() => setIsFullscreen((f) => !f)}
                className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Editor"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="Editor Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Monaco Editor (Upper 55%) */}
          <div className="flex-1 min-h-[200px] relative bg-white">
            <Editor
              height="100%"
              language={LANGUAGES.find((l) => l.key === selectedLang)?.monacoLang || "java"}
              theme="vs"
              value={code}
              onChange={(val) => setCode(val || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
                lineNumbers: "on",
                lineNumbersMinChars: 3,
                wordWrap: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
                renderLineHighlight: "all",
                cursorBlinking: "smooth",
                smoothScrolling: true,
                tabSize: 4,
              }}
              loading={
                <div className="flex items-center justify-center h-full bg-white">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              }
            />
          </div>

          {/* Action Bar (Between Editor and Results Console) */}
          <div className="h-14 shrink-0 flex items-center justify-between px-4 border-t border-b border-slate-200 bg-white z-10 shadow-2xs">
            <div className="flex items-center gap-3">
              {/* Secondary Run Code Button */}
              <button
                onClick={() => execute("RUN")}
                disabled={isRunning || isSubmitting}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] hover:border-[#94A3B8] text-[#0F172A] font-semibold text-xs shadow-2xs transition-all disabled:pointer-events-none disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:border-[#E2E8F0] cursor-pointer"
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                ) : (
                  <Play className="w-4 h-4 text-slate-700 fill-current" />
                )}
                <span>Run Code</span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200 ml-1">
                  Ctrl + Enter
                </span>
              </button>

              {/* Primary Submit Solution Button */}
              <button
                onClick={() => execute("SUBMIT")}
                disabled={isRunning || isSubmitting}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[#111827] hover:bg-[#1F2937] active:bg-[#0F172A] border border-[#111827] hover:border-[#1F2937] text-white font-semibold text-xs shadow-xs transition-all disabled:pointer-events-none disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:border-[#E2E8F0] cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
                <span>Submit Solution</span>
              </button>
            </div>

            {/* Right side: Custom Input + Complete Coding */}
            <div className="flex items-center gap-2">
              {/* Custom Input Button */}
              <button
                onClick={() => setActiveConsoleTab(activeConsoleTab === "customInput" ? "results" : "customInput")}
                className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                  activeConsoleTab === "customInput"
                    ? "bg-slate-100 border-slate-400 text-slate-900"
                    : "bg-white border-[#CBD5E1] text-[#0F172A] hover:bg-[#F8FAFC] hover:border-[#94A3B8]"
                }`}
              >
                <Terminal className="w-4 h-4 text-slate-500" />
                <span>Custom Input</span>
                {customInput.trim() && <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />}
              </button>

              {/* Complete Coding & Proceed to HR — visible when onComplete is wired */}
              {onComplete && (
                <button
                  onClick={() => onComplete({ completed: true })}
                  disabled={!allCodingSubmitted || isRunning || isSubmitting}
                  title={
                    allCodingSubmitted
                      ? "Complete coding round and proceed to HR"
                      : `Submit all ${normalizedQuestions.length} question(s) to proceed`
                  }
                  className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border text-xs font-semibold transition-all shadow-2xs ${
                    allCodingSubmitted
                      ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 border-emerald-600 text-white cursor-pointer"
                      : "bg-white border-slate-200 text-slate-400 cursor-not-allowed"
                  } disabled:pointer-events-none`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Complete Coding</span>
                  <span className="hidden sm:inline text-[10px] opacity-80 font-mono">
                    ({submittedQuestions.size}/{normalizedQuestions.length})
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Results Console Panel (Bottom 40-45%) */}
          <div className="h-64 sm:h-72 shrink-0 flex flex-col bg-white overflow-hidden">
            {/* Console Sub-tabs + Summary Progress */}
            <div className="h-10 shrink-0 flex items-center justify-between px-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveConsoleTab("results")}
                  className={`text-xs font-semibold py-2.5 border-b-2 transition-colors cursor-pointer ${
                    activeConsoleTab === "results"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Output
                </button>
                <button
                  onClick={() => setActiveConsoleTab("results")}
                  className={`text-xs font-semibold py-2.5 border-b-2 transition-colors cursor-pointer ${
                    activeConsoleTab === "results" && execResult?.results
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Test Results
                </button>
                <button
                  onClick={() => setActiveConsoleTab("customInput")}
                  className={`text-xs font-semibold py-2.5 border-b-2 transition-colors cursor-pointer ${
                    activeConsoleTab === "customInput"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Console
                </button>
                <button
                  onClick={() => {
                    setActiveConsoleTab("history");
                    loadAttempts();
                  }}
                  className={`text-xs font-semibold py-2.5 border-b-2 transition-colors cursor-pointer ${
                    activeConsoleTab === "history"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Submissions {attemptsHistory.length > 0 && `(${attemptsHistory.length})`}
                </button>
              </div>

              {/* Progress Summary: e.g. "3 / 5 test cases passed [===] 60%" */}
              {execResult && totalCount > 0 && (
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    execResult.runMode === 'RUN' || execResult.runMode === 'CUSTOM'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-purple-100 text-purple-800 border border-purple-300'
                  }`}>
                    {execResult.runMode === 'RUN' ? 'Run Code Result' : execResult.runMode === 'CUSTOM' ? 'Custom Run' : 'Official Submission'}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {passedCount} / {totalCount} Test Cases Passed
                  </span>
                  <div className="w-24 h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        passPercentage === 100 ? "bg-emerald-500" : "bg-blue-600"
                      }`}
                      style={{ width: `${passPercentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold font-mono text-slate-700">{passPercentage}%</span>
                </div>
              )}
            </div>

            {/* Console Content Body */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              {isRunning || isSubmitting ? (
                <div className="flex flex-col items-center justify-center h-full gap-2.5 text-blue-600 py-8">
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <p className="text-xs font-semibold text-slate-700">
                    {isSubmitting ? "Running complete assessment evaluation on Judge0..." : "Compiling and executing sample test cases..."}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">Real-time compiler sandbox execution</p>
                </div>
              ) : activeConsoleTab === "customInput" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold">Standard Input (stdin) for testing:</span>
                    {customInput && (
                      <button
                        onClick={() => setCustomInput("")}
                        className="text-xs text-rose-600 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder={`e.g.\n[9, 12, 17, 2, 4, 5]\n2`}
                    rows={4}
                    className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Custom tests execute without recording official assessment scores.
                    </span>
                    <button
                      onClick={() => execute("RUN")}
                      className="px-3.5 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1F2937] text-white font-semibold text-xs shadow-xs cursor-pointer"
                    >
                      Run with Custom Input
                    </button>
                  </div>
                </div>
              ) : activeConsoleTab === "history" ? (() => {
                const submitAttempts = attemptsHistory.filter((a: any) => a.runMode === "SUBMIT");
                let bestSubmit: any = null;
                submitAttempts.forEach((att: any) => {
                  if (
                    !bestSubmit ||
                    att.passedCount > bestSubmit.passedCount ||
                    (att.passedCount === bestSubmit.passedCount && att.attemptNumber >= bestSubmit.attemptNumber)
                  ) {
                    bestSubmit = att;
                  }
                });

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Official Submission History
                      </h4>
                      {bestSubmit && (
                        <div className="flex items-center gap-2 text-xs font-semibold font-mono bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <span>Best Result:</span>
                          <span className="font-bold">{bestSubmit.passedCount} / {bestSubmit.totalCount} Passed</span>
                        </div>
                      )}
                    </div>
                    {submitAttempts.length > 0 ? (
                      <div className="space-y-2">
                        {submitAttempts.map((att: any, idx: number) => {
                          const isBest = bestSubmit?.id === att.id || bestSubmit?.attemptNumber === att.attemptNumber;
                          return (
                            <div
                              key={att.id || idx}
                              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                                isBest ? "border-emerald-300 bg-emerald-50/30 shadow-2xs" : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-slate-500 font-bold">#{att.attemptNumber || idx + 1}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-700 border border-purple-200">
                                  SUBMISSION
                                </span>
                                <span
                                  className={`font-semibold ${
                                    att.status === "ACCEPTED" || att.status === "PASSED" || att.status === "SUCCESS"
                                      ? "text-emerald-700"
                                      : "text-rose-700"
                                  }`}
                                >
                                  {att.status}
                                </span>
                                <span className="text-slate-500 font-sans capitalize">{att.language}</span>
                                {isBest && (
                                  <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                    Best Result
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-4 text-slate-600">
                                {att.totalCount > 0 && (
                                  <span className="font-bold text-slate-900">
                                    {att.passedCount} / {att.totalCount} passed
                                  </span>
                                )}
                                <span>{new Date(att.timestamp).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          );
                        })}
                        <p className="text-[11px] text-slate-400 italic pt-1">
                          * Run Code executions are temporary validation runs and are not recorded as attempts.
                        </p>
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-1">
                        <p className="text-xs text-slate-600 font-medium">No official submissions recorded for this problem yet.</p>
                        <p className="text-[11px] text-slate-400">
                          Click <strong>Submit Solution</strong> to evaluate all visible test cases and record an authoritative attempt.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })() : execResult ? (() => {
                const isCompilationError =
                  execResult.errorType === 'COMPILATION_ERROR' ||
                  Boolean(execResult.compileOutput && execResult.compileOutput.trim());

                const tleResult = execResult.results?.find(
                  r => !r.passed && (r.status === 'TIME_LIMIT_EXCEEDED' || r.stderr?.toLowerCase().includes('time limit') || (typeof r.executionTime === 'number' && r.executionTime > 2.0))
                );
                const isTle =
                  execResult.errorType === 'TIME_LIMIT_EXCEEDED' ||
                  execResult.errorType === 'USER_CODE_TIME_LIMIT_EXCEEDED' ||
                  execResult.errorType === 'EXECUTION_TIMEOUT' ||
                  Boolean(tleResult);

                const runtimeFailedResult = execResult.results?.find(
                  r => !r.passed && (r.status === 'RUNTIME_ERROR' || Boolean(r.stderr && r.stderr.trim()))
                );
                const isRuntimeError =
                  !isCompilationError &&
                  !isTle &&
                  (execResult.errorType === 'RUNTIME_ERROR' || Boolean(execResult.stderr && execResult.stderr.trim()) || Boolean(runtimeFailedResult));

                const allPass =
                  execResult.success &&
                  !isCompilationError &&
                  !isRuntimeError &&
                  !isTle &&
                  (execResult.allPassed === true || (passedCount === totalCount && totalCount > 0));

                const allCases = execResult.results || [];
                const failedCases = allCases.filter(r => !r.passed);
                const passedCases = allCases.filter(r => r.passed);

                // Helper to render an individual test case card
                const renderTestCaseCard = (r: TestResult, displayIndex: number) => {
                  const actualText = (r as any).actualOutput ?? r.actual;
                  const expectedText = (r as any).expectedOutput ?? r.expected;
                  const hasActual = actualText != null && String(actualText).trim() !== '';
                  const hasStderr = r.stderr != null && r.stderr.trim() !== '';
                  const hasCompile = r.compileOutput != null && r.compileOutput.trim() !== '';

                  const outputContent: string =
                    hasActual    ? String(actualText) :
                    hasStderr    ? r.stderr! :
                    hasCompile   ? r.compileOutput! :
                    '—';

                  const outputLabel =
                    !hasActual && hasStderr    ? 'Runtime Error / stderr' :
                    !hasActual && hasCompile   ? 'Compiler Output' :
                    'Your Output';

                  return (
                    <div
                      key={r.index ?? displayIndex}
                      className={`p-3.5 rounded-xl border transition-all ${
                        r.passed
                          ? 'border-emerald-200 bg-white hover:border-emerald-300 shadow-2xs'
                          : 'border-rose-200 bg-white hover:border-rose-300 shadow-2xs'
                      }`}
                    >
                      {/* Card Header: Icon + Test Case N + Status Pill + Runtime */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {r.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span className="text-xs font-bold text-slate-900">
                            Test Case #{r.index ?? displayIndex + 1}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              r.passed
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {r.passed ? 'Passed' : 'Failed'}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {formatTime(r.executionTime ?? r.time)}
                          </span>
                        </div>
                      </div>

                      {/* Test Inputs and Outputs */}
                      <div className="space-y-2.5 text-xs pt-2 border-t border-slate-100">
                        {/* Input */}
                        {r.input !== undefined && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold font-sans text-slate-500 uppercase tracking-wider">
                              Input:
                            </span>
                            <pre
                              className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 text-[11px] leading-relaxed"
                              style={{
                                whiteSpace: 'pre-wrap',
                                overflowWrap: 'anywhere',
                                overflowY: 'auto',
                                maxHeight: '120px',
                              }}
                            >
                              {formatExampleText(r.input)}
                            </pre>
                          </div>
                        )}

                        {/* Expected Output */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold font-sans text-slate-500 uppercase tracking-wider">
                            Expected Output:
                          </span>
                          <pre
                            className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 text-[11px] leading-relaxed"
                            style={{
                              whiteSpace: 'pre-wrap',
                              overflowWrap: 'anywhere',
                              overflowY: 'auto',
                              maxHeight: '120px',
                            }}
                          >
                            {formatExampleText(expectedText ?? r.expected ?? '—')}
                          </pre>
                        </div>

                        {/* Your Output / Error */}
                        <div className="space-y-1">
                          <span
                            className={`text-[11px] font-semibold font-sans uppercase tracking-wider ${
                              !r.passed && !hasActual && (hasStderr || hasCompile)
                                ? 'text-rose-600'
                                : 'text-slate-500'
                            }`}
                          >
                            {outputLabel}:
                          </span>
                          <pre
                            className={`p-2.5 rounded-lg border font-mono text-[11px] leading-relaxed ${
                              r.passed
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                : 'bg-rose-50 text-rose-900 border-rose-200'
                            }`}
                            style={{
                              whiteSpace: 'pre-wrap',
                              overflowWrap: 'anywhere',
                              overflowY: 'auto',
                              maxHeight: '240px',
                            }}
                          >
                            {outputContent}
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="space-y-4">
                    {/* SYSTEM / NETWORK / SERVICE ERROR */}
                    {!execResult.success && !isCompilationError && !isTle && !isRuntimeError && (
                      <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/80 space-y-2 text-xs">
                        <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          <span>
                            {execResult.errorType === 'COMPILER_SERVICE_UNAVAILABLE'
                              ? 'Execution Service Unavailable'
                              : execResult.errorType === 'NETWORK_ERROR'
                              ? 'Network Error'
                              : 'Execution Error'}
                          </span>
                        </div>
                        <p className="text-rose-900 font-mono text-xs">
                          {execResult.message || 'An error occurred during code execution.'}
                        </p>
                      </div>
                    )}

                    {/* CASE 3: COMPILATION ERROR */}
                    {isCompilationError && (
                      <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/80 space-y-3 text-xs">
                        <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          <span>❌ Compilation Error</span>
                        </div>
                        <pre className="p-3 bg-white rounded-lg border border-rose-200 text-rose-900 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                          {execResult.compileOutput || execResult.message || "Compilation failed."}
                        </pre>
                        <p className="text-[11px] text-slate-600 italic">
                          Inspect your submitted code in the editor above to correct the syntax errors before re-submitting.
                        </p>
                      </div>
                    )}

                    {/* CASE 5: TIME LIMIT / EXECUTION TIMEOUT */}
                    {!isCompilationError && isTle && (
                      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/80 space-y-3 text-xs">
                        <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                          <span>❌ Execution Failed / Time Limit Exceeded</span>
                        </div>
                        {tleResult?.input && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Input:</span>
                            <pre className="p-2.5 bg-white border border-amber-200 rounded-lg font-mono text-slate-800 text-xs whitespace-pre-wrap max-h-28 overflow-y-auto">
                              {tleResult.input}
                            </pre>
                          </div>
                        )}
                        {(tleResult?.executionTime || tleResult?.time) && (
                          <div className="text-xs text-slate-700 font-mono">
                            <strong>Execution Time:</strong> {tleResult.executionTime ?? tleResult.time}s
                          </div>
                        )}
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Error:</span>
                          <pre className="p-3 bg-white rounded-lg border border-amber-200 text-amber-900 font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                            {tleResult?.stderr || execResult.message || "Your solution exceeded the time limit threshold."}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* CASE 4: RUNTIME ERROR */}
                    {!isCompilationError && !isTle && isRuntimeError && (
                      <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/80 space-y-3 text-xs">
                        <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          <span>❌ Runtime Error</span>
                        </div>
                        {runtimeFailedResult?.input && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Input:</span>
                            <pre className="p-2.5 bg-white border border-rose-200 rounded-lg font-mono text-slate-800 text-xs whitespace-pre-wrap max-h-28 overflow-y-auto">
                              {runtimeFailedResult.input}
                            </pre>
                          </div>
                        )}
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Error:</span>
                          <pre className="p-3 bg-white rounded-lg border border-rose-200 text-rose-900 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                            {runtimeFailedResult?.stderr || execResult.stderr || execResult.message || "Runtime exception occurred."}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* CASE 1: ALL TESTS PASS */}
                    {allPass && (
                      <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/70 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-emerald-950">
                                  {execResult.runMode === 'RUN' ? '✅ Run Code Passed' : '✅ Accepted'}
                                </h3>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  execResult.runMode === 'RUN'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                }`}>
                                  {execResult.runMode === 'RUN' ? 'Run Result (First 2 Tests)' : 'Official Submission'}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-emerald-800 font-mono">
                                {passedCount} / {totalCount} Test Cases Passed
                              </p>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                          {execResult.runMode === 'RUN'
                            ? 'The first 2 visible test cases passed. This is a quick validation run only. Click "Submit Solution" to run all visible test cases and record your official submission.'
                            : 'All visible test cases passed successfully. Official submission recorded.'}
                        </p>
                        {totalCount > 0 && (
                          <button
                            onClick={() => setShowPassedCases(prev => !prev)}
                            className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer pt-1 inline-block"
                          >
                            {showPassedCases ? 'Hide test case details ▲' : `Inspect test cases (${totalCount}) ▼`}
                          </button>
                        )}
                        {showPassedCases && (
                          <div className="space-y-3 pt-2">
                            {allCases.map((r, i) => renderTestCaseCard(r, i))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* CASE 2: SOME TESTS FAIL (WRONG ANSWER) */}
                    {execResult.success && totalCount > 0 && !allPass && !isCompilationError && !isTle && !isRuntimeError && (
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-bold text-rose-900">
                              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                              <span>{execResult.runMode === 'RUN' ? '❌ Run Code Failed' : '❌ Wrong Answer'}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              execResult.runMode === 'RUN'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-purple-100 text-purple-800 border border-purple-300'
                            }`}>
                              {execResult.runMode === 'RUN' ? 'Run Result (First 2 Tests)' : 'Official Submission'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-semibold font-mono">
                            <span className="text-emerald-700">✓ {passedCount} / {totalCount} Test Cases Passed</span>
                            <span className="text-rose-700">✗ {totalCount - passedCount} / {totalCount} Test Cases Failed</span>
                          </div>
                          {execResult.runMode === 'RUN' && (
                            <p className="text-[11px] text-amber-900 font-medium pt-1">
                              Note: Run Code evaluated only the first 2 visible test cases for quick validation. Fix issues and test again or submit your solution.
                            </p>
                          )}
                        </div>

                        {/* For EVERY failed test case, show Test Case #N, Input, Expected Output, Your Output */}
                        <div className="space-y-3">
                          {failedCases.map((r, i) => renderTestCaseCard(r, r.index !== undefined ? r.index - 1 : i))}
                        </div>

                        {/* Optional toggle to view passed test cases */}
                        {passedCases.length > 0 && (
                          <div className="pt-2">
                            <button
                              onClick={() => setShowPassedCases(prev => !prev)}
                              className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                            >
                              {showPassedCases ? 'Hide passed test cases ▲' : `View ${passedCases.length} passed test case(s) ▼`}
                            </button>
                            {showPassedCases && (
                              <div className="space-y-3 pt-2">
                                {passedCases.map((r, i) => renderTestCaseCard(r, r.index !== undefined ? r.index - 1 : i))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fallback when no per-test results */}
                    {allCases.length === 0 && execResult.success && !isCompilationError && !isTle && !isRuntimeError && (
                      <div className="space-y-2">
                        {(execResult.stdout || execResult.stderr || execResult.compileOutput) ? (
                          <>
                            {execResult.stdout && (
                              <div className="space-y-1">
                                <span className="text-[11px] font-semibold font-sans text-slate-500 uppercase tracking-wider">Standard Output</span>
                                <pre
                                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed"
                                  style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', overflowY: 'auto', maxHeight: '200px' }}
                                >
                                  {execResult.stdout}
                                </pre>
                              </div>
                            )}
                            {(execResult.stderr || execResult.compileOutput) && (
                              <div className="space-y-1">
                                <span className="text-[11px] font-semibold font-sans text-rose-600 uppercase tracking-wider">
                                  {execResult.compileOutput ? 'Compiler Output' : 'Runtime Error / stderr'}
                                </span>
                                <pre
                                  className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs font-mono text-rose-900 leading-relaxed"
                                  style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', overflowY: 'auto', maxHeight: '300px' }}
                                >
                                  {execResult.compileOutput || execResult.stderr}
                                </pre>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-700">
                            Program executed with no standard output.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-8">
                  <Terminal className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-medium text-slate-600">No output generated yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click <strong>Run Code</strong> (Ctrl + Enter) to test your solution with sample test cases.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingRound;

