import React, { useState } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { getDisplayName } from '../../../utils/display';
import { Button } from '../../../components/ui/button';
import { StatusBadge, Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../../components/shared/EmptyState';

interface WorkspaceProps {
  question: any;
}

export const MCQWorkspace: React.FC<WorkspaceProps> = ({ question }) => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const options = question?.metadata?.jsonPayload?.options;
  const correctOptionIndex = question?.metadata?.jsonPayload?.correctOptionIndex;
  const explanation = question?.explanations?.[0]?.content;

  if (!Array.isArray(options) || typeof correctOptionIndex !== 'number') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto w-full">
        <PageHeader 
          title={question?.title || "Aptitude Assessment"} 
          description="Multiple Choice Assessment" 
          breadcrumbs={[
            { label: 'Practice', href: '/student/practice' },
            { label: 'Questions', href: '/student/practice/questions' },
            { label: question?.title || 'MCQ' }
          ]} 
        />
        <EmptyState
          icon={<XCircle className="h-6 w-6 text-rose-400" />}
          title="MCQ Data Unavailable"
          description="The question structure is missing required option choices."
          actionLabel="Return to Question Bank"
          onAction={() => navigate('/student/practice/questions')}
        />
      </div>
    );
  }

  const isCorrect = hasSubmitted && selectedOption === correctOptionIndex;

  const handleSubmit = () => {
    if (selectedOption !== null && !hasSubmitted) {
      setHasSubmitted(true);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <PageHeader 
        title={question.title || "Aptitude Assessment"} 
        description="Multiple Choice Assessment" 
        breadcrumbs={[
          { label: 'Practice', href: '/student/practice' },
          { label: 'Questions', href: '/student/practice/questions' },
          { label: question.title }
        ]} 
      />

      <div className="space-y-6">
        <Card className="p-5 md:p-6 bg-surface/70 border border-white/8">
          <div className="flex items-center gap-2 mb-3">
            <StatusBadge status={question.difficulty || 'MEDIUM'} />
            <Badge variant="outline">{getDisplayName(question.topic, 'General')}</Badge>
          </div>
          <p className="text-sm md:text-base font-medium text-text-primary leading-relaxed">
            {question.description || question.title}
          </p>
        </Card>

        {/* Option choices */}
        <div className="space-y-2.5">
          {options.map((option: string, index: number) => {
            const isSelected = selectedOption === index;
            let cardClasses = "border-white/8 bg-surface/50 hover:border-white/20 hover:bg-white/4";
            
            if (hasSubmitted) {
              if (index === correctOptionIndex) {
                cardClasses = "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
              } else if (isSelected && index !== correctOptionIndex) {
                cardClasses = "border-rose-500/40 bg-rose-500/10 text-rose-300";
              } else {
                cardClasses = "border-white/4 bg-white/2 opacity-40";
              }
            } else if (isSelected) {
              cardClasses = "border-accent bg-accent/10 text-text-primary";
            }

            return (
              <button
                key={index}
                disabled={hasSubmitted}
                onClick={() => setSelectedOption(index)}
                className={`w-full p-4 rounded-xl border text-left transition-all duration-150 flex items-center justify-between gap-3 ${cardClasses}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-7 w-7 rounded-lg border flex items-center justify-center text-xs font-semibold shrink-0 ${
                    isSelected ? 'border-accent bg-accent text-white' : 'border-white/10 text-text-muted'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-xs md:text-sm font-medium">{option}</span>
                </div>

                {hasSubmitted && index === correctOptionIndex && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                )}
                {hasSubmitted && isSelected && index !== correctOptionIndex && (
                  <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Action button */}
        <div className="flex items-center justify-between pt-2">
          {!hasSubmitted ? (
            <Button
              onClick={handleSubmit}
              disabled={selectedOption === null}
              size="lg"
            >
              Submit Answer
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/student/practice/questions')}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Back to Question Bank
            </Button>
          )}

          {hasSubmitted && (
            <div className={`text-xs font-medium ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isCorrect ? 'Correct solution!' : 'Incorrect choice. Review the explanation.'}
            </div>
          )}
        </div>

        {/* Explanation Card */}
        {hasSubmitted && explanation && (
          <Card className="p-5 bg-surface/60 border border-white/8 space-y-2">
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Explanation</h4>
            <p className="text-xs text-text-secondary leading-relaxed">{explanation}</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MCQWorkspace;
