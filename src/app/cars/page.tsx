import { getDict, fmt } from "@/lib/i18n";
import { searchCars } from "@/lib/cars";
import { quote } from "@/lib/pricing";
import { datesQuery, parseQuery, type RawQuery } from "@/lib/query";
import { defaultRange } from "@/lib/time";
import { CarCard } from "@/components/CarCard";
import { SearchForm } from "@/components/SearchForm";

export default async function Search({ searchParams }: { searchParams: Promise<RawQuery> }) {
  const q = await searchParams;
  const { t, locale } = await getDict();
  const { params, dateError } = parseQuery(q);
  const cars = await searchCars(params);
  const hasDates = !!(params.start && params.end);
  const defaults = defaultRange();
  return (
    <div className="wrap py-10">
      <h1 className="mb-6 text-4xl font-extrabold">{params.sector ? `${t.search.title} · ${t.sectors[params.sector]}` : t.search.title}</h1>
      <SearchForm t={t} q={q} defaults={defaults} filters />
      {dateError && <p className="alert-err mt-4" role="alert">{t.errors[dateError]}</p>}
      <p className="mt-6 mb-4 font-semibold text-muted" aria-live="polite">
        {cars.length === 1 ? t.search.resultsOne : fmt(t.search.results, { n: cars.length })}
        {!hasDates && <span className="font-normal"> · {t.search.datesHint}</span>}
      </p>
      {cars.length === 0 ? (
        <div className="card p-8"><p className="text-xl font-bold">{t.search.none}</p><p className="text-muted">{t.search.noneHint}</p></div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((c) => (
            <CarCard key={c.id} car={c} t={t} locale={locale} query={hasDates ? datesQuery(q) : ""}
              total={hasDates ? quote(params.start!, params.end!, c.pricePerHour, c.pricePerDay).total : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
