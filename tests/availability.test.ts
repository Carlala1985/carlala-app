import { describe, expect, it } from "vitest";
import { addDays, bookedHours, cleanHours, isAvailable, localSlot, mondayOf, weekdayOf, weekDates, weeklyHoursFor } from "../src/lib/availability";
import { parseLocal } from "../src/lib/time";

const L = (s: string) => parseLocal(s)!;
// Typical week: Saturday (weekday 5) 09:00-17:59 and Monday 18:00-19:59
const weekly = [...Array.from({ length: 9 }, (_, i) => 5 * 24 + 9 + i), 18, 19];
const agenda = { hasAgenda: true, weeklyHours: weekly };
const none = new Map<string, number[]>();

describe("calendar helpers", () => {
  it("knows weekdays (Monday = 0)", () => {
    expect(weekdayOf("2027-03-06")).toBe(5); // Saturday
    expect(mondayOf("2027-03-06")).toBe("2027-03-01");
    expect(weekDates("2027-03-01")[6]).toBe("2027-03-07");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
  });
  it("reads local Bucharest slots, across the clock change", () => {
    expect(localSlot(L("2027-03-28T05:00"))).toMatchObject({ date: "2027-03-28", hour: 5, weekday: 6 });
    expect(localSlot(L("2027-10-31T02:00")).hour).toBe(2);
  });
  it("counts every hour a booking touches", () => {
    expect(bookedHours(L("2027-03-06T10:30"), L("2027-03-06T11:15"))).toHaveLength(2);
    // spring forward: 02:00-05:00 local on 28 March 2027 is only 2 real hours
    expect(bookedHours(L("2027-03-28T02:00"), L("2027-03-28T05:00"))).toHaveLength(2);
  });
});

describe("isAvailable", () => {
  it("allows anything for cars without an agenda", () => {
    expect(isAvailable({ hasAgenda: false, weeklyHours: [] }, none, L("2027-03-02T03:00"), L("2027-03-02T04:00"))).toBe(true);
  });
  it("allows bookings inside coloured hours only", () => {
    expect(isAvailable(agenda, none, L("2027-03-06T10:00"), L("2027-03-06T13:00"))).toBe(true);
    expect(isAvailable(agenda, none, L("2027-03-06T16:00"), L("2027-03-06T19:00"))).toBe(false);
    expect(isAvailable(agenda, none, L("2027-03-01T18:00"), L("2027-03-01T20:00"))).toBe(true);
  });
  it("lets a date exception replace the typical day", () => {
    const blocked = new Map([["2027-03-06", []]]);
    expect(isAvailable(agenda, blocked, L("2027-03-06T10:00"), L("2027-03-06T11:00"))).toBe(false);
    const opened = new Map([["2027-03-03", [8, 9]]]); // a Wednesday, normally closed
    expect(isAvailable(agenda, opened, L("2027-03-03T08:00"), L("2027-03-03T10:00"))).toBe(true);
  });
  it("derives a date's hours from the typical week", () => {
    expect(weeklyHoursFor(weekly, "2027-03-01")).toEqual([18, 19]);
  });
  it("cleans hours sent by a browser", () => {
    expect(cleanHours([3, 3, 200, -1, 2.5, "x", 1], 168)).toEqual([1, 3]);
    expect(cleanHours("nope", 24)).toBeNull();
  });
});
