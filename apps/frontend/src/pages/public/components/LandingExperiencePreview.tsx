import type { FC } from 'react';
import { ShieldCheck, CheckCircle2, Award, Zap, TrendingUp } from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { StatusBadge } from '../../../components/ui/badge';

export const LandingExperiencePreview: FC = () => {
  return (
    <section id="experience" className="py-16 md:py-24 border-t border-border bg-surface-deep/30 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Showcase Item 1: Assessment Session UI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Proctored Simulation Experience</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Standardized Assessment Session Flow
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Experience structured interview sessions with integrated question countdown timers, sample inputs, live output consoles, and focus tracking.
            </p>
            <div className="space-y-2 pt-2 text-xs text-text-secondary">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Camera & microphone hardware verification check</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Fullscreen enforcement with tab-switch telemetry</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Real-time code persistence and automated snapshotting</span>
              </div>
            </div>
          </div>

          {/* Realistic Dashboard Mockup Card */}
          <Card className="p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-text-primary">Round 2 of 3: Live Coding</span>
              </div>
              <span className="text-xs font-mono text-text-muted px-2 py-0.5 rounded bg-surface border border-border">
                Timer: 24:18
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-surface border border-border-card flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-text-primary">Problem: Two Sum Array Pointers</p>
                  <p className="text-[11px] text-text-muted">Complexity: O(N) Time · O(1) Space</p>
                </div>
                <StatusBadge status="PASSED" />
              </div>

              <div className="p-3.5 rounded-xl bg-surface border border-border-card flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-text-primary">Focus Telemetry</p>
                  <p className="text-[11px] text-text-muted">0 tab violations · Fullscreen active</p>
                </div>
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">100% Integrity</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Showcase Item 2: Multidimensional Evaluation Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Card Mockup on Left */}
          <Card className="p-6 space-y-4 shadow-xl order-2 lg:order-1">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold text-text-primary">Assessment Scorecard</span>
              </div>
              <span className="text-xs font-mono text-accent font-bold">Grade: 88%</span>
            </div>

            <div className="space-y-2.5">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-text-secondary">Aptitude & Logical Reasoning</span>
                  <span className="text-text-primary">90%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-deep overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '90%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-text-secondary">Algorithmic Code Correctness</span>
                  <span className="text-text-primary">85%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-deep overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-text-secondary">Communication & Behavioral HR</span>
                  <span className="text-text-primary">88%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-deep overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '88%' }} />
                </div>
              </div>
            </div>
          </Card>

          {/* Description on Right */}
          <div className="space-y-4 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-600 dark:text-purple-400 text-xs font-semibold">
              <Zap className="h-3.5 w-3.5" />
              <span>Automated Scoring Insights</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              Deep Multi-Metric Competency Reports
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Every completed interview produces an actionable evaluation report highlighting individual test outputs, runtime complexity, and targeted improvement areas.
            </p>
            <div className="space-y-2 pt-2 text-xs text-text-secondary">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="h-4 w-4 text-accent shrink-0" />
                <span>Curriculum-benchmarked proficiency analytics</span>
              </div>
              <div className="flex items-center gap-2.5">
                <TrendingUp className="h-4 w-4 text-accent shrink-0" />
                <span>Direct test case failure breakdowns with syntax diagnostics</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingExperiencePreview;
