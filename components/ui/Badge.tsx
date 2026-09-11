import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'teal' | 'brass' | 'neutral';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'neutral',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const variants = {
    neutral: 'bg-paper-dark/60 text-ink-light border-warm-border',
    success: 'bg-status-successLight text-status-success border-emerald-200',
    warning: 'bg-status-warningLight text-status-warning border-amber-200',
    danger: 'bg-status-dangerLight text-status-danger border-rose-200',
    teal: 'bg-teal-subtle text-teal border-teal/20',
    brass: 'bg-brass-subtle text-brass-dark border-brass/20',
  };

  const sizes = {
    sm: 'px-2.5 py-0.5 text-xs font-medium',
    md: 'px-3 py-1 text-xs sm:text-sm font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-lg border transition-colors shadow-2xs',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
