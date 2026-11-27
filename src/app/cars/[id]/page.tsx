import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict, fmt } from "@/lib/i18n";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { ownerRating } from "@/lib/cars";
import { formatRon } from "@/lib/money";
import { quote, validateRange } from "@/lib/pricing";
import { defaultRange, formatDateTime, parseLocal } from "@/lib/time";
import { CarImage } from "@/components/CarCard";
import { Stars } from "@/components/Stars";
import { requestBooking } from "@/app/actions/bookings";
import { displayName } from "@/lib/deletion";
import { AgendaGrid } from "@/components/AgendaGrid";
import { agendaDays, todayLocal } from "@/lib/agendaView";
import { addDays } from "@/lib/availability";
import { driverState } from "@/lib/driverRules";
import { driverChecksRequired } from "@/lib/identity";

type Q = { start?: string; end?: string; error?: string };

export default async function CarPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Q> }) {
  const { id } = await params;
  const q = await searchParams;
  const { t, locale } = await getDict();
  const user = await currentUser();
  const car = await db.car.findUnique({
    where: { id },
    include: { photos: { orderBy: { position: "asc" } }, owner: true },
  });
  const isOwner = !!user && car?.ownerId === user.id;
  const isAdmin = user?.role === "ADMIN";
  if (!car || car.deletedAt || ((car.blocked || car.owner.suspended) && !isOwner && !isAdmin)) notFound();
  const available = car.active && !car.blocked;

  const def = defaultRange();
  const startStr = q.start ?? def.start;
  const endStr = q.end ?? def.end;
  const start = parseLocal(startStr), end = parseLocal(endStr);
  const rangeErr = start && end ? validateRange(start, end) : "end_before_start";
  const price = !rangeErr && start && end ? quote(start, end, car.pricePerHour, car.pricePerDay) : null;
  const errKey = q.error as keyof typeof t.errors | undefined;

  const [rating, reviews] = await Promise.all([
    ownerRating(car.ownerId),
    db.review.findMany({ where: { subjectId: car.ownerId, booking: { carId: car.id } }, include: { author: true }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const today = todayLocal();
  const agenda = car.hasAgenda ? await agendaDays(car, Array.from({ length: 7 }, (_, i) => addDays(today, i)), locale, t.agenda.days.split(","), today) : null;
  const since = new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", { month: "long", year: "numeric" }).format(car.owner.createdAt);

  return (
    <div className="wrap grid gap-10 py-10 lg:grid-cols-[1.4fr_1fr]">
      <div className="flex min-w-0 flex-col gap-8">
        <div className="grid gap-3">
          <CarImage url={car.photos[0]?.url} className="rounded-[28px]" />
          {car.photos.length > 1 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {car.photos.slice(1).map((p) => <CarImage key={p.id} url={p.url} className="rounded-2xl" />)}
            </div>
          )}
        </div>
        <div>
          <p className="text-muted">{car.neighbourhood}, {t.sectors[car.sector]}</p>
          <h1 className="text-[clamp(32px,4.5vw,48px)] font-extrabold leading-tight">{car.make} {car.model} <span className="font-normal text-muted">{car.year}</span></h1>
          <ul className="mt-3 flex flex-wrap gap-2">
            {[fmt(t.car.seats, { n: car.seats }), t.transmission[car.transmission], t.fuel[car.fuel]].map((x) => (
              <li key={x} className="pill bg-white px-3 py-1.5 text-sm ring-1 ring-line">{x}</li>
            ))}
          </ul>
        </div>
        {car.description && (
          <section><h2 className="mb-2 text-2xl font-bold">{t.car.about}</h2><p className="whitespace-pre-line text-muted">{car.description}</p></section>
        )}
        <section>
          <h2 className="mb-3 text-2xl font-bold">{t.agenda.carTitle}</h2>
          {agenda ? <AgendaGrid columns={agenda.columns} initial={agenda.initial} booked={agenda.booked} readOnly
              labels={{ available: t.agenda.available, unavailable: t.agenda.unavailable, booked: t.agenda.booked, hoursPerWeek: "" }} />
            : <p className="text-muted">{t.agenda.anyTime}</p>}
        </section>
        <section className="card flex items-center gap-4 p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-lilac text-lg font-extrabold">{car.owner.name.slice(0, 1)}</span>
          <div className="min-w-0">
            <p className="font-bold">{t.car.owner}: {car.owner.name.split(" ")[0]}</p>
            <p className="text-sm text-muted">{fmt(t.car.memberSince, { date: since })}</p>
            {rating.avg !== null && <Stars value={rating.avg} count={rating.count} label={t.review.stars} />}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-2xl font-bold">{t.car.reviews}</h2>
          {reviews.length === 0 ? <p className="text-muted">{t.car.noReviews}</p> : (
            <ul className="grid gap-3">
              {reviews.map((r) => (
                <li key={r.id} className="card p-4">
                  <div className="flex items-center justify-between gap-3"><b>{displayName(r.author, t.account.deletedUser, true)}</b><Stars value={r.rating} label={t.review.stars} /></div>
                  {r.comment && <p className="mt-1 text-muted">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card flex flex-col gap-4 p-6">
          <div className="tnum flex items-baseline justify-between gap-3">
            <span><b className="text-2xl">{formatRon(car.pricePerHour, locale)}</b> <span className="text-muted">{t.car.perHour}</span></span>
            <span className="text-muted">{formatRon(car.pricePerDay, locale)} {t.car.perDay}</span>
          </div>
          <h2 className="text-xl font-bold">{t.car.bookTitle}</h2>
          {q.error && <p className="alert-err" role="alert">{t.errors[errKey ?? "generic"] ?? t.errors.generic}</p>}
          <form method="get" className="grid gap-3">
            <div><label className="label" htmlFor="start">{t.car.start}</label>
              <input className="input" id="start" name="start" type="datetime-local" step={3600} defaultValue={startStr} required /></div>
            <div><label className="label" htmlFor="end">{t.car.end}</label>
              <input className="input" id="end" name="end" type="datetime-local" step={3600} defaultValue={endStr} required /></div>
            <button className="btn-ghost btn-sm justify-self-start">{t.car.updatePrice}</button>
          </form>
          {rangeErr && start && end && !q.error && <p className="alert-err">{t.errors[rangeErr]}</p>}
          {price && start && end && (
            <div className="tnum rounded-2xl bg-blush p-4 text-[15px]">
              <p className="mb-2 text-sm text-muted">{formatDateTime(start, locale)} → {formatDateTime(end, locale)}</p>
              {price.days > 0 && <p className="flex justify-between"><span>{fmt(t.car.breakdownDays, { n: price.days })}</span><span>{formatRon(price.days * car.pricePerDay, locale)}</span></p>}
              {price.restHours > 0 && <p className="flex justify-between"><span>{fmt(t.car.breakdownHours, { n: price.restHours })}</span><span>{formatRon(price.total - price.days * car.pricePerDay, locale)}</span></p>}
              <p className="mt-2 flex justify-between border-t border-line pt-2 text-lg font-bold"><span>{t.car.total}</span><span>{formatRon(price.total, locale)}</span></p>
              <p className="mt-1 text-[13px] text-muted">{t.car.feeNote}</p>
            </div>
          )}
          {isOwner ? <p className="alert-info">{t.car.ownCar}</p>
            : !available ? <p className="alert-info">{t.car.paused}</p>
            : !user ? <Link href={`/login?next=${encodeURIComponent(`/cars/${car.id}?start=${startStr}&end=${endStr}`)}`} className="btn-ink">{t.car.loginToBook}</Link>
            : price && driverChecksRequired() && driverState(user, end!) !== "ok" ? (
              <div className="grid gap-3">
                <p className="alert-info">{driverState(user, end!) === "expired" ? t.driver.expiresBeforeTrip : t.driver.needed}</p>
                <Link href={`/account/verify?next=${encodeURIComponent(`/cars/${car.id}?start=${startStr}&end=${endStr}`)}`} className="btn-coral">{t.driver.start}</Link>
              </div>
            )
            : price && (
              <form action={requestBooking} className="grid gap-3">
                <input type="hidden" name="carId" value={car.id} />
                <input type="hidden" name="start" value={startStr} />
                <input type="hidden" name="end" value={endStr} />
                <div><label className="label" htmlFor="message">{t.car.message}</label>
                  <textarea className="input min-h-20" id="message" name="message" maxLength={1000} placeholder={t.car.messagePlaceholder} /></div>
                <button className="btn-coral">{t.car.request}</button>
              </form>
            )}
        </div>
      </aside>
    </div>
  );
}
