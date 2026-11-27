"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { stripeEnabled } from "@/lib/payments";
import { startCheck } from "@/lib/identity";
import { canStartCheck } from "@/lib/driverRules";

const safeNext = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : "";
};

/** Sends the renter to Stripe Identity's hosted page (driving licence + selfie). */
export async function startDriverCheck(formData: FormData) {
  const user = await requireUser("/account/verify");
  const next = safeNext(formData.get("next"));
  if (!stripeEnabled() || !canStartCheck(user)) redirect("/account/verify");
  let url: string;
  try {
    url = await startCheck(user, next);
  } catch (e) {
    console.error("identity session failed:", (e as Error).message);
    redirect("/account/verify?error=1");
  }
  redirect(url);
}

/** Test simulator (only when Stripe isn't configured): marks the check as passed. */
export async function simulateDriverCheck(formData: FormData) {
  const user = await requireUser("/account/verify");
  if (stripeEnabled()) redirect("/account/verify");
  await db.user.update({
    where: { id: user.id },
    data: { driverStatus: "VERIFIED", driverVerifiedAt: new Date(), driverName: user.name, driverError: null, licenceCountry: "RO", licenceExpiresOn: null },
  });
  const next = safeNext(formData.get("next"));
  redirect(`/account/verify${next ? `?next=${encodeURIComponent(next)}` : ""}`);
}
