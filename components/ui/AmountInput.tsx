import React from 'react';
import { cn } from '@/lib/utils';
import { useZeroClearInput, UseZeroClearInputOptions } from '@/hooks/useZeroClearInput';

export interface AmountInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'max'>,
    UseZeroClearInputOptions {
  value: number | undefined | null;
  onChange?: (val: number) => void;
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  (
    {
      className,
      value,
      onChange,
      allowDecimals = true,
      min,
      max,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      onFocus: parentOnFocus,
      onBlur: parentOnBlur,
      placeholder = '0',
      ...props
    },
    ref
  ) => {
    const { displayValue, handleFocus, handleChange, handleBlur } = useZeroClearInput(
      value,
      onChange,
      { allowDecimals, min, max }
    );

    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const onCombinedFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      handleFocus(e);
      parentOnFocus?.(e);
    };

    const onCombinedBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      handleBlur(e);
      parentOnBlur?.(e);
    };

    const inputElement = (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3.5 pointer-events-none text-ink-muted flex items-center justify-center">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          ref={ref}
          value={displayValue}
          onFocus={onCombinedFocus}
          onChange={handleChange}
          onBlur={onCombinedBlur}
          placeholder={placeholder}
          className={cn(
            'w-full min-h-[42px] sm:min-h-[44px] rounded-xl border bg-paper-light px-3.5 py-2.5 text-sm sm:text-base text-ink placeholder:text-ink-muted/60 transition-all shadow-xs',
            'border-warm-border focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            error && 'border-status-danger focus:border-status-danger focus:ring-status-danger/20',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 pointer-events-none text-ink-muted flex items-center justify-center">
            {rightIcon}
          </div>
        )}
      </div>
    );

    if (!label && !error && !helperText) {
      return inputElement;
    }

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs sm:text-sm font-semibold tracking-wide text-ink mb-1"
          >
            {label}
          </label>
        )}
        {inputElement}
        {error && <p className="text-xs sm:text-sm text-status-danger font-medium mt-1">{error}</p>}
        {!error && helperText && <p className="text-xs sm:text-sm text-ink-muted mt-1">{helperText}</p>}
      </div>
    );
  }
);

AmountInput.displayName = 'AmountInput';

export default AmountInput;
