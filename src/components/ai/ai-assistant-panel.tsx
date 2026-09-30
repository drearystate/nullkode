"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "grapesjs";
import { Sparkles } from "lucide-react";

type Attachment = {
  id: string;
  name: string;
  mediaType: string;
  size: number;
  dataUrl: string;
};

type Message =
  | { role: "user"; text: string; attachments?: Array<{ name: string; mediaType: string }> }
  /** "info": the AI answered but changed nothing (no check mark, not an error). */
  | { role: "assistant"; text: string; status: "ok" | "error" | "info"; suggestions?: string[]; upgrade?: boolean }
  | { role: "assistant-plan"; text: string }
  | { role: "assistant-thinking"; label: string }
  /** Shown after two failures in a row: ways out of the loop. */
  | { role: "assistant-tip" };

/** This month's AI allowance, from /api/me/ai-usage and the AI routes. */
type Usage = {
  used: number;
  limit: number | null;
  paused: boolean;
  problem: string | null;
  contact: string | null;
  scope: "plan" | "workspace";
};

/** An AI request that failed, with what the server said about it. */
class AiRequestError extends Error {
  constructor(message: string, readonly quota: boolean) {
    super(message);
  }
}

/**
 * Cheap client-side intent detection. We only need to catch the obvious
 * "fill the database with sample rows" case so it can hit the fast
 * /api/ai/seed-data endpoint (~5s) instead of the full edit-page route
 * (~20-40s). Anything ambiguous falls through to edit-page.
 */
function detectSeedIntent(msg: string): boolean {
  const s = msg.toLowerCase();
  // Require both a "sample-like" word AND a "data/rows/records-like" target
  // so phrases like "add an example image" don't match.
  const SAMPLE = /\b(sample|seed|test|dummy|fake|demo|example|placeholder|mock)\b/;
  const TARGET = /\b(data|rows?|records?|entries|items|content|values?)\b/;
  // Also catch direct verbs that mean the same thing.
  const DIRECT = /\b(populate|seed)\s+(the\s+)?(database|tables?|db)\b/;
  return DIRECT.test(s) || (SAMPLE.test(s) && TARGET.test(s));
}

const MAX_FILES = 4;
const MAX_BYTES_PER_FILE = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
// PDFs are deliberately not accepted: the Claude CLI silently drops PDF
// document blocks, and there is no cross-provider fallback. Rejecting at
// upload beats the AI silently ignoring an attachment.
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

type Props = {
  projectId: string;
  pageId: string;
  pageTitle: string;
  getEditor: () => Editor | null;
};

const QUICK_SUGGESTIONS = [
  "Make the heading bigger",
  "Change the background to dark",
  "Add a call-to-action button",
  "Make it look friendlier",
  "Add a pricing section",
];

export function AiAssistantPanel({ projectId, pageId, pageTitle, getEditor }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  // Failed or no-change answers in a row; two in a row shows a tip.
  const failStreak = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Tracks the page currently shown in the editor, so an in-flight AI
  // response can tell whether it still belongs on the visible canvas.
  const pageIdRef = useRef(pageId);

  // What's selected on the canvas: when a section is selected, Ask AI edits
  // just that section (faster, cheaper, and safe on small models).
  const [selection, setSelection] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const ed = getEditor();
      const sel = ed?.getSelected();
      const label = !ed || !sel || sel === ed.getWrapper() ? null : (sel.getName?.() || String(sel.get("tagName") || "section"));
      setSelection((cur) => (cur === label ? cur : label));
    };
    tick();
    const t = setInterval(tick, 800);
    return () => clearInterval(t);
  }, [getEditor]);

  // Reset chat when the active page changes
  useEffect(() => {
    pageIdRef.current = pageId;
    failStreak.current = 0;
    setMessages([]);
    setInput("");
    setAttachments([]);
    setAttachError(null);
  }, [pageId]);

  // The allowance line under the input: loaded when the panel opens, then
  // kept current from each AI answer.
  const refreshUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/me/ai-usage", { cache: "no-store" });
      if (res.ok) setUsage((await res.json()) as Usage);
    } catch {
      /* keep the last known numbers */
    }
  }, []);
  useEffect(() => {
    if (open) void refreshUsage();
  }, [open, refreshUsage]);

  async function addFiles(files: FileList | File[]) {
    setAttachError(null);
    const incoming = Array.from(files);
    const next: Attachment[] = [...attachments];
    let total = next.reduce((s, a) => s + a.size, 0);
    for (const f of incoming) {
      if (next.length >= MAX_FILES) {
        setAttachError(`Max ${MAX_FILES} files`);
        break;
      }
      if (!ACCEPT.split(",").includes(f.type)) {
        setAttachError(`${f.name}: unsupported type`);
        continue;
      }
      if (f.size > MAX_BYTES_PER_FILE) {
        setAttachError(`${f.name}: over ${formatBytes(MAX_BYTES_PER_FILE)}`);
        continue;
      }
      if (total + f.size > MAX_TOTAL_BYTES) {
        setAttachError(`Total over ${formatBytes(MAX_TOTAL_BYTES)}`);
        break;
      }
      try {
        const dataUrl = await readAsDataUrl(f);
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: f.name,
          mediaType: f.type,
          size: f.size,
          dataUrl,
        });
        total += f.size;
      } catch {
        setAttachError(`${f.name}: read failed`);
      }
    }
    setAttachments(next);
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if ((!msg && attachments.length === 0) || busy) return;
    const editor = getEditor();
    if (!editor) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "The editor is still loading — give it a second and try again.",
          status: "error",
        },
      ]);
      return;
    }

    const sentPageId = pageId;
    const sentPageTitle = pageTitle;
    const sentAttachments = attachments;
    // Snapshot of the chat before this message — gives the stateless edit
    // endpoint enough context to handle follow-ups ("did you…?", "undo that").
    const sentHistory = messages
      .filter(
        (m): m is Extract<Message, { role: "user" | "assistant" }> =>
          m.role === "user" || m.role === "assistant"
      )
      .slice(-8)
      .map((m) => ({ role: m.role, text: m.text.slice(0, 2000) }));
    setInput("");
    setAttachments([]);
    setAttachError(null);
    setBusy(true);

    // Pick the fast seed-data path for obvious "add sample data" asks.
    // No attachments → we don't need vision; route stays cheap.
    const isSeed =
      sentAttachments.length === 0 && msg.length > 0 && detectSeedIntent(msg);
    const selectedComp = !isSeed && sentAttachments.length === 0 ? editor.getSelected() : undefined;
    const scopedComp = selectedComp && selectedComp !== editor.getWrapper() ? selectedComp : undefined;
    const thinkingLabel = isSeed
      ? "Generating sample data…"
      : scopedComp ? "Updating the selected section…" : "Working on it…";

    // For seed we already know exactly what we're doing — skip the LLM
    // ack call entirely and show a canned, instant plan. For general
    // edits we fire /api/ai/plan in parallel with the real work below.
    const cannedPlan = isSeed
      ? "I'll generate realistic sample rows for every table and insert them."
      : null;

    setMessages((m) => [
      ...m,
      {
        role: "user",
        text: msg,
        attachments: sentAttachments.map((a) => ({
          name: a.name,
          mediaType: a.mediaType,
        })),
      },
      ...(cannedPlan
        ? ([{ role: "assistant-plan", text: cannedPlan }] as Message[])
        : []),
      { role: "assistant-thinking", label: thinkingLabel },
    ]);

    // Fire the plan call in parallel with the real work so the user sees
    // an acknowledgement in ~1-2s while the longer edit/seed call runs.
    // Failure is silent — the thinking label is shown until the real
    // response lands.
    if (!cannedPlan && msg) {
      void (async () => {
        try {
          const planRes = await fetch("/api/ai/plan", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              message: msg,
              pageTitle,
              hasAttachments: sentAttachments.length > 0,
            }),
          });
          if (!planRes.ok) return;
          const { plan } = (await planRes.json()) as { plan?: string };
          if (!plan) return;
          // Insert the plan ack right before the thinking placeholder, but
          // only if the thinking placeholder is still there (i.e. the real
          // work hasn't already finished and replaced it).
          setMessages((current) => {
            const lastIdx = current.length - 1;
            if (lastIdx < 0) return current;
            if (current[lastIdx].role !== "assistant-thinking") return current;
            const before = current.slice(0, lastIdx);
            const thinking = current[lastIdx];
            return [...before, { role: "assistant-plan", text: plan }, thinking];
          });
        } catch {
          /* ignore */
        }
      })();
    }

    try {
      const currentHtml = editor.getHtml();
      const currentCss = editor.getCss() ?? "";

      const res = isSeed
        ? await fetch("/api/ai/seed-data", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ projectId, message: msg }),
          })
        : scopedComp
        ? await fetch("/api/ai/edit-section", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ projectId, pageId, message: msg, sectionHtml: scopedComp.toHTML(), history: sentHistory }),
          })
        : await fetch("/api/ai/edit-page", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              projectId,
              pageId,
              message: msg || "(see attached files)",
              currentHtml,
              currentCss,
              history: sentHistory,
              attachments: sentAttachments.map((a) => ({
                name: a.name,
                mediaType: a.mediaType,
                dataUrl: a.dataUrl,
              })),
            }),
          });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string; refunded?: boolean; usage?: Usage | null };
        if (data.usage) setUsage(data.usage);
        else void refreshUsage();
        let text = data.error ?? `Error ${res.status}`;
        if (data.refunded && !/didn't count|wasn't counted/i.test(text)) text += " This one didn't count.";
        throw new AiRequestError(text, data.code === "ai_quota");
      }

      const {
        html,
        css,
        explanation,
        createdTables = [],
        createdFlowSlugs = [],
        updatedPages = [],
        suggestions = [],
        noChange = false,
        usage: nextUsage,
      } = (await res.json()) as {
        html: string | null;
        css: string | null;
        explanation: string;
        createdTables?: string[];
        createdFlowSlugs?: string[];
        updatedPages?: Array<{ slug: string; id: string }>;
        suggestions?: string[];
        noChange?: boolean;
        usage?: Usage | null;
      };
      if (nextUsage) setUsage(nextUsage);
      else void refreshUsage();

      // The seed-data fast path returns html/css = null because it doesn't
      // touch the page. Leaving the canvas alone is the whole point —
      // calling setComponents("") would blank the editor.
      //
      // Re-resolve the editor at apply time: the send-time instance is
      // destroyed if the user switched page tabs while the AI worked
      // (GrapesEditor remounts per tab), and calling setComponents on a
      // destroyed instance throws. The server already persisted the edit,
      // so when the canvas can't be painted we just tell the user instead
      // of losing the work.
      let appliedToCanvas = false;
      if (html !== null && html !== undefined) {
        const liveEditor =
          pageIdRef.current === sentPageId ? getEditor() : null;
        if (liveEditor) {
          try {
            if (scopedComp) {
              // Swap only the selected section; the editor's autosave keeps it.
              const added = scopedComp.replaceWith(html);
              if (css) liveEditor.Css.addRules(css);
              const first = Array.isArray(added) ? added[0] : added;
              if (first) liveEditor.select(first);
            } else {
              liveEditor.setComponents(html);
              liveEditor.setStyle(css ?? "");
            }
            appliedToCanvas = true;
          } catch {
            // Editor mid-teardown — the edit is saved; it shows on reload.
          }
        }
      }

      // Surface any backend work the AI did, so users understand that a
      // "feature" request actually wired tables + flows behind the scenes.
      const wiredBits: string[] = [];
      if (createdTables.length > 0) {
        wiredBits.push(
          `${createdTables.length} ${createdTables.length === 1 ? "table" : "tables"}`
        );
      }
      if (createdFlowSlugs.length > 0) {
        wiredBits.push(
          `${createdFlowSlugs.length} ${createdFlowSlugs.length === 1 ? "flow" : "flows"}`
        );
      }
      const alsoDid: string[] = [];
      if (wiredBits.length > 0) alsoDid.push(`created ${wiredBits.join(", ")}`);
      if (updatedPages.length > 0) {
        alsoDid.push(
          updatedPages.length === 1
            ? `updated the "${updatedPages[0].slug}" page`
            : `updated ${updatedPages.length} other pages`
        );
      }
      let summary =
        alsoDid.length > 0
          ? `${explanation} (Also ${alsoDid.join(" and ")}.)`
          : explanation;
      if (html !== null && html !== undefined && !appliedToCanvas) {
        summary += ` (Saved to "${sentPageTitle}" — open that page to see the change.)`;
      }

      // An answer that changed nothing counts toward the "stuck" tip.
      failStreak.current = noChange ? failStreak.current + 1 : 0;
      const tip = noChange && failStreak.current === 2;
      setMessages((m) => {
        const next = m.slice(0, -1); // drop the thinking placeholder
        return [
          ...next,
          noChange
            ? { role: "assistant", text: summary, status: "info" }
            : { role: "assistant", text: summary, status: "ok", suggestions },
          ...(tip ? ([{ role: "assistant-tip" }] as Message[]) : []),
        ];
      });
    } catch (err) {
      const quota = err instanceof AiRequestError && err.quota;
      failStreak.current += 1;
      const tip = !quota && failStreak.current === 2;
      setMessages((m) => {
        const next = m.slice(0, -1);
        return [
          ...next,
          {
            role: "assistant",
            text: err instanceof Error ? err.message : "Something went wrong",
            status: "error",
            upgrade: quota,
          },
          ...(tip ? ([{ role: "assistant-tip" }] as Message[]) : []),
        ];
      });
    } finally {
      setBusy(false);
    }
  }

  function undoLast() {
    const ed = getEditor();
    try {
      if (ed?.UndoManager.hasUndo()) ed.UndoManager.undo();
    } catch {
      /* editor mid-teardown */
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        data-help="Your AI helper. Tell it what you want in normal words — like 'make the title bigger' — and it changes the page for you."
        className="fixed bottom-6 right-6 z-50 rounded-full bg-gradient-to-br from-brand-400 via-brand-600 to-brand-800 text-fixed-white [[data-theme=light]_&]:from-brand-600 [[data-theme=light]_&]:via-brand-400 [[data-theme=light]_&]:to-brand-200 px-5 py-3 shadow-2xl shadow-brand-700/50 hover:scale-105 transition flex items-center gap-2 font-semibold"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Sparkles size={20} aria-hidden />
        Ask AI
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[min(420px,calc(100vw-32px))] h-[min(640px,calc(100vh-64px))] rounded-2xl border border-surface-700 bg-surface-900/95 backdrop-blur-xl shadow-2xl shadow-black/80 [[data-theme=light]_&]:shadow-black/20 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800 bg-gradient-to-r from-brand-900/30 to-transparent">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-surface-950 ring-1 ring-surface-700 flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <Sparkles size={24} aria-hidden className="text-brand-300" />
          </div>
          <div>
            <div className="font-semibold text-sm">AI Assistant</div>
            <div className="text-[11px] text-surface-400 truncate max-w-[220px]">
              Editing: {pageTitle}
            </div>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-surface-400 hover:text-white text-xl leading-none"
          title="Minimize"
          aria-label="Minimize"
          data-help="Shrink the AI helper back to its button. Your chat stays here while this page is open."
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-surface-300 font-medium">
              Tell me what to change about this page.
            </p>
            <p className="text-xs text-surface-500 mt-1">
              I&apos;ll apply it right in the editor — or name another page
              (&quot;on the about page…&quot;) and I&apos;ll edit that one.
            </p>
            <div className="mt-5 space-y-1.5">
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={busy}
                  data-help="Send this request to the AI right away. It changes the page in the editor."
                  className="block w-full text-left text-xs bg-surface-800/60 hover:bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-surface-200 transition disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          if (m.role === "user") {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 text-fixed-white [[data-theme=light]_&]:bg-brand-400 px-4 py-2 text-sm">
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="mb-1.5 flex flex-wrap gap-1">
                      {m.attachments.map((a, j) => (
                        <span
                          key={j}
                          className="inline-flex items-center gap-1 rounded bg-brand-700/60 [[data-theme=light]_&]:bg-brand-300/60 px-1.5 py-0.5 text-[10px]"
                          title={a.name}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          <span className="max-w-[120px] truncate">{a.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {m.text}
                </div>
              </div>
            );
          }
          if (m.role === "assistant-plan") {
            return (
              <div key={i} className="flex">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-brand-900/30 border border-brand-700/40 text-surface-100 px-4 py-2 text-sm">
                  {m.text}
                </div>
              </div>
            );
          }
          if (m.role === "assistant-thinking") {
            return (
              <div key={i} className="flex">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-surface-800 text-surface-200 px-4 py-3 text-sm flex items-center gap-2">
                  <Dot />
                  <Dot delay={150} />
                  <Dot delay={300} />
                  <span className="ml-1 text-xs text-surface-400">{m.label}</span>
                </div>
              </div>
            );
          }
          if (m.role === "assistant-tip") {
            return (
              <div key={i} className="flex">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm text-amber-100">
                  <p>This doesn&apos;t seem to be working. You could:</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
                    <li>say it another way, in a few simple words</li>
                    <li>select a smaller part of the page first, then ask again</li>
                    <li>undo the last change if the page looks wrong</li>
                  </ul>
                  <button type="button" onClick={undoLast} data-help="Undo the most recent change in the editor, in case the page now looks wrong." className="mt-2 rounded-md border border-amber-300/40 px-2 py-1 text-xs hover:bg-amber-300/10">
                    Undo last change
                  </button>
                </div>
              </div>
            );
          }
          // assistant complete
          const isLast = i === messages.length - 1;
          const showSuggestions =
            isLast &&
            m.status === "ok" &&
            m.suggestions &&
            m.suggestions.length > 0;
          return (
            <div key={i} className="flex flex-col items-start gap-2">
              <div
                className={`max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-2 text-sm ${
                  m.status === "ok"
                    ? "bg-surface-800 text-surface-100"
                    : m.status === "info"
                      ? "bg-surface-800 border border-surface-600 text-surface-200"
                      : "bg-red-500/10 border border-red-500/30 text-red-300"
                }`}
              >
                {m.status === "ok" && <span className="mr-1">✓</span>}
                {m.text}
                {m.upgrade && canUpgrade(usage) && (
                  <a href="/billing" className="ml-1 underline hover:text-red-100" data-help="Compare plans that include more AI actions each month.">See plans</a>
                )}
              </div>
              {showSuggestions && (
                <div className="w-full space-y-1.5 pl-1">
                  <div className="text-[10px] uppercase tracking-wide text-surface-500">
                    Suggested next steps
                  </div>
                  {m.suggestions!.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      disabled={busy}
                      data-help="An idea for what to do next. Click to send it to the AI as your next request."
                      className="block w-full text-left text-xs bg-surface-800/40 hover:bg-surface-800 border border-surface-700 hover:border-brand-500/60 rounded-lg px-3 py-2 text-surface-200 transition disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div
        className="border-t border-surface-800 p-3 bg-surface-950/60"
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
        }}
      >
        {selection && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-brand-500/30 bg-brand-500/10 px-2 py-1.5 text-xs text-brand-100">
            <span className="truncate">Changes apply to the selected <strong>{selection}</strong></span>
            <button type="button" className="shrink-0 text-surface-300 underline hover:text-white" onClick={() => getEditor()?.select([])} data-help="Unselect the part you picked, so the AI can change anything on the whole page.">Whole page instead</button>
          </div>
        )}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((a) => (
              <div
                key={a.id}
                className="group relative flex items-center gap-1.5 rounded-md border border-surface-700 bg-surface-900 px-2 py-1 text-xs text-surface-200"
                title={`${a.name} · ${formatBytes(a.size)}`}
              >
                {a.mediaType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.dataUrl}
                    alt=""
                    className="h-6 w-6 rounded object-cover"
                  />
                ) : (
                  <span className="text-[10px] uppercase text-surface-500">file</span>
                )}
                <span className="max-w-[140px] truncate">{a.name}</span>
                <span className="text-[10px] text-surface-500">
                  {formatBytes(a.size)}
                </span>
                <button
                  onClick={() =>
                    setAttachments((a0) => a0.filter((x) => x.id !== a.id))
                  }
                  className="ml-1 text-surface-500 hover:text-white"
                  title="Remove"
                  aria-label={`Remove ${a.name}`}
                  data-help="Remove this picture so it isn't sent with your message."
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {attachError && (
          <div className="mb-2 text-[11px] text-red-400">{attachError}</div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || attachments.length >= MAX_FILES}
            className="shrink-0 h-9 w-9 rounded-lg border border-surface-700 bg-surface-900 text-surface-300 hover:text-white hover:border-surface-600 disabled:opacity-40 flex items-center justify-center"
            title="Attach images"
            aria-label="Attach files"
            data-help="Attach a picture to show the helper what you mean — like a screenshot of a design you want to copy."
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.99 8.8l-8.57 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={(e) => {
              const files = Array.from(e.clipboardData.files);
              if (files.length > 0) {
                e.preventDefault();
                addFiles(files);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Tell me what to change..."
            data-help="Type what you want changed, in your own words. Press Enter to send it."
            rows={1}
            disabled={busy}
            className="flex-1 bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-50 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 resize-none max-h-32 disabled:opacity-50"
          />
          <button
            onClick={() => send()}
            disabled={busy || (!input.trim() && attachments.length === 0)}
            data-help="Send your request, and any pictures you attached, to the AI. It makes the change for you."
            className="btn-primary disabled:opacity-40 shrink-0"
          >
            {busy ? "..." : "Send"}
          </button>
        </div>
        <div className="mt-1.5 text-[10px] text-surface-500 text-center">
          Enter to send · Attach images for context (drop or paste)
        </div>
        <UsageLine usage={usage} />
      </div>
    </div>
  );
}

/**
 * "38 of 50 AI changes left this month": amber once 80% is used; when none
 * are left (or AI is paused) it says why and where to get more.
 */
function UsageLine({ usage }: { usage: Usage | null }) {
  if (!usage || usage.limit === null) return null;
  const left = Math.max(0, usage.limit - usage.used);
  const shared = usage.scope === "workspace" ? " (shared with your clients)" : "";
  if (usage.paused || left === 0) {
    return (
      <div className="mt-1 text-center text-[11px] text-red-300" role="status" data-help="You can't send more AI requests right now. You can still edit the page yourself in the editor.">
        {usage.problem ?? `No AI actions left this month${shared}.`}
        {canUpgrade(usage) && (
          <>
            {" "}
            <a href="/billing" className="underline hover:text-red-100">See plans</a>
          </>
        )}
      </div>
    );
  }
  const low = usage.used >= usage.limit * 0.8;
  return (
    <div className={`mt-1 text-center text-[11px] ${low ? "text-amber-300" : "text-surface-500"}`} role="status" data-help="How many more requests you can send to the AI this month. The count starts again next month.">
      {left} of {usage.limit} AI actions left this month{shared}
      {low ? (usage.contact ? ` — ask ${usage.contact} if you need more` : " — running low") : ""}
    </div>
  );
}

/** A plan with more AI changes can be bought (the plan's own allowance ran out, not a workspace cap). */
function canUpgrade(usage: Usage | null): boolean {
  return Boolean(usage && usage.scope === "plan" && usage.limit !== null && usage.used >= usage.limit);
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full bg-surface-500 animate-bounce"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
