import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios/instance';
import {
  Calendar,
  Play,
  CheckCircle2,
  History,
  ArrowRight,
  BookOpen,
  Clock,
  Layers,
  Briefcase,
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { PageHeader } from '../../../components/shared/PageHeader';
import { StatCard } from '../../../components/shared/StatCard';
import { StatusBadge } from '../../../components/ui/badge';
import { InterviewService } from '../services/interview.service';
import { requestAssessmentFullscreen } from '../utils/fullscreen';

export const InterviewDashboard = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  const [interviews, setInterviews] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      InterviewService.getInterviews().catch(() => []),
      api.get('/templates?status=PUBLISHED').then((res) => res.data?.data || []).catch(() => []),
    ])
      .then(([sessionList, templateList]) => {
        setInterviews(Array.isArray(sessionList) ? sessionList : []);
        setTemplates(Array.isArray(templateList) ? templateList : []);
      });
  }, []);

  const handleStartPractice = async () => {
    try {
      setIsCreating(true);
      const res = await api.post('/interviews/practice');
      if (res.data && res.data.id) {
        await requestAssessmentFullscreen();
        navigate(`/student/interviews/session/${res.data.id}`);
      }
    } catch (err) {
      console.error('Failed to create practice session', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartTemplate = async (templateId: string) => {
    try {
      setIsCreating(true);
      const res = await api.post(`/interviews/templates/${templateId}/start`);
      if (res.data && res.data.id) {
        await requestAssessmentFullscreen();
        navigate(`/student/interviews/session/${res.data.id}`);
      }
    } catch (err) {
      console.error('Failed to start template session', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEnterSession = async (sessionId: string) => {
    await requestAssessmentFullscreen();
    navigate(`/student/interviews/session/${sessionId}`);
  };

  const completedInterviews = interviews.filter((i) => i.state === 'COMPLETED');
  const activeInterviews = interviews.filter((i) => i.state !== 'COMPLETED');

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto w-full pb-12">
      <PageHeader
        title="Interview Hub"
        description="Launch realistic technical interview simulations with proctoring, coding rounds, and AI HR assessments."
        breadcrumbs={[
          { label: 'Dashboard', href: '/student/dashboard' },
          { label: 'Interviews' },
        ]}
        actions={
          <Button
            onClick={handleStartPractice}
            isLoading={isCreating}
            size="lg"
            leftIcon={<Play className="h-4 w-4 fill-current" />}
          >
            Start Practice Assessment
          </Button>
        }
      />

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Available Assessments"
          value={templates.length + 1}
          tone="accent"
          icon={<BookOpen className="h-5 w-5" />}
          subtitle="Curated & practice tracks"
        />
        <StatCard
          title="Total Sessions"
          value={interviews.length}
          tone="violet"
          icon={<History className="h-5 w-5" />}
          subtitle="Mock attempts recorded"
        />
        <StatCard
          title="Completed"
          value={completedInterviews.length}
          tone="success"
          icon={<CheckCircle2 className="h-5 w-5" />}
          subtitle="Evaluated & finalized"
        />
        <StatCard
          title="In Progress"
          value={activeInterviews.length}
          tone="warning"
          icon={<Calendar className="h-5 w-5" />}
          subtitle="Ongoing session records"
        />
      </div>

      {/* ─── 1. AVAILABLE INTERVIEWS SECTION ─────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-accent" /> Available Interviews
            </h2>
            <p className="text-xs text-text-secondary">
              Official campus placements and curated skill assessments ready to take.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Quick Practice Card */}
          <Card className="p-5 flex flex-col justify-between border-accent/20 bg-accent/5 hover:border-accent/40 transition-all">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-accent/20 text-accent">
                  Standard Practice
                </span>
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> 60 mins
                </span>
              </div>
              <h3 className="font-bold text-base text-text-primary">
                General Technical Mock Interview
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Full-cycle evaluation covering 5 Aptitude MCQs, 2 Coding challenges (1 Easy + 1 Med/Hard), and Conversational HR.
              </p>
              <div className="flex items-center gap-3 pt-2 text-[11px] text-text-muted">
                <span className="flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-accent" /> 3 Stages
                </span>
                <span>•</span>
                <span>Mixed Difficulty</span>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-200 flex justify-end">
              <Button
                size="sm"
                onClick={handleStartPractice}
                disabled={isCreating}
                rightIcon={<Play className="h-3.5 w-3.5 fill-current" />}
              >
                Start Assessment
              </Button>
            </div>
          </Card>

          {/* Published Templates from Faculty */}
          {templates.map((tmpl) => {
            // Check if student has active attempt
            const existingAttempt = interviews.find(
              (i) => i.templateId === tmpl.id && i.state !== 'COMPLETED'
            );
            return (
              <Card
                key={tmpl.id}
                className="p-5 flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {tmpl.interviewType || 'MOCK'}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {tmpl.duration || 60} mins
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 line-clamp-1">
                    {tmpl.name}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {tmpl.description ||
                      'Comprehensive assessment with Aptitude, Coding, and HR interview rounds.'}
                  </p>
                  <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-slate-600" /> 3 Stages
                    </span>
                    <span>•</span>
                    <span className="capitalize">{tmpl.difficulty?.toLowerCase() || 'mixed'}</span>
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-200 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => handleStartTemplate(tmpl.id)}
                    disabled={isCreating}
                    rightIcon={<Play className="h-3.5 w-3.5 fill-current" />}
                  >
                    {existingAttempt ? 'Enter Assessment' : 'Start Assessment'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ─── 2. PREVIOUS INTERVIEWS SECTION ─────────────────────────────────── */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <History className="h-5 w-5 text-slate-700" /> Previous Interviews
            </h2>
            <p className="text-xs text-slate-500">
              Access active assessments or review finalized reports.
            </p>
          </div>
          <Button
            variant="link"
            size="sm"
            onClick={() => navigate('/student/reports')}
            className="text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1"
          >
            <span>View All Reports</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {interviews.length > 0 ? (
          <div className="space-y-3">
            {interviews.map((interview) => (
              <Card key={interview.id} className="p-5 transition-all hover:border-white/15">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-semibold text-sm md:text-base text-text-primary">
                        {interview.title || 'Technical Assessment'}
                      </h3>
                      <StatusBadge status={interview.state || 'PENDING'} />
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                        #NM-{interview.id.replace(/-/g, '').slice(0, 4).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary flex items-center gap-2">
                      <span>Created {new Date(interview.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>3 Stages (Aptitude • Coding • HR)</span>
                      <span>•</span>
                      <span className="capitalize">{interview.difficulty?.toLowerCase() || 'mixed'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {interview.state === 'COMPLETED' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/student/interviews/summary/${interview.id}`)}
                        rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                      >
                        View Report
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleEnterSession(interview.id)}
                        rightIcon={<Play className="h-3.5 w-3.5 fill-current" />}
                      >
                        Enter Assessment
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center border-dashed border-white/10">
            <p className="text-sm text-text-muted">
              You have not started any interview sessions yet.
            </p>
            <Button
              size="sm"
              onClick={handleStartPractice}
              className="mt-3"
              leftIcon={<Play className="h-3.5 w-3.5 fill-current" />}
            >
              Take Your First Assessment
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};
