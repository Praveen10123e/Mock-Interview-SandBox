import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import api from '../../../api/axios/instance';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Layers,
  BarChart3,
  ArrowRight,
  Award,
} from 'lucide-react';

export interface CanonicalSkillMetric {
  key: string;
  name: string;
  category: 'HR_BEHAVIORAL' | 'CODING_TECHNICAL' | 'APTITUDE_LOGIC' | 'CORE_COMPETENCY';
  currentScore: number | null;
  baselineScore: number | null;
  previousScore: number | null;
  absoluteChange: number | null;
  growthRate: number | null;
  trend: string;
  history: Array<{
    interviewId: string;
    interviewNumber: number;
    formattedDate: string;
    score: number;
  }>;
  description: string;
  isReliable: boolean;
}

export interface LongitudinalTimelinePoint {
  interviewId: string;
  interviewNumber: number;
  title: string;
  formattedDate: string;
  completedAt: string;
  overallScore: number | null;
  aptitudeScore: number | null;
  codingScore: number | null;
  hrScore: number | null;
  hrDimensions: Record<string, number>;
  codingTestsPassedRatio?: string;
  aptitudeAccuracyRatio?: string;
}

export interface SkillGrowthItem {
  skillKey: string;
  skillName: string;
  category: string;
  baselineScore: number;
  latestScore: number;
  absoluteChange: number;
  growthRate: number | null;
  trend: string;
  evidence: string;
  sourceInterviewIds: string[];
}

export interface StableStrengthItem {
  skillKey: string;
  skillName: string;
  category: string;
  averageScore: number;
  scoreRange: { min: number; max: number };
  interviewsDemonstrated: number;
  description: string;
  evidence: string;
}

export interface DNAMilestone {
  id: string;
  type: string;
  title: string;
  description: string;
  interviewId: string;
  interviewNumber: number;
  achievedAt: string;
}

export interface RoundProgression {
  round: 'APTITUDE' | 'CODING' | 'HR';
  name: string;
  baselineScore: number | null;
  latestScore: number | null;
  absoluteChange: number | null;
  growthRate: number | null;
  trend: string;
  history: Array<{ interviewNumber: number; formattedDate: string; score: number | null }>;
  summary: string;
}

export interface HRDimensionProgression {
  dimensionKey: string;
  dimensionName: string;
  description: string;
  baselineScore: number | null;
  latestScore: number | null;
  absoluteChange: number | null;
  growthRate: number | null;
  trend: string;
  history: Array<{ interviewNumber: number; formattedDate: string; score: number }>;
}

export interface AutopsyDNABridge {
  recurringWeaknessesCount: number;
  activeFindings: Array<{
    skill: string;
    title: string;
    severity: string;
    patternType: string;
    interviewsAffected: number;
    trendStatus: 'IMPROVING_BUT_BELOW_TARGET' | 'STABLE_WEAKNESS' | 'RECENT_REGRESSION';
    note: string;
  }>;
  resolvedFindings: Array<{
    skill: string;
    title: string;
    scoreDelta: number;
    resolutionNote: string;
  }>;
}

export interface AIInterpretation {
  overview: string;
  strongestGrowthSummary: string;
  regressionsWarning: string | null;
  stableStrengthsSummary: string;
  coachingObservations: string[];
  nextFocusAreas: Array<{
    skill: string;
    reason: string;
    actionAdvice: string;
  }>;
}

export interface InterviewDNASummaryResult {
  id: string;
  candidateId: string;
  generatedAt: string;
  analysisVersion: string;
  status: 'COMPLETED' | 'BASELINE_ONLY' | 'INSUFFICIENT_DATA';
  interviewsAnalyzed: number;
  isStale: boolean;
  staleReason?: string;
  currentProfile: {
    skills: CanonicalSkillMetric[];
    overallReadinessScore: number | null;
    readinessTier: 'DEVELOPING' | 'INTERVIEW_READY' | 'STRONG' | 'HIGHLY_CONSISTENT' | 'INSUFFICIENT_HISTORY';
    readinessDescription: string;
  };
  timelineSnapshots: LongitudinalTimelinePoint[];
  strongestGrowth: SkillGrowthItem[];
  recentRegressions: SkillGrowthItem[];
  stableStrengths: StableStrengthItem[];
  roundEvolution: RoundProgression[];
  hrDimensionEvolution: HRDimensionProgression[];
  milestones: DNAMilestone[];
  autopsyConnection: AutopsyDNABridge | null;
  aiInterpretation: AIInterpretation | null;
  summary: string;
  kpis: {
    interviewsAnalyzed: number;
    currentScore: number | null;
    strongestGrowthSkill: string | null;
    strongestGrowthDelta: number | null;
    recentRegressionsCount: number;
    stableStrengthsCount: number;
    priorityFocusSkill: string | null;
  };
}

export const InterviewDNAView: React.FC = () => {
  const navigate = useNavigate();
  const [dnaData, setDnaData] = useState<InterviewDNASummaryResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Progressive Disclosure states
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);

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

  const fetchDNA = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get('/interviews/dna/latest');
      if (res.data?.success && res.data.data) {
        setDnaData(res.data.data);
      } else {
        setError(extractErrorString(res.data?.error, 'Failed to load Interview DNA.'));
      }
    } catch (err: any) {
      console.error('Error fetching DNA snapshot:', err);
      setError(extractErrorString(err, 'Network connection error while retrieving Interview DNA.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFreshDNA = async () => {
    try {
      setIsUpdating(true);
      const res = await api.post('/interviews/dna/generate');
      if (res.data?.success && res.data.data) {
        setDnaData(res.data.data);
      }
    } catch (err: any) {
      console.error('Error refreshing DNA:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchDNA();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !dnaData) {
    return (
      <Card className="p-8 text-center space-y-4 bg-white border border-slate-200">
        <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mx-auto border border-slate-300">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-base font-bold text-slate-900">DNA Service Unavailable</h3>
          <p className="text-xs text-slate-600">{error || 'Unable to load your skills data.'}</p>
        </div>
        <Button onClick={fetchDNA} size="sm" className="bg-slate-900 hover:bg-black text-white font-semibold">
          Retry Analysis
        </Button>
      </Card>
    );
  }

  // ── Empty State: 0 Completed Assessments ──
  if (dnaData.interviewsAnalyzed === 0 || dnaData.status === 'INSUFFICIENT_DATA') {
    return (
      <Card className="p-8 md:p-12 text-center space-y-4 overflow-hidden border border-slate-200 bg-white">
        <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mx-auto border border-slate-300">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-base font-bold text-slate-900">
            No Interview History Yet
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Complete at least 2 mock interviews to track your skill evolution, measure growth velocity, and uncover long-term strengths.
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

  const skills = dnaData.currentProfile.skills || [];
  const visibleSkills = showAllSkills ? skills : skills.slice(0, 5);

  const topGrowth = dnaData.strongestGrowth[0] || null;
  const topRegression = dnaData.recentRegressions[0] || null;
  const readinessTier = dnaData.currentProfile.readinessTier?.replace('_', ' ') || 'Developing';
  const readinessScore = dnaData.currentProfile.overallReadinessScore ?? dnaData.kpis.currentScore ?? 0;
  const focusSkill = dnaData.kpis.priorityFocusSkill || (skills.length > 0 ? skills[0].name : 'Algorithmic Problem Solving');

  // Practice route resolution
  const isCodingFocus = focusSkill.toLowerCase().includes('algorithm') || focusSkill.toLowerCase().includes('coding') || focusSkill.toLowerCase().includes('boundary');
  const practiceRoute = isCodingFocus
    ? '/student/practice/questions?category=Algorithms'
    : focusSkill.toLowerCase().includes('aptitude') || focusSkill.toLowerCase().includes('quantitative')
    ? '/student/practice/categories'
    : '/student/interviews';

  return (
    <div className="space-y-6 md:space-y-8">
      {/* ── 1. Page Header & Subtitle ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Interview DNA
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            See how your interview skills are changing over time.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateFreshDNA}
          disabled={isUpdating}
          className="gap-1.5 text-xs border-slate-300 text-slate-800 hover:bg-slate-50 self-start sm:self-auto font-semibold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          {isUpdating ? 'Updating...' : 'Refresh Skills'}
        </Button>
      </div>

      {/* ── 2. Staleness Banner ── */}
      {dnaData.isStale && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="h-4 w-4 text-slate-700 animate-spin shrink-0" />
            <div>
              <strong className="font-semibold block text-slate-900">New Interview Evidence Available</strong>
              <span className="text-slate-600">{dnaData.staleReason || 'Your assessment records have updated. Refresh to update your skill profile.'}</span>
            </div>
          </div>
          <Button
            onClick={handleGenerateFreshDNA}
            disabled={isUpdating}
            size="sm"
            className="bg-slate-900 hover:bg-black text-white shrink-0 font-semibold text-xs"
          >
            {isUpdating ? 'Updating...' : 'Refresh Skills'}
          </Button>
        </div>
      )}

      {/* ── 3. TOP SUMMARY — ONLY 3 CARDS ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Overall Progress */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500 block uppercase font-mono">
            Overall Progress
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-900">{readinessScore}/100</span>
            <span className="text-xs font-semibold text-slate-600">{readinessTier}</span>
          </div>
          <p className="text-xs text-slate-500">Based on verified assessment history</p>
        </div>

        {/* Current Score */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500 block uppercase font-mono">
            Current Score
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-900">
              {dnaData.kpis.currentScore !== null ? `${dnaData.kpis.currentScore}/100` : `${readinessScore}/100`}
            </span>
            <span className="text-xs font-semibold text-slate-600">Latest session</span>
          </div>
          <p className="text-xs text-slate-500">{dnaData.interviewsAnalyzed} interviews analyzed</p>
        </div>

        {/* Main Area to Improve */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500 block uppercase font-mono">
            Main Focus
          </span>
          <div className="text-sm font-bold text-slate-900 truncate" title={focusSkill}>
            {focusSkill}
          </div>
          <p className="text-xs text-slate-500">Target for next mock interview</p>
        </div>
      </section>

      {/* ── 4. YOUR SKILL PROGRESS (Top 4–5 Skills by Default) ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
              Your Skill Progress
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Core competencies measured on a 0–100 scale
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {visibleSkills.map((skill) => {
            const hasScore = typeof skill.currentScore === 'number';
            const delta = skill.absoluteChange;
            return (
              <div
                key={skill.key}
                className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{skill.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono uppercase">
                      {skill.category.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{skill.description}</p>
                </div>

                <div className="flex items-center gap-4 shrink-0 sm:w-64">
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        !hasScore
                          ? 'bg-slate-300 w-0'
                          : skill.currentScore! >= 75
                          ? 'bg-emerald-600'
                          : skill.currentScore! >= 60
                          ? 'bg-slate-700'
                          : 'bg-slate-900'
                      }`}
                      style={{ width: `${hasScore ? Math.min(100, Math.max(5, skill.currentScore!)) : 0}%` }}
                    />
                  </div>

                  <div className="text-right w-16 shrink-0">
                    <span className="text-xs font-bold font-mono text-slate-900 block">
                      {hasScore ? `${skill.currentScore}/100` : 'No data'}
                    </span>
                    {delta !== null && (
                      <span className={`text-[10px] font-mono font-semibold ${delta >= 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {delta >= 0 ? `+${delta}` : delta} pts
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {skills.length > 5 && (
          <div className="text-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllSkills(!showAllSkills)}
              className="text-xs font-semibold text-slate-800 hover:bg-slate-50 border-slate-300"
            >
              {showAllSkills ? 'Show Fewer Skills' : `View All Skills (${skills.length})`}
            </Button>
          </div>
        )}
      </section>

      {/* ── 5. WHAT'S IMPROVING? (Max 2 Items) ── */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
          What's Improving?
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Item 1: Improving */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                {topGrowth ? topGrowth.skillName : 'Holding Steady'}
              </span>
              {topGrowth && (
                <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  +{topGrowth.absoluteChange} pts
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {topGrowth ? topGrowth.evidence : 'Complete another interview to measure longitudinal gains.'}
            </p>
          </div>

          {/* Item 2: Regression or Main Focus */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5 text-slate-500" />
                {topRegression ? topRegression.skillName : 'No Significant Drops'}
              </span>
              {topRegression && (
                <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {topRegression.absoluteChange} pts
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {topRegression ? topRegression.evidence : 'All tracked competencies maintained or improved scores.'}
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. YOUR NEXT STEP (One Simple Card) ── */}
      <section className="space-y-3">
        <Card className="bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500">
                Your Main Focus
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                {focusSkill}
              </h4>
              <p className="text-xs text-slate-600">
                Practice boundary conditions and structured problem explanations before your next mock assessment.
              </p>
            </div>

            <Button
              onClick={() => navigate(practiceRoute)}
              size="sm"
              className="bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs shrink-0"
            >
              Practice Now <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </Card>
      </section>

      {/* ── 7. COLLAPSIBLE DETAILED ANALYSIS ── */}
      <section className="pt-2">
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedAnalysis(!showAdvancedAnalysis)}
            className="text-xs font-semibold text-slate-800 hover:bg-slate-50 border-slate-300"
          >
            {showAdvancedAnalysis ? 'Hide Detailed Analysis' : 'View Detailed Analysis'}
          </Button>
        </div>

        {showAdvancedAnalysis && (
          <div className="space-y-4 pt-4 border-t border-slate-200 mt-4">
            {/* HR 8 Dimensions */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-1.5">
                <Layers className="h-4 w-4" /> HR Behavioral 8-Dimension History
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {dnaData.hrDimensionEvolution.map((dim) => (
                  <div key={dim.dimensionKey} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{dim.dimensionName}</span>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {dim.latestScore !== null ? `${dim.latestScore}/100` : '--'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{dim.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones */}
            {dnaData.milestones.length > 0 && (
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-1.5">
                  <Award className="h-4 w-4" /> Verified Skill Milestones
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dnaData.milestones.map((ms) => (
                    <div key={ms.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                      <span className="text-xs font-bold text-slate-900 block">{ms.title}</span>
                      <p className="text-[11px] text-slate-600">{ms.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default InterviewDNAView;
