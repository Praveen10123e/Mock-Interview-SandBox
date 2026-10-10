import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { PageHeader } from '../../../components/shared/PageHeader';
import { ReportWorkspace } from '../components/ReportWorkspace';

import { useAuthStore } from '../../../store/AuthStore';

export const InterviewSummary: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isFaculty = user?.roles?.[0] === 'FACULTY';
  const roleBase = isFaculty ? '/faculty' : '/student';

  if (!id) {
    return null;
  }

  return (
    <motion.div 
      className="space-y-6 max-w-7xl mx-auto w-full pb-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <PageHeader
        title="Assessment Report"
        description="Detailed competency breakdown and skill evidence across all assessment rounds."
        breadcrumbs={[
          { label: 'Dashboard', href: `${roleBase}/dashboard` }, 
          { label: isFaculty ? 'Reports' : 'Interviews', href: `${roleBase}/${isFaculty ? 'reports' : 'interviews'}` },
          { label: 'Report' }
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate(isFaculty ? '/faculty/reports' : '/student/interviews')} className="gap-2 cursor-pointer">
            <ChevronLeft className="h-4 w-4" /> Return to {isFaculty ? 'Reports' : 'Interviews'}
          </Button>
        }
      />

      <ReportWorkspace interviewId={id} />
    </motion.div>
  );
};
