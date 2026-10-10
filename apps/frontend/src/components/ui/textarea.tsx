import * as React from 'react';
import { cn } from './button';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[90px] w-full rounded-xl border border-border bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted transition-all duration-150',
          'shadow-[var(--input-shadow)]',
          'focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20',
          'disabled:cursor-not-allowed disabled:opacity-50 leading-relaxed',
          error && 'border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500/20',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
