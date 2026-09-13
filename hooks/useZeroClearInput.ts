import { useState, useCallback, useEffect } from 'react';

export interface UseZeroClearInputOptions {
  allowDecimals?: boolean;
  min?: number | string;
  max?: number | string;
}

/**
 * Wraps a numeric field's value/onChange so that:
 * - focusing a field showing 0 (or empty) clears it for fresh typing
 * - focusing a non-zero field selects all text for quick overwrite
 * - while typing: behaves like a normal input allowing valid digits
 * - blurring an empty field restores 0
 * - commits valid number to onChange (never blank)
 *
 * @param value Current numeric value
 * @param onChange Callback fired with valid number
 * @param options Optional configuration (allowDecimals, min, max)
 */
export function useZeroClearInput(
  value: number | undefined | null,
  onChange?: (val: number) => void,
  options: UseZeroClearInputOptions = {}
) {
  const { allowDecimals = true, min, max } = options;
  const initialStr = value === undefined || value === null ? '0' : String(value);
  const [displayValue, setDisplayValue] = useState<string>(initialStr);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // Keep displayValue in sync with external state updates when not focused
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value === undefined || value === null ? '0' : String(value));
    }
  }, [value, isFocused]);

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (displayValue === '0' || displayValue === '') {
        setDisplayValue('');
      } else {
        // Also select existing text as fallback so typing replaces it directly
        e.target.select();
      }
    },
    [displayValue]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const regex = allowDecimals ? /^\d*\.?\d*$/ : /^\d*$/;

      if (regex.test(raw)) {
        setDisplayValue(raw);

        // Notify parent with current numeric value (or 0 if temporarily empty / decimal point)
        if (raw === '' || raw === '.') {
          onChange?.(0);
        } else {
          let num = Number(raw);
          if (!isNaN(num)) {
            const minNum = min !== undefined ? Number(min) : undefined;
            const maxNum = max !== undefined ? Number(max) : undefined;
            if (minNum !== undefined && !isNaN(minNum) && num < minNum) num = minNum;
            if (maxNum !== undefined && !isNaN(maxNum) && num > maxNum) num = maxNum;
            onChange?.(num);
          }
        }
      }
    },
    [allowDecimals, min, max, onChange]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      let finalNum = 0;
      if (displayValue === '' || displayValue === '.') {
        setDisplayValue('0');
        finalNum = 0;
      } else {
        finalNum = Number(displayValue);
        if (isNaN(finalNum)) {
          finalNum = 0;
        } else {
          const minNum = min !== undefined ? Number(min) : undefined;
          const maxNum = max !== undefined ? Number(max) : undefined;
          if (minNum !== undefined && !isNaN(minNum) && finalNum < minNum) finalNum = minNum;
          if (maxNum !== undefined && !isNaN(maxNum) && finalNum > maxNum) finalNum = maxNum;
        }
        setDisplayValue(String(finalNum));
      }
      onChange?.(finalNum);
    },
    [displayValue, min, max, onChange]
  );

  return {
    displayValue,
    handleFocus,
    handleChange,
    handleBlur,
    setDisplayValue,
  };
}

export default useZeroClearInput;
