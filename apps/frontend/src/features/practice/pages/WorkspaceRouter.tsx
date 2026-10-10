import React, { Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useQuestionById } from '../../../api/questions';
import { Skeleton } from '../../../components/ui/skeleton';
import { EmptyState } from '../../../components/shared/EmptyState';
import { Code2, } from 'lucide-react';

const CodingWorkspace = React.lazy(() => import('./CodingWorkspace').then(m => ({ default: m.CodingWorkspace })));
// Future Workspaces
const SQLWorkspace = React.lazy(() => import('./SQLWorkspace').then(m => ({ default: m.SQLWorkspace })));
const MCQWorkspace = React.lazy(() => import('./MCQWorkspace').then(m => ({ default: m.MCQWorkspace })));
const HRWorkspace = React.lazy(() => import('./HRWorkspace').then(m => ({ default: m.HRWorkspace })));

export const WorkspaceRouter: React.FC = () => {
  const { id } = useParams();
  const { data: question, isLoading, error } = useQuestionById(id);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl h-[calc(100vh-4rem)] flex flex-col gap-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="flex-1 flex gap-4">
          <Skeleton className="w-1/2 h-full rounded-xl" />
          <Skeleton className="w-1/2 h-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center h-[70vh]">
        <EmptyState 
          icon={<Code2 className="h-12 w-12" />}
          title="Question Not Found"
          description="The practice question you are looking for does not exist or you do not have access to it."
          actionLabel="Return to Question Bank"
          onAction={() => window.history.back()}
        />
      </div>
    );
  }

  const renderWorkspace = () => {
    switch (question.questionType) {
      case 'CODING':
        return <CodingWorkspace question={question} />;
      case 'SQL':
        return <SQLWorkspace question={question} />;
      case 'MCQ':
      case 'APTITUDE':
        return <MCQWorkspace question={question} />;
      case 'SUBJECTIVE':
      case 'HR':
        return <HRWorkspace question={question} />;
      default:
        // Default to coding if unknown but closely matching a standard technical problem
        return <CodingWorkspace question={question} />;
    }
  };

  return (
    <Suspense fallback={
      <div className="container mx-auto p-6 max-w-7xl h-[calc(100vh-4rem)] flex flex-col gap-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="flex-1 w-full rounded-xl" />
      </div>
    }>
      {renderWorkspace()}
    </Suspense>
  );
};
