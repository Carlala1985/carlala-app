import { NextResponse } from "next/server";
import { stripe, stripeEnabled } from "@/lib/payments";
import { markPaid } from "@/lib/bookings";

/** Stripe calls this after a Checkout payment. Configure it in the Stripe dashboard with the event checkout.session.completed. */
export async function POST(req: Request) {
  if (!stripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "not configured" }, { status: 501 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  let event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object;
    const bookingId = s.metadata?.bookingId;
    if (bookingId && s.payment_status === "paid") {
      const res = await markPaid(bookingId);
      if (res === "conflict") console.warn(`Booking ${bookingId} was paid but the car was taken: refund needed`);
    }
  }
  return NextResponse.json({ received: true });
}
