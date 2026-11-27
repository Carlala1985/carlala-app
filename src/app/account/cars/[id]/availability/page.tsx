import Link from "next/link";
import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { addDays, isDateStr, mondayOf, weekDates } from "@/lib/availability";
import { agendaDays, todayLocal } from "@/lib/agendaView";
import { AgendaGrid } from "@/components/AgendaGrid";
import { resetDates, saveDates, saveWeekly, stopAgenda } from "@/app/actions/agenda";

type Q = { tab?: string; week?: string; saved?: string; stopped?: string };
const range = (days: number[], from: number, to: number) => days.flatMap((d) => Array.from({ length: to - from }, (_, k) => d * 24 + from + k));

export default async function Availability({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Q> }) {
  const { id } = await params;
  const q = await searchParams;
  const user = await requireUser(`/account/cars/${id}/availability`);
  const car = await db.car.findFirst({ where: { id, ownerId: user.id, deletedAt: null } });
  if (!car) notFound();
  const { t, locale } = await getDict();
  const a = t.agenda;
  const dayNames = a.days.split(",");
  const labels = { available: a.available, unavailable: a.unavailable, booked: a.booked, hoursPerWeek: a.hoursPerWeek };
  const tab = q.tab === "dates" ? "dates" : "week";
  const today = todayLocal();
  const thisMonday = mondayOf(today);
  const monday = isDateStr(q.week) && mondayOf(q.week) >= thisMonday ? mondayOf(q.week) : thisMonday;
  const dates = weekDates(monday);
  const tabCls = (on: boolean) => `rounded-full px-4 py-2.5 text-[15px] font-semibold ${on ? "bg-ink text-blush" : "text-muted hover:text-ink"}`;
  const fmtRange = new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  const presets = [
    { label: a.presetDays, cells: range([0, 1, 2, 3, 4, 5, 6], 8, 20) },
    { label: a.presetWeekends, cells: range([5, 6], 0, 24) },
    { label: a.presetEvenings, cells: [...range([0, 1, 2, 3, 4], 18, 24), ...range([5, 6], 0, 24)] },
    { label: a.presetAll, cells: range([0, 1, 2, 3, 4, 5, 6], 0, 24) },
    { label: a.presetNone, cells: [] },
  ];
  const view = tab === "dates" ? await agendaDays(car, dates, locale, dayNames, today) : null;

  return (
    <div className="wrap max-w-[900px] py-10">
      <Link href="/account/cars" className="text-sm font-semibold text-muted hover:text-ink">← {t.myCars.title}</Link>
      <h1 className="mt-2 text-4xl font-extrabold">{a.title}: {car.make} {car.model}</h1>
      <p className="mb-5 mt-2 max-w-[62ch] text-muted">{a.intro}</p>
      {q.saved && <p className="alert-ok mb-4" role="status">{a.saved}</p>}
      {q.stopped && <p className="alert-ok mb-4" role="status">{a.stopped}</p>}
      {!car.hasAgenda && !q.saved && <p className="alert-info mb-4">{a.off}</p>}

      <nav className="mb-5 inline-flex gap-1 rounded-full bg-white p-1 ring-1 ring-line" aria-label={a.title}>
        <Link href={`?tab=week`} className={tabCls(tab === "week")} aria-current={tab === "week" ? "page" : undefined}>{a.tabWeek}</Link>
        <Link href={`?tab=dates&week=${monday}`} className={tabCls(tab === "dates")} aria-current={tab === "dates" ? "page" : undefined}>{a.tabDates}</Link>
      </nav>

      {tab === "week" ? (
        <form action={saveWeekly} className="flex flex-col gap-4">
          <p className="text-muted">{a.weekHint}</p>
          <input type="hidden" name="carId" value={car.id} />
          <AgendaGrid columns={dayNames.map((d) => ({ label: d }))} initial={car.weeklyHours} name="slots" labels={labels} presets={presets} />
          <div><button className="btn-ink">{a.save}</button></div>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-muted">{a.datesHint}</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {monday > thisMonday ? <Link href={`?tab=dates&week=${addDays(monday, -7)}`} className="btn-ghost btn-sm">← {a.prev}</Link> : <span />}
            <b className="tnum">{fmtRange.format(new Date(`${dates[0]}T12:00:00Z`))} – {fmtRange.format(new Date(`${dates[6]}T12:00:00Z`))}</b>
            <Link href={`?tab=dates&week=${addDays(monday, 7)}`} className="btn-ghost btn-sm">{a.next} →</Link>
          </div>
          <form action={saveDates} className="flex flex-col gap-4">
            <input type="hidden" name="carId" value={car.id} />
            <input type="hidden" name="week" value={monday} />
            <AgendaGrid key={monday} columns={view!.columns} initial={view!.initial} booked={view!.booked} name="slots" labels={labels} />
            <div className="flex flex-wrap gap-2"><button className="btn-ink">{a.save}</button></div>
          </form>
          {view!.columns.some((c) => c.changed) && (
            <form action={resetDates}><input type="hidden" name="carId" value={car.id} /><input type="hidden" name="week" value={monday} />
              <button className="text-sm font-semibold underline decoration-coral decoration-2 underline-offset-4">{a.resetWeek}</button></form>
          )}
        </div>
      )}

      {car.hasAgenda && (
        <form action={stopAgenda} className="mt-10 border-t border-line pt-6"><input type="hidden" name="carId" value={car.id} />
          <button className="text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink">{a.stop}</button></form>
      )}
    </div>
  );
}
