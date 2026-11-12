import "server-only";
import Stripe from "stripe";
import type { Booking, Car } from "@prisma/client";
import { db } from "./db";

export const stripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;
export const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);
const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

/**
 * Where to send the renter to pay. With Stripe keys: a Stripe Checkout page (RON, card).
 * Without keys: the built-in simulator, so the flow can be tested end to end.
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
    metadata: { bookingId: booking.id },
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    success_url: `${appUrl()}/account/trips?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/account/trips?payment=cancelled`,
  });
  await db.booking.update({ where: { id: booking.id }, data: { stripeSessionId: session.id } });
  return session.url!;
}
