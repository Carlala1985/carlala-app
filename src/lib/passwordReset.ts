import "server-only";
import { createHash, randomBytes } from "crypto";
import { db } from "./db";

export const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_HOUR = 3;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a one-time reset token for a user. Returns the raw token (to email), or null when rate-limited. */
export async function createResetToken(userId: string) {
  const recent = await db.passwordResetToken.count({ where: { userId, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } } });
  if (recent >= MAX_PER_HOUR) return null;
  const token = randomBytes(32).toString("base64url");
  await db.passwordResetToken.create({ data: { userId, tokenHash: hash(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) } });
  return token;
}

/** The still-valid token record for a raw token, or null. */
export async function findValidToken(token: string | undefined | null) {
  if (!token || token.length > 100) return null;
  const rec = await db.passwordResetToken.findUnique({ where: { tokenHash: hash(token) }, include: { user: true } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date() || rec.user.deletedAt || rec.user.suspended) return null;
  return rec;
}
