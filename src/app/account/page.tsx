import { getDict } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { deleteMyAccount } from "@/app/actions/deletion";

export default async function Account({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser("/account");
  const { error } = await searchParams;
  const { t, locale } = await getDict();
  const since = new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(user.createdAt);
  const row = (label: string, value: string) => (
    <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-line py-3 first:border-t-0">
      <dt className="text-muted">{label}</dt><dd className="min-w-0 break-words font-semibold">{value}</dd>
    </div>
  );
  return (
    <div className="wrap max-w-[720px] py-10">
      <h1 className="mb-6 text-4xl font-extrabold">{t.account.title}</h1>
      <dl className="card px-6 py-3">
        {row(t.account.name, user.name)}
        {row(t.account.email, user.email)}
        {row(t.account.phone, user.phone || t.account.none)}
        {row(t.account.memberSince, since)}
      </dl>
      <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        <a href="/account/verify" className="font-semibold underline decoration-coral decoration-2 underline-offset-4">{t.driver.nav}</a>
        <a href="/account/payouts" className="font-semibold underline decoration-coral decoration-2 underline-offset-4">{t.nav.payouts}</a>
      </p>
      <section className="mt-10 flex flex-col gap-3">
        <h2 className="text-2xl font-bold">{t.account.deleteTitle}</h2>
        {error === "has_trips" && <p className="alert-err" role="alert">{t.account.hasTrips}</p>}
        <ConfirmDelete action={deleteMyAccount} fields={{}} cta={t.account.deleteCta} text={t.account.deleteText} confirm={t.account.deleteConfirm} small={false} />
      </section>
    </div>
  );
}
