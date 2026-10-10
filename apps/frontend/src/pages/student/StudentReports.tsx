import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { StatusBadge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { PageHeader } from '../../components/shared/PageHeader';
import { EmptyState } from '../../components/shared/EmptyState';
import { InterviewService } from '../../features/interview/services/interview.service';
import { FileText, Clock, ArrowRight, Play, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react';
import { Skeleton } from '../../components/ui/skeleton';

export const StudentReports: React.FC = () => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await InterviewService.getInterviews();
        setInterviews(data || []);
      } catch (err) {
        console.error("Failed to fetch reports", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto w-full">
      <PageHeader
        title="Performance Reports"
        description="Review comprehensive feedback, scoring breakdowns, and competency profiles from past assessments."
        breadcrumbs={[
          { label: 'Dashboard', href: '/student/dashboard' },
          { label: 'Reports' }
        ]}
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
      ) : interviews.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No Reports Recorded"
          description="Complete a mock interview session to generate multidimensional feedback reports and competency radar charts."
          actionLabel="Start Mock Interview"
          onAction={() => navigate('/student/interviews')}
        />
      ) : (
        <div className="space-y-4">
          {interviews.map((interview) => {
            const isCompleted = interview.state === 'COMPLETED';
            
            return (
              <Card key={interview.id} className="p-5 md:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-semibold text-base text-text-primary">
                        {interview.title || 'Technical Assessment'}
                      </h3>
                      <StatusBadge status={interview.state || 'PENDING'} />
                      <span className="text-[11px] font-mono text-text-muted">
                        ID: {interview.id.substring(0, 8)}...
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      Created on {new Date(interview.createdAt).toLocaleDateString()} · {interview.interviewType || 'PRACTICE'} · {interview.difficulty || 'MEDIUM'}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {isCompleted ? (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/student/interviews/summary/${interview.id}`)}
                        rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                      >
                        View Full Report
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/student/interviews/session/${interview.id}`)}
                        rightIcon={<Play className="h-3.5 w-3.5 fill-current" />}
                      >
                        Enter Assessment
                      </Button>
                    )}
                  </div>
                </div>

                {!isCompleted ? (
                  <div className="flex items-start sm:items-center gap-3 text-xs text-text-secondary p-3.5 rounded-xl border border-white/6 bg-white/[0.02] shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
                    <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                    <div className="leading-relaxed">
                      <span className="font-medium text-text-primary">Incomplete Assessment</span> — Progress through Aptitude, live Judge0 Coding, and AI HR rounds to finalize composite scoring.
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-text-muted pt-2 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Report finalized & saved</span>
                    </div>
                    <button 
                      onClick={() => navigate(`/student/interviews/summary/${interview.id}`)}
                      className="text-accent hover:text-accent-hover font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span>Inspect Scores</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </Card>
            );
          })}

          {/* Contextual overview card */}
          <div className="mt-6 rounded-2xl border border-[var(--border-card)] bg-[var(--surface-gradient)] p-5 md:p-6 shadow-[var(--card-shadow)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-primary uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <span>Multidimensional Evaluation Engine</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Scores evaluate problem solving, test case pass rates, code efficiency, time management, and communication clarity.
              </p>
            </div>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => navigate('/student/interviews')}
              leftIcon={<Sparkles className="h-3.5 w-3.5 text-accent" />}
            >
              Start New Interview
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentReports;
