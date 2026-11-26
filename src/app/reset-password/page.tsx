import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { findValidToken } from "@/lib/passwordReset";
import { resetPassword } from "@/app/actions/password";
import { ResetForm } from "@/components/ResetForm";

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const { t } = await getDict();
  const valid = await findValidToken(token);
  return (
    <div className="wrap max-w-[480px] py-12 sm:py-16">
      <h1 className="mb-6 text-4xl font-extrabold">{t.auth.resetTitle}</h1>
      {valid && token ? <ResetForm action={resetPassword} token={token} labels={t.auth} /> : (
        <div className="flex flex-col gap-4"><p className="alert-err" role="alert">{t.auth.resetInvalid}</p>
          <Link href="/forgot-password" className="btn-ink self-start">{t.auth.askNew}</Link></div>
      )}
    </div>
  );
}
