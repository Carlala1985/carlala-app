import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { currentUser } from "@/lib/session";
import { blobEnabled, isValidPhoto, MAX_PHOTO_BYTES, PHOTO_TYPES, savePhotoLocally } from "@/lib/uploads";

/**
 * Production: issues short-lived Vercel Blob upload tokens to signed-in users (the browser then uploads directly).
 * Development without Blob: receives the file and stores it on disk.
 */
export async function POST(req: Request) {
  if (blobEnabled()) {
    try {
      const body = (await req.json()) as HandleUploadBody;
      const result = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          if (!(await currentUser())) throw new Error("not signed in");
          if (!pathname.startsWith("cars/")) throw new Error("bad path");
          return { allowedContentTypes: Object.keys(PHOTO_TYPES), maximumSizeInBytes: MAX_PHOTO_BYTES, addRandomSuffix: true };
        },
      });
      return NextResponse.json(result);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  // On Vercel the disk is read-only: without a Blob store there is nowhere to put photos.
  if (process.env.VERCEL) return NextResponse.json({ error: "photo storage not configured (connect a Vercel Blob store)" }, { status: 503 });
  if (!(await currentUser())) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const f = (await req.formData()).get("file");
  if (!(f instanceof File) || !isValidPhoto(f)) return NextResponse.json({ error: "invalid photo" }, { status: 400 });
  return NextResponse.json({ url: await savePhotoLocally(f) });
}
