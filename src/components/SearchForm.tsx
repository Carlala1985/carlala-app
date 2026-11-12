import type { Dict } from "@/lib/i18n/en";
import { FUELS, SECTORS, TRANSMISSIONS } from "@/lib/cars";
import type { RawQuery } from "@/lib/query";

export function SearchForm({ t, q, defaults, filters = false }: {
  t: Dict; q: RawQuery; defaults: { start: string; end: string }; filters?: boolean;
}) {
  return (
    <form action="/cars" method="get" className="grid gap-3 rounded-[24px] bg-white p-3 ring-1 ring-line sm:grid-cols-[1.1fr_1fr_1fr_auto] sm:items-end">
      <div><label className="label px-1" htmlFor="sector">{t.home.where}</label>
        <select id="sector" name="sector" className="input" defaultValue={q.sector ?? ""}>
          <option value="">{t.home.anySector}</option>
          {SECTORS.map((s) => <option key={s} value={s}>{t.sectors[s]}</option>)}
        </select></div>
      <div><label className="label px-1" htmlFor="start">{t.home.from}</label>
        <input id="start" name="start" type="datetime-local" step={3600} className="input" defaultValue={q.start ?? defaults.start} /></div>
      <div><label className="label px-1" htmlFor="end">{t.home.until}</label>
        <input id="end" name="end" type="datetime-local" step={3600} className="input" defaultValue={q.end ?? defaults.end} /></div>
      {filters && (
        <div className="grid gap-3 sm:col-span-3 sm:grid-cols-2">
          <div><label className="label px-1" htmlFor="transmission">{t.search.transmission}</label>
            <select id="transmission" name="transmission" className="input" defaultValue={q.transmission ?? ""}>
              <option value="">{t.search.any}</option>
              {TRANSMISSIONS.map((v) => <option key={v} value={v}>{t.transmission[v]}</option>)}
            </select></div>
          <div><label className="label px-1" htmlFor="fuel">{t.search.fuel}</label>
            <select id="fuel" name="fuel" className="input" defaultValue={q.fuel ?? ""}>
              <option value="">{t.search.any}</option>
              {FUELS.map((v) => <option key={v} value={v}>{t.fuel[v]}</option>)}
            </select></div>
        </div>
      )}
      <button className="btn-ink h-[52px] sm:row-start-1 sm:col-start-4">{filters ? t.search.apply : t.home.search}</button>
    </form>
  );
}
