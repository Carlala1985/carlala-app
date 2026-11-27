/**
 * Owner availability agenda. All times are Bucharest local time.
 * A car with an agenda is bookable only in hours the owner coloured:
 * the typical week (hour-of-week indices, Monday 00:00 = 0 ... Sunday 23:00 = 167),
 * unless a specific date has an exception, which then replaces that day entirely.
 */
import { TZ } from "./time";

export const HOURS_PER_WEEK = 168;
const HOUR = 3600000;
const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", weekday: "short",
});
const WD: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** Local date, weekday (Monday = 0) and hour of an instant. */
export function localSlot(d: Date) {
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, weekday: WD[p.weekday], hour: Number(p.hour) };
}

/** Start of every hour the booking touches (a booking 10:30-11:15 needs 10:00 and 11:00). */
export function bookedHours(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  for (let t = Math.floor(start.getTime() / HOUR) * HOUR; t < end.getTime(); t += HOUR) out.push(new Date(t));
  return out;
}

/** Local dates a time range touches, to load exceptions for. */
export function datesTouched(start: Date, end: Date) {
  return [...new Set(bookedHours(start, end).map((h) => localSlot(h).date))];
}

export type Agenda = { hasAgenda: boolean; weeklyHours: number[] };
export type Exceptions = Map<string, number[]>; // date -> available hours that day

export function isHourAvailable(agenda: Agenda, exceptions: Exceptions, at: Date) {
  if (!agenda.hasAgenda) return true;
  const s = localSlot(at);
  const ex = exceptions.get(s.date);
  return ex ? ex.includes(s.hour) : agenda.weeklyHours.includes(s.weekday * 24 + s.hour);
}

/** True when every hour of the booking is coloured as available. */
export function isAvailable(agenda: Agenda, exceptions: Exceptions, start: Date, end: Date) {
  if (!agenda.hasAgenda) return true;
  return bookedHours(start, end).every((h) => isHourAvailable(agenda, exceptions, h));
}

/* ----- calendar helpers on "YYYY-MM-DD" strings (no time zone involved) ----- */

const toUtcNoon = (date: string) => new Date(`${date}T12:00:00Z`);
const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(date: string, n: number) {
  const d = toUtcNoon(date); d.setUTCDate(d.getUTCDate() + n); return toDateStr(d);
}
/** Monday = 0 ... Sunday = 6. */
export function weekdayOf(date: string) {
  return (toUtcNoon(date).getUTCDay() + 6) % 7;
}
export function mondayOf(date: string) {
  return addDays(date, -weekdayOf(date));
}
export function weekDates(monday: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
export const isDateStr = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(toUtcNoon(v).getTime());

/** Hours (0-23) of a given date according to the typical week. */
export function weeklyHoursFor(weeklyHours: number[], date: string) {
  const wd = weekdayOf(date);
  return weeklyHours.filter((i) => Math.floor(i / 24) === wd).map((i) => i % 24).sort((a, b) => a - b);
}

/** Cleans hour lists coming from a browser. */
export function cleanHours(v: unknown, max: number) {
  if (!Array.isArray(v)) return null;
  const nums = v.filter((x) => Number.isInteger(x) && x >= 0 && x < max) as number[];
  return [...new Set(nums)].sort((a, b) => a - b);
}
