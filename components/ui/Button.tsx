import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'teal' | 'brass' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = 'teal',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] shadow-xs';

    const variants = {
      teal: 'bg-teal hover:bg-teal-light text-white shadow-warm focus-visible:ring-teal',
      brass: 'bg-brass hover:bg-brass-light text-white shadow-warm focus-visible:ring-brass',
      outline:
        'border border-warm-border bg-paper-light hover:bg-paper text-ink focus-visible:ring-teal hover:border-ink-muted shadow-xs',
      ghost: 'text-ink hover:bg-paper-dark/60 focus-visible:ring-teal',
      danger:
        'bg-status-danger hover:bg-red-700 text-white shadow-warm focus-visible:ring-status-danger',
    };

    const sizes = {
      sm: 'text-xs sm:text-sm px-3.5 py-2 min-h-[38px] gap-2',
      md: 'text-sm sm:text-base px-4.5 py-2.5 min-h-[42px] gap-2.5',
      lg: 'text-base px-6 py-3 min-h-[48px] gap-3 font-bold',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
