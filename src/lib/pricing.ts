/** Carlala's service fee: 25 % of each rental, taken from the owner's side (confirmed by GUFFROY SRL, Nov 2026). */
export const PLATFORM_FEE_RATE = 0.25;
export const MIN_HOURS = 1;
export const MAX_DAYS = 30;

const HOUR = 60 * 60 * 1000;

/** Billable hours, rounded up to the next full hour. */
export function billableHours(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / HOUR);
}

/**
 * Price for a rental, in bani.
 * Each full 24 hours costs the daily price. Leftover hours cost the hourly price,
 * but never more than one extra day.
 */
export function quote(start: Date, end: Date, pricePerHour: number, pricePerDay: number) {
  const hours = billableHours(start, end);
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  const total = days * pricePerDay + Math.min(rest * pricePerHour, pricePerDay);
  const platformFee = Math.round(total * PLATFORM_FEE_RATE);
  return { hours, days, restHours: rest, total, platformFee, ownerEarnings: total - platformFee };
}

export type RangeError = "end_before_start" | "too_short" | "too_long" | "in_past";

export function validateRange(start: Date, end: Date, now = new Date()): RangeError | null {
  if (!(end > start)) return "end_before_start";
  if (start.getTime() < now.getTime() - 5 * 60 * 1000) return "in_past";
  const hours = billableHours(start, end);
  if (hours < MIN_HOURS) return "too_short";
  if (hours > MAX_DAYS * 24) return "too_long";
  return null;
}

/** Two time ranges overlap when each starts before the other ends. */
export const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart < bEnd && bStart < aEnd;
