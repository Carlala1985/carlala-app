"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { cleanHours, HOURS_PER_WEEK, isDateStr, weekDates, weeklyHoursFor } from "@/lib/availability";

async function ownCar(carId: string) {
  const user = await requireUser();
  const car = await db.car.findFirst({ where: { id: carId, ownerId: user.id, deletedAt: null } });
  if (!car) redirect("/account/cars");
  return car;
}

const parse = (v: FormDataEntryValue | null) => { try { return JSON.parse(String(v ?? "")); } catch { return null; } };
const back = (carId: string, extra: string) => `/account/cars/${carId}/availability?${extra}`;

/** Saves the typical week. Turns the agenda on. */
export async function saveWeekly(formData: FormData) {
  const car = await ownCar(String(formData.get("carId")));
  const hours = cleanHours(parse(formData.get("slots")), HOURS_PER_WEEK);
  if (!hours) redirect(back(car.id, "tab=week"));
  await db.car.update({ where: { id: car.id }, data: { weeklyHours: hours, hasAgenda: true } });
  revalidatePath(`/cars/${car.id}`);
  redirect(back(car.id, "tab=week&saved=1"));
}

/**
 * Saves 7 specific dates. A date equal to the typical week stores no exception;
 * anything different is stored as that day's own hours.
 */
export async function saveDates(formData: FormData) {
  const car = await ownCar(String(formData.get("carId")));
  const monday = String(formData.get("week"));
  const cells = cleanHours(parse(formData.get("slots")), HOURS_PER_WEEK);
  if (!isDateStr(monday) || !cells) redirect(back(car.id, "tab=dates"));
  const dates = weekDates(monday);
  const ops = dates.map((date, col) => {
    const hours = cells.filter((i) => Math.floor(i / 24) === col).map((i) => i % 24);
    const typical = weeklyHoursFor(car.weeklyHours, date);
    const same = hours.length === typical.length && hours.every((h, k) => h === typical[k]);
    return same
      ? db.availabilityException.deleteMany({ where: { carId: car.id, date } })
      : db.availabilityException.upsert({ where: { carId_date: { carId: car.id, date } }, update: { hours }, create: { carId: car.id, date, hours } });
  });
  await db.$transaction([...ops, db.car.update({ where: { id: car.id }, data: { hasAgenda: true } })]);
  revalidatePath(`/cars/${car.id}`);
  redirect(back(car.id, `tab=dates&week=${monday}&saved=1`));
}

/** Removes this week's date changes so the typical week applies again. */
export async function resetDates(formData: FormData) {
  const car = await ownCar(String(formData.get("carId")));
  const monday = String(formData.get("week"));
  if (isDateStr(monday)) await db.availabilityException.deleteMany({ where: { carId: car.id, date: { in: weekDates(monday) } } });
  revalidatePath(`/cars/${car.id}`);
  redirect(back(car.id, `tab=dates&week=${monday}&saved=1`));
}

/** Turns the agenda off (data is kept): the car can be requested at any time again. */
export async function stopAgenda(formData: FormData) {
  const car = await ownCar(String(formData.get("carId")));
  await db.car.update({ where: { id: car.id }, data: { hasAgenda: false } });
  revalidatePath(`/cars/${car.id}`);
  redirect(back(car.id, "stopped=1"));
}
