import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './button';

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
  {
    variants: {
      variant: {
        default: 'border border-accent/25 bg-accent/12 text-accent',
        secondary: 'border border-border bg-surface-elevated text-text-secondary font-medium',
        destructive: 'border border-rose-500/25 bg-rose-500/12 text-rose-600 dark:text-rose-400',
        success: 'border border-emerald-500/25 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
        warning: 'border border-amber-500/25 bg-amber-500/12 text-amber-600 dark:text-amber-300',
        info: 'border border-indigo-500/25 bg-indigo-500/12 text-indigo-600 dark:text-indigo-300',
        outline: 'text-text-secondary border border-border bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

export function Badge({ className, variant, icon, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </div>
  );
}

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: string;
  className?: string;
  icon?: React.ReactNode;
}

export function StatusBadge({ status, className, icon, children, ...props }: StatusBadgeProps) {
  const normalized = (status || '').toUpperCase().trim();
  
  let variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'outline' = 'secondary';
  let label = status;

  if (['EASY', 'PASSED', 'COMPLETED', 'ASSESSED', 'CORRECT'].includes(normalized)) {
    variant = 'success';
  } else if (['MEDIUM', 'PARTIALLY_SOLVED', 'PROVISIONAL', 'RUN_PASSED', 'PENDING', 'RUNNING'].includes(normalized)) {
    variant = 'warning';
  } else if (['HARD', 'FAILED', 'WRONG', 'COMPILATION_ERROR', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED'].includes(normalized)) {
    variant = 'destructive';
  } else if (['CODING', 'SQL', 'MCQ', 'ACTIVE', 'IN_PROGRESS'].includes(normalized)) {
    variant = 'info';
  } else if (['NOT_ATTEMPTED', 'NOT_ASSESSED', 'LOCKED', 'SKIPPED'].includes(normalized)) {
    variant = 'secondary';
  }

  // Readable label formatting
  if (normalized === 'PARTIALLY_SOLVED') label = 'Partially Solved';
  else if (normalized === 'RUN_PASSED') label = 'Sample Passed';
  else if (normalized === 'NOT_ATTEMPTED') label = 'Not Attempted';
  else if (normalized === 'NOT_ASSESSED') label = 'Not Assessed';
  else if (normalized === 'TIME_LIMIT_EXCEEDED') label = 'Time Limit Exceeded';

  return (
    <Badge variant={variant} className={className} icon={icon} {...props}>
      {children || label}
    </Badge>
  );
}
