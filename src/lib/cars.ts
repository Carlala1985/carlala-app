import type { BookingStatus, Fuel, Prisma, Sector, Transmission } from "@prisma/client";
import { db } from "./db";
import { datesTouched, isAvailable, type Exceptions } from "./availability";

export const SECTORS: Sector[] = ["S1", "S2", "S3", "S4", "S5", "S6", "ILFOV"];
export const TRANSMISSIONS: Transmission[] = ["MANUAL", "AUTOMATIC"];
export const FUELS: Fuel[] = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC", "LPG"];

/** Bookings in these states make the car unavailable for that time. */
export const BLOCKING: BookingStatus[] = ["ACCEPTED", "PAID"];

export const isSector = (v: unknown): v is Sector => SECTORS.includes(v as Sector);
export const isTransmission = (v: unknown): v is Transmission => TRANSMISSIONS.includes(v as Transmission);
export const isFuel = (v: unknown): v is Fuel => FUELS.includes(v as Fuel);

/** Cars anyone can see: live, not hidden by an admin, owner not suspended. */
export const publicCar: Prisma.CarWhereInput = { active: true, blocked: false, deletedAt: null, owner: { suspended: false, deletedAt: null } };

export type SearchParams = { sector?: Sector; transmission?: Transmission; fuel?: Fuel; start?: Date; end?: Date };

export async function searchCars(p: SearchParams, take = 60) {
  const where: Prisma.CarWhereInput = { ...publicCar };
  if (p.sector) where.sector = p.sector;
  if (p.transmission) where.transmission = p.transmission;
  if (p.fuel) where.fuel = p.fuel;
  if (p.start && p.end) {
    where.bookings = { none: { status: { in: BLOCKING }, start: { lt: p.end }, end: { gt: p.start } } };
  }
  const cars = await db.car.findMany({
    where, take: p.start && p.end ? take * 3 : take, orderBy: { createdAt: "desc" },
    include: { photos: { orderBy: { position: "asc" }, take: 1 } },
  });
  if (!(p.start && p.end)) return cars;
  // Cars with an agenda are only shown when every requested hour is coloured as available.
  const ex = await loadExceptions(cars.filter((c) => c.hasAgenda).map((c) => c.id), p.start, p.end);
  return cars.filter((c) => isAvailable(c, ex.get(c.id) ?? new Map(), p.start!, p.end!)).slice(0, take);
}

/** Date exceptions per car for the days a time range touches. */
export async function loadExceptions(carIds: string[], start: Date, end: Date) {
  const out = new Map<string, Exceptions>();
  if (!carIds.length) return out;
  const rows = await db.availabilityException.findMany({ where: { carId: { in: carIds }, date: { in: datesTouched(start, end) } } });
  for (const r of rows) {
    if (!out.has(r.carId)) out.set(r.carId, new Map());
    out.get(r.carId)!.set(r.date, r.hours);
  }
  return out;
}

/** True when the car's agenda allows the whole booking. */
export async function fitsAgenda(car: { id: string; hasAgenda: boolean; weeklyHours: number[] }, start: Date, end: Date) {
  if (!car.hasAgenda) return true;
  const ex = await loadExceptions([car.id], start, end);
  return isAvailable(car, ex.get(car.id) ?? new Map(), start, end);
}

/** Average rating an owner received, with count. */
export async function ownerRating(ownerId: string) {
  const r = await db.review.aggregate({ where: { subjectId: ownerId }, _avg: { rating: true }, _count: true });
  return { avg: r._avg.rating ?? null, count: r._count };
}
