import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/shared/PageHeader';
import { StatCard } from '../../../components/shared/StatCard';
import { PerformanceTrendChart, type InterviewProgressPoint } from '../components/PerformanceTrendChart';
import { RoundPerformanceChart } from '../components/RoundPerformanceChart';
import { InterviewAutopsyView } from '../components/InterviewAutopsyView';
import { InterviewDNAView } from '../components/InterviewDNAView';
import { PersonalizedImprovementView } from '../components/PersonalizedImprovementView';
import { InterviewService } from '../../interview/services/interview.service';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  TrendingUp,
  Award,
  Calendar,
  ArrowRight,
  Sparkles,
  Target,
  Dna,
  Flame,
  LayoutDashboard,
  ShieldCheck,
  TrendingDown,
  Compass,
} from 'lucide-react';

export const ProgressDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'overview' | 'dna' | 'autopsy' | 'plan'>('overview');
  const [interviews, setInterviews] = useState<any[]>([]);
  const [isLoadingInterviews, setIsLoadingInterviews] = useState(true);

  useEffect(() => {
    setIsLoadingInterviews(true);
    InterviewService.getInterviews()
      .then((data) => {
        setInterviews(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Failed to load progress interviews:', err);
      })
      .finally(() => {
        setIsLoadingInterviews(false);
      });
  }, []);

  // ── Extract Chronological Completed Interviews ──
  // Only valid completed or finalized sessions are included
  const completedChronological = interviews
    .filter((i) => i.state === 'COMPLETED' || i.session?.finalizedAt)
    .slice()
    .reverse();

  const trendPoints: InterviewProgressPoint[] = [];

  completedChronological.forEach((inv, idx) => {
    const snap = inv.session?.reportSnapshot;
    const overall = snap?.overallScore ?? snap?.overallProficiencyScore;
    if (typeof overall !== 'number' || isNaN(overall)) return;

    const dateStr = inv.createdAt || inv.session?.finalizedAt;
    const d = dateStr ? new Date(dateStr) : new Date();
    const formattedDate = !isNaN(d.getTime())
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : `Assessment ${idx + 1}`;

    const apt = typeof snap?.stages?.aptitude?.scorePercentage === 'number' ? snap.stages.aptitude.scorePercentage : null;
    const coding = typeof snap?.stages?.coding?.scorePercentage === 'number' ? snap.stages.coding.scorePercentage : null;
    const rawHr =
      snap?.stages?.hr?.scorePercentage ??
      snap?.stages?.hr?.overallScore ??
      snap?.stages?.hr?.analysis?.overallScore ??
      snap?.scoreBreakdown?.hrScore ??
      snap?.stages?.hr?.analysis?.communicationScore ??
      (typeof inv.hrScore === 'number' ? inv.hrScore : null);

    const hr = typeof rawHr === 'number' && !isNaN(rawHr) ? Math.round(rawHr) : null;

    trendPoints.push({
      id: inv.id,
      interviewNumber: idx + 1,
      label: `Interview ${idx + 1}`,
      formattedDate,
      overallScore: overall,
      aptitudeScore: apt,
      codingScore: coding,
      hrScore: hr,
    });
  });

  const totalEvaluationsCount = trendPoints.length;
  const hasMultipleInterviews = totalEvaluationsCount >= 2;

  // ── Growth Summary Calculations ──
  const latestPoint = trendPoints[trendPoints.length - 1] || null;
  const prevPoint = trendPoints.length >= 2 ? trendPoints[trendPoints.length - 2] : null;

  const latestScore = latestPoint?.overallScore ?? null;
  const prevScore = prevPoint?.overallScore ?? null;
  const bestScore = trendPoints.length > 0 ? Math.max(...trendPoints.map((p) => p.overallScore)) : null;

  let deltaFromPrev: number | null = null;
  if (latestScore !== null && prevScore !== null) {
    deltaFromPrev = latestScore - prevScore;
  }

  // ── Extract Strongest Skill & Main Focus Area from Latest Snapshot ──
  const latestSnapshot = completedChronological[completedChronological.length - 1]?.session?.reportSnapshot || null;
  const prevSnapshot = completedChronological.length >= 2
    ? completedChronological[completedChronological.length - 2]?.session?.reportSnapshot
    : null;

  interface SkillItem {
    name: string;
    category: string;
    score: number;
    prevScore: number | null;
  }

  const allSkills: SkillItem[] = [];

  if (latestSnapshot) {
    const hrCompetencies = latestSnapshot?.stages?.hr?.analysis?.competencyScores || {};
    const prevHrCompetencies = prevSnapshot?.stages?.hr?.analysis?.competencyScores || {};

    const hrDims = [
      { key: 'relevance', name: 'Relevance' },
      { key: 'specificity', name: 'Specificity' },
      { key: 'evidence', name: 'Technical Evidence' },
      { key: 'structure', name: 'STAR Structure' },
      { key: 'clarity', name: 'Communication Clarity' },
      { key: 'technicalDepth', name: 'Technical Depth' },
      { key: 'ownership', name: 'Ownership' },
      { key: 'professionalism', name: 'Professionalism' },
    ];

    hrDims.forEach((dim) => {
      const s = hrCompetencies[dim.key];
      if (typeof s === 'number') {
        allSkills.push({
          name: dim.name,
          category: 'HR',
          score: Math.round(s),
          prevScore: typeof prevHrCompetencies[dim.key] === 'number' ? Math.round(prevHrCompetencies[dim.key]) : null,
        });
      }
    });

    const coding = latestSnapshot?.stages?.coding;
    const prevCoding = prevSnapshot?.stages?.coding;
    if (coding && typeof coding.scorePercentage === 'number') {
      allSkills.push({
        name: 'Algorithmic Problem Solving',
        category: 'Coding',
        score: Math.round(coding.scorePercentage),
        prevScore: prevCoding ? Math.round(prevCoding.scorePercentage) : null,
      });
    }

    const apt = latestSnapshot?.stages?.aptitude;
    const prevApt = prevSnapshot?.stages?.aptitude;
    if (apt && typeof apt.scorePercentage === 'number') {
      allSkills.push({
        name: 'Quantitative Reasoning',
        category: 'Aptitude',
        score: Math.round(apt.scorePercentage),
        prevScore: prevApt ? Math.round(prevApt.scorePercentage) : null,
      });
    }
  }

  // Determine Strongest Skill & Main Focus Area
  const sortedByScore = [...allSkills].sort((a, b) => b.score - a.score);
  const strongestSkill = sortedByScore.length > 0 ? sortedByScore[0] : null;
  const focusSkill = sortedByScore.length > 0 ? sortedByScore[sortedByScore.length - 1] : null;

  // What Changed items
  const improvingSkills = allSkills.filter((s) => s.prevScore !== null && s.score > s.prevScore);
  const regressedSkills = allSkills.filter((s) => s.prevScore !== null && s.score < s.prevScore);
  const stableSkills = allSkills.filter((s) => s.score >= 75);

  const topImproving = improvingSkills.length > 0 ? improvingSkills[0] : null;
  const topNeedsAttention = regressedSkills.length > 0 ? regressedSkills[0] : focusSkill;
  const topStable = stableSkills.length > 0 ? stableSkills[0] : null;

  // Next Step guidance based on main focus area
  const nextStepTitle = focusSkill ? focusSkill.name : 'Boundary & Edge Case Handling';
  const nextStepCategory = focusSkill?.category || 'Coding';
  const nextStepPracticeRoute = nextStepCategory === 'Coding'
    ? '/student/practice/questions?category=Algorithms'
    : nextStepCategory === 'Aptitude'
    ? '/student/practice/categories'
    : '/student/interviews';

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto w-full pb-12">
      {/* ── Page Header ── */}
      <PageHeader
        title="MY PROGRESS"
        description="See your interview performance, key improvements, and next steps."
        breadcrumbs={[
          { label: 'Dashboard', href: '/student/dashboard' },
          { label: 'My Progress' },
        ]}
        actions={
          <Button
            onClick={() => navigate('/student/interviews')}
            size="sm"
            leftIcon={<Calendar className="h-4 w-4" />}
            className="bg-slate-900 hover:bg-black text-white shadow-xs font-semibold"
          >
            Start New Mock Interview
          </Button>
        }
      />

      {/* ── Sub-Navigation Tabs (Clean Student-Friendly Language, No Phase Badges) ── */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveView('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 ${
            activeView === 'overview'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
          }`}
          title="See your overall performance, key improvements, and next steps"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveView('dna')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 ${
            activeView === 'dna'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
          }`}
          title="See how your skills are changing over time"
        >
          <Dna className="h-4 w-4" />
          <span>Interview DNA</span>
        </button>

        <button
          onClick={() => setActiveView('autopsy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 ${
            activeView === 'autopsy'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
          }`}
          title="Understand repeated mistakes and root causes"
        >
          <Target className="h-4 w-4" />
          <span>Interview Autopsy</span>
        </button>

        <button
          onClick={() => setActiveView('plan')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 ${
            activeView === 'plan'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
          }`}
          title="See what you should practice next"
        >
          <Flame className="h-4 w-4" />
          <span>Improvement Plan</span>
        </button>
      </div>

      {/* ── Tab Views ── */}
      {activeView === 'dna' ? (
        <InterviewDNAView />
      ) : activeView === 'autopsy' ? (
        <InterviewAutopsyView />
      ) : activeView === 'plan' ? (
        <PersonalizedImprovementView />
      ) : (
        /* ── Simple Progress Overview (Default Tab) ── */
        <div className="space-y-6 md:space-y-8">
          {/* 1. Summary Cards (Exactly 4 Cards) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Latest Interview Score"
              value={latestScore !== null ? `${latestScore}/100` : '--'}
              subtitle={
                deltaFromPrev !== null
                  ? `${deltaFromPrev >= 0 ? `↑ +${deltaFromPrev}` : `↓ ${deltaFromPrev}`} pts from previous`
                  : totalEvaluationsCount === 1
                  ? 'First recorded baseline'
                  : 'Awaiting first assessment'
              }
              icon={<Award className="h-5 w-5" />}
              tone={deltaFromPrev !== null && deltaFromPrev >= 0 ? 'success' : 'accent'}
            />

            <StatCard
              title="Best Interview Score"
              value={bestScore !== null ? `${bestScore}/100` : '--'}
              subtitle={totalEvaluationsCount > 0 ? `Highest score achieved` : 'Awaiting first assessment'}
              icon={<Sparkles className="h-5 w-5" />}
              tone="gold"
            />

            <StatCard
              title="Strongest Skill"
              value={strongestSkill ? strongestSkill.name : '--'}
              subtitle={strongestSkill ? `${strongestSkill.score}/100 current score` : 'Calculating baseline'}
              icon={<ShieldCheck className="h-5 w-5" />}
              tone="success"
            />

            <StatCard
              title="Main Focus Area"
              value={focusSkill ? focusSkill.name : '--'}
              subtitle={focusSkill ? `${focusSkill.score}/100 • Priority practice` : 'No recurring weaknesses'}
              icon={<Target className="h-5 w-5" />}
              tone="warning"
            />
          </section>

          {/* 2. Performance Trend Over Time */}
          <section className="space-y-4">
            {isLoadingInterviews ? (
              <Skeleton className="h-[320px] w-full rounded-2xl" />
            ) : hasMultipleInterviews ? (
              <div className="space-y-6">
                <PerformanceTrendChart data={trendPoints} />
                <RoundPerformanceChart data={trendPoints} />
              </div>
            ) : totalEvaluationsCount === 1 ? (
              <Card className="p-6 md:p-8 text-center space-y-3 overflow-hidden border-blue-200 bg-blue-50/20">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-slate-900">
                    Baseline Recorded: {latestScore}/100
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Complete your second mock interview to unlock longitudinal progression trendlines and skill velocity tracking.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={() => navigate('/student/interviews')}
                    size="sm"
                    className="bg-slate-900 hover:bg-black text-white font-semibold"
                  >
                    Start Second Mock Assessment
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-8 md:p-12 text-center space-y-3 overflow-hidden border-slate-200 bg-white">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
                  <Compass className="h-6 w-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-slate-900">No Assessment History Recorded Yet</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Take your first mock interview to diagnose your strengths, discover repeated mistakes, and receive a customized practice plan.
                  </p>
                </div>
                <div className="pt-2">
                  <Button onClick={() => navigate('/student/interviews')} className="bg-slate-900 hover:bg-black text-white font-semibold">
                    Start First Mock Assessment
                  </Button>
                </div>
              </Card>
            )}
          </section>

          {/* 3. "WHAT CHANGED?" Section (3 Simple Cards) */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 font-mono">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              What Changed?
            </h2>

            {hasMultipleInterviews ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* ↑ Improving */}
                <div className="p-4 rounded-xl bg-white border border-emerald-200/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Improving
                    </span>
                    {topImproving && (
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        +{topImproving.score - (topImproving.prevScore || 0)} pts
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {topImproving ? topImproving.name : 'Scores Holding Steady'}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {topImproving
                      ? `Improved from ${topImproving.prevScore} to ${topImproving.score}/100 in recent evaluation.`
                      : 'Maintain steady preparation to see continuous score gains.'}
                  </p>
                </div>

                {/* ↓ Needs Attention */}
                <div className="p-4 rounded-xl bg-white border border-rose-200/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-800 flex items-center gap-1">
                      <TrendingDown className="h-3.5 w-3.5 text-rose-600" /> Needs Attention
                    </span>
                    {topNeedsAttention && (
                      <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {topNeedsAttention.score}/100
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {topNeedsAttention ? topNeedsAttention.name : 'All Areas on Track'}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {topNeedsAttention
                      ? `Identified as your lowest scoring competency. Target this in your next practice session.`
                      : 'No critical developmental bottlenecks detected.'}
                  </p>
                </div>

                {/* → Stable Strength */}
                <div className="p-4 rounded-xl bg-white border border-blue-200/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-800 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Stable Strength
                    </span>
                    {topStable && (
                      <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {topStable.score}/100
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {topStable ? topStable.name : 'Establishing Baseline'}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {topStable
                      ? `Consistently high performance recorded across multi-round interview sessions.`
                      : 'Complete more interviews to identify your most reliable competencies.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-600">
                Complete another interview to see meaningful score trajectory changes.
              </div>
            )}
          </section>

          {/* 4. "YOUR NEXT STEP" Section (Direct High-Impact Action) */}
          <section className="space-y-3">
            <Card className="bg-white border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-mono font-bold uppercase border border-slate-200">
                      Recommended Next Step
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Based on your latest assessment
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Focus on: {nextStepTitle}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Practice targeted drills to reinforce boundary checks and structured explanations before your next mock interview.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={() => setActiveView('plan')}
                    variant="outline"
                    size="sm"
                    className="text-xs border-slate-300 text-slate-800 hover:bg-slate-50 font-semibold"
                  >
                    View Plan
                  </Button>
                  <Button
                    onClick={() => navigate(nextStepPracticeRoute)}
                    size="sm"
                    className="bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-xs"
                  >
                    Practice Now <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
};

export default ProgressDashboard;
