import "server-only";
import type { Car } from "@prisma/client";
import { db } from "./db";
import { BLOCKING } from "./cars";
import { addDays, bookedHours, localSlot, weeklyHoursFor } from "./availability";
import { parseLocal } from "./time";
import type { GridColumn } from "@/components/AgendaGrid";

/** Grid data (columns, coloured cells, booked cells) for 7 consecutive local dates. */
export async function agendaDays(car: Pick<Car, "id" | "weeklyHours">, dates: string[], locale: "ro" | "en", dayNames: string[], today: string) {
  const exceptions = new Map((await db.availabilityException.findMany({ where: { carId: car.id, date: { in: dates } } })).map((e) => [e.date, e.hours]));
  const from = parseLocal(`${dates[0]}T00:00`)!, to = parseLocal(`${addDays(dates[6], 1)}T00:00`)!;
  const bookings = await db.booking.findMany({ where: { carId: car.id, status: { in: BLOCKING }, start: { lt: to }, end: { gt: from } }, select: { start: true, end: true } });
  const fmtDay = new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const columns: GridColumn[] = dates.map((date) => {
    const wd = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
    return { label: dayNames[wd], sub: fmtDay.format(new Date(`${date}T12:00:00Z`)), changed: exceptions.has(date), past: date < today };
  });
  const initial = dates.flatMap((date, col) => (exceptions.get(date) ?? weeklyHoursFor(car.weeklyHours, date)).map((h) => col * 24 + h));
  const booked = new Set<number>();
  for (const b of bookings) {
    for (const h of bookedHours(b.start < from ? from : b.start, b.end > to ? to : b.end)) {
      const s = localSlot(h); const col = dates.indexOf(s.date);
      if (col >= 0) booked.add(col * 24 + s.hour);
    }
  }
  return { columns, initial, booked: [...booked] };
}

export const todayLocal = () => localSlot(new Date()).date;
