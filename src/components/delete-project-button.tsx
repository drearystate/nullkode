"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Trash button on an app card. Opens a short confirmation that says what
 * deleting does, offers the backup download, and, when the app has a Google
 * Play upload key, asks the owner to download that first.
 */
export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [keyAck, setKeyAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations("project.deleteProject");
  const tc = useTranslations("common");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    cancelRef.current?.focus();
    fetch(`/api/projects/${projectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive && data?.hasUploadKey) setHasKey(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open, projectId]);

  function openDialog(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setKeyAck(false);
    setOpen(true);
  }

  function close() {
    if (!busy) setOpen(false);
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keyBackedUp: keyAck }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body.code === "upload-key") setHasKey(true);
        setError(body.error || t("failed", { status: res.status }));
        return;
      }
      setOpen(false);
      startTransition(() => router.refresh());
    } catch {
      setError(t("networkError"));
    } finally {
      setBusy(false);
    }
  }

  const dialog = (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center"
      onClick={(e) => {
        e.stopPropagation();
        close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`delete-app-${projectId}`}
        className="card w-full max-w-md p-6 text-start shadow-2xl [[data-theme=light]_&]:bg-surface-900"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
      >
        <h3 id={`delete-app-${projectId}`} className="text-lg font-semibold">
          {t("title", { name: projectName })}
        </h3>
        <p className="mt-2 text-sm text-surface-300">{t("summary")}</p>
        <p className="mt-1 text-sm text-surface-400">
          {t("details")}
        </p>
        <a href={`/api/projects/${projectId}/export`} className="btn-ghost mt-4 inline-flex" download data-help={t("backupHelp")}>
          <Download size={15} aria-hidden /> {t("backup")}
        </a>
        {hasKey && (
          <div className="mt-4 rounded-lg border border-red-800/60 bg-red-950/30 p-4 text-sm text-red-100">
            <p className="font-medium">{t("keyTitle")}</p>
            <p className="mt-1 text-red-100/80">{t("keyBody")}</p>
            <a href={`/api/projects/${projectId}/native/keystore/download`} className="mt-2 inline-block font-medium underline" download data-help={t("keyDownloadHelp")}>
              {t("keyDownload")}
            </a>
            <label className="mt-3 flex items-start gap-2">
              <input type="checkbox" className="mt-1" checked={keyAck} onChange={(e) => setKeyAck(e.target.checked)} data-help={t("keyAckHelp")} />
              <span>{t("keyAck")}</span>
            </label>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className="btn-ghost" onClick={close} disabled={busy}>
            {tc("cancel")}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy || (hasKey && !keyAck)}
            data-help={t("deleteHelp")}
            className="rounded-lg bg-[#b91c1c] px-4 py-2 text-sm font-semibold text-fixed-white transition hover:bg-[#dc2626] disabled:opacity-50"
          >
            {busy ? t("deleting") : t("deleteApp")}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        disabled={busy || pending}
        aria-label={t("buttonLabel", { name: projectName })}
        title={t("deleteApp")}
        data-help={t("buttonHelp")}
        className="relative z-10 inline-flex h-7 w-7 items-center justify-center rounded-md text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      {open && typeof document !== "undefined" && createPortal(dialog, document.body)}
    </>
  );
}
