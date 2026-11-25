import "server-only";
import Stripe from "stripe";
import type { Booking, Car } from "@prisma/client";
import { db } from "./db";

export const stripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;
export const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);
/**
 * The app's public address, used for links that leave the site (Stripe return pages).
 * APP_URL wins when set; on Vercel it falls back to the production domain Vercel provides
 * (app.carlala.eu once connected, else carlala-app.vercel.app).
 */
export function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

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
