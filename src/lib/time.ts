/** All user-facing times are Bucharest local time. The server stores UTC. */
export const TZ = "Europe/Bucharest";

/** Offset of Bucharest from UTC at a given instant, in minutes. */
function offsetMinutes(at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** Parse "YYYY-MM-DDTHH:mm" typed in Bucharest local time into a UTC Date. */
export function parseLocal(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const naive = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Two passes handle the daylight-saving switch correctly.
  let t = naive - offsetMinutes(new Date(naive)) * 60000;
  t = naive - offsetMinutes(new Date(t)) * 60000;
  return new Date(t);
}

/** Format a UTC Date as "YYYY-MM-DDTHH:mm" in Bucharest time, for <input type="datetime-local">. */
export function toLocalInput(d: Date) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

export function formatDateTime(d: Date, locale: "ro" | "en") {
  return new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", {
    timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

/** Next full hour from now, plus `addHours`. */
export function nextHour(addHours = 0) {
  const d = new Date();
  d.setUTCMinutes(0, 0, 0);
  d.setUTCHours(d.getUTCHours() + 1 + addHours);
  return d;
}

/**
 * Sensible default search window: from the next full hour for 3 hours,
 * or tomorrow 10:00-13:00 when that would fall at night (21:00-08:00 Bucharest time).
 */
export function defaultRange() {
  let start = nextHour(1);
  const hour = Number(toLocalInput(start).slice(11, 13));
  if (hour < 8 || hour >= 21) {
    const day = toLocalInput(new Date(start.getTime() + (hour >= 21 ? 86400000 : 0))).slice(0, 10);
    start = parseLocal(`${day}T10:00`)!;
  }
  const end = new Date(start.getTime() + 3 * 3600000);
  return { start: toLocalInput(start), end: toLocalInput(end) };
}
