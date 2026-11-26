import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { requestPasswordReset } from "@/app/actions/password";

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  const { t } = await getDict();
  return (
    <div className="wrap max-w-[480px] py-12 sm:py-16">
      <h1 className="mb-3 text-4xl font-extrabold">{t.auth.forgotTitle}</h1>
      {sent ? (
        <div className="flex flex-col gap-4"><p className="alert-ok" role="status">{t.auth.forgotSent}</p>
          <Link href="/login" className="btn-ghost self-start">{t.auth.login}</Link></div>
      ) : (
        <form action={requestPasswordReset} className="card flex flex-col gap-4 p-6 sm:p-8">
          <p className="text-muted">{t.auth.forgotText}</p>
          <div><label className="label" htmlFor="email">{t.auth.email}</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required /></div>
          <button className="btn-ink">{t.auth.sendLink}</button>
        </form>
      )}
    </div>
  );
}
