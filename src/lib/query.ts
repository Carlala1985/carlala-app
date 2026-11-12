import { isFuel, isSector, isTransmission, type SearchParams } from "./cars";
import { parseLocal } from "./time";
import { validateRange } from "./pricing";

export type RawQuery = { sector?: string; transmission?: string; fuel?: string; start?: string; end?: string };

/** Turn URL query values into safe search parameters. Invalid dates are dropped and reported. */
export function parseQuery(q: RawQuery) {
  const p: SearchParams = {};
  if (isSector(q.sector)) p.sector = q.sector;
  if (isTransmission(q.transmission)) p.transmission = q.transmission;
  if (isFuel(q.fuel)) p.fuel = q.fuel;
  const start = parseLocal(q.start), end = parseLocal(q.end);
  let dateError: ReturnType<typeof validateRange> = null;
  if (start && end) {
    dateError = validateRange(start, end);
    if (!dateError) { p.start = start; p.end = end; }
  }
  return { params: p, dateError };
}

/** "?start=…&end=…" to carry chosen dates to the car page. */
export function datesQuery(q: RawQuery) {
  const s = new URLSearchParams();
  if (q.start) s.set("start", q.start);
  if (q.end) s.set("end", q.end);
  const str = s.toString();
  return str ? `?${str}` : "";
}
