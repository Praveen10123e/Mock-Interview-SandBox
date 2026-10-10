import React from 'react';
import { useInterviewSessionStore } from '../store/useInterviewSessionStore';
import { Progress } from '../../../components/ui/progress';

export const InterviewHeader: React.FC = () => {
  const { title, remainingTime, state, questions, currentQuestionIndex } =
    useInterviewSessionStore();

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <header className="h-16 w-full bg-card border-b border-border flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
      {/* Left: Title & State */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold truncate max-w-md">{title || 'Interview Session'}</h1>
        <span
          className={`px-2 py-1 text-xs font-semibold rounded ${state === 'RUNNING' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}
        >
          {state}
        </span>
      </div>

      {/* Middle: Progress */}
      <div className="flex-1 max-w-md mx-8 flex items-center gap-4 hidden md:flex">
        <span className="text-xs font-medium whitespace-nowrap text-muted-foreground">
          Question {currentQuestionIndex + 1} of {questions.length}
        </span>
        <Progress value={progress} className="h-2 flex-1" />
      </div>

      {/* Right: Timer */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
            Remaining Time
          </span>
          <span
            className={`text-xl font-mono font-bold ${remainingTime < 300 ? 'text-destructive animate-pulse' : 'text-foreground'}`}
          >
            {formatTime(remainingTime)}
          </span>
        </div>
      </div>
    </header>
  );
};
