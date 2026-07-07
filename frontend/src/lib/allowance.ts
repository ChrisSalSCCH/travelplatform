/**
 * Austrian daily allowance calculation (§ 26 EStG)
 *
 * Rules:
 *  - < 3h trip  → €0 (no allowance)
 *  - 3–12h trip  → half rate (no meal deductions apply to the half rate)
 *  - > 12h trip  → full rate, reduced by 1/3 per invited meal
 *  - Result is never negative
 */
export function calcDailyAllowance(
  hours: number,
  fullRate: number,
  breakfast: boolean,
  lunch: boolean,
  dinner: boolean,
): number {
  if (hours < 3) return 0;
  if (hours < 12) return fullRate / 2; // half rate, no meal deductions
  const mealDeduction = (breakfast ? fullRate / 3 : 0) + (lunch ? fullRate / 3 : 0) + (dinner ? fullRate / 3 : 0);
  return Math.max(0, fullRate - mealDeduction);
}

export function calcTripHours(departure: string, returnTime: string): number {
  if (!departure || !returnTime) return 0;
  const diff = (new Date(returnTime).getTime() - new Date(departure).getTime()) / 3_600_000;
  return Math.max(0, diff);
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}
