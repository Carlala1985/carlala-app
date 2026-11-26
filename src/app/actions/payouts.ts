"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";
import { stripeEnabled } from "@/lib/payments";
import { dashboardLink, ensureAccount, onboardingLink, refundBooking } from "@/lib/connect";

/** Sends the owner to Stripe-hosted onboarding (creates their connected account the first time). */
export async function startPayoutOnboarding() {
  const user = await requireUser("/account/payouts");
  if (!stripeEnabled()) redirect("/account/payouts");
  let url: string;
  try {
    url = await onboardingLink(await ensureAccount(user));
  } catch (e) {
    console.error("onboarding link failed:", (e as Error).message);
    redirect("/account/payouts?error=1");
  }
  redirect(url);
}

export async function openPayoutDashboard() {
  const user = await requireUser("/account/payouts");
  if (!stripeEnabled() || !user.stripeAccountId) redirect("/account/payouts");
  let url: string;
  try {
    url = await dashboardLink(user.stripeAccountId);
  } catch (e) {
    console.error("dashboard link failed:", (e as Error).message);
    redirect("/account/payouts?error=1");
  }
  redirect(url);
}

/** Admin: full refund of a paid booking (before the owner is paid). */
export async function adminRefund(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const exists = await db.booking.findUnique({ where: { id }, select: { id: true } });
  if (!exists) redirect("/admin");
  const res = await refundBooking(id);
  revalidatePath("/admin");
  redirect(res === "refunded" || res === "already" ? "/admin?refunded=1" : "/admin?error=refund");
}
