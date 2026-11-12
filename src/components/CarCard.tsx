import Link from "next/link";
import type { Car, CarPhoto } from "@prisma/client";
import type { Dict } from "@/lib/i18n/en";
import { formatRon } from "@/lib/money";
import { CarGlyph } from "./Logo";

export function CarImage({ url, className = "" }: { url?: string; className?: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={`aspect-[4/3] w-full object-cover ${className}`} />
  ) : (
    <div className={`flex aspect-[4/3] w-full items-center justify-center bg-lilac ${className}`}><CarGlyph className="w-2/5" /></div>
  );
}

export function CarCard({ car, t, locale, total, query = "" }: {
  car: Car & { photos: CarPhoto[] }; t: Dict; locale: "ro" | "en"; total?: number; query?: string;
}) {
  return (
    <Link href={`/cars/${car.id}${query}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(36,22,58,.45)]">
      <CarImage url={car.photos[0]?.url} />
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-lg font-bold leading-tight">{car.make} {car.model}</h3>
          <span className="tnum shrink-0 text-sm text-muted">{car.year}</span>
        </div>
        <p className="text-sm text-muted">{car.neighbourhood}, {t.sectors[car.sector]} · {t.transmission[car.transmission]} · {t.fuel[car.fuel]}</p>
        <div className="mt-auto flex items-baseline justify-between gap-3 pt-3">
          <span className="tnum"><b className="text-lg">{formatRon(car.pricePerHour, locale)}</b> <span className="text-sm text-muted">{t.search.perHour}</span></span>
          <span className="tnum text-sm text-muted">{formatRon(car.pricePerDay, locale)} {t.search.perDay}</span>
        </div>
        {total !== undefined && <p className="tnum mt-1 rounded-xl bg-peach px-3 py-1.5 text-sm font-semibold">{t.search.totalFor.replace("{price}", formatRon(total, locale))}</p>}
      </div>
    </Link>
  );
}
