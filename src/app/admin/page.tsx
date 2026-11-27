import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { settleBookings } from "@/lib/bookings";
import { formatRon } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { StatusPill } from "@/components/StatusPill";
import { toggleBlock, toggleSuspend } from "@/app/actions/admin";
import { adminDeleteCar, adminDeleteUser } from "@/app/actions/deletion";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { adminRefund } from "@/app/actions/payouts";
import { displayName } from "@/lib/deletion";

export default async function Admin({ searchParams }: { searchParams: Promise<{ deleted?: string; error?: string; refunded?: string }> }) {
  const admin = await requireAdmin();
  const { deleted, error, refunded } = await searchParams;
  const { t, locale } = await getDict();
  await settleBookings();
  const [users, cars, bookings, fees] = await Promise.all([
    db.user.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 100, include: { _count: { select: { cars: { where: { deletedAt: null } }, bookingsAsRenter: true } } } }),
    db.car.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 100, include: { owner: true } }),
    db.booking.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { car: { include: { owner: true } }, renter: true, handovers: { select: { objectionAt: true } } } }),
    db.booking.aggregate({ where: { status: { in: ["PAID", "COMPLETED"] } }, _sum: { platformFee: true } }),
  ]);
  const stat = (label: string, value: string | number) => (
    <div className="card p-5"><p className="text-sm text-muted">{label}</p><p className="tnum text-3xl font-extrabold">{value}</p></div>
  );
  const th = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted";
  const td = "px-4 py-3 align-top border-t border-line";
  return (
    <div className="wrap flex flex-col gap-10 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-4xl font-extrabold">{t.admin.title}</h1>
        <Link href="/admin/analytics" className="btn-ink">{t.admin.traffic}</Link></div>
      {deleted && <p className="alert-ok" role="status">{deleted === "car" ? t.admin.deletedCar : t.admin.deletedUser}</p>}
      {refunded && <p className="alert-ok" role="status">{t.admin.refundedOk}</p>}
      {error && <p className="alert-err" role="alert">{error === "refund" ? t.admin.refundFailed : error === "car_has_trips" ? t.admin.carHasTrips : t.admin.userHasTrips}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stat(t.admin.users, users.length)}{stat(t.admin.cars, cars.length)}{stat(t.admin.bookings, bookings.length)}
        {stat(t.admin.revenue, formatRon(fees._sum.platformFee ?? 0, locale))}
      </div>

      <section><h2 className="mb-3 text-2xl font-bold">{t.admin.bookings}</h2>
        <div className="card overflow-x-auto"><table className="w-full min-w-[860px] text-[15px]">
          <thead><tr><th className={th}>{t.admin.cars}</th><th className={th}>{t.admin.renter}</th><th className={th}>{t.admin.when}</th><th className={th}>{t.admin.status}</th><th className={`${th} text-right`}>{t.admin.total}</th><th className={th}>{t.admin.payout}</th></tr></thead>
          <tbody>{bookings.map((b) => (
            <tr key={b.id}><td className={td}><Link href={`/cars/${b.carId}`} className="font-semibold underline decoration-line underline-offset-4">{b.car.make} {b.car.model}</Link></td>
              <td className={td}>{displayName(b.renter, t.account.deletedUser)}<br /><span className="text-sm text-muted">{b.renter.email}</span></td>
              <td className={`${td} tnum`}>{formatDateTime(b.start, locale)}<br /><span className="text-sm text-muted">→ {formatDateTime(b.end, locale)}</span></td>
              <td className={td}><div className="flex flex-col items-start gap-1"><StatusPill status={b.status} t={t} />
                {b.handovers.length > 0 && <Link href={`/bookings/${b.id}/handover`} className={`pill ${b.handovers.some((x) => x.objectionAt) ? "bg-[#fde8e6] text-err" : "bg-lilac"}`}>{b.handovers.some((x) => x.objectionAt) ? t.handover.disputeAdmin : `${t.handover.button} (${b.handovers.length}/2)`}</Link>}</div></td><td className={`${td} tnum text-right`}>{formatRon(b.totalPrice, locale)}</td>
              <td className={td}>{b.refundedAt ? <span className="pill bg-lilac">{t.admin.refunded}</span>
                : b.transferredAt ? <span className="pill bg-[#e3f4ea] text-ok">{t.admin.paidOut}</span>
                : b.status === "COMPLETED" && !b.stripeChargeId ? <span className="pill bg-lilac">{t.payouts.simulated}</span>
                : b.status === "COMPLETED" && !b.car.owner.payoutsReady ? <span className="pill bg-peach">{t.admin.payoutPending}</span>
                : b.status === "PAID" ? <ConfirmDelete action={adminRefund} fields={{ id: b.id }} cta={t.admin.refund} text={t.admin.refundText} confirm={t.admin.refundConfirm} /> : null}</td></tr>
          ))}</tbody></table></div>
      </section>

      <section><h2 className="mb-3 text-2xl font-bold">{t.admin.cars}</h2>
        <div className="card overflow-x-auto"><table className="w-full min-w-[640px] text-[15px]">
          <thead><tr><th className={th}>{t.admin.cars}</th><th className={th}>{t.admin.owner}</th><th className={th}>{t.carForm.sector}</th><th className={th}></th></tr></thead>
          <tbody>{cars.map((c) => (
            <tr key={c.id}><td className={td}><Link href={`/cars/${c.id}`} className="font-semibold underline decoration-line underline-offset-4">{c.make} {c.model} {c.year}</Link>
              {c.blocked && <span className="pill ml-2 bg-[#fde8e6] text-err">{t.myCars.blocked}</span>}</td>
              <td className={td}>{c.owner.name}</td><td className={td}>{t.sectors[c.sector]}</td>
              <td className={`${td} text-right`}><div className="flex flex-wrap items-start justify-end gap-2"><form action={toggleBlock}><input type="hidden" name="id" value={c.id} />
                <button className="btn-ghost btn-sm">{c.blocked ? t.admin.unblock : t.admin.block}</button></form>
                <ConfirmDelete action={adminDeleteCar} fields={{ id: c.id }} cta={t.admin.deleteCar} text={t.admin.deleteCarText} confirm={t.admin.confirm} /></div></td></tr>
          ))}</tbody></table></div>
      </section>

      <section><h2 className="mb-3 text-2xl font-bold">{t.admin.users}</h2>
        <div className="card overflow-x-auto"><table className="w-full min-w-[640px] text-[15px]">
          <thead><tr><th className={th}>{t.auth.name}</th><th className={th}>{t.auth.email}</th><th className={`${th} text-right`}>{t.admin.cars} / {t.admin.bookings}</th><th className={th}></th></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id}><td className={td}>{u.name}{u.role === "ADMIN" && <span className="pill ml-2 bg-lilac">admin</span>}{u.suspended && <span className="pill ml-2 bg-[#fde8e6] text-err">{t.admin.suspend}</span>}</td>
              <td className={td}>{u.email}</td><td className={`${td} tnum text-right`}>{u._count.cars} / {u._count.bookingsAsRenter}</td>
              <td className={`${td} text-right`}>{u.id !== admin.id && <div className="flex flex-wrap items-start justify-end gap-2"><form action={toggleSuspend}><input type="hidden" name="id" value={u.id} />
                <button className="btn-ghost btn-sm">{u.suspended ? t.admin.unsuspend : t.admin.suspend}</button></form>
                <ConfirmDelete action={adminDeleteUser} fields={{ id: u.id }} cta={t.admin.deleteUser} text={t.admin.deleteUserText} confirm={t.admin.confirm} /></div>}</td></tr>
          ))}</tbody></table></div>
      </section>
    </div>
  );
}
