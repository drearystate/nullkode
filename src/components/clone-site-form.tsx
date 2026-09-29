"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  onBack: () => void;
};

type Status =
  | { kind: "idle" }
  | { kind: "cloning"; messages: string[]; pageCount: number };

type CloneEvent =
  | { type: "progress"; message: string; pageCount?: number }
  | { type: "done"; projectId: string; homePageId: string }
  | { type: "error"; message: string };

export function CloneSiteForm({ onBack }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [status]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function stop() {
    abortRef.current?.abort();
    setStatus({ kind: "idle" });
    setError("Stopped. Nothing was saved.");
  }

  async function submit() {
    let target = url.trim();
    if (!target) return;
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = "https://" + target;
    }
    try {
      new URL(target);
    } catch {
      setError("That doesn't look like a web address. Try something like mybusiness.com");
      return;
    }

    setStatus({ kind: "cloning", messages: [`Connecting to ${target}…`], pageCount: 0 });
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/clone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: target }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "We couldn't start copying that site. Please try again.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const trimmed = chunk.trim();
          if (!trimmed.startsWith("data:")) continue;
          let ev: CloneEvent;
          try {
            ev = JSON.parse(trimmed.slice(5).trim()) as CloneEvent;
          } catch {
            continue;
          }
          if (ev.type === "progress") {
            const message = ev.message;
            setStatus((s) => ({
              kind: "cloning",
              messages: s.kind === "cloning" ? [...s.messages, message] : [message],
              pageCount: ev.type === "progress" && ev.pageCount !== undefined ? ev.pageCount : s.kind === "cloning" ? s.pageCount : 0,
            }));
          } else if (ev.type === "done") {
            router.push(`/projects/${ev.projectId}/pages/${ev.homePageId}/edit?welcome=1`);
            return;
          } else if (ev.type === "error") {
            throw new Error(ev.message);
          }
        }
      }
      throw new Error("The copy stopped before it finished. Please try again.");
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(friendly(err instanceof Error ? err.message : ""));
      setStatus({ kind: "idle" });
    }
  }

  const cloning = status.kind === "cloning";

  return (
    <div className="relative mx-auto max-w-lg px-6 py-16 md:py-24">
      <div className="pointer-events-none absolute -inset-20 bg-gradient-to-br from-orange-700/20 via-transparent to-brand-500/10 blur-3xl" />

      <div className="relative">
        <button
          onClick={onBack}
          disabled={cloning}
          className="text-sm text-surface-400 hover:text-white transition mb-6 inline-flex items-center gap-1 disabled:opacity-30"
        >
          ← Back
        </button>

        <div className="card p-8">
          <h2 className="text-2xl font-bold mb-2">Copy your website</h2>
          <p className="text-sm text-surface-400 mb-6">
            Brings up to 30 pages of your site, with their pictures and styles, into an app you can edit here. Only copy sites you own or have permission to use.
          </p>

          {error && (
            <div role="alert" className="mb-4 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          {!cloning && (
            <>
              <label htmlFor="clone-url" className="label">Your website&apos;s address</label>
              <input
                id="clone-url"
                data-help="The address of the website to copy, like mybusiness.com. You don't need to type https://."
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder="mybusiness.com"
                className="w-full bg-surface-950 border border-surface-700 rounded-lg px-4 py-3 text-base text-surface-50 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 mb-4"
                autoFocus
              />
              <button
                onClick={submit}
                data-help="Starts copying the site into a new app. It can take a minute; the editor opens by itself when it's done."
                disabled={!url.trim()}
                className="btn-primary w-full py-3 disabled:opacity-40"
              >
                Copy my site
              </button>
            </>
          )}

          {cloning && (
            <>
              <div className="flex items-center gap-3 mb-3" role="status" aria-live="polite">
                <div className="relative h-5 w-5">
                  <div className="absolute inset-0 rounded-full border-2 border-brand-500/30" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-400 animate-spin" />
                </div>
                <span className="text-sm font-semibold">
                  Copying{status.pageCount > 0 ? ` (${status.pageCount} page${status.pageCount === 1 ? "" : "s"})` : "…"}
                </span>
              </div>
              <div
                ref={messagesRef}
                className="bg-surface-950 border border-surface-800 rounded-lg p-3 text-xs space-y-1 max-h-72 overflow-y-auto"
              >
                {status.messages.map((m, i) => (
                  <div key={i} className="text-surface-300">{m}</div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[11px] text-surface-500 leading-relaxed">We&apos;ll open the editor when it&apos;s done.</p>
                <button type="button" onClick={stop} data-help="Stop copying. Nothing is saved, so you can try again with a different address." className="btn-ghost text-sm">Stop</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Network jargon → something a person can act on. */
function friendly(message: string): string {
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo|not resolve|fetch failed|Private network/i.test(message)) {
    return "We couldn't reach that address. Check the spelling and that the site is online, then try again.";
  }
  if (/No pages could be cloned/i.test(message)) return "We reached the site but couldn't copy any pages from it.";
  return message || "Something went wrong while copying. Please try again.";
}
