import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

/** Local uploads (development only), served by src/app/uploads/[...path]/route.ts. */
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS = 6;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function isValidPhoto(f: File) {
  return f.size > 0 && f.size <= MAX_PHOTO_BYTES && f.type in TYPES;
}

/**
 * Stores a photo and returns its public URL.
 * Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set (production), else the local uploads/ folder (development).
 */
export async function savePhoto(f: File) {
  const name = `cars/${randomUUID()}.${TYPES[f.type]}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(name, f, { access: "public", contentType: f.type });
    return blob.url;
  }
  await mkdir(path.join(UPLOAD_DIR, "cars"), { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await f.arrayBuffer()));
  return `/uploads/${name}`;
}
