"use client";
import { useCallback, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Reference images (concept art, sketches, screenshots of apps the person
 * likes, mood boards) for the AI builders: the new-app wizard, the
 * dashboard's idea box, the plan review and the Designer chat. Images can
 * be added with the button, dropped on the picker (or on the form around
 * it, see referenceDropProps) or pasted (imagesFromPaste).
 *
 * Big pictures are shrunk in the browser first (at most 1600 px on the
 * longest side, like the server does, src/lib/ai/references.ts), so even
 * phone photos upload quickly. The server checks every image again.
 */

export const MAX_REFERENCE_IMAGES = 6;
/** Per image, after shrinking (the server's limit). */
export const MAX_REFERENCE_BYTES = 5 * 1024 * 1024;
/** Bigger originals aren't even opened. */
const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
const MAX_SIDE = 1600;
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const REFERENCE_ACCEPT = TYPES.join(",");

/**
 * One picked image: a new one (`dataUrl`), or one already stored on the
 * server (`stored`, shown from its URL).
 */
export type PickedImage = {
  key: string;
  name: string;
  mediaType: string;
  /** What the thumbnail shows. */
  src: string;
  dataUrl?: string;
  stored?: { referenceId: string; index: number };
};

type T = ReturnType<typeof useTranslations>;

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("read failed"));
    r.readAsDataURL(blob);
  });
}

function dataUrlBytes(dataUrl: string): number {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((b64.length * 3) / 4);
}

/** The image, at most MAX_SIDE px on its longest side, as a data URL (GIFs become a still PNG). */
async function shrink(file: File): Promise<{ dataUrl: string; mediaType: string }> {
  const original = await readAsDataUrl(file);
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // The browser can't draw it: send it as it is and let the server judge.
    return { dataUrl: original, mediaType: file.type };
  }
  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest <= MAX_SIDE && file.size <= 1.5 * 1024 * 1024 && file.type !== "image/gif") {
    bitmap.close();
    return { dataUrl: original, mediaType: file.type };
  }
  const scale = Math.min(1, MAX_SIDE / longest);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const type = file.type === "image/jpeg" ? "image/jpeg" : file.type === "image/webp" ? "image/webp" : "image/png";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.88));
  if (!blob) return { dataUrl: original, mediaType: file.type };
  return { dataUrl: await readAsDataUrl(blob), mediaType: blob.type || type };
}

/** Adds files to the picked images; returns the new list and the first problem (or null). */
export async function addImageFiles(files: File[], current: PickedImage[], t: T): Promise<{ images: PickedImage[]; error: string | null }> {
  const next = [...current];
  let error: string | null = null;
  for (const file of files) {
    if (next.length >= MAX_REFERENCE_IMAGES) {
      error = t("references.picker.tooMany", { max: MAX_REFERENCE_IMAGES });
      break;
    }
    const type = file.type === "image/jpg" ? "image/jpeg" : file.type;
    if (!TYPES.includes(type)) {
      error = t("references.picker.wrongType", { name: file.name || t("references.picker.pasted") });
      continue;
    }
    if (file.size > MAX_ORIGINAL_BYTES) {
      error = t("references.picker.tooBig", { name: file.name, size: "5 MB" });
      continue;
    }
    try {
      const { dataUrl, mediaType } = await shrink(file);
      if (dataUrlBytes(dataUrl) > MAX_REFERENCE_BYTES) {
        error = t("references.picker.tooBig", { name: file.name, size: "5 MB" });
        continue;
      }
      const name = (file.name || t("references.picker.pastedName", { n: next.length + 1 })).slice(0, 120);
      next.push({ key: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name, mediaType, src: dataUrl, dataUrl });
    } catch {
      error = t("references.picker.readFailed", { name: file.name });
    }
  }
  return { images: next, error };
}

/** Image files on the clipboard of a paste event (empty when there are none). */
export function imagesFromPaste(e: React.ClipboardEvent): File[] {
  return [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
}

/** Whether a drag carries files (so text drags still work as usual). */
function dragHasFiles(e: React.DragEvent): boolean {
  return [...(e.dataTransfer?.types ?? [])].includes("Files");
}

/**
 * Drop handling for a whole form or panel: dropping image files anywhere on
 * it adds them. `onFiles` gets the dropped files.
 */
export function referenceDropProps(onFiles: (files: File[]) => void, setActive?: (active: boolean) => void) {
  return {
    onDragOver: (e: React.DragEvent) => {
      if (!dragHasFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      setActive?.(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      setActive?.(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!dragHasFiles(e)) return;
      e.preventDefault();
      // A picker inside a form that takes drops too: add the files once.
      e.stopPropagation();
      setActive?.(false);
      onFiles([...e.dataTransfer.files]);
    },
  };
}

/**
 * Picked images as the API takes them: the stored set's id when the images
 * are exactly that set, else the images themselves (stored ones are fetched
 * back from the server first).
 */
export async function referencePayload(images: PickedImage[]): Promise<{ referenceId: string } | { images: Array<{ data: string; mediaType: string; name: string }> } | null> {
  if (images.length === 0) return null;
  const id = images[0].stored?.referenceId;
  if (id && images.every((img, i) => img.stored?.referenceId === id && img.stored.index === i)) return { referenceId: id };
  const out: Array<{ data: string; mediaType: string; name: string }> = [];
  for (const img of images) {
    let data = img.dataUrl;
    if (!data) {
      const res = await fetch(img.src, { cache: "force-cache" });
      if (!res.ok) throw new Error(String(res.status));
      data = await readAsDataUrl(await res.blob());
    }
    out.push({ data, mediaType: img.mediaType, name: img.name });
  }
  return { images: out };
}

/** A stored set as picked images (thumbnails from the server). */
export function storedImages(referenceId: string, list: Array<{ index: number; name: string; mediaType: string }>): PickedImage[] {
  return list.map((img) => ({
    key: `${referenceId}-${img.index}`,
    name: img.name,
    mediaType: img.mediaType,
    src: `/api/ai/references/${encodeURIComponent(referenceId)}/${img.index}`,
    stored: { referenceId, index: img.index },
  }));
}

/**
 * Uploads picked images (POST /api/ai/references) unless they are already
 * one stored set. Returns the set's id, or throws with the server's words.
 */
export async function uploadReferences(images: PickedImage[], fallbackError: string): Promise<{ referenceId: string; images: PickedImage[] } | null> {
  const payload = await referencePayload(images).catch(() => {
    throw new Error(fallbackError);
  });
  if (!payload) return null;
  if ("referenceId" in payload) return { referenceId: payload.referenceId, images };
  const res = await fetch("/api/ai/references", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as { referenceId?: string; images?: Array<{ index: number; name: string; mediaType: string }>; error?: string } | null;
  if (!res || !res.ok || !data?.referenceId) throw new Error(data?.error || fallbackError);
  // Keep showing the local pictures (no flicker); they are now that stored set.
  return { referenceId: data.referenceId, images: images.map((img, index) => ({ ...img, stored: { referenceId: data.referenceId!, index } })) };
}

/**
 * The picker: an "Add images" button, drop zone and thumbnails with remove
 * buttons. `compact` is the one-line version for small composers.
 */
export function ReferencePicker({
  images,
  onChange,
  disabled = false,
  compact = false,
  id = "reference-images",
  error,
  onError,
}: {
  images: PickedImage[];
  onChange: (images: PickedImage[]) => void;
  disabled?: boolean;
  compact?: boolean;
  id?: string;
  /** A problem to show (e.g. the server refused the images). */
  error?: string | null;
  onError?: (message: string | null) => void;
}) {
  const t = useTranslations("ai");
  const input = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const shown = error ?? localError;

  const add = useCallback(
    async (files: File[]) => {
      if (disabled || files.length === 0) return;
      setBusy(true);
      const result = await addImageFiles(files, images, t);
      setBusy(false);
      setLocalError(result.error);
      onError?.(result.error);
      if (result.images.length !== images.length) onChange(result.images);
    },
    [disabled, images, onChange, onError, t],
  );

  const remove = (key: string) => {
    setLocalError(null);
    onError?.(null);
    onChange(images.filter((img) => img.key !== key));
  };

  const full = images.length >= MAX_REFERENCE_IMAGES;
  return (
    <div
      className={`min-w-0 rounded-lg ${active ? "outline-dashed outline-2 outline-brand-400/70" : ""}`}
      {...referenceDropProps((files) => void add(files), setActive)}
      data-testid="reference-picker"
    >
      <input
        ref={input}
        id={`${id}-input`}
        type="file"
        accept={REFERENCE_ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          void add(files);
        }}
      />
      <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "rounded-lg border border-dashed border-white/15 p-2"}`}>
        <button
          type="button"
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-surface-200 transition hover:border-brand-400/60 hover:bg-white/[0.06] disabled:opacity-40 ${compact ? "h-9 w-9 justify-center" : "px-3 py-1.5 text-xs"}`}
          onClick={() => input.current?.click()}
          disabled={disabled || busy || full}
          aria-label={compact ? t("references.picker.add") : undefined}
          title={full ? t("references.picker.tooMany", { max: MAX_REFERENCE_IMAGES }) : t("references.picker.addTitle")}
          data-help={t("references.picker.addHelp")}
        >
          <ImagePlus size={compact ? 16 : 14} aria-hidden />
          {!compact && <span>{images.length ? t("references.picker.addMore") : t("references.picker.add")}</span>}
        </button>
        {images.length > 0 && (
          <ul className="flex min-w-0 flex-wrap items-center gap-1.5" aria-label={t("references.picker.listLabel", { count: images.length })} data-help={t("references.picker.listHelp")}>
            {images.map((img, i) => (
              <li key={img.key} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt={t("references.picker.thumbAlt", { n: i + 1, name: img.name })} title={img.name} className={`${compact ? "h-9 w-9" : "h-12 w-12"} rounded-md border border-white/10 object-cover`} />
                <button
                  type="button"
                  className="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-surface-900 text-surface-200 shadow hover:bg-red-500/80 hover:text-white disabled:opacity-40"
                  onClick={() => remove(img.key)}
                  disabled={disabled}
                  aria-label={t("references.picker.remove", { name: img.name })}
                  data-help={t("references.picker.removeHelp")}
                >
                  <X size={11} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {!compact && images.length === 0 && <span className="min-w-0 text-xs text-surface-500">{t("references.picker.hint", { max: MAX_REFERENCE_IMAGES })}</span>}
        {busy && <span className="text-xs text-surface-400" role="status">{t("references.picker.preparing")}</span>}
      </div>
      {shown && <p role="alert" className="mt-1.5 text-xs text-red-300">{shown}</p>}
    </div>
  );
}
