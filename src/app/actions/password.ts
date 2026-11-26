"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { createResetToken, findValidToken } from "@/lib/passwordReset";
import { sendEmail } from "@/lib/email/send";
import { emails } from "@/lib/email/templates";
import { appUrl } from "@/lib/url";
import { getLocale } from "@/lib/i18n";

/** Always answers the same way, so this page can't be used to find out who has an account. */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 160);
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  if (user && !user.deletedAt && !user.suspended) {
    const token = await createResetToken(user.id);
    if (token) {
      const l = user.locale === "en" ? "en" : user.locale === "ro" ? "ro" : await getLocale();
      await sendEmail({ to: user.email, toName: user.name, tag: "password-reset", ...emails.reset(l, `${appUrl()}/reset-password?token=${token}`) });
    }
  }
  redirect("/forgot-password?sent=1");
}

export type ResetState = { error?: string } | undefined;

export async function resetPassword(_: ResetState, formData: FormData): Promise<ResetState> {
  const rec = await findValidToken(String(formData.get("token") ?? ""));
  if (!rec) return { error: "resetInvalid" };
  const password = String(formData.get("password") ?? "");
  if (password.length < 8 || password.length > 200) return { error: "errPassword" };
  const passwordHash = await bcrypt.hash(password, 10);
  await db.$transaction([
    db.user.update({ where: { id: rec.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    db.passwordResetToken.deleteMany({ where: { userId: rec.userId, id: { not: rec.id } } }),
  ]);
  await createSession(rec.userId);
  redirect("/?reset=1");
}
