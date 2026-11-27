import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { formatRon } from "@/lib/money";
import { CarImage } from "@/components/CarCard";
import { toggleCarActive } from "@/app/actions/cars";
import { deleteMyCar } from "@/app/actions/deletion";
import { ConfirmDelete } from "@/components/ConfirmDelete";

export default async function MyCars({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string; error?: string }> }) {
  const user = await requireUser("/account/cars");
  const { saved, deleted, error } = await searchParams;
  const { t, locale } = await getDict();
  const cars = await db.car.findMany({ where: { ownerId: user.id, deletedAt: null }, orderBy: { createdAt: "desc" }, include: { photos: { orderBy: { position: "asc" }, take: 1 } } });
  return (
    <div className="wrap py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-extrabold">{t.myCars.title}</h1>
        <div className="flex flex-wrap gap-2"><Link href="/account/payouts" className="btn-ghost">{t.nav.payouts}</Link><Link href="/account/cars/new" className="btn-ink">{t.myCars.add}</Link></div>
      </div>
      {saved && <p className="alert-ok mb-6" role="status">{t.carForm.saved}</p>}
      {deleted && <p className="alert-ok mb-6" role="status">{t.myCars.deleted}</p>}
      {error === "car_has_trips" && <p className="alert-err mb-6" role="alert">{t.myCars.hasTrips}</p>}
      {cars.length === 0 ? (
        <div className="card flex flex-col items-start gap-3 p-8">
          <p className="text-xl font-bold">{t.myCars.empty}</p><p className="text-muted">{t.myCars.emptyHint}</p>
          <Link href="/account/cars/new" className="btn-coral mt-2">{t.myCars.add}</Link>
        </div>
      ) : (
        <ul className="grid gap-4">
          {cars.map((c) => (
            <li key={c.id} className="card grid gap-x-5 gap-y-3 overflow-hidden sm:grid-cols-[200px_1fr]">
              <CarImage url={c.photos[0]?.url} className="sm:row-span-2 sm:h-full" />
              <div className="flex flex-col gap-1 px-5 pt-1 sm:pt-5 sm:pl-0 sm:pr-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">{c.make} {c.model} <span className="text-muted font-normal">{c.year}</span></h2>
                  {c.blocked ? <span className="pill bg-[#fde8e6] text-err">{t.myCars.blocked}</span>
                    : c.active ? <span className="pill bg-[#e3f4ea] text-ok">{t.myCars.live}</span>
                    : <span className="pill bg-lilac">{t.myCars.paused}</span>}
                </div>
                <p className="text-sm text-muted">{c.neighbourhood}, {t.sectors[c.sector]}</p>
                <p className="tnum text-sm">{formatRon(c.pricePerHour, locale)} {t.search.perHour} · {formatRon(c.pricePerDay, locale)} {t.search.perDay}</p>
              </div>
              <div className="flex flex-wrap items-start gap-2 px-5 pb-5 sm:pl-0">
                <Link href={`/cars/${c.id}`} className="btn-ghost btn-sm">{t.myCars.view}</Link>
                <Link href={`/account/cars/${c.id}/edit`} className="btn-ghost btn-sm">{t.myCars.edit}</Link>
                <Link href={`/account/cars/${c.id}/availability`} className="btn-ghost btn-sm">{t.agenda.edit}</Link>
                <form action={toggleCarActive}><input type="hidden" name="id" value={c.id} />
                  <button className="btn-ghost btn-sm">{c.active ? t.myCars.pause : t.myCars.resume}</button></form>
                <ConfirmDelete action={deleteMyCar} fields={{ id: c.id }} cta={t.myCars.delete} text={t.myCars.deleteText} confirm={t.myCars.deleteConfirm} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
