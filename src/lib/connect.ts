import "server-only";
import type Stripe from "stripe";
import type { User } from "@prisma/client";
import { db } from "./db";
import { appUrl } from "./url";
import { stripe, stripeEnabled, sessionPaymentRefs } from "./payments";
import { markPaid } from "./bookings";

/**
 * Stripe Connect for Carlala (see docs/stripe-plan.md):
 * owners are Accounts v2 "recipient" accounts with the Express dashboard; Carlala charges renters,
 * holds the money, and transfers the owner's share after the trip (separate charges and transfers).
 */

export type PayoutStatus = "disabled" | "none" | "pending" | "active" | "restricted";

/** Creates the owner's connected account once, and remembers its id. */
export async function ensureAccount(user: User): Promise<string> {
  if (user.stripeAccountId) return user.stripeAccountId;
  const account = await stripe().v2.core.accounts.create({
    display_name: user.name,
    contact_email: user.email,
    identity: { country: "ro", entity_type: "individual" },
    dashboard: "express",
    defaults: {
      currency: "ron",
      locales: [user.locale === "en" ? "en-GB" : "ro-RO"],
      responsibilities: { fees_collector: "application", losses_collector: "application" },
    },
    configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
    metadata: { carlalaUserId: user.id },
  }, { idempotencyKey: `account-${user.id}` });
  await db.user.update({ where: { id: user.id }, data: { stripeAccountId: account.id } });
  return account.id;
}

/** Stripe-hosted onboarding page where the owner gives ID, address and IBAN. */
export async function onboardingLink(accountId: string) {
  const link = await stripe().v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        refresh_url: `${appUrl()}/account/payouts?refresh=1`,
        return_url: `${appUrl()}/account/payouts?return=1`,
        collection_options: { fields: "eventually_due" },
      },
    },
  });
  return link.url;
}

/** One-time login link to the owner's Stripe Express dashboard (payouts, bank details). */
export async function dashboardLink(accountId: string) {
  return (await stripe().accounts.createLoginLink(accountId)).url;
}

/** Reads the transfers capability from Stripe (v2 path) and caches it on the user. */
export async function refreshPayoutStatus(user: User): Promise<PayoutStatus> {
  if (!stripeEnabled()) return "disabled";
  if (!user.stripeAccountId) return "none";
  const account = await stripe().v2.core.accounts.retrieve(user.stripeAccountId, { include: ["configuration.recipient"] });
  const cap = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
  const ready = cap === "active";
  if (ready !== user.payoutsReady) await db.user.update({ where: { id: user.id }, data: { payoutsReady: ready } });
  if (ready) await payPendingForOwner(user.id);
  return ready ? "active" : cap === "restricted" || cap === "rejected" ? "restricted" : "pending";
}

export type PayoutResult = "paid" | "already" | "not_ready" | "not_eligible" | "disabled" | "error";

/**
 * Pays the owner their share of a finished trip. Safe to call repeatedly:
 * the idempotency key is the booking id and the transfer id is stored.
 */
export async function payOwner(bookingId: string): Promise<PayoutResult> {
  if (!stripeEnabled()) return "disabled";
  const b = await db.booking.findUnique({ where: { id: bookingId }, include: { car: { include: { owner: true } } } });
  if (!b) return "not_eligible";
  if (b.stripeTransferId) return "already";
  if (b.status !== "COMPLETED" || !b.stripeChargeId || b.refundedAt || b.ownerEarnings <= 0) return "not_eligible";
  const owner = b.car.owner;
  if (!owner.stripeAccountId || !owner.payoutsReady) return "not_ready";
  try {
    // Re-check the capability right before moving money.
    const account = await stripe().v2.core.accounts.retrieve(owner.stripeAccountId, { include: ["configuration.recipient"] });
    if (account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status !== "active") {
      await db.user.update({ where: { id: owner.id }, data: { payoutsReady: false } });
      return "not_ready";
    }
    const transfer = await stripe().transfers.create({
      amount: b.ownerEarnings,
      currency: "ron",
      destination: owner.stripeAccountId,
      transfer_group: b.id,
      source_transaction: b.stripeChargeId, // never transfers money that hasn't been collected
      description: `${b.car.make} ${b.car.model}, Carlala booking ${b.id}`,
      metadata: { bookingId: b.id },
    }, { idempotencyKey: `transfer-${b.id}` });
    await db.booking.update({ where: { id: b.id }, data: { stripeTransferId: transfer.id, transferredAt: new Date() } });
    return "paid";
  } catch (e) {
    console.error(`payout for booking ${b.id} failed:`, (e as Error).message);
    return "error";
  }
}

/** Pays every finished trip still waiting for this owner (e.g. right after they finish onboarding). */
export async function payPendingForOwner(ownerId: string) {
  const pending = await db.booking.findMany({
    where: { status: "COMPLETED", stripeTransferId: null, refundedAt: null, stripeChargeId: { not: null }, car: { ownerId } },
    select: { id: true },
  });
  for (const { id } of pending) await payOwner(id);
}

export type RefundResult = "refunded" | "already" | "not_refundable" | "error";

/** Full refund of a paid booking that won't happen. Not possible once the owner has been paid. */
export async function refundBooking(bookingId: string): Promise<RefundResult> {
  const b = await db.booking.findUnique({ where: { id: bookingId } });
  if (!b) return "not_refundable";
  if (b.refundedAt) return "already";
  if (b.stripeTransferId) return "not_refundable";
  if (!["PAID", "CANCELLED"].includes(b.status) || !b.paidAt) return "not_refundable";
  try {
    let refundId: string | null = null;
    if (stripeEnabled() && b.stripePaymentIntentId) {
      const refund = await stripe().refunds.create(
        { payment_intent: b.stripePaymentIntentId, metadata: { bookingId: b.id } },
        { idempotencyKey: `refund-${b.id}` },
      );
      refundId = refund.id;
    }
    await db.booking.update({ where: { id: b.id }, data: { status: "CANCELLED", stripeRefundId: refundId, refundedAt: new Date() } });
    return "refunded";
  } catch (e) {
    console.error(`refund for booking ${b.id} failed:`, (e as Error).message);
    return "error";
  }
}

/**
 * Confirms a Checkout payment (from the webhook or the return page). Idempotent.
 * If someone else's trip for the same car was confirmed first, the money is refunded automatically.
 */
export async function confirmCheckout(session: Stripe.Checkout.Session, renterId?: string) {
  const bookingId = session.metadata?.bookingId;
  if (!bookingId || session.payment_status !== "paid") return null;
  if (renterId) {
    const own = await db.booking.findFirst({ where: { id: bookingId, renterId }, select: { id: true } });
    if (!own) return null;
  }
  const refs = await sessionPaymentRefs(session);
  const result = await markPaid(bookingId, refs ?? undefined);
  if (result === "conflict") await refundBooking(bookingId);
  return result;
}
