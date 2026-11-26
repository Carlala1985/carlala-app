import { getDict } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { formatRon } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { refreshPayoutStatus, type PayoutStatus } from "@/lib/connect";
import { openPayoutDashboard, startPayoutOnboarding } from "@/app/actions/payouts";

export default async function Payouts({ searchParams }: { searchParams: Promise<{ return?: string; error?: string }> }) {
  const user = await requireUser("/account/payouts");
  const q = await searchParams;
  const { t, locale } = await getDict();
  let status: PayoutStatus = "disabled";
  let failed = !!q.error;
  try {
    status = await refreshPayoutStatus(user);
  } catch (e) {
    console.error("payout status failed:", (e as Error).message);
    failed = true;
    status = user.payoutsReady ? "active" : user.stripeAccountId ? "pending" : "none";
  }
  const trips = await db.booking.findMany({
    where: { status: "COMPLETED", car: { ownerId: user.id } },
    orderBy: { end: "desc" }, take: 50, include: { car: true },
  });
  const tone = status === "active" ? "alert-ok" : status === "disabled" ? "alert-info" : status === "none" ? "alert-info" : "alert-err";
  const message = { disabled: t.payouts.disabled, none: t.payouts.none, pending: t.payouts.pending, restricted: t.payouts.restricted, active: t.payouts.active }[status];
  return (
    <div className="wrap max-w-[820px] py-10">
      <h1 className="mb-3 text-4xl font-extrabold">{t.payouts.title}</h1>
      <p className="mb-6 max-w-[62ch] text-muted">{t.payouts.intro}</p>
      {q.return && status !== "active" && <p className="alert-info mb-4" role="status">{t.payouts.returned}</p>}
      {failed && <p className="alert-err mb-4" role="alert">{t.payouts.error}</p>}
      <div className="card flex flex-col items-start gap-4 p-6">
        <p className={tone}>{message}</p>
        {(status === "none" || status === "pending" || status === "restricted") && (
          <form action={startPayoutOnboarding}><button className="btn-coral">{status === "none" ? t.payouts.setup : t.payouts.continue}</button></form>
        )}
        {status === "active" && (
          <form action={openPayoutDashboard}><button className="btn-ghost">{t.payouts.dashboard}</button></form>
        )}
      </div>
      <section className="mt-10">
        <h2 className="mb-3 text-2xl font-bold">{t.payouts.history}</h2>
        {trips.length === 0 ? <p className="text-muted">{t.payouts.noHistory}</p> : (
          <ul className="card divide-y divide-line">
            {trips.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0"><p className="font-semibold">{b.car.make} {b.car.model}</p>
                  <p className="tnum text-sm text-muted">{formatDateTime(b.start, locale)} → {formatDateTime(b.end, locale)}</p></div>
                <div className="tnum text-right"><p className="font-bold">{formatRon(b.ownerEarnings, locale)}</p>
                  <p className={`text-sm ${b.transferredAt ? "text-ok" : "text-muted"}`}>{b.transferredAt ? t.payouts.paid : b.refundedAt ? t.admin.refunded : !b.stripeChargeId ? t.payouts.simulated : status === "active" ? t.payouts.processing : t.payouts.waiting}</p></div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
