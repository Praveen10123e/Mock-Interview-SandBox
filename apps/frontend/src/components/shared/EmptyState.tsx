import React from 'react';
import { EmptyState as BaseEmptyState, type EmptyStateProps } from '../ui/empty-state';

export const EmptyState: React.FC<EmptyStateProps> = (props) => {
  return <BaseEmptyState {...props} />;
};

export type { EmptyStateProps };
