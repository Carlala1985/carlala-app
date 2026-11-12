"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

/** Either side of a finished trip can review the other, once. */
export async function submitReview(formData: FormData) {
  const user = await requireUser();
  const b = await db.booking.findUnique({ where: { id: String(formData.get("bookingId")) }, include: { car: true } });
  if (!b || b.status !== "COMPLETED") return;
  const isRenter = b.renterId === user.id, isOwner = b.car.ownerId === user.id;
  if (!isRenter && !isOwner) return;
  const rating = Math.round(Number(formData.get("rating")));
  if (!(rating >= 1 && rating <= 5)) return;
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 1000);
  await db.review.upsert({
    where: { bookingId_authorId: { bookingId: b.id, authorId: user.id } },
    update: {},
    create: { bookingId: b.id, authorId: user.id, subjectId: isRenter ? b.car.ownerId : b.renterId, rating, comment },
  });
  revalidatePath(isRenter ? "/account/trips" : "/account/requests");
  revalidatePath(`/cars/${b.carId}`);
}
