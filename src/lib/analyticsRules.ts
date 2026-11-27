/** Pure helpers for cookieless visit statistics (no database). */

const BOT = /bot|crawl|spider|slurp|preview|monitor|headless|lighthouse|pingdom|uptime|curl|wget|python|java\/|go-http|node-fetch|axios/i;
export const isBot = (ua: string) => !ua || BOT.test(ua);

export function deviceOf(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

/** Page path only: never the query string or fragment (they can hold tokens), capped in length. */
export function cleanPath(p: unknown) {
  if (typeof p !== "string" || !p.startsWith("/")) return null;
  const path = p.split(/[?#]/)[0].replace(/\/{2,}/g, "/").slice(0, 200);
  // Collapse ids so pages group together: /cars/cmi9… -> /cars/:id
  return path.replace(/\/c[a-z0-9]{20,30}(?=\/|$)/g, "/:id");
}

const OWN = /(^|\.)carlala\.eu$/i;
/** Host of an external referring site, or null for direct visits and our own pages. */
export function refHost(ref: unknown) {
  if (typeof ref !== "string" || !ref) return null;
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "").toLowerCase();
    return OWN.test(h) || h === "localhost" ? null : h.slice(0, 100);
  } catch {
    return null;
  }
}

export const cleanLang = (l: unknown) => (typeof l === "string" && /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(l) ? l.slice(0, 2).toLowerCase() : null);
