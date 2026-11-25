import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/db", () => ({ db: {} }));
import { appUrl } from "../src/lib/payments";

const KEYS = ["APP_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"];
afterEach(() => KEYS.forEach((k) => delete process.env[k]));

describe("appUrl", () => {
  it("uses APP_URL when set, without a trailing slash", () => {
    process.env.APP_URL = "https://app.carlala.eu/";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "carlala-app.vercel.app";
    expect(appUrl()).toBe("https://app.carlala.eu");
  });
  it("falls back to Vercel's production domain", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "carlala-app.vercel.app";
    process.env.VERCEL_URL = "carlala-app-abc123.vercel.app";
    expect(appUrl()).toBe("https://carlala-app.vercel.app");
  });
  it("uses localhost when nothing is set", () => expect(appUrl()).toBe("http://localhost:3000"));
});
