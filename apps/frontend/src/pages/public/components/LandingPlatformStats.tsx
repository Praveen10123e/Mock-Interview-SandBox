import type { FC } from 'react';
import { BookOpen, LayoutTemplate, Code2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useStatistics } from '../../../api/questions';
import { Card } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';

export const LandingPlatformStats: FC = () => {
  const { data: stats, isLoading } = useStatistics();

  const metrics = [
    {
      title: 'Practice Questions',
      value: stats?.totalQuestions ? `${stats.totalQuestions}+` : '60+',
      subtitle: 'Curated technical problems',
      icon: <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
    },
    {
      title: 'Curriculum Domains',
      value: '9',
      subtitle: 'Aptitude, Core CS & Coding',
      icon: <LayoutTemplate className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
    },
    {
      title: 'Execution Environments',
      value: '5',
      subtitle: 'Python, JS, Java, C, C++',
      icon: <Code2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
    },
    {
      title: 'Interview Assessment',
      value: '3-Round',
      subtitle: 'Aptitude · Coding · HR',
      icon: <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    },
  ];

  return (
    <section className="py-12 border-y border-border bg-surface-deep/50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Section Heading & Truthful Platform Context */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-xs font-semibold text-accent uppercase tracking-wider font-mono">
            Platform Capabilities
          </h2>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Built for Technical Interview Readiness
          </p>
          <p className="text-xs sm:text-sm text-text-secondary">
            Engineered to assess real problem-solving, clean code implementation, algorithmic complexity, and behavioral communication.
          </p>
        </div>

        {/* 4 Refined Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))
          ) : (
            metrics.map((m) => (
              <Card key={m.title} className="p-5 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {m.title}
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                    {m.value}
                  </div>
                  <p className="text-xs text-text-muted">{m.subtitle}</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-surface-elevated border border-border flex items-center justify-center shrink-0 shadow-xs">
                  {m.icon}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Product Focus Pillars */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs font-semibold text-text-secondary">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-surface border border-border-card shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Aptitude & Logic MCQs</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-surface border border-border-card shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
            <span>Multi-Language Live Coding</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-surface border border-border-card shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-purple-500 shrink-0" />
            <span>Relational SQL Querying</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-surface border border-border-card shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Behavioral & Situational HR</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingPlatformStats;
