"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { FUELS, SECTORS, TRANSMISSIONS } from "@/lib/cars";
import { isValidPhoto, MAX_PHOTOS, savePhoto } from "@/lib/uploads";
import { toBani } from "@/lib/money";

export type CarFormState = { error?: string } | undefined;

const nextYear = new Date().getFullYear() + 1;
const schema = z.object({
  make: z.string().trim().min(1).max(40),
  model: z.string().trim().min(1).max(60),
  year: z.coerce.number().int().min(1990, "errYear").max(nextYear, "errYear"),
  seats: z.coerce.number().int().min(2).max(9),
  transmission: z.enum(TRANSMISSIONS as [string, ...string[]]),
  fuel: z.enum(FUELS as [string, ...string[]]),
  sector: z.enum(SECTORS as [string, ...string[]]),
  neighbourhood: z.string().trim().min(2).max(60),
  description: z.string().trim().max(2000).default(""),
  pricePerHour: z.coerce.number().min(1, "errPrice").max(5000, "errPrice"),
  pricePerDay: z.coerce.number().min(1, "errPrice").max(5000, "errPrice"),
});

export async function saveCar(_: CarFormState, formData: FormData): Promise<CarFormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "") || null;
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues[0].message;
    return { error: msg.startsWith("err") ? msg : "errRequired" };
  }
  const d = parsed.data;
  if (d.pricePerDay < d.pricePerHour) return { error: "errDayPrice" };

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.some((f) => !isValidPhoto(f))) return { error: "errPhoto" };

  const data = {
    make: d.make, model: d.model, year: d.year, seats: d.seats,
    transmission: d.transmission as never, fuel: d.fuel as never, sector: d.sector as never,
    neighbourhood: d.neighbourhood, description: d.description,
    pricePerHour: toBani(d.pricePerHour), pricePerDay: toBani(d.pricePerDay),
  };

  let carId: string;
  if (id) {
    const car = await db.car.findUnique({ where: { id }, include: { _count: { select: { photos: true } } } });
    if (!car || car.ownerId !== user.id) return { error: "forbidden" };
    await db.car.update({ where: { id }, data });
    carId = id;
    const room = MAX_PHOTOS - car._count.photos;
    for (const [i, f] of files.slice(0, Math.max(0, room)).entries()) {
      await db.carPhoto.create({ data: { carId, url: await savePhoto(f), position: car._count.photos + i } });
    }
  } else {
    const car = await db.car.create({ data: { ...data, ownerId: user.id } });
    carId = car.id;
    for (const [i, f] of files.slice(0, MAX_PHOTOS).entries()) {
      await db.carPhoto.create({ data: { carId, url: await savePhoto(f), position: i } });
    }
  }
  revalidatePath("/cars");
  redirect(`/account/cars?saved=${carId}`);
}

export async function toggleCarActive(formData: FormData) {
  const user = await requireUser();
  const car = await db.car.findUnique({ where: { id: String(formData.get("id")) } });
  if (!car || car.ownerId !== user.id) return;
  await db.car.update({ where: { id: car.id }, data: { active: !car.active } });
  revalidatePath("/account/cars");
  revalidatePath("/cars");
}

export async function deletePhoto(formData: FormData) {
  const user = await requireUser();
  const photo = await db.carPhoto.findUnique({ where: { id: String(formData.get("photoId")) }, include: { car: true } });
  if (!photo || photo.car.ownerId !== user.id) return;
  await db.carPhoto.delete({ where: { id: photo.id } });
  revalidatePath(`/account/cars/${photo.carId}/edit`);
}
