import type { DriverStatus } from "@prisma/client";

/** Youngest age at which someone may rent on Carlala (checked against the date of birth on the licence). */
export const MIN_DRIVER_AGE = 18;

export type DriverState = "ok" | "none" | "processing" | "retry" | "expired";

type Driver = { driverStatus: DriverStatus; licenceExpiresOn: Date | null };

/** Can this person drive a car until `until`? The licence must still be valid on the last day of the trip. */
export function driverState(u: Driver, until: Date = new Date()): DriverState {
  if (u.driverStatus === "PROCESSING") return "processing";
  if (u.driverStatus === "REQUIRES_INPUT") return "retry";
  if (u.driverStatus !== "VERIFIED") return "none";
  if (u.licenceExpiresOn && dayOf(u.licenceExpiresOn) < dayOf(until)) return "expired";
  return "ok";
}

/** A new check can be started unless one is being processed or a valid one is in place. */
export const canStartCheck = (u: Driver) => !["processing", "ok"].includes(driverState(u));

/** Full years between a date of birth and a date (birthdays count from the day itself). */
export function ageOn(dob: { year: number; month: number; day: number }, on: Date) {
  const y = on.getUTCFullYear(), m = on.getUTCMonth() + 1, d = on.getUTCDate();
  return y - dob.year - (m < dob.month || (m === dob.month && d < dob.day) ? 1 : 0);
}

const dayOf = (d: Date) => d.toISOString().slice(0, 10);
