import "server-only";
import Stripe from "stripe";
import type { Booking, Car } from "@prisma/client";
import { db } from "./db";
import { appUrl } from "./url";

export { appUrl } from "./url";

export const stripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;

let client: Stripe | undefined;
/**
 * One Stripe client per server instance. Uses the fetch-based HTTP client (works everywhere,
 * including behind proxies); the API version is the one pinned by the SDK.
 */
export function stripe() {
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!, {
    httpClient: Stripe.createFetchHttpClient(),
    appInfo: { name: "Carlala", url: "https://carlala.eu" },
    maxNetworkRetries: 2,
  });
  return client;
}

/** Label Stripe uses to group these Checkout Sessions in the Dashboard. */
const INTEGRATION_ID = "carlala-booking-qtrvbmkz";

/**
 * Where to send the renter to pay. With Stripe keys: Stripe Checkout (RON, dynamic payment methods).
 * Without keys: the built-in simulator, so the flow can be tested end to end.
 * The PaymentIntent carries transfer_group = booking id: the owner's share is transferred
 * separately after the trip (separate charges and transfers).
 */
export async function paymentUrl(booking: Booking & { car: Car }, email: string, locale: "ro" | "en") {
  if (!stripeEnabled()) return `/pay/${booking.id}`;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    locale,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "ron",
        unit_amount: booking.totalPrice,
        product_data: { name: `${booking.car.make} ${booking.car.model} · Carlala` },
      },
    }],
    payment_intent_data: {
      transfer_group: booking.id,
      metadata: { bookingId: booking.id },
      description: `Carlala booking ${booking.id}`,
    },
    metadata: { bookingId: booking.id },
    integration_identifier: INTEGRATION_ID,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    success_url: `${appUrl()}/account/trips?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/account/trips?payment=cancelled`,
  }, { idempotencyKey: `checkout-${booking.id}-${Math.floor(Date.now() / 60000)}` });
  await db.booking.update({ where: { id: booking.id }, data: { stripeSessionId: session.id } });
  return session.url!;
}

export type PaymentRefs = { paymentIntentId: string; chargeId: string | null };

/** PaymentIntent and charge ids for a paid Checkout Session. */
export async function sessionPaymentRefs(session: Stripe.Checkout.Session): Promise<PaymentRefs | null> {
  const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!piId) return null;
  const pi = await stripe().paymentIntents.retrieve(piId);
  const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id ?? null;
  return { paymentIntentId: piId, chargeId };
}
