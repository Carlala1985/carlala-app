import "server-only";
import { randomBytes } from "crypto";
import { unlink } from "fs/promises";
import path from "path";
import { del } from "@vercel/blob";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { blobEnabled, blobToken, UPLOAD_DIR } from "./uploads";

/**
 * Deletion keeps booking history (needed for accounting, see the privacy policy) but removes
 * everything personal: listings and photos disappear, accounts are anonymised.
 */
export type DeleteResult = "ok" | "has_trips" | "not_found";

/** A paid trip that hasn't ended yet blocks deletion, so nobody is left without the car they paid for. */
async function hasActiveTrips(where: { carId?: string; carIds?: string[]; renterId?: string }) {
  const now = new Date();
  const or = [];
  if (where.carId) or.push({ carId: where.carId });
  if (where.carIds?.length) or.push({ carId: { in: where.carIds } });
  if (where.renterId) or.push({ renterId: where.renterId });
  if (!or.length) return false;
  return (await db.booking.count({ where: { status: "PAID", end: { gt: now }, OR: or } })) > 0;
}

/** Deletes the stored photo files. Best effort: a missing file never blocks a deletion. */
export async function removePhotoFiles(urls: string[]) {
  for (const url of urls) {
    try {
      if (url.startsWith("/uploads/")) await unlink(path.join(UPLOAD_DIR, url.slice("/uploads/".length)));
      else if (blobEnabled() && url.includes(".blob.vercel-storage.com/")) await del(url, blobToken() ? { token: blobToken() } : undefined);
    } catch (e) {
      console.warn("could not remove photo file", url, (e as Error).message);
    }
  }
}

export async function deleteCar(carId: string): Promise<DeleteResult> {
  const car = await db.car.findFirst({ where: { id: carId, deletedAt: null }, include: { photos: true } });
  if (!car) return "not_found";
  if (await hasActiveTrips({ carId })) return "has_trips";
  await db.$transaction([
    db.booking.updateMany({ where: { carId, status: { in: ["REQUESTED", "ACCEPTED"] } }, data: { status: "DECLINED" } }),
    db.carPhoto.deleteMany({ where: { carId } }),
    db.car.update({ where: { id: carId }, data: { deletedAt: new Date(), active: false, description: "" } }),
  ]);
  await removePhotoFiles(car.photos.map((p) => p.url));
  return "ok";
}

export async function deleteUser(userId: string): Promise<DeleteResult> {
  const user = await db.user.findFirst({ where: { id: userId, deletedAt: null }, include: { cars: { where: { deletedAt: null }, select: { id: true } } } });
  if (!user) return "not_found";
  const carIds = user.cars.map((c) => c.id);
  if (await hasActiveTrips({ carIds, renterId: userId })) return "has_trips";
  for (const id of carIds) await deleteCar(id);
  await db.$transaction([
    db.booking.updateMany({ where: { renterId: userId, status: { in: ["REQUESTED", "ACCEPTED"] } }, data: { status: "CANCELLED" } }),
    db.booking.updateMany({ where: { renterId: userId }, data: { message: "" } }),
    db.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        name: "",
        email: `deleted-${userId}@deleted.carlala.invalid`,
        phone: null,
        passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
        role: "USER",
      },
    }),
  ]);
  return "ok";
}

/** Name to show for a person; deleted accounts show a neutral label instead. */
export function displayName(u: { name: string; deletedAt: Date | null }, deletedLabel: string, first = false) {
  if (u.deletedAt || !u.name) return deletedLabel;
  return first ? u.name.split(" ")[0] : u.name;
}
