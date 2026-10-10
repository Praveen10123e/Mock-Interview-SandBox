import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Code2,
  BarChart3,
  Calendar,
  Sparkles,
  Award,
  Target,
  Brain,
  Users,
  Compass,
  FileText,
  Clock,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { useAuthStore } from '../../store/AuthStore';
import { useProfile } from '../../hooks/useProfile';
import { useStatistics, useCategories } from '../../api/questions';
import { Skeleton } from '../../components/ui/skeleton';
import { InterviewService } from '../../features/interview/services/interview.service';
import { StatusBadge } from '../../components/ui/badge';
import { StatCard } from '../../components/shared/StatCard';
import { getProcessedStudentCategories } from '../../utils/categoryMapping';

export const StudentDashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { data: profile } = useProfile();
  const { data: statsData, isLoading: isLoadingStats } = useStatistics();
  const { data: rawCategories } = useCategories();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [isLoadingInterviews, setIsLoadingInterviews] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoadingInterviews(true);
    InterviewService.getInterviews()
      .then((data) => {
        setInterviews(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Failed to load student interviews:', err);
      })
      .finally(() => {
        setIsLoadingInterviews(false);
      });
  }, []);

  // ── Candidate Name Resolution ──
  const rawFirst = (profile?.firstName || user?.firstName || '').trim();
  const rawLast = (profile?.lastName || user?.lastName || '').trim();
  const first = (rawFirst === 'New' && rawLast === 'User') ? '' : rawFirst;
  const last = (rawFirst === 'New' && rawLast === 'User') ? '' : rawLast;

  const combinedName = [first, last].filter(Boolean).join(' ');
  const emailPrefixName = user?.email ? user.email.split('@')[0].replace(/[._-]/g, ' ') : '';
  const formattedEmailName = emailPrefixName
    .split(' ')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

  const displayName = combinedName || user?.name || formattedEmailName || 'Candidate';

  // ── Real Completed Interviews & Score Calculations ──
  const completedInterviews = interviews.filter((i) => i.state === 'COMPLETED' || i.session?.finalizedAt);
  const totalInterviewsCount = interviews.length;

  const scoredInterviews = completedInterviews
    .map((inv) => {
      const snap = inv.session?.reportSnapshot;
      const score = snap?.overallScore ?? snap?.overallProficiencyScore;
      return typeof score === 'number' && !isNaN(score) ? score : null;
    })
    .filter((s): s is number => s !== null);

  const averageScore = scoredInterviews.length > 0
    ? Math.round(scoredInterviews.reduce((a, b) => a + b, 0) / scoredInterviews.length)
    : null;

  const bestScore = scoredInterviews.length > 0
    ? Math.max(...scoredInterviews)
    : null;

  // ── Latest & Previous Completed Interview ──
  const latestCompleted = completedInterviews[0] || null;
  const previousCompleted = completedInterviews[1] || null;

  const latestSnap = latestCompleted?.session?.reportSnapshot || null;
  const prevSnap = previousCompleted?.session?.reportSnapshot || null;

  const latestOverallScore = latestSnap?.overallScore ?? latestSnap?.overallProficiencyScore ?? null;
  const prevOverallScore = prevSnap?.overallScore ?? prevSnap?.overallProficiencyScore ?? null;

  // Round scores of latest completed
  const aptScore = latestSnap?.stages?.aptitude?.scorePercentage ?? null;
  const codingScore = latestSnap?.stages?.coding?.scorePercentage ?? null;
  const rawHrScore =
    latestSnap?.stages?.hr?.scorePercentage ??
    latestSnap?.stages?.hr?.overallScore ??
    latestSnap?.stages?.hr?.analysis?.overallScore ??
    latestSnap?.scoreBreakdown?.hrScore ??
    latestSnap?.stages?.hr?.analysis?.communicationScore ??
    (typeof latestCompleted?.hrScore === 'number' ? latestCompleted.hrScore : null);

  const hrScore = typeof rawHrScore === 'number' && !isNaN(rawHrScore) ? Math.round(rawHrScore) : null;
  const hrStatus = latestSnap?.stages?.hr?.status || latestCompleted?.hrStatus || (latestCompleted?.session?.status === 'ANALYZING' ? 'ANALYZING' : 'NOT_STARTED');

  // Score comparison calculation
  let scoreDiffText: string | null = null;
  let scoreDiffTone: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (latestOverallScore !== null && prevOverallScore !== null) {
    const diff = latestOverallScore - prevOverallScore;
    if (diff > 0) {
      scoreDiffText = `↑ +${diff} from previous interview`;
      scoreDiffTone = 'positive';
    } else if (diff < 0) {
      scoreDiffText = `↓ ${diff} from previous interview`;
      scoreDiffTone = 'negative';
    } else {
      scoreDiffText = `→ Same score as previous interview`;
      scoreDiffTone = 'neutral';
    }
  } else if (latestCompleted) {
    scoreDiffText = 'First recorded assessment';
  }

  // ── Deterministic Next Best Action ──
  let nextAction = {
    title: 'Take Your First Mock Interview',
    tag: 'Baseline Assessment',
    description: 'Establish your candidate readiness benchmark with a full 3-round mock interview.',
    recommendation: 'Complete Aptitude, Coding, and HR rounds under proctored simulation.',
    actionRoute: '/student/interviews',
    actionLabel: 'Start Mock Interview',
  };

  if (completedInterviews.length > 0) {
    const validScores: { name: string; score: number; type: 'coding' | 'aptitude' | 'hr' }[] = [];
    if (typeof codingScore === 'number') validScores.push({ name: 'Coding', score: codingScore, type: 'coding' });
    if (typeof aptScore === 'number') validScores.push({ name: 'Aptitude', score: aptScore, type: 'aptitude' });
    if (typeof hrScore === 'number') validScores.push({ name: 'HR Behavioral', score: hrScore, type: 'hr' });

    if (validScores.length > 0) {
      validScores.sort((a, b) => a.score - b.score);
      const lowest = validScores[0];

      if (lowest.score < 75) {
        if (lowest.type === 'coding') {
          nextAction = {
            title: 'Focus on Coding Practice',
            tag: 'Coding Lowest Round',
            description: `Coding is currently your lowest-performing round (${lowest.score}%).`,
            recommendation: 'Recommended: Practice algorithmic problem solving with test cases.',
            actionRoute: '/student/practice/questions',
            actionLabel: 'Practice Coding Problems',
          };
        } else if (lowest.type === 'aptitude') {
          nextAction = {
            title: 'Strengthen Quantitative & Logical Aptitude',
            tag: 'Aptitude Lowest Round',
            description: `Aptitude is currently your lowest-performing round (${lowest.score}%).`,
            recommendation: 'Recommended: Practice timed logical, quantitative, and verbal questions.',
            actionRoute: '/student/practice/categories',
            actionLabel: 'Practice Aptitude Sets',
          };
        } else if (lowest.type === 'hr') {
          nextAction = {
            title: 'Refine HR Behavioral Articulation',
            tag: 'HR Lowest Round',
            description: `HR Behavioral is currently your lowest-performing round (${lowest.score}%).`,
            recommendation: 'Recommended: Practice structured STAR method responses and technical depth.',
            actionRoute: '/student/interviews',
            actionLabel: 'Practice HR Round',
          };
        }
      } else if (hrScore === null) {
        nextAction = {
          title: 'Complete HR Behavioral Round',
          tag: 'HR Pending Assessment',
          description: 'Your Aptitude and Coding scores are strong (>= 75%), but your HR Behavioral round has not been evaluated yet.',
          recommendation: 'Recommended: Complete the HR Behavioral interview to unlock your full readiness profile.',
          actionRoute: '/student/interviews',
          actionLabel: 'Complete HR Round',
        };
      } else {
        nextAction = {
          title: 'Maintain Strong Readiness',
          tag: 'All Rounds Strong',
          description: 'You are performing consistently above 75% across all technical and behavioral rounds.',
          recommendation: 'Recommended: Take a full timed assessment to maintain your competitive edge.',
          actionRoute: '/student/interviews',
          actionLabel: 'Start Full Assessment',
        };
      }
    }
  }

  // ── Practice Domains ──
  const categories = getProcessedStudentCategories(rawCategories || []);
  const totalQuestions = statsData?.totalQuestions ?? 0;

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto w-full">
      {/* ── 1. Hero / Welcome Section ── */}
      <div className="rounded-2xl border border-border-card bg-surface p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm relative overflow-hidden">
        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Naan Mudhalvan Candidate Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Welcome back, {displayName}.
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Continue building your interview readiness across algorithmic problem solving, SQL databases, and AI-evaluated mock assessments.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0 w-full sm:w-auto">
          <Button
            onClick={() => navigate('/student/interviews')}
            size="lg"
            leftIcon={<Calendar className="h-4 w-4" />}
            className="flex-1 sm:flex-initial"
          >
            Start Mock Interview
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/student/practice')}
            size="lg"
            leftIcon={<Code2 className="h-4 w-4" />}
            className="flex-1 sm:flex-initial"
          >
            Continue Practice
          </Button>
        </div>
      </div>

      {/* ── 2. Top Summary Metrics (Real Data) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Interviews"
          value={isLoadingInterviews ? '...' : totalInterviewsCount}
          subtitle={`${completedInterviews.length} completed assessments`}
          icon={<History className="h-5 w-5" />}
          tone="violet"
        />
        <StatCard
          title="Average Score"
          value={averageScore !== null ? `${averageScore}/100` : '--'}
          subtitle={scoredInterviews.length > 0 ? `Across ${scoredInterviews.length} evaluations` : 'Awaiting evaluations'}
          icon={<Award className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          title="Best Score"
          value={bestScore !== null ? `${bestScore}/100` : '--'}
          subtitle={bestScore !== null ? 'Peak assessment performance' : 'No recorded scores yet'}
          icon={<Sparkles className="h-5 w-5" />}
          tone="gold"
        />
        <StatCard
          title="Problem Bank"
          value={isLoadingStats ? '...' : totalQuestions}
          subtitle="Curated interview questions"
          icon={<BookOpen className="h-5 w-5" />}
          tone="success"
        />
      </div>

      {/* ── 3. Performance & Next Best Action Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Performance (Latest Evaluation) */}
        <Card className="lg:col-span-2 flex flex-col justify-between overflow-hidden bg-white border border-slate-200/80 shadow-xs">
          <div>
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  Current Performance Across Rounds
                </CardTitle>
                {latestCompleted && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    Latest Assessment: {new Date(latestCompleted.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-5 md:p-6 space-y-5">
              {latestCompleted ? (
                <>
                  {/* Aptitude Round Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Brain className="h-4 w-4 text-sky-600" />
                        <span>Aptitude & Logic</span>
                      </div>
                      <span className="font-mono font-bold text-sky-600">
                        {aptScore !== null ? `${aptScore}%` : 'Not evaluated yet'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${aptScore !== null ? Math.min(100, Math.max(0, aptScore)) : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Coding Round Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Code2 className="h-4 w-4 text-emerald-600" />
                        <span>Coding & Data Structures</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-600">
                        {codingScore !== null ? `${codingScore}%` : 'Not evaluated yet'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${codingScore !== null ? Math.min(100, Math.max(0, codingScore)) : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* HR Round Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Users className="h-4 w-4 text-amber-600" />
                        <span>HR & Behavioral Readiness</span>
                      </div>
                      <span className="font-mono font-bold text-amber-600">
                        {hrScore !== null
                          ? `${hrScore}%`
                          : (hrStatus === 'ANALYZING' || hrStatus === 'IN_PROGRESS' || latestCompleted?.session?.status === 'ANALYZING')
                          ? 'Evaluation pending'
                          : 'Not evaluated yet'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${hrScore !== null ? Math.min(100, Math.max(0, hrScore)) : 0}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <Compass className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No evaluated round data recorded yet. Complete a mock interview assessment to visualize your round-by-round calibration.
                  </p>
                </div>
              )}
            </CardContent>
          </div>

          {latestCompleted && (
            <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Overall Assessment Score: <strong className="text-slate-900 font-mono">{latestOverallScore !== null ? `${latestOverallScore}/100` : '--'}</strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/student/interviews/summary/${latestCompleted.id}`)}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1 font-semibold"
              >
                View Full Breakdown <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </Card>

        {/* Next Best Action Card */}
        <Card className="flex flex-col justify-between bg-white border border-slate-200/80 shadow-xs overflow-hidden">
          <div>
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Target className="h-4 w-4 text-slate-700" />
                  Next Best Action
                </CardTitle>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                  {nextAction.tag}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <h3 className="text-base font-bold text-slate-900">{nextAction.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{nextAction.description}</p>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                {nextAction.recommendation}
              </div>
            </CardContent>
          </div>
          <div className="p-4 pt-0">
            <Button
              onClick={() => navigate(nextAction.actionRoute)}
              className="w-full gap-1.5 font-semibold bg-slate-900 hover:bg-black text-white shadow-2xs cursor-pointer"
            >
              {nextAction.actionLabel} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* ── 4. Latest Interview & Practice Overview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Completed Assessment Detail */}
        {latestCompleted && (
          <Card className="flex flex-col justify-between overflow-hidden bg-white border border-slate-200/80 shadow-xs">
            <div>
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Latest Completed Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div>
                  <h4 className="text-base font-bold text-slate-900">{latestCompleted.title || 'Practice Assessment'}</h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(latestCompleted.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-600 font-medium">Overall Score</span>
                    <div className="text-2xl font-bold font-mono text-blue-600 mt-0.5">
                      {latestOverallScore !== null ? `${latestOverallScore}/100` : '--'}
                    </div>
                  </div>
                  {scoreDiffText && (
                    <div className={`text-right text-xs font-semibold ${scoreDiffTone === 'positive' ? 'text-emerald-600' : scoreDiffTone === 'negative' ? 'text-rose-600' : 'text-slate-500'}`}>
                      {scoreDiffText}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 font-medium">Aptitude</span>
                    <p className="font-bold text-sky-600 mt-0.5 font-mono">{aptScore !== null ? `${aptScore}%` : '--'}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 font-medium">Coding</span>
                    <p className="font-bold text-emerald-600 mt-0.5 font-mono">{codingScore !== null ? `${codingScore}%` : '--'}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 font-medium">HR</span>
                    <p className="font-bold text-amber-600 mt-0.5 font-mono">{hrScore !== null ? `${hrScore}%` : '--'}</p>
                  </div>
                </div>
              </CardContent>
            </div>
            <div className="p-4 pt-0">
              <Button
                variant="outline"
                onClick={() => navigate(`/student/interviews/summary/${latestCompleted.id}`)}
                className="w-full gap-1 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <FileText className="h-3.5 w-3.5" /> View Diagnostic Report
              </Button>
            </div>
          </Card>
        )}

        {/* Practice Overview Breakdown */}
        <Card className={`${latestCompleted ? 'lg:col-span-2' : 'lg:col-span-3'} flex flex-col justify-between overflow-hidden bg-white border border-slate-200/80 shadow-xs`}>
          <div>
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  Practice Problem Bank Curriculum
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/student/practice')}
                  className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1 font-semibold"
                >
                  Explore Bank <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {categories.slice(0, 6).map((cat) => (
                  <div
                    key={cat.name}
                    onClick={() => navigate(`/student/practice/questions?category=${encodeURIComponent(cat.name)}`)}
                    className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-blue-300 hover:bg-white transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {cat.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 font-medium">
                        {cat.count} Qs
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{cat.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </div>
          <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>{totalQuestions} curated challenges across Data Structures, Algorithms, SQL, and Aptitude.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/student/practice/questions')}
              className="text-xs border-slate-200 text-slate-700 hover:bg-white"
            >
              Solve Challenges
            </Button>
          </div>
        </Card>
      </div>

      {/* ── 5. Recent Interview Activity ── */}
      <Card className="overflow-hidden bg-white border border-slate-200/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-mono">
              <Clock className="h-4 w-4 text-blue-600" />
              Recent Interview Activity
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/student/interviews')}
              className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold"
            >
              All Interviews ({interviews.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingInterviews ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : interviews.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {interviews.slice(0, 5).map((interview) => {
                const snap = interview.session?.reportSnapshot;
                const score = snap?.overallScore ?? snap?.overallProficiencyScore ?? null;
                const isCompleted = interview.state === 'COMPLETED';

                return (
                  <div
                    key={interview.id}
                    className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-semibold text-slate-900">
                          {interview.title || 'Mock Interview Session'}
                        </span>
                        <StatusBadge status={interview.state} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{new Date(interview.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span>•</span>
                        <span className="capitalize">{interview.interviewType?.toLowerCase() || 'mock'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                      {score !== null && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block font-medium">Score</span>
                          <span className="text-sm font-bold font-mono text-blue-600">{score}/100</span>
                        </div>
                      )}
                      {isCompleted ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/student/interviews/summary/${interview.id}`)}
                          className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          View Report
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/student/interviews/lobby/${interview.id}`)}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Resume
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center space-y-3">
              <Calendar className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-600">No assessment activity recorded yet.</p>
              <Button size="sm" onClick={() => navigate('/student/interviews')} className="bg-blue-600 hover:bg-blue-700 text-white">
                Launch First Mock Interview
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;
