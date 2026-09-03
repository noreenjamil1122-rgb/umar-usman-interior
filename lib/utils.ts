import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines Tailwind classes safely with clsx and twMerge.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format monetary amount into Pakistani Rupee (PKR / Rs.) currency display.
 * Example: 15400 -> "Rs. 15,400"
 */
export function formatCurrency(amount: number): string {
  const rounded = roundMoney(amount);
  return `Rs. ${new Intl.NumberFormat('en-PK', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(rounded)}`;
}

/**
 * Safely rounds money to 2 decimal places to avoid floating point drift.
 */
export function roundMoney(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Format Date to readable format: "12 Oct 2026" or "12/10/2026"
 */
export function formatDate(date: string | Date | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format Date with time: "12 Oct 2026, 03:45 PM"
 */
export function formatDateTime(date: string | Date | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
