"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function toggleSuspend(formData: FormData) {
  const admin = await requireAdmin();
  const u = await db.user.findUnique({ where: { id: String(formData.get("id")) } });
  if (!u || u.id === admin.id) return;
  await db.user.update({ where: { id: u.id }, data: { suspended: !u.suspended } });
  revalidatePath("/admin");
}

export async function toggleBlock(formData: FormData) {
  await requireAdmin();
  const c = await db.car.findUnique({ where: { id: String(formData.get("id")) } });
  if (!c) return;
  await db.car.update({ where: { id: c.id }, data: { blocked: !c.blocked } });
  revalidatePath("/admin");
  revalidatePath("/cars");
}
