import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { searchCars } from "@/lib/cars";
import { defaultRange } from "@/lib/time";
import { CarCard } from "@/components/CarCard";
import { SearchForm } from "@/components/SearchForm";
import { CarGlyph } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const { account } = await searchParams;
  const { t, locale } = await getDict();
  const cars = await searchCars({}, 6);
  const defaults = defaultRange();
  const steps = [[t.home.how1h, t.home.how1p], [t.home.how2h, t.home.how2p], [t.home.how3h, t.home.how3p]];
  return (
    <>
      {account === "deleted" && <div className="wrap pt-6"><p className="alert-ok" role="status">{t.account.deleted}</p></div>}
      <section className="wrap grid items-center gap-10 py-10 md:grid-cols-[1.1fr_1fr] md:py-16">
        <div className="flex min-w-0 flex-col gap-5">
          <span className="eyebrow">{t.home.eyebrow}</span>
          <h1 className="text-[clamp(40px,6.4vw,76px)] font-extrabold leading-[1.02]">{t.home.h1}</h1>
          <p className="max-w-[46ch] text-xl text-muted">{t.home.sub}</p>
        </div>
        <div className="relative hidden aspect-[5/4] items-center justify-center overflow-hidden rounded-[36px] bg-coral md:flex" aria-hidden="true">
          <CarGlyph className="w-3/5" />
        </div>
        <div className="md:col-span-2"><SearchForm t={t} q={{}} defaults={defaults} /></div>
      </section>

      {cars.length > 0 && <section className="wrap py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-3xl font-extrabold">{t.home.featured}</h2>
          <Link href="/cars" className="font-semibold underline decoration-coral decoration-2 underline-offset-4">{t.home.seeAll}</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((c) => <CarCard key={c.id} car={c} t={t} locale={locale} />)}
        </div>
      </section>}

      <section className="mt-12 bg-white py-16">
        <div className="wrap">
          <h2 className="mb-8 text-3xl font-extrabold">{t.home.howTitle}</h2>
          <ol className="grid gap-5 md:grid-cols-3">
            {steps.map(([h, p], i) => (
              <li key={h} className="flex flex-col gap-2 rounded-[22px] bg-blush p-6">
                <span className="mb-2 flex size-10 items-center justify-center rounded-full bg-coral font-extrabold">{i + 1}</span>
                <h3 className="text-xl font-bold">{h}</h3><p className="text-muted">{p}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="wrap py-16">
        <div className="flex flex-col items-start gap-4 rounded-[36px] bg-ink p-8 text-blush sm:p-12">
          <h2 className="max-w-[20ch] text-4xl font-extrabold">{t.home.ownerTitle}</h2>
          <p className="max-w-[48ch] text-lg opacity-80">{t.home.ownerP}</p>
          <Link href="/account/cars/new" className="btn-coral mt-2">{t.home.ownerCta}</Link>
        </div>
      </section>
    </>
  );
}
