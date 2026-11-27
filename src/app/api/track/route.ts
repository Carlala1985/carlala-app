import { recordView } from "@/lib/analytics";

const ALLOWED = new Set(["https://carlala.eu", "https://www.carlala.eu", "https://app.carlala.eu"]);
const cors = (origin: string | null): Record<string, string> => (origin && ALLOWED.has(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {});

/** Receives anonymous page views (navigator.sendBeacon, text/plain JSON). Always answers 204. */
export async function POST(req: Request) {
  try {
    const body = JSON.parse((await req.text()).slice(0, 2000));
    await recordView(body ?? {}, req.headers);
  } catch {
    // ignore malformed beacons
  }
  return new Response(null, { status: 204, headers: cors(req.headers.get("origin")) });
}
