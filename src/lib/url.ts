/**
 * The app's public address, used for links that leave the site (Stripe return pages).
 * APP_URL wins when set; on Vercel it falls back to the production domain Vercel provides
 * (app.carlala.eu once connected, else carlala-app.vercel.app).
 */
export function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
