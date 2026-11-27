import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { requireAdmin } from "@/lib/session";
import { purgeOldViews, trafficStats } from "@/lib/analytics";
import { DailyChart } from "@/components/DailyChart";

type Q = { days?: string; site?: string };
const DAY_OPTIONS = [7, 30, 90];

/** Last N Bucharest days, oldest first, so missing days show as empty bars. */
function lastDays(n: number) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" });
  return Array.from({ length: n }, (_, i) => fmt.format(new Date(Date.now() - (n - 1 - i) * 86400000)));
}

export default async function Analytics({ searchParams }: { searchParams: Promise<Q> }) {
  await requireAdmin();
  const q = await searchParams;
  const { t, locale } = await getDict();
  const a = t.admin;
  const days = DAY_OPTIONS.includes(Number(q.days)) ? Number(q.days) : 30;
  const site = q.site === "web" || q.site === "app" ? q.site : "all";
  await purgeOldViews();
  const s = await trafficStats(days, site);
  const byDay = new Map(s.series.map((d) => [d.day, d]));
  const series = lastDays(days).map((day) => byDay.get(day) ?? { day, visitors: 0, views: 0 });
  const nf = new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-GB", { maximumFractionDigits: 1 });
  const link = (o: Partial<{ days: number; site: string }>) => `?days=${o.days ?? days}&site=${o.site ?? site}`;
  const chip = (on: boolean) => `rounded-full px-3.5 py-2 text-sm font-semibold ${on ? "bg-ink text-blush" : "bg-white text-muted ring-1 ring-line hover:text-ink"}`;
  const deviceName = (d: string) => (a as Record<string, string>)[d] ?? d;
  const regionName = new Intl.DisplayNames([locale], { type: "region" });
  const langName = new Intl.DisplayNames([locale], { type: "language" });

  const list = (title: string, rows: { label: string; views: number }[], name: (l: string) => string = (l) => l, empty = a.unknown) => {
    const max = Math.max(1, ...rows.map((r) => r.views));
    return (
      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-bold">{title}</h2>
        {rows.length === 0 ? <p className="text-sm text-muted">{a.noData}</p> : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li key={r.label} className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-sm">
                <span className="min-w-0 truncate" title={r.label}>{r.label ? name(r.label) : empty}</span>
                <span className="tnum text-right font-semibold">{nf.format(r.views)}</span>
                <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-blush" aria-hidden="true">
                  <span className="block h-full rounded-full bg-[#e04f33]" style={{ width: `${(r.views / max) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };

  return (
    <div className="wrap flex flex-col gap-6 py-10">
      <div>
        <Link href="/admin" className="text-sm font-semibold text-muted hover:text-ink">← {a.title}</Link>
        <h1 className="mt-2 text-4xl font-extrabold">{a.traffic}</h1>
        <p className="mt-2 max-w-[62ch] text-muted">{a.trafficIntro}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={a.traffic}>
        {(["all", "web", "app"] as const).map((x) => <Link key={x} href={link({ site: x })} className={chip(site === x)} aria-current={site === x ? "true" : undefined}>{a[`site_${x}`]}</Link>)}
        <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
        {DAY_OPTIONS.map((d) => <Link key={d} href={link({ days: d })} className={chip(days === d)} aria-current={days === d ? "true" : undefined}>{a.days.replace("{n}", String(d))}</Link>)}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[[a.visits, nf.format(s.totalVisits)], [a.pageViews, nf.format(s.totalViews)], [a.perVisit, s.totalVisits ? nf.format(s.totalViews / s.totalVisits) : "–"]].map(([k, v]) => (
          <div key={k} className="card p-5"><p className="text-sm text-muted">{k}</p><p className="tnum text-3xl font-extrabold">{v}</p></div>
        ))}
      </div>
      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-bold">{a.daily}</h2>
        <DailyChart series={series} locale={locale} labels={{ visits: a.visits, pageViews: a.pageViews, tableView: a.tableView, date: a.date, daily: a.daily }} />
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        {list(a.topPages, s.pages)}
        {list(a.sources, s.referrers, (l) => l, a.direct)}
        {list(a.countries, s.countries, (c) => { try { return regionName.of(c) ?? c; } catch { return c; } })}
        {list(a.devices, s.devices, deviceName)}
        {list(a.languages, s.langs, (l) => { try { return langName.of(l) ?? l; } catch { return l; } })}
      </div>
    </div>
  );
}
