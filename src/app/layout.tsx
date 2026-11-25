import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";
import { getDict } from "@/lib/i18n";
import { currentUser } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { setLocale } from "./actions/locale";
import { logout } from "./actions/auth";

// Self-hosted so no visitor data goes to Google (see carlala.eu/privacy.html).
const bricolage = localFont({
  src: [
    { path: "../fonts/bricolage-grotesque-latin-opsz-normal.woff2", weight: "200 800" },
    { path: "../fonts/bricolage-grotesque-latin-ext-opsz-normal.woff2", weight: "200 800" },
  ],
  variable: "--font-bricolage",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.meta.title, description: t.meta.description, icons: { icon: "/icon.svg" } };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getDict();
  const user = await currentUser();
  return (
    <html lang={locale} className={bricolage.variable}>
      <body className="flex min-h-dvh flex-col font-sans text-[17px] leading-relaxed">
        <header className="sticky top-0 z-40 border-b border-line/70 bg-blush/90 backdrop-blur">
          <div className="wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
            <Link href="/" aria-label="Carlala"><Logo className="h-8 w-auto" /></Link>
            <nav aria-label="Main" className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px] font-medium">
              <Link href="/cars" className="hover:underline decoration-coral decoration-2 underline-offset-4">{t.nav.find}</Link>
              {user ? (
                <>
                  <Link href="/account/trips" className="hover:underline decoration-coral decoration-2 underline-offset-4">{t.nav.trips}</Link>
                  <Link href="/account/cars" className="hover:underline decoration-coral decoration-2 underline-offset-4">{t.nav.myCars}</Link>
                  <Link href="/account/requests" className="hover:underline decoration-coral decoration-2 underline-offset-4">{t.nav.requests}</Link>
                  <Link href="/account" className="hover:underline decoration-coral decoration-2 underline-offset-4">{t.nav.account}</Link>
                  {user.role === "ADMIN" && <Link href="/admin" className="hover:underline decoration-coral decoration-2 underline-offset-4">{t.nav.admin}</Link>}
                </>
              ) : (
                <Link href="/account/cars/new" className="hover:underline decoration-coral decoration-2 underline-offset-4">{t.nav.list}</Link>
              )}
            </nav>
            <div className="flex items-center gap-2">
              <form action={setLocale} className="flex rounded-full bg-white p-[3px] ring-1 ring-line" aria-label={t.common.language}>
                {(["ro", "en"] as const).map((l) => (
                  <button key={l} name="locale" value={l} aria-pressed={locale === l}
                    className={`rounded-full px-2.5 py-1.5 text-[13px] font-semibold uppercase ${locale === l ? "bg-ink text-blush" : "text-muted"}`}>{l}</button>
                ))}
              </form>
              {user ? (
                <form action={logout}><button className="btn-ghost btn-sm">{t.nav.logout}</button></form>
              ) : (
                <>
                  <Link href="/login" className="btn-ghost btn-sm">{t.nav.login}</Link>
                  <Link href="/signup" className="btn-ink btn-sm hidden sm:inline-flex">{t.nav.signup}</Link>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-20 border-t border-line">
          <div className="wrap flex flex-wrap items-start justify-between gap-6 py-10 text-[15px] text-muted">
            <div className="flex flex-col gap-2">
              <Logo className="h-7 w-auto self-start" />
              <span>{t.footer.tagline}</span>
              <span className="text-[13px]">{t.footer.company}</span>
            </div>
            <nav aria-label="Footer" className="flex flex-wrap gap-5">
              <a href="https://carlala.eu/privacy.html" className="hover:text-ink">{t.footer.privacy}</a>
              <a href="https://carlala.eu/cookies.html" className="hover:text-ink">{t.footer.cookies}</a>
              <span className="select-all font-semibold text-ink">{t.footer.contact}</span>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
