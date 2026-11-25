"use client";
import { useState } from "react";
import { upload } from "@vercel/blob/client";

const MAX_SIDE = 1600;

/** Shrinks a photo in the browser (max 1600 px, JPEG) so phone photos upload fast and stay small. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return out && out.size < file.size ? out : file;
  } catch {
    return file; // the server still checks type and size
  }
}

type Item = { key: string; preview: string; url?: string; failed?: boolean };

export function PhotoPicker({ max, direct, labels, onBusyChange }: {
  max: number; direct: boolean; labels: Record<string, string>; onBusyChange: (busy: boolean) => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const room = max - items.filter((i) => !i.failed).length;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, Math.max(0, room));
    e.target.value = "";
    if (!files.length) return;
    setError("");
    const added = files.map((f) => ({ key: crypto.randomUUID(), preview: URL.createObjectURL(f) }));
    setItems((cur) => [...cur, ...added]);
    onBusyChange(true);
    await Promise.all(files.map(async (f, i) => {
      const key = added[i].key;
      try {
        const blob = await shrink(f);
        let url: string;
        if (direct) {
          url = (await upload(`cars/${key}.jpg`, blob, { access: "public", handleUploadUrl: "/api/upload", contentType: blob.type || "image/jpeg" })).url;
        } else {
          const fd = new FormData();
          fd.append("file", new File([blob], `${key}.jpg`, { type: blob.type || "image/jpeg" }));
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          if (!res.ok) throw new Error(String(res.status));
          url = (await res.json()).url;
        }
        setItems((cur) => cur.map((it) => (it.key === key ? { ...it, url } : it)));
      } catch {
        setItems((cur) => cur.map((it) => (it.key === key ? { ...it, failed: true } : it)));
        setError(labels.uploadFailed);
      }
    }));
    onBusyChange(false);
  }

  const urls = items.filter((i) => i.url).map((i) => i.url!);
  return (
    <div>
      <label className="label" htmlFor="photo-picker">{labels.photos}</label>
      <input type="hidden" name="photoUrls" value={JSON.stringify(urls)} />
      {items.length > 0 && (
        <ul className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {items.map((it) => (
            <li key={it.key} className="relative overflow-hidden rounded-xl ring-1 ring-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.preview} alt="" className={`aspect-square w-full object-cover ${it.url ? "" : "opacity-50"}`} />
              {!it.url && <span className={`absolute inset-x-1 bottom-1 rounded-md px-1 text-center text-[11px] font-semibold ${it.failed ? "bg-err text-white" : "bg-white"}`}>{it.failed ? "✕" : labels.uploading}</span>}
            </li>
          ))}
        </ul>
      )}
      {room > 0 && (
        <input id="photo-picker" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onPick}
          className="input file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-blush" />
      )}
      <p className="hint">{labels.photosHint}</p>
      {error && <p className="alert-err mt-2" role="alert">{error}</p>}
    </div>
  );
}
