import type { BookingStatus, Fuel, Prisma, Sector, Transmission } from "@prisma/client";
import { db } from "./db";

export const SECTORS: Sector[] = ["S1", "S2", "S3", "S4", "S5", "S6", "ILFOV"];
export const TRANSMISSIONS: Transmission[] = ["MANUAL", "AUTOMATIC"];
export const FUELS: Fuel[] = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC", "LPG"];

/** Bookings in these states make the car unavailable for that time. */
export const BLOCKING: BookingStatus[] = ["ACCEPTED", "PAID"];

export const isSector = (v: unknown): v is Sector => SECTORS.includes(v as Sector);
export const isTransmission = (v: unknown): v is Transmission => TRANSMISSIONS.includes(v as Transmission);
export const isFuel = (v: unknown): v is Fuel => FUELS.includes(v as Fuel);

/** Cars anyone can see: live, not hidden by an admin, owner not suspended. */
export const publicCar: Prisma.CarWhereInput = { active: true, blocked: false, owner: { suspended: false } };

export type SearchParams = { sector?: Sector; transmission?: Transmission; fuel?: Fuel; start?: Date; end?: Date };

export async function searchCars(p: SearchParams, take = 60) {
  const where: Prisma.CarWhereInput = { ...publicCar };
  if (p.sector) where.sector = p.sector;
  if (p.transmission) where.transmission = p.transmission;
  if (p.fuel) where.fuel = p.fuel;
  if (p.start && p.end) {
    where.bookings = { none: { status: { in: BLOCKING }, start: { lt: p.end }, end: { gt: p.start } } };
  }
  return db.car.findMany({
    where, take, orderBy: { createdAt: "desc" },
    include: { photos: { orderBy: { position: "asc" }, take: 1 } },
  });
}

/** Average rating an owner received, with count. */
export async function ownerRating(ownerId: string) {
  const r = await db.review.aggregate({ where: { subjectId: ownerId }, _avg: { rating: true }, _count: true });
  return { avg: r._avg.rating ?? null, count: r._count };
}
