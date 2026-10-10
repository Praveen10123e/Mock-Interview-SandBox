import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../ui/button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load content',
  message = 'An unexpected error occurred while communicating with the server.',
  onRetry,
  className = '',
  compact = false,
}) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center rounded-xl bg-surface/40 border border-rose-500/15',
      compact ? 'p-6' : 'p-10 md:p-12',
      className
    )}>
      <div className="mb-3 text-rose-400/80 flex items-center justify-center">
        <AlertCircle className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
      </div>
      <h3 className="text-sm font-medium text-text-primary mb-1 tracking-tight">{title}</h3>
      <p className="text-xs md:text-sm text-text-secondary max-w-sm mb-5 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="sm" leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
          Try Again
        </Button>
      )}
    </div>
  );
};
