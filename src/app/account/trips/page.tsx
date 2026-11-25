import Link from "next/link";
import { getDict, fmt } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { markPaid, settleBookings } from "@/lib/bookings";
import { stripe, stripeEnabled } from "@/lib/payments";
import { formatRon } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { CarImage } from "@/components/CarCard";
import { StatusPill } from "@/components/StatusPill";
import { ReviewForm } from "@/components/ReviewForm";
import { cancelBooking, payBooking } from "@/app/actions/bookings";
import { displayName } from "@/lib/deletion";

type Q = { sent?: string; payment?: string; session_id?: string };

export default async function Trips({ searchParams }: { searchParams: Promise<Q> }) {
  const user = await requireUser("/account/trips");
  const q = await searchParams;
  const { t, locale } = await getDict();

  // Back from Stripe: confirm the payment straight away instead of waiting for the webhook.
  let payment = q.payment;
  if (q.session_id && stripeEnabled()) {
    try {
      const s = await stripe().checkout.sessions.retrieve(q.session_id);
      const own = s.metadata?.bookingId && (await db.booking.findFirst({ where: { id: s.metadata.bookingId, renterId: user.id } }));
      if (own && s.payment_status === "paid") payment = (await markPaid(own.id)) === "conflict" ? "unavailable" : "success";
    } catch (e) { console.error(e); }
  }
  await settleBookings();

  const trips = await db.booking.findMany({
    where: { renterId: user.id }, orderBy: { start: "desc" },
    include: { car: { include: { owner: true, photos: { orderBy: { position: "asc" }, take: 1 } } }, reviews: true },
  });
  const msg = q.sent ? ["ok", t.car.requestSent] : payment === "success" ? ["ok", t.pay.success]
    : payment === "cancelled" ? ["info", t.pay.cancelled] : payment === "failed" ? ["err", t.pay.failed]
    : payment === "unavailable" ? ["err", t.pay.unavailable] : null;

  return (
    <div className="wrap py-10">
      <h1 className="mb-6 text-4xl font-extrabold">{t.trips.title}</h1>
      {msg && <p className={`alert-${msg[0]} mb-6`} role="status">{msg[1]}</p>}
      {trips.length === 0 ? (
        <div className="card flex flex-col items-start gap-3 p-8"><p className="text-xl font-bold">{t.trips.empty}</p>
          <Link href="/cars" className="btn-coral">{t.trips.emptyCta}</Link></div>
      ) : (
        <ul className="grid gap-4">
          {trips.map((b) => {
            const reviewed = b.reviews.some((r) => r.authorId === user.id);
            return (
              <li key={b.id} className="card grid gap-4 overflow-hidden sm:grid-cols-[200px_1fr]">
                <Link href={`/cars/${b.carId}`}><CarImage url={b.car.photos[0]?.url} className="sm:h-full" /></Link>
                <div className="flex flex-col gap-2 px-5 pb-5 sm:py-5 sm:pl-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">{b.car.make} {b.car.model}</h2><StatusPill status={b.status} t={t} />
                  </div>
                  <p className="tnum text-[15px]">{formatDateTime(b.start, locale)} → {formatDateTime(b.end, locale)}</p>
                  <p className="text-sm text-muted">{b.car.neighbourhood}, {t.sectors[b.car.sector]} · {fmt(t.trips.with, { name: displayName(b.car.owner, t.account.deletedUser, true) })}</p>
                  <p className="tnum font-semibold">{formatRon(b.totalPrice, locale)}</p>
                  {b.status === "REQUESTED" && <p className="text-sm text-muted">{t.trips.waiting}</p>}
                  {b.status === "ACCEPTED" && <p className="text-sm font-semibold text-coral-deep">{t.trips.acceptedHint}</p>}
                  <div className="mt-1 flex flex-wrap gap-2">
                    {b.status === "ACCEPTED" && (
                      <form action={payBooking}><input type="hidden" name="id" value={b.id} />
                        <button className="btn-coral btn-sm">{fmt(t.trips.pay, { price: formatRon(b.totalPrice, locale) })}</button></form>
                    )}
                    {(b.status === "REQUESTED" || b.status === "ACCEPTED") && (
                      <form action={cancelBooking}><input type="hidden" name="id" value={b.id} />
                        <button className="btn-ghost btn-sm">{t.trips.cancel}</button></form>
                    )}
                    {b.status === "COMPLETED" && (reviewed ? <span className="pill bg-lilac">{t.trips.reviewed}</span>
                      : <ReviewForm bookingId={b.id} t={t} cta={t.trips.review} />)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
