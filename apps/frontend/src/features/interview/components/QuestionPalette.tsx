import React from 'react';
import { useInterviewSessionStore } from '../store/useInterviewSessionStore';

export const QuestionPalette: React.FC = () => {
  const { questions, currentQuestionIndex, setCurrentQuestionIndex, answers, markedForReview } =
    useInterviewSessionStore();

  return (
    <div className="w-full bg-card border rounded-md p-4 flex flex-col gap-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Question Palette
      </h3>

      <div className="flex flex-wrap gap-2">
        {questions.map((q, idx) => {
          const isCurrent = currentQuestionIndex === idx;
          const isAnswered = !!answers[q.id]?.value;
          const isMarked = markedForReview[q.id];

          let bgColor = 'bg-secondary text-secondary-foreground'; // Unanswered
          if (isCurrent) bgColor = 'bg-primary text-primary-foreground';
          else if (isMarked)
            bgColor = 'bg-warning text-warning-foreground'; // Assuming warning color exists
          else if (isAnswered) bgColor = 'bg-success text-success-foreground'; // Assuming success color exists

          return (
            <button
              key={q.id}
              onClick={() => setCurrentQuestionIndex(idx)}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-transform hover:scale-110 ${bgColor} ${isCurrent ? 'ring-2 ring-ring ring-offset-2' : ''}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary"></div> Current
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success"></div> Answered
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-warning"></div> Marked Review
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-secondary"></div> Unanswered
        </div>
      </div>
    </div>
  );
};
