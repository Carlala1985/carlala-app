"use client";
import { useState } from "react";

/**
 * Visits per day: one series, thin bars with a 2px gap and 4px rounded tops, faint gridlines,
 * hover/focus tooltip, and a table view. Bar colour #e04f33 passes 3:1 against white (validated).
 */
export function DailyChart({ series, labels, locale }: {
  series: { day: string; visitors: number; views: number }[];
  labels: { visits: string; pageViews: string; tableView: string; date: string; daily: string };
  locale: "ro" | "en";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.map((d) => d.visitors));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const fmtDay = new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const label = (d: string) => fmtDay.format(new Date(`${d}T12:00:00Z`));
  const every = Math.ceil(series.length / 7);
  const h = hover !== null ? series[hover] : null;
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="sr-only">{labels.daily}</figcaption>
      <div className="relative mt-3 grid grid-cols-[2.5rem_1fr] gap-x-2">
        <div className="relative h-56" aria-hidden="true">
          {ticks.map((t) => <span key={t} className="tnum absolute right-0 translate-y-1/2 text-[11px] leading-none text-muted" style={{ bottom: `${(t / top) * 100}%` }}>{t}</span>)}
        </div>
        <div className="relative h-56">
          {ticks.map((t) => <div key={t} className="absolute inset-x-0 border-t border-line/70" style={{ bottom: `${(t / top) * 100}%` }} aria-hidden="true" />)}
          <div className="absolute inset-0 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
            {series.map((d, i) => (
              <button key={d.day} type="button" className="group relative flex h-full flex-1 items-end focus:outline-none"
                onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                aria-label={`${label(d.day)}: ${d.visitors} ${labels.visits}, ${d.views} ${labels.pageViews}`}>
                <span className={`block w-full rounded-t-[4px] ${hover === i ? "bg-[#b93a22]" : "bg-[#e04f33]"}`}
                  style={{ height: `${(d.visitors / top) * 100}%`, minHeight: d.visitors ? 2 : 0 }} />
              </button>
            ))}
          </div>
          {h && hover !== null && (
            <div role="status" className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-ink px-3 py-2 text-[13px] text-blush shadow-lg"
              style={{ left: `${((hover + 0.5) / series.length) * 100}%` }}>
              <b className="block">{label(h.day)}</b>
              <span className="tnum block">{h.visitors} {labels.visits.toLowerCase()} · {h.views} {labels.pageViews.toLowerCase()}</span>
            </div>
          )}
        </div>
        <span />
        <div className="mt-1 flex gap-[2px]" aria-hidden="true">
          {series.map((d, i) => <span key={d.day} className="tnum flex-1 overflow-visible whitespace-nowrap text-center text-[11px] text-muted">{i % every === 0 ? label(d.day) : ""}</span>)}
        </div>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-muted">{labels.tableView}</summary>
        <div className="mt-2 max-h-72 overflow-auto rounded-xl ring-1 ring-line">
          <table className="tnum w-full text-left">
            <thead className="sticky top-0 bg-white"><tr><th className="px-3 py-2">{labels.date}</th><th className="px-3 py-2 text-right">{labels.visits}</th><th className="px-3 py-2 text-right">{labels.pageViews}</th></tr></thead>
            <tbody>{[...series].reverse().map((d) => <tr key={d.day} className="border-t border-line"><td className="px-3 py-1.5">{label(d.day)}</td><td className="px-3 py-1.5 text-right">{d.visitors}</td><td className="px-3 py-1.5 text-right">{d.views}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

function niceStep(max: number) {
  const raw = max / 4, pow = 10 ** Math.floor(Math.log10(raw)), n = raw / pow;
  return Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow);
}
