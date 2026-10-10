import type { FC, ReactNode } from 'react';
import { Card, CardContent } from '../ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../ui/button';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  subtitle?: string;
  tone?: 'violet' | 'neutral' | 'success' | 'warning' | 'accent' | 'gold';
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export const StatCard: FC<StatCardProps> = ({ title, value, icon, subtitle, tone, trend, className = '' }) => {
  // Auto-detect appropriate tone from title if not explicitly passed
  let resolvedTone = tone;
  if (!resolvedTone) {
    const t = title.toLowerCase();
    if (t.includes('completed') || t.includes('passed') || t.includes('solved')) {
      resolvedTone = 'success';
    } else if (t.includes('progress') || t.includes('pending') || t.includes('open')) {
      resolvedTone = 'warning';
    } else if (t.includes('evaluation') || t.includes('readiness') || t.includes('accuracy')) {
      resolvedTone = 'accent';
    } else {
      resolvedTone = 'violet';
    }
  }

  const toneClasses = {
    violet: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-400',
    neutral: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-400',
    success: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
    accent: 'bg-purple-500/12 text-purple-600 dark:text-purple-400',
    gold: 'bg-amber-500/14 text-amber-600 dark:text-amber-400',
  }[resolvedTone || 'violet'];

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider truncate">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">{value}</span>
              {trend && (
                <span className={`inline-flex items-center text-xs font-semibold ${trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {trend.isPositive ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                  {trend.value}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          {icon && (
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]', toneClasses)}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
