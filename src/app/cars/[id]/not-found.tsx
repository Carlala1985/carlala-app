import Link from "next/link";
import { getDict } from "@/lib/i18n";

export default async function NotFound() {
  const { t } = await getDict();
  return (
    <div className="wrap flex flex-col items-start gap-4 py-16">
      <h1 className="text-3xl font-extrabold">{t.car.notFound}</h1>
      <Link href="/cars" className="btn-ink">{t.nav.find}</Link>
    </div>
  );
}
