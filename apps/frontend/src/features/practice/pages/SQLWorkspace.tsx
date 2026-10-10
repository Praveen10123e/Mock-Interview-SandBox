import React from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { getDisplayName } from '../../../utils/display';
import { PremiumEmptyPage } from '../../../components/shared/PremiumEmptyPage';
import { Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WorkspaceProps {
  question: any;
}

export const SQLWorkspace: React.FC<WorkspaceProps> = ({ question }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full min-h-[70vh]">
      <PageHeader 
        title={question.title || "SQL Challenge"} 
        description="SQL Execution Environment" 
        breadcrumbs={[
          { label: 'Question Bank', href: '/student/practice/questions' },
          { label: getDisplayName(question.category, 'SQL') },
          { label: getDisplayName(question.topic, 'Queries') },
          { label: question.title }
        ]} 
      />
      <div className="flex-1 mt-6">
        <PremiumEmptyPage
          title={question.title}
          description="SQL Workspace"
          emptyStateTitle="SQL Practice Coming Soon"
          emptyStateDescription="SQL questions will be available once the SQL Practice Workspace is implemented."
          emptyStateIcon={<Database className="w-8 h-8" />}
          actionLabel="Back to Question Bank"
          onAction={() => navigate('/student/practice/questions')}
          breadcrumbs={[]}
        />
      </div>
    </div>
  );
};
