import "server-only";
import { createHash, randomBytes } from "crypto";
import { db } from "./db";
import { cleanLang, cleanPath, deviceOf, isBot, refHost } from "./analyticsRules";

const RETENTION_DAYS = 396; // ~13 months

/** Today's random salt. Older salts are deleted, so earlier visitor codes can never be recomputed. */
async function todaySalt() {
  const day = new Date().toISOString().slice(0, 10);
  const existing = await db.analyticsSalt.findUnique({ where: { day } });
  if (existing) return existing.salt;
  const salt = randomBytes(32).toString("hex");
  await db.analyticsSalt.upsert({ where: { day }, update: {}, create: { day, salt } });
  await db.analyticsSalt.deleteMany({ where: { day: { not: day } } });
  return (await db.analyticsSalt.findUnique({ where: { day } }))!.salt;
}

/** Records one page view. Returns false when ignored (bot, bad input). Never stores the IP address. */
export async function recordView(input: { s?: unknown; p?: unknown; r?: unknown; l?: unknown }, headers: Headers) {
  const ua = headers.get("user-agent") ?? "";
  if (isBot(ua)) return false;
  const path = cleanPath(input.p);
  if (!path) return false;
  const site = input.s === "web" ? "web" : "app";
  const ip = (headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || headers.get("x-real-ip") || "0.0.0.0";
  const visitor = createHash("sha256").update(`${await todaySalt()}|${ip}|${ua}`).digest("hex").slice(0, 24);
  const country = headers.get("x-vercel-ip-country");
  await db.pageView.create({
    data: {
      site, path, visitor, device: deviceOf(ua),
      referrer: refHost(input.r), lang: cleanLang(input.l),
      country: country && /^[A-Z]{2}$/.test(country) ? country : null,
    },
  });
  return true;
}

export async function purgeOldViews() {
  await db.pageView.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - RETENTION_DAYS * 86400000) } } });
}

type Row = { label: string; views: number; visitors: number };

/** Daily series and breakdowns for the admin dashboard. Days are Bucharest days. */
export async function trafficStats(days: number, site: "all" | "web" | "app") {
  const since = new Date(Date.now() - days * 86400000);
  const where = { createdAt: { gte: since }, ...(site === "all" ? {} : { site }) };
  const siteSql = site === "all" ? "" : `AND "site" = '${site}'`;
  const daily = await db.$queryRawUnsafe<{ day: string; views: bigint; visitors: bigint }[]>(
    `SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Bucharest', 'YYYY-MM-DD') AS day,
            count(*) AS views, count(DISTINCT "visitor") AS visitors
       FROM "PageView" WHERE "createdAt" >= $1 ${siteSql} GROUP BY 1 ORDER BY 1`, since);
  const group = async (col: "path" | "referrer" | "country" | "device" | "lang", take = 10): Promise<Row[]> => {
    const rows = await db.$queryRawUnsafe<{ label: string | null; views: bigint; visitors: bigint }[]>(
      `SELECT "${col}" AS label, count(*) AS views, count(DISTINCT "visitor" || to_char("createdAt", 'YYYY-MM-DD')) AS visitors
         FROM "PageView" WHERE "createdAt" >= $1 ${siteSql} ${col === "referrer" ? `AND "referrer" IS NOT NULL` : ""}
        GROUP BY 1 ORDER BY 2 DESC LIMIT ${take}`, since);
    return rows.map((r) => ({ label: r.label ?? "", views: Number(r.views), visitors: Number(r.visitors) }));
  };
  const [pages, referrers, countries, devices, langs, totalViews] = await Promise.all([
    group("path"), group("referrer"), group("country"), group("device", 3), group("lang", 6), db.pageView.count({ where }),
  ]);
  const series = daily.map((d) => ({ day: d.day, views: Number(d.views), visitors: Number(d.visitors) }));
  return { series, pages, referrers, countries, devices, langs, totalViews, totalVisits: series.reduce((a, d) => a + d.visitors, 0) };
}
