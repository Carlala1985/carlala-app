import "server-only";
import { db } from "./db";
import { BLOCKING } from "./cars";
import { notifyBooking } from "./notify";

/**
 * Moves bookings forward in time. Runs before dashboards are shown:
 * unanswered or unpaid requests expire at pick-up time; paid trips finish at return time.
 */
export async function settleBookings() {
  const now = new Date();
  await db.booking.updateMany({ where: { status: { in: ["REQUESTED", "ACCEPTED"] }, start: { lt: now } }, data: { status: "EXPIRED" } });
  const ended = await db.booking.findMany({ where: { status: "PAID", end: { lt: now } }, select: { id: true } });
  for (const { id } of ended) {
    // Only the request that actually flips the status sends the review invitation.
    const { count } = await db.booking.updateMany({ where: { id, status: "PAID" }, data: { status: "COMPLETED" } });
    if (count === 1) await notifyBooking(id, "review");
  }
}

/** True when the car already has an accepted or paid booking overlapping this time. */
export async function hasConflict(carId: string, start: Date, end: Date, excludeId?: string) {
  const n = await db.booking.count({
    where: { carId, status: { in: BLOCKING }, start: { lt: end }, end: { gt: start }, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  return n > 0;
}

/**
 * Confirms payment for a booking. Safe to call more than once (Stripe webhook, return page, simulator).
 * Returns "paid", "already" or "conflict" (someone else's trip was confirmed first).
 */
export async function markPaid(bookingId: string) {
  const result = await markPaidTx(bookingId);
  if (result === "paid") await notifyBooking(bookingId, "paid");
  return result;
}

async function markPaidTx(bookingId: string) {
  return db.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!b) return "missing" as const;
    if (b.status === "PAID" || b.status === "COMPLETED") return "already" as const;
    if (b.status !== "ACCEPTED") return "invalid" as const;
    const clash = await tx.booking.count({
      where: { carId: b.carId, status: "PAID", start: { lt: b.end }, end: { gt: b.start }, id: { not: b.id } },
    });
    if (clash > 0) {
      // Needs a refund in Stripe; flagged for the admin page.
      await tx.booking.update({ where: { id: b.id }, data: { status: "CANCELLED" } });
      return "conflict" as const;
    }
    await tx.booking.update({ where: { id: b.id }, data: { status: "PAID", paidAt: new Date() } });
    return "paid" as const;
  }, { isolationLevel: "Serializable" });
}
