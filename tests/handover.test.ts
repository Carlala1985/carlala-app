import { describe, expect, it } from "vitest";
import { canRespond, canSubmit, checkReadings } from "../src/lib/handover";

const H = 3600000;
const start = new Date("2027-05-10T08:00:00Z"), end = new Date("2027-05-10T18:00:00Z");
const paid = { status: "PAID", start, end };
const at = (ms: number) => new Date(start.getTime() + ms);
const report = (by: string) => ({ createdAt: at(0), submittedById: by, confirmedAt: null, objectionAt: null });

describe("canSubmit", () => {
  it("opens pick-up 2 hours before the start, only for paid trips", () => {
    expect(canSubmit("PICKUP", paid, null, null, at(-3 * H))).toBe(false);
    expect(canSubmit("PICKUP", paid, null, null, at(-1 * H))).toBe(true);
    expect(canSubmit("PICKUP", { ...paid, status: "ACCEPTED" }, null, null, at(0))).toBe(false);
  });
  it("allows each report only once, and return only after pick-up", () => {
    expect(canSubmit("PICKUP", paid, report("o"), null, at(0))).toBe(false);
    expect(canSubmit("RETURN", paid, null, null, at(H))).toBe(false);
    expect(canSubmit("RETURN", paid, report("o"), null, at(H))).toBe(true);
    expect(canSubmit("RETURN", paid, report("o"), report("r"), at(H))).toBe(false);
  });
  it("closes the return report a week after the end", () => {
    expect(canSubmit("RETURN", { ...paid, status: "COMPLETED" }, report("o"), null, new Date(end.getTime() + 8 * 24 * H))).toBe(false);
  });
});

describe("canRespond", () => {
  it("lets only the other side respond, once", () => {
    expect(canRespond(report("owner"), "owner", at(H))).toBe(false);
    expect(canRespond(report("owner"), "renter", at(H))).toBe(true);
    expect(canRespond({ ...report("owner"), confirmedAt: at(H) }, "renter", at(2 * H))).toBe(false);
  });
});

describe("checkReadings", () => {
  it("validates kilometres and fuel", () => {
    expect(checkReadings("45210", "75")).toBeNull();
    expect(checkReadings("-1", "50")).toBe("km");
    expect(checkReadings("1000", "120")).toBe("fuel");
    expect(checkReadings("1000", "50", 1200)).toBe("km_lower");
  });
});
