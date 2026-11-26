import { getDict, fmt } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { settleBookings } from "@/lib/bookings";
import { formatRon } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { StatusPill } from "@/components/StatusPill";
import { ReviewForm } from "@/components/ReviewForm";
import { acceptBooking, completeBooking, declineBooking } from "@/app/actions/bookings";
import { displayName } from "@/lib/deletion";
import Link from "next/link";
import { stripeEnabled } from "@/lib/payments";

export default async function Requests({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser("/account/requests");
  const { error } = await searchParams;
  const { t, locale } = await getDict();
  await settleBookings();
  const bookings = await db.booking.findMany({
    where: { car: { ownerId: user.id } },
    orderBy: [{ status: "asc" }, { start: "asc" }],
    include: { car: true, renter: true, reviews: true },
  });
  const now = new Date();
  return (
    <div className="wrap py-10">
      <h1 className="mb-6 text-4xl font-extrabold">{t.requests.title}</h1>
      {error === "conflict" && <p className="alert-err mb-6" role="alert">{t.requests.conflict}</p>}
      {stripeEnabled() && !user.payoutsReady && (
        <div className={`${error === "payouts" ? "alert-err" : "alert-info"} mb-6 flex flex-wrap items-center justify-between gap-3`} role={error === "payouts" ? "alert" : undefined}>
          <span>{t.payouts.needed}</span><Link href="/account/payouts" className="btn-ink btn-sm">{t.payouts.setup}</Link>
        </div>
      )}
      {bookings.length === 0 ? <div className="card p-8 text-xl font-bold">{t.requests.empty}</div> : (
        <ul className="grid gap-4">
          {bookings.map((b) => {
            const reviewed = b.reviews.some((r) => r.authorId === user.id);
            return (
              <li key={b.id} className="card flex flex-col gap-2 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">{b.car.make} {b.car.model}</h2><StatusPill status={b.status} t={t} />
                </div>
                <p className="tnum text-[15px]">{formatDateTime(b.start, locale)} → {formatDateTime(b.end, locale)}</p>
                <p className="text-sm text-muted">{fmt(t.requests.from, { name: displayName(b.renter, t.account.deletedUser) })}{b.status === "PAID" && b.renter.phone ? ` · ${b.renter.phone}` : ""}</p>
                {b.message && <blockquote className="rounded-2xl bg-blush px-4 py-3 text-[15px]">“{b.message}”</blockquote>}
                <p className="tnum font-semibold">{fmt(t.requests.earnings, { price: formatRon(b.ownerEarnings, locale) })} <span className="font-normal text-muted">/ {formatRon(b.totalPrice, locale)}</span></p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {b.status === "REQUESTED" && (
                    <form action={acceptBooking}><input type="hidden" name="id" value={b.id} /><button className="btn-ink btn-sm">{t.requests.accept}</button></form>
                  )}
                  {(b.status === "REQUESTED" || b.status === "ACCEPTED") && (
                    <form action={declineBooking}><input type="hidden" name="id" value={b.id} /><button className="btn-ghost btn-sm">{t.requests.decline}</button></form>
                  )}
                  {b.status === "PAID" && b.start <= now && (
                    <form action={completeBooking}><input type="hidden" name="id" value={b.id} /><button className="btn-ghost btn-sm">{t.requests.complete}</button></form>
                  )}
                  {b.status === "COMPLETED" && (reviewed ? <span className="pill bg-lilac">{t.requests.reviewed}</span>
                    : <ReviewForm bookingId={b.id} t={t} cta={t.requests.review} />)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
