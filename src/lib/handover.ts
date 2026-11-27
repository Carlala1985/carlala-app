/**
 * Hand-over (condition) reports at pick-up and return. Pure rules, no database access.
 * One report per stage, submitted by either side, then confirmed or disputed by the other.
 */
export const REQUIRED_SLOTS = ["FRONT", "BACK", "LEFT", "RIGHT", "DASHBOARD"] as const;
export type RequiredSlot = (typeof REQUIRED_SLOTS)[number];
export const MAX_EXTRA_PHOTOS = 10;
export type Stage = "PICKUP" | "RETURN";

const HOUR = 3600000, DAY = 24 * HOUR;
export const PICKUP_OPENS_BEFORE = 2 * HOUR; // pick-up report can start 2 h before the trip
export const RETURN_DEADLINE_AFTER_END = 7 * DAY;
export const RESPONSE_WINDOW = 7 * DAY; // the other side has 7 days to confirm or dispute

type BookingLike = { status: string; start: Date; end: Date };
type HandoverLike = { createdAt: Date; submittedById: string; confirmedAt: Date | null; objectionAt: Date | null } | null | undefined;

export function canSubmit(stage: Stage, b: BookingLike, pickup: HandoverLike, ret: HandoverLike, now = new Date()) {
  if (!["PAID", "COMPLETED"].includes(b.status)) return false;
  const t = now.getTime();
  if (stage === "PICKUP") return !pickup && t >= b.start.getTime() - PICKUP_OPENS_BEFORE && t <= b.end.getTime() + DAY;
  return !!pickup && !ret && t >= b.start.getTime() && t <= b.end.getTime() + RETURN_DEADLINE_AFTER_END;
}

export function canRespond(h: HandoverLike, userId: string, now = new Date()) {
  return !!h && h.submittedById !== userId && !h.confirmedAt && !h.objectionAt && now.getTime() <= h.createdAt.getTime() + RESPONSE_WINDOW;
}

export type ReadingError = "km" | "fuel" | "km_lower";
/** Validates the typed readings. Return kilometres can't be lower than at pick-up. */
export function checkReadings(km: unknown, fuel: unknown, pickupKm?: number): ReadingError | null {
  const k = Number(km), f = Number(fuel);
  if (!Number.isInteger(k) || k < 0 || k > 2_000_000) return "km";
  if (!Number.isInteger(f) || f < 0 || f > 100) return "fuel";
  if (pickupKm !== undefined && k < pickupKm) return "km_lower";
  return null;
}
