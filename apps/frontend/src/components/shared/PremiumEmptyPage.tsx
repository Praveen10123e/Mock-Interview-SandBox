import type { FC, ReactNode } from 'react';
import { PageHeader } from './PageHeader';
import { EmptyState } from './EmptyState';
import { motion } from 'framer-motion';

interface PremiumEmptyPageProps {
  title: string;
  description: string;
  breadcrumbs: { label: string; href?: string }[];
  emptyStateIcon: ReactNode;
  emptyStateTitle: string;
  emptyStateDescription: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const PremiumEmptyPage: FC<PremiumEmptyPageProps> = ({
  title,
  description,
  breadcrumbs,
  emptyStateIcon,
  emptyStateTitle,
  emptyStateDescription,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col h-full min-h-[60vh]">
      <PageHeader 
        title={title} 
        description={description} 
        breadcrumbs={breadcrumbs} 
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="flex-1 flex items-center justify-center"
      >
        <EmptyState 
          icon={emptyStateIcon}
          title={emptyStateTitle}
          description={emptyStateDescription}
          actionLabel={actionLabel}
          onAction={onAction}
          className="w-full max-w-2xl"
        />
      </motion.div>
    </div>
  );
};
