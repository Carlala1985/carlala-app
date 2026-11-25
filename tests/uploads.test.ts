import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { isOurPhotoUrl } from "../src/lib/uploads";

afterEach(() => { delete process.env.BLOB_READ_WRITE_TOKEN; });

describe("isOurPhotoUrl", () => {
  it("accepts local uploads in development", () => {
    expect(isOurPhotoUrl("/uploads/cars/4d2790a5-5859-4bef-b6f8-fc46ad1cb64d.png")).toBe(true);
  });
  it("rejects other local paths", () => {
    expect(isOurPhotoUrl("/uploads/../.env")).toBe(false);
    expect(isOurPhotoUrl("https://evil.example/cars/x.jpg")).toBe(false);
  });
  it("accepts only our Blob store's car photos in production", () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
    expect(isOurPhotoUrl("https://abc123.public.blob.vercel-storage.com/cars/x-AbC.jpg")).toBe(true);
    expect(isOurPhotoUrl("https://abc123.public.blob.vercel-storage.com/other/x.jpg")).toBe(false);
    expect(isOurPhotoUrl("http://abc123.public.blob.vercel-storage.com/cars/x.jpg")).toBe(false);
    expect(isOurPhotoUrl("https://evil.example/?public.blob.vercel-storage.com/cars/x.jpg")).toBe(false);
  });
});
