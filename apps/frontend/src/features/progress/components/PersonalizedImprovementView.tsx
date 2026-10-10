import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import api from '../../../api/axios/instance';
import {
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Target,
  Calendar,
  Flame,
  Code2,
  Brain,
  MessageSquare,
  RotateCcw,
  HelpCircle,
} from 'lucide-react';

export interface PracticeTask {
  id: string;
  type: string;
  title: string;
  description: string;
  category: string;
  estimatedMinutes: number;
  practiceRoute: string;
  actionLabel: string;
  requiredCount: number;
  completedCount: number;
  isCompleted: boolean;
  completionNote?: string;
}

export interface ImprovementPriority {
  id: string;
  rank: number;
  category: 'CODING' | 'APTITUDE' | 'HR' | 'CROSS_ROUND';
  skillKey: string;
  title: string;
  priorityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priorityScore: number;
  currentScore: number;
  targetScore: number;
  scoreDeltaNeeded: number;
  status: string;
  statusLabel: string;
  rationale: string;
  evidenceSummary: string;
  evidenceSourceIds: string[];
  tasks: PracticeTask[];
  reassessmentMethod: string;
}

export interface ImprovementCoaching {
  coachingSummary: string;
  priorityGuidance: Array<{
    priorityId: string;
    skillTitle: string;
    actionAdvice: string;
    commonMistakeToAvoid: string;
    suggestedStructure: string;
  }>;
}

export interface ReassessmentGuidance {
  isReadyForReassessment: boolean;
  reassessmentType: string;
  recommendedSession: string;
  reassessmentReason: string;
  targetMetrics: string[];
}

export interface PersonalizedImprovementPlanResult {
  id: string;
  candidateId: string;
  generatedAt: string;
  analysisVersion: string;
  status: 'ACTIVE' | 'TARGETS_REACHED' | 'INSUFFICIENT_DATA';
  interviewsAnalyzed: number;
  isStale: boolean;
  staleReason?: string;
  topPriorities: ImprovementPriority[];
  secondaryPriorities: ImprovementPriority[];
  coaching: ImprovementCoaching;
  reassessment: ReassessmentGuidance;
  summary: string;
  kpis: {
    activePrioritiesCount: number;
    tasksInProgressCount: number;
    skillsImprovingCount: number;
    targetsReachedCount: number;
  };
}

export const PersonalizedImprovementView: React.FC = () => {
  const navigate = useNavigate();
  const [planData, setPlanData] = useState<PersonalizedImprovementPlanResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedWhyId, setExpandedWhyId] = useState<string | null>(null);
  const [showSecondary, setShowSecondary] = useState(false);

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

  const fetchPlan = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get('/interviews/improvement-plan/latest');
      if (res.data?.success && res.data.data) {
        setPlanData(res.data.data);
      } else {
        setError(extractErrorString(res.data?.error, 'Failed to load Improvement Plan.'));
      }
    } catch (err: any) {
      console.error('Error fetching Improvement Plan:', err);
      setError(extractErrorString(err, 'Network connection error while retrieving Improvement Plan.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshPlan = async () => {
    try {
      setIsUpdating(true);
      const res = await api.post('/interviews/improvement-plan/generate');
      if (res.data?.success && res.data.data) {
        setPlanData(res.data.data);
      }
    } catch (err: any) {
      console.error('Error refreshing Improvement Plan:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !planData) {
    return (
      <Card className="p-8 text-center space-y-4 bg-white border-slate-200">
        <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto border border-slate-200">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-base font-bold text-slate-900">Improvement Plan Unavailable</h3>
          <p className="text-xs text-slate-600">{error || 'Unable to load your personalized plan.'}</p>
        </div>
        <Button onClick={fetchPlan} size="sm" className="bg-slate-900 hover:bg-black text-white font-semibold">
          Retry Analysis
        </Button>
      </Card>
    );
  }

  // ── Empty State: 0 Completed Assessments ──
  if (planData.interviewsAnalyzed === 0 || planData.status === 'INSUFFICIENT_DATA') {
    return (
      <Card className="p-8 md:p-12 text-center space-y-4 overflow-hidden border-slate-200 bg-white">
        <div className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center mx-auto border border-slate-200">
          <Flame className="h-7 w-7" />
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-lg font-bold text-slate-900">
            No Improvement Plan Yet
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your personalized improvement plan will appear once you complete your first full mock interview assessment.
          </p>
        </div>
        <div className="pt-2">
          <Button onClick={() => navigate('/student/interviews')} className="bg-slate-900 hover:bg-black text-white font-semibold">
            <Calendar className="h-4 w-4 mr-1.5" /> Start First Mock Assessment
          </Button>
        </div>
      </Card>
    );
  }

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

  const getPriorityBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityDisplayLevel = (level: string) => {
    if (level === 'CRITICAL' || level === 'HIGH') return 'HIGH PRIORITY';
    if (level === 'MEDIUM') return 'MEDIUM PRIORITY';
    return 'LOW PRIORITY';
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* ── 1. Page Header & Subtitle ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Your Improvement Plan
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Practice the areas that will make the biggest difference.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshPlan}
          disabled={isUpdating}
          className="gap-1.5 text-xs bg-white text-slate-800 border-slate-300 hover:bg-slate-50 self-start sm:self-auto font-semibold cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          {isUpdating ? 'Recalculating...' : 'Refresh Plan'}
        </Button>
      </div>

      {/* ── 2. Staleness Banner ── */}
      {planData.isStale && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs text-xs">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="h-4 w-4 text-amber-600 animate-spin shrink-0" />
            <div>
              <strong className="font-semibold block text-amber-950">New Interview Evidence Available</strong>
              <span>{planData.staleReason || 'New mock interview results are recorded. Refresh to update practice recommendations.'}</span>
            </div>
          </div>
          <Button
            onClick={handleRefreshPlan}
            disabled={isUpdating}
            size="sm"
            className="bg-slate-900 hover:bg-black text-white shrink-0 font-semibold text-xs"
          >
            {isUpdating ? 'Recalculating...' : 'Refresh Plan'}
          </Button>
        </div>
      )}

      {/* ── 3. Improvement Loop Visualization (Assess -> Identify -> Practice -> Reassess) ── */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <span className="font-bold text-slate-900 font-mono text-[11px]">THE IMPROVEMENT LOOP:</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-[11px] font-semibold flex-wrap justify-center">
          <span className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-700">1. Take Interview</span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-700">2. Find Weakness</span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className="px-2.5 py-1 rounded bg-slate-900 text-white font-bold">3. Practice Drills</span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-700">4. Reassess</span>
        </div>
      </div>

      {/* ── 4. YOUR TOP 3 PRIORITIES (Primary Focus Section) ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 font-mono">
              <Flame className="h-4 w-4 text-slate-900" />
              Your Top Practice Priorities
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Target these specific areas before taking your next mock assessment
            </p>
          </div>
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline-block">
            {planData.interviewsAnalyzed} sessions evaluated
          </span>
        </div>

        <div className="space-y-4">
          {planData.topPriorities.slice(0, 3).map((prio) => {
            const progressPercent = Math.min(100, Math.round((prio.currentScore / prio.targetScore) * 100));
            const isWhyExpanded = expandedWhyId === prio.id;

            return (
              <Card
                key={prio.id}
                className="overflow-hidden bg-white border border-slate-200/80 hover:border-slate-300 shadow-xs transition-all"
              >
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Priority Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center font-mono font-bold text-slate-700 text-xs border border-slate-200">
                        #{prio.rank}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(prio.category)}
                          <h4 className="text-sm font-bold text-slate-900">{prio.title}</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono uppercase">
                          {prio.category.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${getPriorityBadge(
                          prio.priorityLevel
                        )}`}
                      >
                        {getPriorityDisplayLevel(prio.priorityLevel)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${
                          prio.status === 'TARGET_REACHED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : prio.status === 'IMPROVING'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : prio.status === 'REGRESSED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {prio.status === 'TARGET_REACHED'
                          ? 'Target Reached ✓'
                          : prio.status === 'IMPROVING'
                          ? 'Score Improving'
                          : prio.status === 'REGRESSED'
                          ? 'Needs Attention'
                          : 'Not Started'}
                      </span>
                    </div>
                  </div>

                  {/* Score Target Progress */}
                  <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">
                        Current: <strong className="text-slate-900 font-mono">{prio.currentScore}/100</strong>
                      </span>
                      <span className="text-slate-600 font-medium">
                        Target: <strong className="text-slate-900 font-mono">{prio.targetScore}/100</strong> ({prio.scoreDeltaNeeded > 0 ? `+${prio.scoreDeltaNeeded} pts needed` : 'Target Achieved'})
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          prio.currentScore >= prio.targetScore
                            ? 'bg-emerald-600'
                            : 'bg-slate-900'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Micro-Explanation: "Why am I seeing this?" */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700">
                        {prio.rationale}
                      </span>
                      <button
                        onClick={() => setExpandedWhyId(isWhyExpanded ? null : prio.id)}
                        className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="h-3 w-3" />
                        {isWhyExpanded ? 'Hide Details' : 'Why?'}
                      </button>
                    </div>

                    {isWhyExpanded && (
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1 mt-1">
                        <strong className="text-slate-900 font-semibold block">Evidence Context:</strong>
                        <p>{prio.evidenceSummary}</p>
                      </div>
                    )}
                  </div>

                  {/* Actionable Practice Tasks */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wide font-mono flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-slate-700" /> Actionable Practice Tasks:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {prio.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">{task.title}</span>
                              <span className="text-[10px] font-mono font-medium text-slate-400">
                                ~{task.estimatedMinutes} mins
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-snug">{task.description}</p>
                          </div>

                          <div className="pt-1 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-mono">
                              Goal: {task.requiredCount} problem{task.requiredCount > 1 ? 's' : ''}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => navigate(task.practiceRoute)}
                              className="bg-slate-900 hover:bg-black text-white text-xs h-7 px-2.5 font-semibold"
                            >
                              {task.actionLabel} <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── 5. Reassessment Guidance ── */}
      <section className="space-y-3">
        <Card className="bg-white border border-slate-200 shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <RotateCcw className="h-4 w-4 text-slate-700" />
              Reassessment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">
                  {planData.reassessment.recommendedSession}
                </h4>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  {planData.reassessment.reassessmentReason}
                </p>
              </div>
              <Button
                onClick={() => navigate('/student/interviews')}
                className="bg-slate-900 hover:bg-black text-white shrink-0 font-semibold shadow-xs"
              >
                <Calendar className="h-4 w-4 mr-1.5" /> Start Reassessment Mock
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── 6. Secondary Priorities (Collapsible Backlog) ── */}
      {planData.secondaryPriorities.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSecondary(!showSecondary)}
              className="text-xs font-semibold bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
            >
              {showSecondary ? 'Hide Secondary Priorities' : `View Secondary Priorities (${planData.secondaryPriorities.length})`}
            </Button>
          </div>

          {showSecondary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {planData.secondaryPriorities.map((sec) => (
                <div
                  key={sec.id}
                  className="p-4 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(sec.category)}
                      <span className="text-xs font-bold text-slate-900">{sec.title}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-600">
                      {sec.currentScore}/100
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">{sec.rationale}</p>
                  <div className="pt-1 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (sec.tasks[0]?.practiceRoute) navigate(sec.tasks[0].practiceRoute);
                      }}
                      className="text-xs bg-white text-slate-800 border-slate-300 hover:bg-slate-50 font-semibold"
                    >
                      Practice Drill <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default PersonalizedImprovementView;
