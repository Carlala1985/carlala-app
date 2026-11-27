"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canRespond, canSubmit, checkReadings, MAX_EXTRA_PHOTOS, REQUIRED_SLOTS, type Stage } from "@/lib/handover";
import { isOurPhotoUrl } from "@/lib/uploads";
import { notifyHandover } from "@/lib/notify";

export type HandoverState = { error?: string } | undefined;

const urls = (v: FormDataEntryValue | null) => {
  try { const a: unknown = JSON.parse(String(v ?? "[]")); return Array.isArray(a) ? a.filter((u): u is string => isOurPhotoUrl(u, "handovers")) : []; }
  catch { return []; }
};

/** The booking if the user is its renter or the car's owner. */
async function participantBooking(bookingId: string, userId: string) {
  const b = await db.booking.findUnique({ where: { id: bookingId }, include: { car: true, handovers: true } });
  if (!b || (b.renterId !== userId && b.car.ownerId !== userId)) return null;
  return b;
}

export async function submitHandover(_: HandoverState, formData: FormData): Promise<HandoverState> {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId"));
  const stage: Stage = formData.get("stage") === "RETURN" ? "RETURN" : "PICKUP";
  const b = await participantBooking(bookingId, user.id);
  if (!b) return { error: "errExists" };
  const pickup = b.handovers.find((h) => h.stage === "PICKUP"), ret = b.handovers.find((h) => h.stage === "RETURN");
  if (!canSubmit(stage, b, pickup, ret)) return { error: "errExists" };

  const photos = REQUIRED_SLOTS.map((slot) => ({ slot, url: urls(formData.get(`photo_${slot}`))[0] }));
  if (photos.some((p) => !p.url)) return { error: "errPhotos" };
  const extra = urls(formData.get("photo_EXTRA")).slice(0, MAX_EXTRA_PHOTOS).map((url) => ({ slot: "EXTRA", url }));
  const readingError = checkReadings(formData.get("km"), formData.get("fuel"), stage === "RETURN" ? pickup?.odometerKm : undefined);
  if (readingError) return { error: `err${readingError}` };

  let id: string;
  try {
    const h = await db.handover.create({
      data: {
        bookingId, stage, submittedById: user.id,
        odometerKm: Number(formData.get("km")), fuelPercent: Number(formData.get("fuel")),
        notes: String(formData.get("notes") ?? "").trim().slice(0, 1000),
        photos: { create: [...photos, ...extra].map((p) => ({ slot: p.slot, url: p.url!, uploadedById: user.id })) },
      },
    });
    id = h.id;
  } catch (e) {
    // Both people submitted at the same moment: the first report wins.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "errExists" };
    throw e;
  }
  await notifyHandover(id, "submitted");
  revalidatePath(`/bookings/${bookingId}/handover`);
  redirect(`/bookings/${bookingId}/handover?done=submitted`);
}

/** The other side confirms the report, or reports a difference (with an optional comment and photos). */
export async function respondHandover(formData: FormData) {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId"));
  const stage: Stage = formData.get("stage") === "RETURN" ? "RETURN" : "PICKUP";
  const b = await participantBooking(bookingId, user.id);
  const h = b?.handovers.find((x) => x.stage === stage);
  if (!b || !h || !canRespond(h, user.id)) redirect(`/bookings/${bookingId}/handover`);
  if (formData.get("answer") === "object") {
    const comment = String(formData.get("comment") ?? "").trim().slice(0, 2000);
    if (!comment) redirect(`/bookings/${bookingId}/handover?error=errComment&stage=${stage}`);
    const extra = urls(formData.get("photo_OBJECTION")).slice(0, MAX_EXTRA_PHOTOS);
    await db.handover.update({
      where: { id: h.id },
      data: { objection: comment, objectionAt: new Date(), confirmedById: user.id, photos: { create: extra.map((url) => ({ slot: "EXTRA", url, uploadedById: user.id })) } },
    });
    await notifyHandover(h.id, "disputed");
  } else {
    await db.handover.update({ where: { id: h.id }, data: { confirmedById: user.id, confirmedAt: new Date() } });
  }
  revalidatePath(`/bookings/${bookingId}/handover`);
  redirect(`/bookings/${bookingId}/handover?done=responded`);
}
