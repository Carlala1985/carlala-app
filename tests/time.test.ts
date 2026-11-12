import { describe, expect, it } from "vitest";
import { defaultRange, parseLocal, toLocalInput } from "../src/lib/time";

describe("Bucharest time", () => {
  it("parses winter time (UTC+2)", () => expect(parseLocal("2027-01-15T10:00")!.toISOString()).toBe("2027-01-15T08:00:00.000Z"));
  it("parses summer time (UTC+3)", () => expect(parseLocal("2027-07-15T10:00")!.toISOString()).toBe("2027-07-15T07:00:00.000Z"));
  it("round-trips", () => expect(toLocalInput(parseLocal("2027-10-31T05:00")!)).toBe("2027-10-31T05:00"));
  it("rejects garbage", () => expect(parseLocal("tomorrow")).toBeNull());
});

describe("defaultRange", () => {
  it("never starts at night and lasts 3 hours", () => {
    const { start, end } = defaultRange();
    const h = Number(start.slice(11, 13));
    expect(h >= 8 && h < 21).toBe(true);
    expect(parseLocal(end)!.getTime() - parseLocal(start)!.getTime()).toBe(3 * 3600000);
  });
});
