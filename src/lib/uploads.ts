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

/**
 * The Vercel Blob read-write token. Vercel names it BLOB_READ_WRITE_TOKEN by default, but the
 * "connect store" screen allows a custom prefix (e.g. CARLALA_READ_WRITE_TOKEN), so any
 * *_READ_WRITE_TOKEN variable holding a Blob token is accepted.
 */
export function blobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const [k, v] of Object.entries(process.env)) {
    if (k.endsWith("_READ_WRITE_TOKEN") && v?.startsWith("vercel_blob_rw_")) return v;
  }
  return undefined;
}

/**
 * How photos reach Vercel Blob:
 * - "token": classic stores, a *_READ_WRITE_TOKEN variable signs client upload tokens.
 * - "oidc": newer stores, Vercel provides BLOB_STORE_ID and the deployment's OIDC identity; uploads use presigned URLs.
 * - "none": local development, photos go to ./uploads.
 */
export type BlobMode = "token" | "oidc" | "none";
export function blobMode(): BlobMode {
  if (blobToken()) return "token";
  if (process.env.BLOB_STORE_ID) return "oidc";
  return "none";
}

export const blobEnabled = () => blobMode() !== "none";

export function isValidPhoto(f: File) {
  return f.size > 0 && f.size <= MAX_PHOTO_BYTES && f.type in PHOTO_TYPES;
}

/** Local development only. */
/** Photo folders: listing photos and hand-over (condition report) photos. */
export const PHOTO_FOLDERS = ["cars", "handovers"] as const;
export type PhotoFolder = (typeof PHOTO_FOLDERS)[number];

export async function savePhotoLocally(f: File, folder: PhotoFolder = "cars") {
  const name = `${folder}/${randomUUID()}.${PHOTO_TYPES[f.type]}`;
  await mkdir(path.join(UPLOAD_DIR, folder), { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await f.arrayBuffer()));
  return `/uploads/${name}`;
}

/** Only accept photo URLs that point at our own storage, never arbitrary links sent by a browser. */
export function isOurPhotoUrl(url: unknown, folder: PhotoFolder = "cars"): url is string {
  if (typeof url !== "string" || url.length > 500) return false;
  if (blobEnabled()) {
    try {
      const u = new URL(url);
      return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com") && u.pathname.startsWith(`/${folder}/`);
    } catch {
      return false;
    }
  }
  return new RegExp(`^/uploads/${folder}/[0-9a-f-]{36}\\.(jpg|png|webp)$`).test(url);
}
