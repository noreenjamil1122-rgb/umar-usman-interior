'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PartyFieldProps {
  label: string;
  value?: React.ReactNode;
  locked?: boolean;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export function PartyField({
  label,
  value,
  locked,
  className,
  labelClassName,
  valueClassName,
}: PartyFieldProps) {
  if (locked) {
    return (
      <div className={cn('space-y-1', className)}>
        <span className={cn('block text-xs font-bold uppercase tracking-wider text-ink-muted', labelClassName)}>
          {label}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
          <Lock className="w-3.5 h-3.5 text-amber-600" />
          <span>Admin access required</span>
        </span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <span className={cn('block text-xs font-bold uppercase tracking-wider text-ink-muted', labelClassName)}>
        {label}
      </span>
      <div className={cn('text-sm font-semibold text-ink', valueClassName)}>
        {value || '-'}
      </div>
    </div>
  );
}

export function PartyLockBadge({ title = 'Admin access required' }: { title?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200"
      title={title}
    >
      <Lock className="w-3 h-3 text-amber-600" />
      <span>Locked</span>
    </span>
  );
}
