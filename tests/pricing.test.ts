import { describe, expect, it } from "vitest";
import { billableHours, overlaps, quote, validateRange } from "../src/lib/pricing";

const H = 3600000;
const t0 = new Date("2027-03-10T08:00:00Z");
const at = (h: number) => new Date(t0.getTime() + h * H);

describe("quote", () => {
  it("charges hourly for short rentals", () => {
    expect(quote(t0, at(3), 1500, 14000).total).toBe(4500);
  });
  it("caps leftover hours at one day", () => {
    expect(quote(t0, at(20), 1500, 14000).total).toBe(14000);
  });
  it("combines days and hours", () => {
    const q = quote(t0, at(26), 1500, 14000);
    expect(q).toMatchObject({ days: 1, restHours: 2, total: 14000 + 3000 });
  });
  it("splits the fee from the owner's earnings", () => {
    const q = quote(t0, at(4), 2500, 20000);
    expect(q.platformFee + q.ownerEarnings).toBe(q.total);
    expect(q.platformFee).toBe(2500);
  });
  it("rounds part hours up", () => {
    expect(billableHours(t0, new Date(t0.getTime() + 61 * 60000))).toBe(2);
  });
});

describe("validateRange", () => {
  const now = new Date("2027-03-10T07:00:00Z");
  it("accepts a normal range", () => expect(validateRange(t0, at(2), now)).toBeNull());
  it("rejects end before start", () => expect(validateRange(at(2), t0, now)).toBe("end_before_start"));
  it("rejects the past", () => expect(validateRange(new Date("2027-03-09T08:00:00Z"), t0, now)).toBe("in_past"));
  it("rejects over 30 days", () => expect(validateRange(t0, at(24 * 31), now)).toBe("too_long"));
});

describe("overlaps", () => {
  it("detects overlap", () => expect(overlaps(t0, at(3), at(2), at(5))).toBe(true));
  it("allows back-to-back trips", () => expect(overlaps(t0, at(3), at(3), at(5))).toBe(false));
});
