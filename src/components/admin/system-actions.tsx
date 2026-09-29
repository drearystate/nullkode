"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bug, Check, Copy, Download, Loader2, Play } from "lucide-react";

/** "Copy details", "Download .txt" and "Open a bug report" for Admin > System. */
export function SystemDetailsActions({ text, filename, bugHref }: { text: string; filename: string; bugHref: string | null }) {
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);

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
        <button type="button" className="btn-ghost" onClick={copy} data-help="Copies this page's checks, setting names and recent errors, with private data hidden, so you can paste them into a message to whoever supports you.">
          {copied === "yes" ? <Check size={15} /> : <Copy size={15} />} Copy details
        </button>
        <button type="button" className="btn-ghost" onClick={download} data-help="Saves the same details as a text file you can attach to a support request.">
          <Download size={15} /> Download .txt
        </button>
        {bugHref && (
          <a className="btn-ghost" href={bugHref} target="_blank" rel="noopener noreferrer" data-help="Opens a new bug report for the platform's developers, with your version filled in. Paste the copied details into it and read them over before posting.">
            <Bug size={15} /> Open a bug report
          </a>
        )}
      </div>
      <p role="status" className="mt-2 text-xs text-surface-400">
        {copied === "yes" ? "Copied. Paste it into your message or bug report." : copied === "failed" ? "Couldn't copy. Use Download .txt instead." : ""}
      </p>
    </div>
  );
}

type Mode = "report" | "apply" | "off";

const MODES: Array<{ value: Mode; label: string; help: string }> = [
  { value: "report", label: "Report only", help: "Each night, count what could be removed. Nothing is deleted." },
  { value: "apply", label: "Remove old records", help: "Each night, delete what the rules below allow. Deleted records can't be brought back." },
  { value: "off", label: "Off", help: "Don't check or remove anything." },
];

/** Choose whether the nightly clean-up deletes anything, and run it now. */
export function MaintenanceControls({ mode: initial, fromEnv }: { mode: Mode; fromEnv: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initial);
  const [busy, setBusy] = useState<"save" | "run" | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

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
      if (!res.ok && res.status !== 202) throw new Error(data.error || "That didn't work. Please try again.");
      setMessage({
        tone: "ok",
        text: method === "PUT" ? "Saved." : res.status === 202 ? "Started. It's still working; refresh this page in a few minutes to see the result." : "Done. The result is shown above.",
      });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Check your connection and try again." });
    } finally {
      setBusy(null);
    }
  }

  function save() {
    if (mode === "apply" && initial !== "apply" && !confirm("Turn on nightly clean-up? Old run logs, expired sign-ins, old published versions and deleted apps' files older than a week will be removed for good. Take a backup first if you want to keep them.")) return;
    void call("PUT", { mode });
  }

  return (
    <div>
      <fieldset className="space-y-2 text-sm">
        <legend className="label">What the nightly clean-up does</legend>
        {MODES.map((m) => (
          <label key={m.value} className="flex cursor-pointer items-start gap-2">
            <input type="radio" name="maintenance-mode" className="mt-1" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} />
            <span>
              {m.label}
              <span className="block text-xs text-surface-400">{m.help}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {fromEnv && <p className="mt-2 text-xs text-surface-400">Currently set by NK_MAINTENANCE in the server&apos;s .env file. Saving here overrides it.</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={busy !== null || mode === initial} onClick={save}>
          {busy === "save" && <Loader2 size={14} className="animate-spin" />} Save
        </button>
        <button type="button" className="btn-ghost" disabled={busy !== null} onClick={() => void call("POST")} data-help={initial === "apply" ? "Runs the clean-up right away. Old records it finds are removed for good." : "Counts what the clean-up would remove, without deleting anything."}>
          {busy === "run" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} {initial === "apply" ? "Run clean-up now" : "Check now"}
        </button>
      </div>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`mt-2 text-sm ${message.tone === "error" ? "text-red-300" : "text-emerald-300"}`}>{message.text}</p>}
    </div>
  );
}
