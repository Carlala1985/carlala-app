import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, stripeEnabled } from "@/lib/payments";
import { confirmCheckout } from "@/lib/connect";
import { applySession } from "@/lib/identity";

/**
 * Stripe webhook (source of truth for payments). In the Stripe Dashboard, send these events here:
 * checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed,
 * identity.verification_session.processing, .verified, .requires_input, .canceled (driver checks).
 */
export async function POST(req: Request) {
  if (!stripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "not configured" }, { status: 501 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(await req.text(), sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      // completed can arrive while still unpaid (delayed methods): confirmCheckout checks payment_status.
      await confirmCheckout(event.data.object);
      break;
    case "checkout.session.async_payment_failed":
      console.warn(`Payment failed for booking ${event.data.object.metadata?.bookingId}; it stays accepted until it expires.`);
      break;
    case "identity.verification_session.processing":
    case "identity.verification_session.verified":
    case "identity.verification_session.requires_input":
    case "identity.verification_session.canceled":
      await applySession(event.data.object);
      break;
  }
  return NextResponse.json({ received: true });
}
