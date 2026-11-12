import { redirect } from "next/navigation";
import { getDict } from "@/lib/i18n";
import { currentUser } from "@/lib/session";
import { AuthForm } from "@/components/AuthForm";
import { login } from "../actions/auth";

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/" } = await searchParams;
  if (await currentUser()) redirect(next.startsWith("/") ? next : "/");
  const { t } = await getDict();
  return (
    <div className="wrap max-w-[480px] py-12 sm:py-16">
      <h1 className="mb-6 text-4xl font-extrabold">{t.auth.loginTitle}</h1>
      <AuthForm mode="login" action={login} labels={t.auth} errors={{ ...t.auth, generic: t.errors.generic }} next={next} />
    </div>
  );
}
