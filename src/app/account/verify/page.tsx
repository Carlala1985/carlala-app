import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import { stripeEnabled } from "@/lib/payments";
import { refreshCheck } from "@/lib/identity";
import { driverState } from "@/lib/driverRules";
import { simulateDriverCheck, startDriverCheck } from "@/app/actions/driver";

type Q = { return?: string; next?: string; error?: string };

export default async function Verify({ searchParams }: { searchParams: Promise<Q> }) {
  let user = await requireUser("/account/verify");
  const q = await searchParams;
  const { t, locale } = await getDict();
  const d = t.driver;
  let failed = !!q.error;
  try {
    user = await refreshCheck(user);
  } catch (e) {
    console.error("identity refresh failed:", (e as Error).message);
    failed = true;
  }
  const state = driverState(user);
  const next = q.next?.startsWith("/") && !q.next.startsWith("//") ? q.next : "";
  const tag = locale === "ro" ? "ro-RO" : "en-GB";
  const date = (v: Date) => new Intl.DateTimeFormat(tag, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(v);
  const country = (c: string) => { try { return new Intl.DisplayNames([tag], { type: "region" }).of(c) ?? c; } catch { return c; } };
  const reason = user.driverError ? d.reasons[user.driverError] ?? d.reasons.other : d.reasons.other;
  const tone = state === "ok" ? "alert-ok" : state === "none" || state === "processing" ? "alert-info" : "alert-err";
  const message = { ok: d.verified, none: d.none, processing: d.processing, retry: `${d.failed} ${reason}`, expired: d.expired }[state];
  const row = (label: string, value: string) => (
    <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-line py-3 first:border-t-0">
      <dt className="text-muted">{label}</dt><dd className="min-w-0 break-words font-semibold">{value}</dd>
    </div>
  );
  return (
    <div className="wrap max-w-[720px] py-10">
      <h1 className="mb-3 text-4xl font-extrabold">{d.title}</h1>
      <p className="mb-6 max-w-[62ch] text-muted">{d.intro}</p>
      {failed && <p className="alert-err mb-4" role="alert">{d.error}</p>}
      <div className="card flex flex-col items-start gap-4 p-6">
        <p className={tone} role="status">{message}</p>
        {state === "ok" && (
          <dl className="w-full">
            {user.driverName && row(d.name, user.driverName)}
            {user.licenceExpiresOn && row(d.validUntil, date(user.licenceExpiresOn))}
            {user.licenceCountry && row(d.country, country(user.licenceCountry))}
            {user.driverVerifiedAt && row(d.checkedOn, date(user.driverVerifiedAt))}
          </dl>
        )}
        {state === "ok" && next && <Link href={next} className="btn-coral">{t.common.continue}</Link>}
        {state !== "ok" && state !== "processing" && (stripeEnabled() ? (
          <form action={startDriverCheck}>
            <input type="hidden" name="next" value={next} />
            <button className="btn-coral">{state === "none" ? d.start : d.retry}</button>
          </form>
        ) : (
          <form action={simulateDriverCheck} className="flex flex-col items-start gap-2">
            <input type="hidden" name="next" value={next} />
            <p className="text-sm text-muted">{d.simulator}</p>
            <button className="btn-ghost">{d.simulate}</button>
          </form>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted"><a href="https://carlala.eu/privacy.html" className="underline">{d.privacy}</a></p>
    </div>
  );
}
