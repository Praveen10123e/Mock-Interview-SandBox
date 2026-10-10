import type { FC } from 'react';
import { Play, Code2, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface LandingCTAProps {
  onStartMockInterview: () => void;
  onExplorePracticeBank: () => void;
}

export const LandingCTA: FC<LandingCTAProps> = ({
  onStartMockInterview,
  onExplorePracticeBank,
}) => {
  return (
    <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full text-center">
      <div className="relative overflow-hidden rounded-3xl border border-border-card bg-[var(--surface-card)] p-8 sm:p-12 md:p-16 shadow-2xl">
        {/* Subtle Ambient Radial Accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[280px] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Start Preparing Today</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
            Ready to Test Your Technical Readiness?
          </h2>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Join candidates across the Naan Mudhalvan engineering network preparing for competitive software engineering interviews with proctoring and Judge0 execution.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Button
              size="lg"
              onClick={onStartMockInterview}
              leftIcon={<Play className="h-4 w-4 fill-current" />}
              className="w-full sm:w-auto"
            >
              Start Your Mock Interview
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onExplorePracticeBank}
              leftIcon={<Code2 className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              Explore Practice
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingCTA;
