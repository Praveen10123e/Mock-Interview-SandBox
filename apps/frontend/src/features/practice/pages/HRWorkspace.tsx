import React, { useState } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { getDisplayName } from '../../../utils/display';
import { Button } from '../../../components/ui/button';
import { StatusBadge, Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { Textarea } from '../../../components/ui/textarea';
import { CheckCircle2, Bot, ArrowRight, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../../components/shared/EmptyState';

interface WorkspaceProps {
  question: any;
}

export const HRWorkspace: React.FC<WorkspaceProps> = ({ question }) => {
  const navigate = useNavigate();
  const [answer, setAnswer] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const evaluationCriteria = question?.metadata?.jsonPayload?.evaluationCriteria;

  if (!Array.isArray(evaluationCriteria)) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto w-full">
        <PageHeader 
          title={question?.title || "Subjective Assessment"} 
          description="HR & Subjective Questions" 
          breadcrumbs={[
            { label: 'Practice', href: '/student/practice' },
            { label: 'Questions', href: '/student/practice/questions' },
            { label: question?.title || 'Subjective' }
          ]} 
        />
        <EmptyState
          icon={<XCircle className="h-6 w-6 text-rose-400" />}
          title="Subjective Data Unavailable"
          description="Evaluation criteria are missing for this question definition."
          actionLabel="Return to Question Bank"
          onAction={() => navigate('/student/practice/questions')}
        />
      </div>
    );
  }

  const handleSubmit = () => {
    if (answer.trim().length > 0) {
      setHasSubmitted(true);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      <PageHeader 
        title={question.title || "Subjective Assessment"} 
        description="HR & Subjective Questions" 
        breadcrumbs={[
          { label: 'Practice', href: '/student/practice' },
          { label: 'Questions', href: '/student/practice/questions' },
          { label: question.title }
        ]} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Question & Criteria */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-5 bg-surface/70 border border-white/8 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={question.difficulty || 'MEDIUM'} />
              <Badge variant="outline">{getDisplayName(question.category, 'HR')}</Badge>
            </div>
            <h2 className="text-sm font-semibold text-text-primary leading-relaxed">
              {question.description || question.title}
            </h2>
          </Card>

          <Card className="p-5 bg-surface/50 border border-white/8 space-y-3">
            <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-accent" /> 
              <span>Evaluation Criteria</span>
            </h3>
            <ul className="space-y-2">
              {evaluationCriteria.map((criteria: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="text-accent mt-0.5">•</span>
                  <span>{criteria}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Right Column: Answer Area */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 bg-surface/70 border border-white/8 flex flex-col min-h-[380px]">
            <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-3">Your Response</h3>
            
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={hasSubmitted}
              placeholder="Type your response here... Structure your answer to address the evaluation criteria."
              className="flex-1 min-h-[220px] resize-none text-xs md:text-sm"
            />
            
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/6">
              <span className="text-[11px] font-mono text-text-muted">
                {answer.length} characters
              </span>
              
              {!hasSubmitted ? (
                <Button 
                  onClick={handleSubmit} 
                  disabled={answer.trim().length === 0}
                  size="sm"
                >
                  Submit Response
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/student/practice/questions')}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  Back to Question Bank
                </Button>
              )}
            </div>

            {hasSubmitted && (
              <div className="mt-4 p-3.5 rounded-lg bg-accent/10 border border-accent/20 flex items-start gap-3">
                <Bot className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-text-primary mb-0.5">Response Captured</h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Your response has been saved for review.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HRWorkspace;
