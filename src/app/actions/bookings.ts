"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n";
import { fitsAgenda, publicCar } from "@/lib/cars";
import { quote, validateRange } from "@/lib/pricing";
import { parseLocal } from "@/lib/time";
import { hasConflict, markPaid, onTripFinished } from "@/lib/bookings";
import { paymentUrl, stripeEnabled } from "@/lib/payments";
import { notifyBooking } from "@/lib/notify";

const back = (carId: string, start: string, end: string, extra: string) =>
  `/cars/${carId}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&${extra}`;

export async function requestBooking(formData: FormData) {
  const carId = String(formData.get("carId"));
  const startRaw = String(formData.get("start") ?? ""), endRaw = String(formData.get("end") ?? "");
  const user = await requireUser(`/cars/${carId}`);
  const car = await db.car.findFirst({ where: { id: carId, ...publicCar } });
  if (!car) redirect(`/cars/${carId}`);
  if (car.ownerId === user.id) redirect(back(carId, startRaw, endRaw, "error=forbidden"));
  const start = parseLocal(startRaw), end = parseLocal(endRaw);
  if (!start || !end) redirect(back(carId, startRaw, endRaw, "error=dates"));
  const err = validateRange(start, end);
  if (err) redirect(back(carId, startRaw, endRaw, `error=${err}`));
  if (!(await fitsAgenda(car, start, end))) redirect(back(carId, startRaw, endRaw, "error=outside_agenda"));
  if (await hasConflict(carId, start, end)) redirect(back(carId, startRaw, endRaw, "error=unavailable"));
  const q = quote(start, end, car.pricePerHour, car.pricePerDay);
  const booking = await db.booking.create({
    data: {
      carId, renterId: user.id, start, end,
      totalPrice: q.total, platformFee: q.platformFee, ownerEarnings: q.ownerEarnings,
      message: String(formData.get("message") ?? "").slice(0, 1000),
    },
  });
  await notifyBooking(booking.id, "newRequest");
  redirect("/account/trips?sent=1");
}

async function ownBooking(id: string, as: "owner" | "renter") {
  const user = await requireUser();
  const b = await db.booking.findUnique({ where: { id }, include: { car: true } });
  if (!b) return null;
  if (as === "owner" && b.car.ownerId !== user.id) return null;
  if (as === "renter" && b.renterId !== user.id) return null;
  return { user, b };
}

export async function acceptBooking(formData: FormData) {
  const r = await ownBooking(String(formData.get("id")), "owner");
  if (!r || r.b.status !== "REQUESTED") return;
  if (stripeEnabled() && !r.user.payoutsReady) redirect("/account/requests?error=payouts");
  if (await hasConflict(r.b.carId, r.b.start, r.b.end, r.b.id)) redirect("/account/requests?error=conflict");
  await db.booking.update({ where: { id: r.b.id }, data: { status: "ACCEPTED" } });
  await notifyBooking(r.b.id, "accepted");
  revalidatePath("/account/requests");
}

export async function declineBooking(formData: FormData) {
  const r = await ownBooking(String(formData.get("id")), "owner");
  if (!r || !["REQUESTED", "ACCEPTED"].includes(r.b.status)) return;
  await db.booking.update({ where: { id: r.b.id }, data: { status: "DECLINED" } });
  await notifyBooking(r.b.id, "declined");
  revalidatePath("/account/requests");
}

export async function completeBooking(formData: FormData) {
  const r = await ownBooking(String(formData.get("id")), "owner");
  if (!r || r.b.status !== "PAID" || r.b.start > new Date()) return;
  await db.booking.update({ where: { id: r.b.id }, data: { status: "COMPLETED" } });
  await onTripFinished(r.b.id);
  revalidatePath("/account/requests");
}

/** Renter cancels before paying. Paid trips need a refund, handled by Carlala support for now. */
export async function cancelBooking(formData: FormData) {
  const r = await ownBooking(String(formData.get("id")), "renter");
  if (!r || !["REQUESTED", "ACCEPTED"].includes(r.b.status)) return;
  await db.booking.update({ where: { id: r.b.id }, data: { status: "CANCELLED" } });
  await notifyBooking(r.b.id, "cancelled");
  revalidatePath("/account/trips");
}

export async function payBooking(formData: FormData) {
  const r = await ownBooking(String(formData.get("id")), "renter");
  if (!r || r.b.status !== "ACCEPTED") redirect("/account/trips");
  if (await hasConflict(r.b.carId, r.b.start, r.b.end, r.b.id)) redirect("/account/trips?payment=unavailable");
  let url: string;
  try {
    url = await paymentUrl(r.b, r.user.email, await getLocale());
  } catch (e) {
    console.error("Stripe checkout failed", e);
    redirect("/account/trips?payment=failed");
  }
  redirect(url);
}

/** Test-only payment, available while Stripe is not configured. */
export async function simulatePayment(formData: FormData) {
  if (stripeEnabled()) redirect("/account/trips");
  const r = await ownBooking(String(formData.get("id")), "renter");
  if (!r) redirect("/account/trips");
  const res = await markPaid(r.b.id);
  redirect(res === "conflict" ? "/account/trips?payment=unavailable" : "/account/trips?payment=success");
}
