import "server-only";
import { cookies, headers } from "next/headers";
import en, { type Dict } from "./en";
import ro from "./ro";

export type Locale = "ro" | "en";
export const LOCALES: Locale[] = ["ro", "en"];
export const LOCALE_COOKIE = "carlala-lang";
const dicts: Record<Locale, Dict> = { ro, en };

/** Locale from the cookie, else from the browser, else Romanian. */
export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (c === "ro" || c === "en") return c;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^\s*en/i.test(accept) ? "en" : "ro";
}

export async function getDict() {
  const locale = await getLocale();
  return { locale, t: dicts[locale] };
}

/** Fill "{name}" placeholders. */
export function fmt(s: string, vars: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}
