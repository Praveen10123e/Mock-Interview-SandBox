import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { StatCard } from '../../../components/shared/StatCard';
import api from '../../../api/axios/instance';
import {
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Code2,
  Brain,
  MessageSquare,
  Award,
  ChevronRight,
  Target,
  CheckCircle2,
  Flame,
  ArrowRight,
  ShieldAlert,
  X,
} from 'lucide-react';

export interface AutopsyEvidence {
  id: string;
  interviewId: string;
  interviewNumber: number;
  formattedDate: string;
  category: 'CODING' | 'APTITUDE' | 'HR';
  questionTitle: string;
  difficulty?: string;
  failedTestCases?: Array<{
    input: string;
    expected: string;
    actual: string;
    isEdgeCase?: boolean;
    explanation?: string;
  }>;
  codeSnippet?: string;
  primaryErrorType?: string | null;
  runtimeError?: string | null;
  hrDimensionScores?: Record<string, number>;
  sttTranscript?: string;
  verifiedTranscript?: string;
  missingCompetencies?: string[];
  hrQuestionType?: string;
  timeSpentSeconds?: number;
  userAnswer?: string;
  correctAnswer?: string;
  explanation?: string;
  sourceType: string;
}

export interface AutopsyFinding {
  id: string;
  category: 'CODING' | 'APTITUDE' | 'HR' | 'CROSS_ROUND';
  skill: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  patternType: 'RECURRING' | 'PERSISTENT' | 'EMERGING_PATTERN' | 'SINGLE_OCCURRENCE';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  interviewsAffected: number;
  totalOccurrences: number;
  likelyRootCause: string;
  impact: string;
  correctiveGuidance: string;
  evidence: AutopsyEvidence[];
  trendDirection?: 'RESOLVED' | 'IMPROVING' | 'PERSISTING' | 'WORSENING';
}

export interface ResolvedPattern {
  skill: string;
  category: string;
  resolvedAtInterviewNumber: number;
  evidenceSummary: string;
}

export interface CrossRoundPattern {
  id: string;
  symptomTitle: string;
  roundsInvolved: string[];
  hypothesis: string;
  confidence: string;
  correctiveStrategy: string;
  connectedEvidenceCount: number;
}

export interface InterviewAutopsyResult {
  id: string;
  candidateId: string;
  generatedAt: string;
  analysisVersion: string;
  status: 'COMPLETED' | 'INSUFFICIENT_DATA';
  interviewsAnalyzed: number;
  isStale: boolean;
  staleReason?: string;
  kpis: {
    interviewsAnalyzed: number;
    recurringWeaknessesCount: number;
    criticalFindingsCount: number;
    resolvedPatternsCount: number;
    confidenceScore: number;
  };
  findings: AutopsyFinding[];
  resolvedPatterns: ResolvedPattern[];
  strengths: string[];
  crossRoundPatterns: CrossRoundPattern[];
  summary: string;
}

export const InterviewAutopsyView: React.FC = () => {
  const [autopsy, setAutopsy] = useState<InterviewAutopsyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal / Slide-over state for detailed evidence
  const [evidenceModalFinding, setEvidenceModalFinding] = useState<AutopsyFinding | null>(null);
  const [showAllPatterns, setShowAllPatterns] = useState(false);

  const extractErrorString = (err: any, fallback: string): string => {
    if (!err) return fallback;
    if (typeof err === 'string') return err;
    if (typeof err.message === 'string') return err.message;
    if (err.error) {
      if (typeof err.error === 'string') return err.error;
      if (typeof err.error.message === 'string') return err.error.message;
    }
    if (err.response?.data) {
      const data = err.response.data;
      if (typeof data === 'string') return data;
      if (typeof data.message === 'string') return data.message;
      if (data.error) {
        if (typeof data.error === 'string') return data.error;
        if (typeof data.error.message === 'string') return data.error.message;
      }
    }
    return fallback;
  };

  const fetchAutopsy = async (forceGenerate = false) => {
    try {
      if (forceGenerate) {
        setRefreshing(true);
        const res = await api.post('/interviews/autopsy/generate');
        if (res.data?.success && res.data.data) {
          setAutopsy(res.data.data);
        }
      } else {
        setLoading(true);
        const res = await api.get('/interviews/autopsy/latest');
        if (res.data?.success && res.data.data) {
          setAutopsy(res.data.data);
        }
      }
      setError(null);
    } catch (err: any) {
      console.error('Failed to load interview autopsy:', err);
      setError(extractErrorString(err, 'Failed to load autopsy analysis.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAutopsy();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  const getPracticeRouteForCategory = (category: string) => {
    switch (category) {
      case 'CODING':
        return '/student/practice/questions?category=Algorithms';
      case 'APTITUDE':
        return '/student/practice/categories';
      case 'HR':
      default:
        return '/student/interviews';
    }
  };

  if (error || !autopsy) {
    return (
      <Card className="p-8 text-center bg-white border border-slate-200 rounded-xl space-y-3">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto border border-slate-200">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Failed to Load Interview Autopsy</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{error || 'An unexpected error occurred.'}</p>
        <Button
          onClick={() => fetchAutopsy(true)}
          size="sm"
          className="bg-slate-900 hover:bg-black text-white gap-1.5 font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry Analysis
        </Button>
      </Card>
    );
  }

  // ── Empty State: 0 Completed Assessments ──
  if (autopsy.status === 'INSUFFICIENT_DATA' || autopsy.interviewsAnalyzed === 0) {
    return (
      <Card className="p-8 md:p-12 text-center bg-white border border-slate-200 rounded-xl space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-center mx-auto">
          <Target className="h-7 w-7" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-lg font-bold text-slate-900">No Assessment Mistakes Recorded Yet</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Take mock interviews to diagnose recurring patterns, test case boundary failures, and communication gaps based on stored execution data.
          </p>
        </div>
        <div className="pt-2">
          <Button
            onClick={() => (window.location.href = '/student/interviews')}
            className="bg-slate-900 hover:bg-black text-white font-semibold"
          >
            Start First Mock Assessment
          </Button>
        </div>
      </Card>
    );
  }

  const { findings, strengths, resolvedPatterns, isStale, staleReason } = autopsy;

  // Student-friendly priority badge mapper
  const getFriendlyPriorityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return { label: 'High Priority', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'MEDIUM':
        return { label: 'Needs Attention', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: 'Watch Area', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'CODING':
        return <Code2 className="h-4 w-4 text-emerald-600" />;
      case 'APTITUDE':
        return <Brain className="h-4 w-4 text-sky-600" />;
      case 'HR':
        return <MessageSquare className="h-4 w-4 text-amber-600" />;
      default:
        return <Target className="h-4 w-4 text-violet-600" />;
    }
  };

  const top3Findings = findings.slice(0, 3);
  const remainingFindings = findings.slice(3);

  const recurringCount = findings.filter((f) => f.patternType === 'RECURRING' || f.patternType === 'PERSISTENT').length;
  const improvingCount = resolvedPatterns.length;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* ── 1. Page Header & Subtitle ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Interview Autopsy
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Understand the main reasons your performance is falling short.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchAutopsy(true)}
          disabled={refreshing}
          className="gap-1.5 text-xs bg-white text-slate-800 border-slate-300 hover:bg-slate-50 self-start sm:self-auto font-semibold cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Updating Autopsy...' : 'Refresh Autopsy'}
        </Button>
      </div>

      {/* ── 2. Staleness Banner ── */}
      {isStale && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-950 block font-semibold">New Interview Evidence Available</strong>
              <span className="text-amber-800 leading-relaxed">
                {staleReason || 'New mock interview results are recorded. Refresh to update failure diagnostics.'}
              </span>
            </div>
          </div>
          <Button
            onClick={() => fetchAutopsy(true)}
            size="sm"
            className="bg-slate-900 hover:bg-black text-white font-semibold self-start sm:self-auto shrink-0 text-xs"
          >
            Refresh Now
          </Button>
        </div>
      )}

      {/* ── 3. Top Summary (3 Simple Cards) ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Interviews Analyzed"
          value={`${autopsy.interviewsAnalyzed}`}
          subtitle="Recorded evaluation sessions"
          icon={<ShieldAlert className="h-5 w-5" />}
          tone="neutral"
        />

        <StatCard
          title="Main Recurring Issues"
          value={`${recurringCount}`}
          subtitle="Observed across multiple interviews"
          icon={<Flame className="h-5 w-5" />}
          tone={recurringCount > 0 ? 'warning' : 'neutral'}
        />

        <StatCard
          title="Improved Areas"
          value={`${improvingCount}`}
          subtitle="Past issues no longer observed"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="gold"
        />
      </section>

      {/* ── 4. YOUR TOP 3 ISSUES (Focused Primary Section) ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 font-mono">
              <Flame className="h-4 w-4 text-slate-900" />
              Your Top 3 Issues
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The primary reasons you lost marks in recent mock assessments
            </p>
          </div>
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline-block">
            {autopsy.interviewsAnalyzed} interviews analyzed
          </span>
        </div>

        {top3Findings.length > 0 ? (
          <div className="space-y-3">
            {top3Findings.map((finding, idx) => {
              const badge = getFriendlyPriorityBadge(finding.severity);
              const practiceUrl = getPracticeRouteForCategory(finding.category);

              return (
                <div
                  key={finding.id}
                  className="p-5 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center font-mono font-bold text-slate-700 text-xs">
                        #{idx + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(finding.category)}
                        <h4 className="text-sm font-bold text-slate-900">{finding.title}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Seen in {finding.interviewsAffected} interview{finding.interviewsAffected > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Why this matters:
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {finding.likelyRootCause || finding.impact}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-slate-700">
                      <strong className="text-slate-900 font-semibold">What to do: </strong>
                      {finding.correctiveGuidance}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEvidenceModalFinding(finding)}
                        className="text-xs bg-white text-slate-800 border-slate-300 hover:bg-slate-50 font-semibold"
                      >
                        View Why <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => (window.location.href = practiceUrl)}
                        className="bg-slate-900 hover:bg-black text-white text-xs font-semibold"
                      >
                        Practice Now
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="p-6 text-center text-xs text-slate-600 bg-white border-slate-200">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1.5" />
            <p className="font-semibold text-slate-800">No Recurring Failure Patterns Detected</p>
            <p className="text-slate-500">Your recent interviews did not show repeated mistakes across assessments.</p>
          </Card>
        )}

        {/* ── Secondary Patterns (Collapsible) ── */}
        {remainingFindings.length > 0 && (
          <div className="pt-2 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllPatterns(!showAllPatterns)}
              className="text-xs font-semibold bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
            >
              {showAllPatterns ? 'Hide Other Patterns' : `View All Patterns (${findings.length})`}
            </Button>

            {showAllPatterns && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 text-left">
                {remainingFindings.map((finding) => (
                  <div key={finding.id} className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(finding.category)}
                        <span className="text-xs font-bold text-slate-900">{finding.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {finding.interviewsAffected} sessions
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{finding.impact}</p>
                    <div className="pt-1 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEvidenceModalFinding(finding)}
                        className="text-xs bg-white text-slate-800 border-slate-300 hover:bg-slate-50 font-semibold"
                      >
                        View Why <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── 5. Demonstrated Strengths & Past Resolutions ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
        {/* Strengths */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Award className="h-4 w-4 text-slate-700" />
            Demonstrated Strengths
          </h4>
          {strengths.length > 0 ? (
            <ul className="space-y-1 text-xs text-slate-700">
              {strengths.map((str, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-slate-900 font-bold">•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Complete more sessions to record consistent strength areas.</p>
          )}
        </div>

        {/* Resolved Patterns */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-slate-700" />
            Resolved Weaknesses
          </h4>
          {resolvedPatterns.length > 0 ? (
            <ul className="space-y-1 text-xs text-slate-700">
              {resolvedPatterns.map((rp, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-slate-900 font-bold">✓</span>
                  <span><strong>{rp.skill}:</strong> {rp.evidenceSummary}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Practice assigned drills and take reassessment mocks to resolve flagged patterns.</p>
          )}
        </div>
      </section>

      {/* ── 6. Evidence Deep-Dive Modal / Slide-Over ── */}
      {evidenceModalFinding && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                  Detailed Failure Evidence
                </span>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  {getCategoryIcon(evidenceModalFinding.category)}
                  {evidenceModalFinding.title}
                </h3>
              </div>
              <button
                onClick={() => setEvidenceModalFinding(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-900 block font-semibold">Why this was flagged:</strong>
                <p className="text-slate-600 leading-relaxed">{evidenceModalFinding.likelyRootCause}</p>
                <span className="text-[10px] text-slate-400 block pt-1 italic">
                  Based on your previous assessments.
                </span>
              </div>

              <div className="space-y-3">
                <strong className="text-xs text-slate-900 block uppercase font-mono">
                  Recorded Assessment Instances ({evidenceModalFinding.evidence.length}):
                </strong>

                {evidenceModalFinding.evidence.map((ev, i) => (
                  <div key={ev.id || i} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800 border-b border-slate-100 pb-1.5">
                      <span>Assessment #{ev.interviewNumber} • {ev.questionTitle}</span>
                      <span className="text-slate-400 font-mono">{ev.formattedDate}</span>
                    </div>

                    {/* Failed Test Cases (Coding) */}
                    {ev.failedTestCases && ev.failedTestCases.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] uppercase font-bold text-rose-700 font-mono block">
                          Failed Visible Test Case:
                        </span>
                        {ev.failedTestCases.map((tc, tcIdx) => (
                          <div key={tcIdx} className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] space-y-1">
                            <div><span className="text-slate-500">Input: </span><code className="text-slate-900">{tc.input}</code></div>
                            <div><span className="text-slate-500">Expected: </span><code className="text-emerald-700">{tc.expected}</code></div>
                            <div><span className="text-slate-500">Actual: </span><code className="text-rose-700">{tc.actual}</code></div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* HR Transcript Excerpt */}
                    {ev.verifiedTranscript && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] uppercase font-bold text-amber-700 font-mono block">
                          Transcript Excerpt:
                        </span>
                        <p className="p-2.5 rounded bg-slate-50 border border-slate-200 italic text-slate-700 text-[11px]">
                          "{ev.verifiedTranscript.slice(0, 240)}..."
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <Button onClick={() => setEvidenceModalFinding(null)} size="sm" className="bg-slate-900 hover:bg-black text-white font-semibold">
                Close Evidence
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewAutopsyView;
