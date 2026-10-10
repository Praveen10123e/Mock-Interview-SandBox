import type { FC } from 'react';
import { BookOpen, ShieldCheck, Cpu, BarChart3 } from 'lucide-react';
import { Card } from '../../../components/ui/card';

export const LandingHowItWorks: FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Practice & Skill Discovery',
      desc: 'Browse curriculum questions across DSA, SQL, and Aptitude. Test your logic with instant Judge0 feedback.',
      icon: <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
    },
    {
      step: '02',
      title: 'Pre-flight Diagnostics',
      desc: 'Verify browser camera, audio, network connectivity, and fullscreen permissions before session lock-in.',
      icon: <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
    },
    {
      step: '03',
      title: 'Multi-Round Simulation',
      desc: 'Navigate timed Aptitude MCQs, algorithmic Coding rounds, and conversational AI HR situational prompts.',
      icon: <Cpu className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
    },
    {
      step: '04',
      title: 'Comprehensive Evaluation',
      desc: 'Review composite scores, individual test cases, proctoring violation logs, and competency analytics.',
      icon: <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
    },
  ];

  return (
    <section id="workflow" className="py-16 md:py-24 border-y border-border bg-surface-deep/40 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-xs font-semibold text-accent uppercase tracking-wider font-mono">
            How It Works
          </h2>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            The Candidate Assessment Lifecycle
          </p>
          <p className="text-xs sm:text-sm text-text-secondary">
            A structured workflow designed to build confidence from standalone problem practice to full mock interviews.
          </p>
        </div>

        {/* Timeline Grid (Horizontal Desktop / Vertical Mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {steps.map((s) => (
            <Card
              key={s.step}
              className="p-6 flex flex-col justify-between space-y-4 hover:border-accent/40 transition-all group relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-accent px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/25">
                  STEP {s.step}
                </span>
                <div className="h-8 w-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center shadow-xs">
                  {s.icon}
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                  {s.title}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingHowItWorks;
