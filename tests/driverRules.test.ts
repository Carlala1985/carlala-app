import { describe, expect, it } from "vitest";
import { ageOn, canStartCheck, driverState } from "../src/lib/driverRules";

const d = (s: string) => new Date(s);

describe("driverState", () => {
  it("needs a passed check", () => {
    expect(driverState({ driverStatus: "NONE", licenceExpiresOn: null })).toBe("none");
    expect(driverState({ driverStatus: "PROCESSING", licenceExpiresOn: null })).toBe("processing");
    expect(driverState({ driverStatus: "REQUIRES_INPUT", licenceExpiresOn: null })).toBe("retry");
    expect(driverState({ driverStatus: "VERIFIED", licenceExpiresOn: null })).toBe("ok");
  });
  it("requires the licence to be valid on the last day of the trip", () => {
    const u = { driverStatus: "VERIFIED" as const, licenceExpiresOn: d("2027-03-10T00:00:00Z") };
    expect(driverState(u, d("2027-03-10T20:00:00Z"))).toBe("ok");
    expect(driverState(u, d("2027-03-11T08:00:00Z"))).toBe("expired");
  });
  it("lets people start a new check only when needed", () => {
    expect(canStartCheck({ driverStatus: "VERIFIED", licenceExpiresOn: null })).toBe(false);
    expect(canStartCheck({ driverStatus: "PROCESSING", licenceExpiresOn: null })).toBe(false);
    expect(canStartCheck({ driverStatus: "REQUIRES_INPUT", licenceExpiresOn: null })).toBe(true);
    expect(canStartCheck({ driverStatus: "VERIFIED", licenceExpiresOn: d("2020-01-01T00:00:00Z") })).toBe(true);
  });
});

describe("ageOn", () => {
  it("counts birthdays from the day itself", () => {
    const dob = { year: 2008, month: 11, day: 27 };
    expect(ageOn(dob, d("2026-11-26T12:00:00Z"))).toBe(17);
    expect(ageOn(dob, d("2026-11-27T00:00:00Z"))).toBe(18);
  });
});
