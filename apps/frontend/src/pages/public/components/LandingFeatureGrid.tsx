import type { FC } from 'react';
import {
  Terminal,
  Cpu,
  ShieldCheck,
  Database,
  Users,
  BarChart3,
} from 'lucide-react';
import { Card } from '../../../components/ui/card';

export const LandingFeatureGrid: FC = () => {
  const features = [
    {
      title: 'Judge0 Multi-Language Execution',
      desc: 'Execute algorithmic code in Python, JavaScript, Java, C, and C++ with test verification, input/output validation, and execution timing metrics.',
      icon: <Terminal className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
      tone: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      title: '3-Round Structured Interviews',
      desc: 'Experience a unified 3-stage evaluation format matching industry hiring workflows: Aptitude MCQs, live algorithmic Coding, and AI conversational HR.',
      icon: <Cpu className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
      tone: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      title: 'Proctored Focus Guard Telemetry',
      desc: 'Grace-period tab lock and window focus tracking record integrity metrics during formal sessions without causing false disqualifications.',
      icon: <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      tone: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Relational SQL Query Workspace',
      desc: 'Solve database querying challenges with syntax highlighting, relational schema schemas, and live query output tables.',
      icon: <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      tone: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Conversational HR Assessments',
      desc: 'Engage with situational, behavioral, and conflict-resolution interview prompts designed to benchmark communication and professional readiness.',
      icon: <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
      tone: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Multidimensional Score Analytics',
      desc: 'Receive immediate session performance breakdowns across problem solving, code correctness, execution efficiency, and topic mastery.',
      icon: <BarChart3 className="h-5 w-5 text-rose-600 dark:text-rose-400" />,
      tone: 'bg-rose-500/10 border-rose-500/20',
    },
  ];

  return (
    <section id="features" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
      <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
        <h2 className="text-xs font-semibold text-accent uppercase tracking-wider font-mono">
          Architecture & Capabilities
        </h2>
        <p className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
          Engineered for Real Technical Assessment
        </p>
        <p className="text-xs sm:text-sm text-text-secondary">
          Every tool, runner, and proctoring telemetry system built directly into the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f) => (
          <Card
            key={f.title}
            className="p-6 flex flex-col justify-between space-y-4 hover:border-accent/40 transition-all group"
          >
            <div className="space-y-3">
              <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${f.tone} group-hover:scale-105 transition-transform shadow-xs`}>
                {f.icon}
              </div>
              <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors">
                {f.title}
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                {f.desc}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default LandingFeatureGrid;
