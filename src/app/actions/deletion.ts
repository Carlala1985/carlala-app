"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { destroySession, requireAdmin, requireUser } from "@/lib/session";
import { deleteCar, deleteUser } from "@/lib/deletion";

/** Owner deletes one of their cars. */
export async function deleteMyCar(formData: FormData) {
  const user = await requireUser();
  const car = await db.car.findFirst({ where: { id: String(formData.get("id")), ownerId: user.id, deletedAt: null } });
  if (!car) redirect("/account/cars");
  const res = await deleteCar(car.id);
  revalidatePath("/cars");
  redirect(res === "has_trips" ? "/account/cars?error=car_has_trips" : "/account/cars?deleted=1");
}

/** A person deletes their own account. */
export async function deleteMyAccount() {
  const user = await requireUser();
  const res = await deleteUser(user.id);
  if (res === "has_trips") redirect("/account?error=has_trips");
  await destroySession();
  revalidatePath("/cars");
  redirect("/?account=deleted");
}

export async function adminDeleteCar(formData: FormData) {
  await requireAdmin();
  const res = await deleteCar(String(formData.get("id")));
  revalidatePath("/cars");
  redirect(res === "has_trips" ? "/admin?error=car_has_trips" : "/admin?deleted=car");
}

export async function adminDeleteUser(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  if (id === admin.id) redirect("/admin");
  const res = await deleteUser(id);
  revalidatePath("/cars");
  redirect(res === "has_trips" ? "/admin?error=user_has_trips" : "/admin?deleted=user");
}
