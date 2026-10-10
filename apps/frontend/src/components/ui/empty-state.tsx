import React from 'react';
import { Button } from './button';
import { cn } from './button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className = '',
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card)] shadow-[var(--card-shadow)]',
      compact ? 'p-6 md:p-8' : 'p-10 md:p-14',
      className
    )}>
      {icon && (
        <div className="mb-3.5 h-11 w-11 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {icon}
        </div>
      )}
      <h3 className="text-sm md:text-base font-semibold text-text-primary mb-1.5 tracking-tight">{title}</h3>
      <p className="text-xs md:text-sm text-text-secondary max-w-md mb-5 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="secondary" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
