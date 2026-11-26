"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, isAdminEmail } from "@/lib/session";
import { getLocale } from "@/lib/i18n";
import { notifyWelcome } from "@/lib/notify";

export type AuthState = { error?: string; values?: Record<string, string> } | undefined;

/** Only allow redirects to paths on this site. */
function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

const signupSchema = z.object({
  name: z.string().trim().min(2, "errName").max(80),
  email: z.string().trim().toLowerCase().email("errEmail").max(160),
  password: z.string().min(8, "errPassword").max(200),
  phone: z.string().trim().max(30).optional(),
});

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(["name", "email", "password", "phone"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = signupSchema.safeParse(raw);
  const values = { name: raw.name, email: raw.email, phone: raw.phone };
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const { name, email, password, phone } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { error: "errExists", values };
  const user = await db.user.create({
    data: { name, email, phone: phone || null, passwordHash: await bcrypt.hash(password, 10), locale: await getLocale(), role: isAdminEmail(email) ? "ADMIN" : "USER" },
  });
  await createSession(user.id);
  await notifyWelcome(user);
  redirect(safeNext(formData.get("next")));
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "errInvalid", values: { email } };
  if (user.suspended) return { error: "suspended", values: { email } };
  if (user.role !== "ADMIN" && isAdminEmail(user.email)) await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
