import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-ink-light"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 pointer-events-none text-ink-muted">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              'w-full rounded-lg border bg-paper-light px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60 transition-colors',
              'border-warm-border focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error && 'border-status-danger focus:border-status-danger focus:ring-status-danger',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 pointer-events-none text-ink-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-status-danger font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-ink-muted">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
