"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bug, Check, Copy, Download, Loader2, Play } from "lucide-react";
import { useTranslations } from "next-intl";

/** "Copy details", "Download .txt" and "Open a bug report" for Admin > System. */
export function SystemDetailsActions({ text, filename, bugHref }: { text: string; filename: string; bugHref: string | null }) {
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);
  const t = useTranslations("admin.systemActions");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("yes");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied(null), 3000);
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={copy} data-help={t("copyHelp")}>
          {copied === "yes" ? <Check size={15} /> : <Copy size={15} />} {t("copy")}
        </button>
        <button type="button" className="btn-ghost" onClick={download} data-help={t("downloadHelp")}>
          <Download size={15} /> {t("download")}
        </button>
        {bugHref && (
          <a className="btn-ghost" href={bugHref} target="_blank" rel="noopener noreferrer" data-help={t("bugHelp")}>
            <Bug size={15} /> {t("bug")}
          </a>
        )}
      </div>
      <p role="status" className="mt-2 text-xs text-surface-400">
        {copied === "yes" ? t("copied") : copied === "failed" ? t("copyFailed") : ""}
      </p>
    </div>
  );
}

type Mode = "report" | "apply" | "off";

const MODES: Mode[] = ["report", "apply", "off"];

/** Choose whether the nightly clean-up deletes anything, and run it now. */
export function MaintenanceControls({ mode: initial, fromEnv }: { mode: Mode; fromEnv: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initial);
  const [busy, setBusy] = useState<"save" | "run" | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const t = useTranslations("admin.systemActions");
  const tc = useTranslations("common");

  async function call(method: "PUT" | "POST", body?: unknown) {
    setBusy(method === "PUT" ? "save" : "run");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 202) throw new Error(data.error || t("failed"));
      setMessage({
        tone: "ok",
        text: method === "PUT" ? tc("saved") : res.status === 202 ? t("started") : t("done"),
      });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : t("network") });
    } finally {
      setBusy(null);
    }
  }

  function save() {
    if (mode === "apply" && initial !== "apply" && !confirm(t("applyConfirm"))) return;
    void call("PUT", { mode });
  }

  return (
    <div>
      <fieldset className="space-y-2 text-sm">
        <legend className="label">{t("modeLegend")}</legend>
        {MODES.map((m) => (
          <label key={m} className="flex cursor-pointer items-start gap-2">
            <input type="radio" name="maintenance-mode" className="mt-1" value={m} checked={mode === m} onChange={() => setMode(m)} />
            <span>
              {t(`mode.${m}`)}
              <span className="block text-xs text-surface-400">{t(`modeHelp.${m}`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {fromEnv && <p className="mt-2 text-xs text-surface-400">{t("fromEnv")}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={busy !== null || mode === initial} onClick={save}>
          {busy === "save" && <Loader2 size={14} className="animate-spin" />} {tc("save")}
        </button>
        <button type="button" className="btn-ghost" disabled={busy !== null} onClick={() => void call("POST")} data-help={initial === "apply" ? t("runHelp") : t("checkHelp")}>
          {busy === "run" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} {initial === "apply" ? t("run") : t("check")}
        </button>
      </div>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`mt-2 text-sm ${message.tone === "error" ? "text-red-300" : "text-emerald-300"}`}>{message.text}</p>}
    </div>
  );
}
