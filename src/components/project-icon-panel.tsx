"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

export function ProjectIconPanel({
  projectId,
  initialIcon,
  projectName,
}: {
  projectId: string;
  initialIcon: string | null;
  projectName: string;
}) {
  const [icon, setIcon] = useState<string | null>(initialIcon);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"idle" | "uploading" | "generating">("idle");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const t = useTranslations("project.projectIcon");

  async function handleUpload(file: File) {
    setMode("uploading");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("icon", file);
      const res = await fetch(`/api/projects/${projectId}/icon`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("uploadFailed"));
      setIcon(data.icon);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMode("idle");
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setMode("generating");
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/icon`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("generationFailed"));
      setIcon(data.icon);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMode("idle");
    }
  }

  async function handleRemove() {
    if (!confirm(t("removeConfirm"))) return;
    const res = await fetch(`/api/projects/${projectId}/icon`, {
      method: "DELETE",
    });
    if (res.ok) setIcon(null);
  }

  const busy = mode !== "idle";

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-20 h-20 rounded-2xl bg-surface-900 border border-surface-800 overflow-hidden flex items-center justify-center">
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={icon} alt={projectName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-surface-500">
              {projectName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1">
          <h2 className="font-semibold" data-help={t("titleHelp")}>{t("title")}</h2>
          <p className="text-xs text-surface-400 mt-1">
            {t("intro")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary text-sm"
              disabled={busy}
              data-help={t("uploadHelp")}
              onClick={() => fileRef.current?.click()}
            >
              {mode === "uploading" ? t("uploading") : t("upload")}
            </button>
            {icon && (
              <button
                type="button"
                className="btn btn-ghost text-sm"
                disabled={busy}
                data-help={t("removeHelp")}
                onClick={handleRemove}
              >
                {t("remove")}
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-surface-800">
        <h3 className="text-sm font-medium">{t("generateTitle")}</h3>
        <p className="text-xs text-surface-400 mt-1">
          {t("generateIntro")}
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder={t("promptPlaceholder")}
            aria-label={t("promptLabel")}
            data-help={t("promptHelp")}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={busy}
          />
          <button
            type="button"
            className="btn btn-primary text-sm"
            disabled={busy || !prompt.trim()}
            data-help={t("generateHelp")}
            onClick={handleGenerate}
          >
            {mode === "generating" ? t("generating") : t("generate")}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
