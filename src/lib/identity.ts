import "server-only";
import type Stripe from "stripe";
import type { User } from "@prisma/client";
import { db } from "./db";
import { stripe, stripeEnabled } from "./payments";
import { appUrl } from "./url";
import { ageOn, MIN_DRIVER_AGE } from "./driverRules";

/**
 * Driver checks with Stripe Identity: the renter photographs their driving licence and takes a
 * live selfie on Stripe's hosted page. Stripe checks the licence is genuine and not expired, and
 * that the face matches. Carlala keeps only the result, the name on the licence, its expiry date
 * and issuing country. The date of birth is read once for the age check and not stored.
 */
/** `next`: where to send the renter after a passed check (e.g. back to the car they wanted). */
export async function startCheck(user: User, next = ""): Promise<string> {
  // Close an unfinished earlier session so only one is open per person.
  if (user.identitySessionId && user.driverStatus !== "VERIFIED") {
    await stripe().identity.verificationSessions.cancel(user.identitySessionId).catch(() => {});
  }
  const session = await stripe().identity.verificationSessions.create({
    type: "document",
    options: { document: { allowed_types: ["driving_license"], require_live_capture: true, require_matching_selfie: true } },
    provided_details: { email: user.email },
    client_reference_id: user.id,
    metadata: { userId: user.id },
    return_url: `${appUrl()}/account/verify?return=1${next ? `&next=${encodeURIComponent(next)}` : ""}`,
  });
  await db.user.update({ where: { id: user.id }, data: { identitySessionId: session.id, driverError: null } });
  return session.url!;
}

/** Applies a VerificationSession's state to its user. Ignores sessions that aren't the user's latest. */
export async function applySession(session: Stripe.Identity.VerificationSession) {
  const user = await db.user.findUnique({ where: { identitySessionId: session.id } });
  if (!user) return null;
  switch (session.status) {
    case "processing":
      if (user.driverStatus !== "VERIFIED") await db.user.update({ where: { id: user.id }, data: { driverStatus: "PROCESSING" } });
      break;
    case "requires_input":
      await db.user.update({ where: { id: user.id }, data: { driverStatus: "REQUIRES_INPUT", driverError: session.last_error?.code ?? "unverified" } });
      break;
    case "canceled":
      if (user.driverStatus !== "VERIFIED") await db.user.update({ where: { id: user.id }, data: { driverStatus: "NONE" } });
      break;
    case "verified":
      if (user.driverStatus !== "VERIFIED" || !user.driverVerifiedAt) await recordVerified(user.id, session);
      break;
  }
  return db.user.findUnique({ where: { id: user.id } });
}

async function recordVerified(userId: string, session: Stripe.Identity.VerificationSession) {
  const reportId = typeof session.last_verification_report === "string" ? session.last_verification_report : session.last_verification_report?.id;
  let doc: Stripe.Identity.VerificationReport.Document | null = null;
  if (reportId) {
    // Expiry and date of birth are "sensitive" fields: they need an explicit expand.
    const report = await stripe().identity.verificationReports
      .retrieve(reportId, { expand: ["document.expiration_date", "document.dob"] })
      .catch((e) => {
        console.error("identity report (sensitive fields) failed:", (e as Error).message);
        return stripe().identity.verificationReports.retrieve(reportId);
      });
    doc = report.document ?? null;
  }
  const dob = doc?.dob;
  if (dob?.year && dob.month && dob.day && ageOn({ year: dob.year, month: dob.month, day: dob.day }, new Date()) < MIN_DRIVER_AGE) {
    await db.user.update({ where: { id: userId }, data: { driverStatus: "REQUIRES_INPUT", driverError: "under_age" } });
    return;
  }
  const exp = doc?.expiration_date;
  const name = [doc?.first_name, doc?.last_name].filter(Boolean).join(" ");
  await db.user.update({
    where: { id: userId },
    data: {
      driverStatus: "VERIFIED", driverVerifiedAt: new Date(), driverError: null,
      driverName: name || null,
      licenceCountry: doc?.issuing_country ?? null,
      licenceExpiresOn: exp?.year && exp.month && exp.day ? new Date(Date.UTC(exp.year, exp.month - 1, exp.day)) : null,
    },
  });
}

/** Pulls the latest state from Stripe (used when the renter comes back, in case the webhook is late). */
export async function refreshCheck(user: User) {
  if (!stripeEnabled() || !user.identitySessionId || user.driverStatus === "VERIFIED") return user;
  const session = await stripe().identity.verificationSessions.retrieve(user.identitySessionId);
  return (await applySession(session)) ?? user;
}

/** On account deletion: asks Stripe to erase the licence and selfie it collected (best effort). */
export async function redactCheck(sessionId: string | null) {
  if (!stripeEnabled() || !sessionId) return;
  const s = await stripe().identity.verificationSessions.retrieve(sessionId).catch(() => null);
  if (!s) return;
  if (s.status === "verified" || s.status === "requires_input") {
    await stripe().identity.verificationSessions.redact(sessionId).catch((e) => console.error("identity redact failed:", (e as Error).message));
  } else if (s.status !== "canceled") {
    await stripe().identity.verificationSessions.cancel(sessionId).catch(() => {});
  }
}
