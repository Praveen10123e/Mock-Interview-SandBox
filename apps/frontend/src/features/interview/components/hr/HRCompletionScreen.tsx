import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, BarChart2, Upload, Brain, FileText } from 'lucide-react';

interface HRCompletionScreenProps {
  onViewReport: () => void;
  interviewId: string;
}

interface Step {
  id: string;
  icon: React.ReactNode;
  label: string;
  status: 'waiting' | 'in-progress' | 'done';
  delayMs: number;
}

const STEPS: Omit<Step, 'status'>[] = [
  { id: 'upload', icon: <Upload className="w-4 h-4" />, label: 'Uploading recorded responses…', delayMs: 800 },
  { id: 'speech', icon: <FileText className="w-4 h-4" />, label: 'Analyzing speech transcripts…', delayMs: 1800 },
  { id: 'evaluate', icon: <Brain className="w-4 h-4" />, label: 'Evaluating behavioral dimensions…', delayMs: 3200 },
  { id: 'report', icon: <BarChart2 className="w-4 h-4" />, label: 'Generating your detailed report…', delayMs: 5000 },
];

export const HRCompletionScreen: React.FC<HRCompletionScreenProps> = ({ onViewReport }) => {
  const [steps, setSteps] = useState<Step[]>(
    STEPS.map((s) => ({ ...s, status: 'waiting' as const }))
  );
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    STEPS.forEach((step, idx) => {
      timers.push(
        setTimeout(() => {
          setSteps((prev) =>
            prev.map((s) => (s.id === step.id ? { ...s, status: 'in-progress' } : s))
          );
        }, step.delayMs)
      );

      const doneAt = step.delayMs + 1000;
      timers.push(
        setTimeout(() => {
          setSteps((prev) =>
            prev.map((s) => (s.id === step.id ? { ...s, status: 'done' } : s))
          );
          if (idx === STEPS.length - 1) {
            setTimeout(() => setAllDone(true), 400);
          }
        }, doneAt)
      );
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#F8FAFC] min-h-0 overflow-y-auto">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 max-w-lg w-full shadow-xs text-center">
        {/* Top Celebration */}
        <div className="mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center bg-emerald-50 border border-emerald-200">
            {allDone ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            ) : (
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            )}
          </div>
          <h2 className="text-xl font-bold text-[#0F172A]">
            {allDone ? 'Interview Complete!' : 'Analyzing Your Performance…'}
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 leading-relaxed">
            {allDone
              ? 'Your behavioral interview has been evaluated across key professional competencies.'
              : 'Our AI is evaluating your verbal answers and communication structure. This will take just a few seconds.'}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-2.5 mb-6 text-left">
          {steps.map((step) => {
            const isDone = step.status === 'done';
            const isInProgress = step.status === 'in-progress';
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  isDone
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                    : isInProgress
                    ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                }`}
              >
                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : isInProgress ? (
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  ) : (
                    <div className="opacity-50">{step.icon}</div>
                  )}
                </div>
                <span className="text-xs font-semibold">{step.label}</span>
              </div>
            );
          })}
        </div>

        {/* CTA Button */}
        {allDone && (
          <div className="pt-2">
            <button
              id="hr-view-report-btn"
              type="button"
              onClick={onViewReport}
              className="w-full h-11 px-6 text-sm font-semibold rounded-lg bg-[#111827] hover:bg-[#1F2937] text-white shadow-xs border border-[#111827] cursor-pointer flex items-center justify-center gap-2 transition-colors"
            >
              <BarChart2 className="w-4 h-4" />
              View Full Analytics &amp; Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
