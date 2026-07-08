import type { AllowanceDayDraft } from './types';

/**
 * Austrian daily allowance per day (§ 26 EStG):
 * - hours < 3  → 0
 * - 3 ≤ hours < 12 → half rate (no meal deductions)
 * - hours ≥ 12 → full rate minus 1/3 per invited meal, min 0
 */
export function calcDayAllowance(
  hours: number,
  fullRate: number,
  breakfast: boolean,
  lunch: boolean,
  dinner: boolean,
): number {
  if (hours < 3) return 0;
  if (hours < 12) return fullRate / 2;
  const deduction =
    (breakfast ? fullRate / 3 : 0) +
    (lunch     ? fullRate / 3 : 0) +
    (dinner    ? fullRate / 3 : 0);
  return Math.max(0, fullRate - deduction);
}

/** Legacy single-trip helper */
export function calcDailyAllowance(
  hours: number, fullRate: number,
  breakfast: boolean, lunch: boolean, dinner: boolean,
): number {
  return calcDayAllowance(hours, fullRate, breakfast, lunch, dinner);
}

export function calcTripHours(departure: string, returnTime: string): number {
  if (!departure || !returnTime) return 0;
  return Math.max(0, (new Date(returnTime).getTime() - new Date(departure).getTime()) / 3_600_000);
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

/**
 * Generate one AllowanceDayDraft per calendar day of the trip.
 * First day: hours from departure until midnight.
 * Last day: hours from midnight until return time.
 * Middle days: 24 hours (always full rate eligible).
 */
export function generateAllowanceDays(
  departureIso: string,
  returnIso: string,
): AllowanceDayDraft[] {
  if (!departureIso || !returnIso) return [];
  const dep = new Date(departureIso);
  const ret = new Date(returnIso);
  if (ret <= dep) return [];

  const days: AllowanceDayDraft[] = [];
  const cursor = new Date(dep);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= ret) {
    const dayStart = new Date(cursor);
    const dayEnd = new Date(cursor);
    dayEnd.setHours(23, 59, 59, 999);

    const effectiveStart = dep > dayStart ? dep : dayStart;
    const effectiveEnd = ret < dayEnd ? ret : dayEnd;
    const hours = Math.max(0, (effectiveEnd.getTime() - effectiveStart.getTime()) / 3_600_000);

    const isoDate = cursor.toISOString().split('T')[0];
    const isFirst = days.length === 0;

    days.push({
      date: isoDate,
      label: cursor.toLocaleDateString('en-AT', { weekday: 'short', day: '2-digit', month: 'short' }),
      isFirstDay: isFirst,
      isLastDay: false, // set below
      hours,
      isAbroad: false,
      mealBreakfast: false,
      mealLunch: false,
      mealDinner: false,
    });

    cursor.setDate(cursor.getDate() + 1);
    if (cursor > ret) break;
  }

  if (days.length > 0) days[days.length - 1].isLastDay = true;
  return days;
}
