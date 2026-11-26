import "server-only";

export type Email = { to: string; toName?: string; subject: string; html: string; text: string; tag: string };

/**
 * Sends a transactional email through Brevo's API.
 * Never throws: a failed email must not break a booking. Without BREVO_API_KEY (local development)
 * the email is only logged.
 */
export async function sendEmail(e: Email): Promise<boolean> {
  if (!e.to || e.to.endsWith(".invalid")) return false; // deleted accounts
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    console.info(`[email not sent: BREVO_API_KEY missing] ${e.tag} -> ${e.to}: ${e.subject}`);
    return false;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: "Carlala", email: process.env.EMAIL_FROM ?? "hello@carlala.eu" },
        to: [{ email: e.to, ...(e.toName ? { name: e.toName } : {}) }],
        subject: e.subject,
        htmlContent: e.html,
        textContent: e.text,
        tags: [e.tag],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`email ${e.tag} failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    return res.ok;
  } catch (err) {
    console.error(`email ${e.tag} failed:`, (err as Error).message);
    return false;
  }
}
