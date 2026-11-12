import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDict } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { stripeEnabled } from "@/lib/payments";
import { formatRon } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { simulatePayment } from "@/app/actions/bookings";

/** Payment simulator, only reachable while Stripe keys are not set. */
export default async function PaySimulator({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (stripeEnabled()) redirect("/account/trips");
  const user = await requireUser(`/pay/${id}`);
  const b = await db.booking.findFirst({ where: { id, renterId: user.id }, include: { car: true } });
  if (!b) notFound();
  if (b.status !== "ACCEPTED") redirect("/account/trips");
  const { t, locale } = await getDict();
  return (
    <div className="wrap max-w-[520px] py-14">
      <div className="card flex flex-col gap-4 p-8">
        <span className="pill self-start bg-peach">{t.common.example}</span>
        <h1 className="text-3xl font-extrabold">{t.pay.simTitle}</h1>
        <p className="text-muted">{t.pay.simText}</p>
        <div className="tnum rounded-2xl bg-blush p-4">
          <p className="font-bold">{b.car.make} {b.car.model}</p>
          <p className="text-sm text-muted">{formatDateTime(b.start, locale)} → {formatDateTime(b.end, locale)}</p>
          <p className="mt-2 text-2xl font-extrabold">{formatRon(b.totalPrice, locale)}</p>
        </div>
        <form action={simulatePayment}><input type="hidden" name="id" value={b.id} /><button className="btn-coral w-full">{t.pay.simPay}</button></form>
        <Link href="/account/trips" className="btn-ghost">{t.pay.simCancel}</Link>
      </div>
    </div>
  );
}
