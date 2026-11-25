import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * Car photos.
 * Production: the browser uploads straight to Vercel Blob (see src/app/api/upload/route.ts),
 * so photos never pass through a server action or hit Vercel's 4.5 MB request limit.
 * Development without BLOB_READ_WRITE_TOKEN: photos are saved in ./uploads and served by src/app/uploads/[...path]/route.ts.
 */
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS = 6;
export const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export const blobEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export function isValidPhoto(f: File) {
  return f.size > 0 && f.size <= MAX_PHOTO_BYTES && f.type in PHOTO_TYPES;
}

/** Local development only. */
export async function savePhotoLocally(f: File) {
  const name = `cars/${randomUUID()}.${PHOTO_TYPES[f.type]}`;
  await mkdir(path.join(UPLOAD_DIR, "cars"), { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await f.arrayBuffer()));
  return `/uploads/${name}`;
}

/** Only accept photo URLs that point at our own storage, never arbitrary links sent by a browser. */
export function isOurPhotoUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 500) return false;
  if (blobEnabled()) {
    try {
      const u = new URL(url);
      return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com") && u.pathname.startsWith("/cars/");
    } catch {
      return false;
    }
  }
  return /^\/uploads\/cars\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(url);
}
