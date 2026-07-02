import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ExpenseCategory } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-AT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat('de-AT', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(amount));
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  daily_allowance: 'Daily Allowance',
  mileage: 'Mileage',
  accommodation: 'Accommodation',
  transport: 'Transport',
  other: 'Other',
};

export const CATEGORY_TOOLTIPS: Record<ExpenseCategory, string> = {
  mileage:
    '§ 26 EStG — 0.42 €/km (private car). Max 30,000 km/year eligible for FFG funding. Amount is calculated automatically.',
  daily_allowance:
    'Domestic: €26.40/day (>12h), pro-rated from 3h. Abroad: €35.80/day standard EU rate (§ 26 EStG / Austrian travel expense law).',
  accommodation:
    'Overnight allowance: €15.00 flat rate (no receipt needed) or actual hotel receipt.',
  transport:
    'Public transport, taxi, flight, etc. Attach receipt where possible for FFG reimbursement.',
  other:
    'Other eligible expense. Add a clear description and attach receipt for FFG compliance.',
};
