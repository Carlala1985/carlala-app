import { describe, expect, it } from "vitest";
import { cleanLang, cleanPath, deviceOf, isBot, refHost } from "../src/lib/analyticsRules";

describe("analytics rules", () => {
  it("never keeps query strings (they can hold tokens)", () => {
    expect(cleanPath("/reset-password?token=secret123")).toBe("/reset-password");
    expect(cleanPath("/cars?sector=S1#top")).toBe("/cars");
    expect(cleanPath("https://evil.example/")).toBeNull();
  });
  it("groups pages with ids", () => {
    expect(cleanPath("/cars/cmigq3b8w0000x7k2abcd1234")).toBe("/cars/:id");
    expect(cleanPath("/bookings/cmigq3b8w0000x7k2abcd1234/handover")).toBe("/bookings/:id/handover");
  });
  it("keeps only external referring hosts", () => {
    expect(refHost("https://www.google.com/search?q=carlala")).toBe("google.com");
    expect(refHost("https://carlala.eu/")).toBeNull();
    expect(refHost("https://app.carlala.eu/cars")).toBeNull();
    expect(refHost("not a url")).toBeNull();
  });
  it("recognises devices and bots", () => {
    expect(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile")).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (Linux; Android 14; SM-X710) Safari")).toBe("tablet");
    expect(deviceOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140")).toBe("desktop");
    expect(isBot("Googlebot/2.1")).toBe(true);
    expect(isBot("")).toBe(true);
  });
  it("keeps the language code only", () => {
    expect(cleanLang("ro-RO")).toBe("ro");
    expect(cleanLang("<script>")).toBeNull();
  });
});
