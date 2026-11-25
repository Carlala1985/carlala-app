import { NextResponse } from "next/server";
import { handleUpload, handleUploadPresigned, type HandleUploadBody, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { issueSignedToken } from "@vercel/blob";
import { currentUser } from "@/lib/session";
import { blobMode, blobToken, isValidPhoto, MAX_PHOTO_BYTES, PHOTO_TYPES, savePhotoLocally } from "@/lib/uploads";

const allowedContentTypes = Object.keys(PHOTO_TYPES);

/** Only signed-in users may upload, and only into cars/. */
async function checkUpload(pathname: string) {
  if (!(await currentUser())) throw new Error("not signed in");
  if (!/^cars\/[\w-]+\.(jpg|png|webp)$/.test(pathname)) throw new Error("bad path");
}

/**
 * Hands out upload permission for car photos; the browser then uploads straight to Vercel Blob.
 * Supports both kinds of Blob store (see blobMode). Without Blob (local development) it stores the file on disk.
 */
export async function POST(req: Request) {
  const mode = blobMode();
  try {
    if (mode === "oidc") {
      const body = (await req.json()) as HandleUploadPresignedBody;
      const result = await handleUploadPresigned({
        body,
        request: req,
        getSignedToken: async (pathname) => {
          await checkUpload(pathname);
          const token = await issueSignedToken({
            pathname, operations: ["put"], allowedContentTypes, maximumSizeInBytes: MAX_PHOTO_BYTES, validUntil: Date.now() + 10 * 60 * 1000,
          });
          return { token };
        },
      });
      return NextResponse.json(result);
    }
    if (mode === "token") {
      const body = (await req.json()) as HandleUploadBody;
      const result = await handleUpload({
        token: blobToken(),
        body,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          await checkUpload(pathname);
          return { allowedContentTypes, maximumSizeInBytes: MAX_PHOTO_BYTES, addRandomSuffix: true };
        },
      });
      return NextResponse.json(result);
    }
  } catch (e) {
    console.error("photo upload permission failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  // On Vercel the disk is read-only: without a Blob store there is nowhere to put photos.
  if (process.env.VERCEL) return NextResponse.json({ error: "photo storage not configured (connect a Vercel Blob store)" }, { status: 503 });
  if (!(await currentUser())) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const f = (await req.formData()).get("file");
  if (!(f instanceof File) || !isValidPhoto(f)) return NextResponse.json({ error: "invalid photo" }, { status: 400 });
  return NextResponse.json({ url: await savePhotoLocally(f) });
}

/**
 * Safe status check. Says which storage mode is active and, for Blob, whether the app can obtain
 * upload permission (it requests a 1-minute permission it never uses). Never returns any secret.
 */
export async function GET() {
  const mode = blobMode();
  let canSign: boolean | string = "n/a";
  if (mode === "oidc") {
    try {
      await issueSignedToken({ pathname: "healthcheck/probe.jpg", operations: ["put"], validUntil: Date.now() + 60 * 1000 });
      canSign = true;
    } catch (e) {
      canSign = `error: ${(e as Error).message}`.slice(0, 200);
    }
  }
  return NextResponse.json({
    storage: mode === "none" ? (process.env.VERCEL ? "missing" : "local-disk") : "connected",
    mode,
    canSign,
    environment: process.env.VERCEL_ENV ?? "local",
  }, { headers: { "Cache-Control": "no-store" } });
}
