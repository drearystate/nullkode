"use client";
import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CheckCircle2, KeyRound, Loader2, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";

type ProviderId = "openai" | "anthropic" | "xai" | "gemini" | "openrouter" | "custom";
type Provider = { id: ProviderId; baseUrl: string | null; can: { chat: boolean; vision: boolean; embed: boolean; speech: boolean }; example: { model: string; embed?: string; speech?: string; voice?: string } };
export type ConnectionView = {
  id: string;
  name: string;
  provider: ProviderId;
  baseUrl: string | null;
  keyHint: string;
  model: string;
  chatModel: string | null;
  visionModel: string | null;
  speechModel: string | null;
  voice: string | null;
  embedModel: string | null;
  isDefault: boolean;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastError: string | null;
};
type Status = { usesAi: boolean; hasKey: boolean; platformOwner: boolean; needsKey: boolean };
type Limits = { perHour: number; perVisitorHour: number };
type TestResult = { ok: boolean; code: string; message: string };

type Draft = {
  editing: string | null;
  name: string;
  provider: ProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  chatModel: string;
  visionModel: string;
  speechModel: string;
  voice: string;
  embedModel: string;
  isDefault: boolean;
};

const empty = (provider: ProviderId = "openai"): Draft => ({ editing: null, name: "default", provider, baseUrl: "", apiKey: "", model: "", chatModel: "", visionModel: "", speechModel: "", voice: "", embedModel: "", isDefault: false });

/** The AI keys screen: the app's own AI connections, a test button and the abuse limits. Keys are write-only. */
export function AiKeysPanel(props: { projectId: string; providers: Provider[]; connections: ConnectionView[]; status: Status; limits: Limits }) {
  const t = useTranslations("aiKeys");
  const format = useFormatter();
  const [connections, setConnections] = useState(props.connections);
  const [status, setStatus] = useState(props.status);
  const [draft, setDraft] = useState<Draft | null>(props.connections.length ? null : empty());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<string, TestResult>>({});
  const [limits, setLimits] = useState(props.limits);
  const [limitsNote, setLimitsNote] = useState<string | null>(null);
  const base = `/api/projects/${props.projectId}/ai-keys`;
  const provider = (id: ProviderId) => props.providers.find((p) => p.id === id)!;

  async function call(path: string, method: string, body?: unknown) {
    const res = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || t("errors.network"));
    return json;
  }

  async function reload() {
    const j = await call(base, "GET");
    setConnections(j.connections);
    setStatus(j.status);
  }

  function testText(r: TestResult) {
    const known = ["ok", "key", "model", "quota", "timeout", "private", "unreadable", "other"].includes(r.code) ? r.code : "other";
    return r.ok || known === "unreadable" || known === "private" ? t(`test.${known}`) : `${t(`test.${known}`)} ${t("test.detail", { detail: r.message })}`;
  }

  async function save() {
    if (!draft) return;
    setBusy("save");
    setError(null);
    try {
      await call(base, "POST", {
        name: draft.name,
        provider: draft.provider,
        baseUrl: draft.baseUrl || null,
        apiKey: draft.apiKey || null,
        model: draft.model,
        chatModel: draft.chatModel || null,
        visionModel: draft.visionModel || null,
        speechModel: draft.speechModel || null,
        voice: draft.voice || null,
        embedModel: draft.embedModel || null,
        isDefault: draft.isDefault,
      });
      setDraft(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.saveFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function test(id: string) {
    setBusy(`test:${id}`);
    try {
      const r = (await call(`${base}/test`, "POST", { id })) as TestResult;
      setTests((x) => ({ ...x, [id]: r }));
      await reload();
    } catch (e) {
      setTests((x) => ({ ...x, [id]: { ok: false, code: "other", message: e instanceof Error ? e.message : "" } }));
    } finally {
      setBusy(null);
    }
  }

  async function testDraft() {
    if (!draft) return;
    setBusy("test:draft");
    try {
      const r = draft.apiKey
        ? ((await call(`${base}/test`, "POST", { provider: draft.provider, baseUrl: draft.baseUrl || null, apiKey: draft.apiKey, model: draft.model, embedModel: draft.embedModel || null })) as TestResult)
        : draft.editing
          ? ((await call(`${base}/test`, "POST", { id: draft.editing })) as TestResult)
          : { ok: false, code: "other", message: t("errors.keyMissing") };
      setTests((x) => ({ ...x, draft: r }));
    } catch (e) {
      setTests((x) => ({ ...x, draft: { ok: false, code: "other", message: e instanceof Error ? e.message : "" } }));
    } finally {
      setBusy(null);
    }
  }

  async function remove(c: ConnectionView) {
    if (!confirm(t("list.removeConfirm", { name: c.name }))) return;
    setBusy(`remove:${c.id}`);
    try {
      await call(base, "DELETE", { id: c.id });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.saveFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function makeDefault(c: ConnectionView) {
    setBusy(`default:${c.id}`);
    try {
      await call(base, "POST", { name: c.name, provider: c.provider, baseUrl: c.baseUrl, model: c.model, chatModel: c.chatModel, visionModel: c.visionModel, speechModel: c.speechModel, voice: c.voice, embedModel: c.embedModel, isDefault: true });
      await reload();
    } finally {
      setBusy(null);
    }
  }

  async function saveLimits() {
    setBusy("limits");
    setLimitsNote(null);
    try {
      const j = await call(base, "PATCH", { limits });
      setLimits(j.limits);
      setLimitsNote(t("limits.saved"));
    } catch (e) {
      setLimitsNote(e instanceof Error ? e.message : t("errors.saveFailed"));
    } finally {
      setBusy(null);
    }
  }

  const edit = (c: ConnectionView) =>
    setDraft({ editing: c.id, name: c.name, provider: c.provider, baseUrl: c.baseUrl ?? "", apiKey: "", model: c.model, chatModel: c.chatModel ?? "", visionModel: c.visionModel ?? "", speechModel: c.speechModel ?? "", voice: c.voice ?? "", embedModel: c.embedModel ?? "", isDefault: c.isDefault });

  const statusBox = status.platformOwner && !status.hasKey
    ? { tone: "info", text: t("page.ownerNote") }
    : status.needsKey
      ? { tone: "warn", text: t("page.needsKey") }
      : status.hasKey
        ? { tone: "ok", text: t("page.ready") }
        : { tone: "info", text: t("page.noAiYet") };

  const editingConn = draft?.editing ? connections.find((c) => c.id === draft.editing) : null;
  const p = draft ? provider(draft.provider) : null;
  const canList = p ? [p.can.chat && t("form.canChat"), p.can.vision && t("form.canVision"), p.can.embed && t("form.canEmbed"), p.can.speech && t("form.canSpeech")].filter(Boolean).join(", ") : "";

  return (
    <div className="mt-6 space-y-6">
      <div
        role="status"
        data-testid="ai-keys-status"
        className={`rounded-lg border px-4 py-3 text-sm ${statusBox.tone === "warn" ? "border-amber-400/30 bg-amber-400/10 text-amber-100" : statusBox.tone === "ok" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" : "border-brand-400/20 bg-brand-500/10 text-surface-200"}`}
      >
        <span className="inline-flex items-start gap-2">
          {statusBox.tone === "warn" ? <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden /> : statusBox.tone === "ok" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden /> : <KeyRound size={16} className="mt-0.5 shrink-0" aria-hidden />}
          <span>{statusBox.text}</span>
        </span>
      </div>

      <section className="card p-5" aria-labelledby="ai-conn-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="ai-conn-heading" className="font-semibold">{t("list.title")}</h2>
          {!draft && (
            <button type="button" className="btn-primary text-sm" onClick={() => setDraft(empty())}>
              <KeyRound size={14} aria-hidden /> {t("form.addTitle")}
            </button>
          )}
        </div>
        {connections.length === 0 ? (
          <p className="mt-3 text-sm text-surface-400">{t("list.empty")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {connections.map((c) => (
              <li key={c.id} className="rounded-lg border border-white/10 p-4 text-sm" data-testid="ai-connection">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {t(`providers.${c.provider}`)}
                      {c.isDefault && <span className="ms-2 rounded bg-brand-500/20 px-1.5 py-0.5 text-[11px] text-brand-200">{t("list.default")}</span>}
                    </p>
                    <p className="mt-1 text-xs text-surface-400">{t("list.name", { name: c.name })}</p>
                    <p className="mt-1 text-xs text-surface-400">
                      {t("list.key")}: <span dir="ltr" className="font-mono">{c.keyHint}</span> · {t("list.model")}: <span dir="ltr" className="font-mono">{c.model}</span>
                    </p>
                    {c.lastTestAt && (
                      <p className={`mt-1 text-xs ${c.lastTestOk ? "text-emerald-300" : "text-amber-300"}`}>
                        {c.lastTestOk ? t("list.lastOk", { when: format.relativeTime(new Date(c.lastTestAt)) }) : t("list.lastFailed", { when: format.relativeTime(new Date(c.lastTestAt)) })}
                      </p>
                    )}
                    {tests[c.id] && <p role="status" className={`mt-1 text-xs ${tests[c.id].ok ? "text-emerald-300" : "text-amber-300"}`}>{testText(tests[c.id])}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-ghost text-xs" disabled={busy !== null} onClick={() => test(c.id)}>
                      {busy === `test:${c.id}` ? <Loader2 size={13} className="animate-spin" aria-hidden /> : null}
                      {busy === `test:${c.id}` ? t("list.testing") : t("list.test")}
                    </button>
                    {!c.isDefault && (
                      <button type="button" className="btn-ghost text-xs" data-help={t("list.makeDefaultHelp")} disabled={busy !== null} onClick={() => makeDefault(c)}>{t("list.makeDefault")}</button>
                    )}
                    <button type="button" className="btn-ghost text-xs" disabled={busy !== null} onClick={() => edit(c)}>{t("list.edit")}</button>
                    <button type="button" className="btn-ghost text-xs text-red-300" disabled={busy !== null} onClick={() => remove(c)} aria-label={`${t("list.remove")} ${c.name}`}>
                      <Trash2 size={13} aria-hidden /> {t("list.remove")}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {draft && p && (
          <form
            className="mt-5 space-y-4 rounded-lg border border-white/10 p-4"
            data-testid="ai-key-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <h3 className="font-medium">{editingConn ? t("form.editTitle", { name: editingConn.name }) : t("form.addTitle")}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm" data-help={t("form.providerHelp")}>
                <span className="label">{t("form.provider")}</span>
                <select className="input w-full" name="provider" value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value as ProviderId })}>
                  {props.providers.map((pr) => <option key={pr.id} value={pr.id}>{t(`providers.${pr.id}`)}</option>)}
                </select>
                {canList && <span className="mt-1 block text-xs text-surface-400">{t("form.can", { list: canList })}</span>}
              </label>
              <label className="block text-sm" data-help={t("form.nameHelp")}>
                <span className="label">{t("form.name")}</span>
                <input className="input w-full" name="name" dir="ltr" value={draft.name} disabled={Boolean(draft.editing)} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </label>
              <label className="block text-sm sm:col-span-2" data-help={t("form.apiKeyHelp")}>
                <span className="label">{t("form.apiKey")}</span>
                <input
                  className="input w-full font-mono"
                  name="apiKey"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  dir="ltr"
                  value={draft.apiKey}
                  placeholder={editingConn ? t("form.apiKeySaved", { hint: editingConn.keyHint }) : ""}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    // A key's look tells which service it is from.
                    const guess = /^sk-ant-/.test(v) ? "anthropic" : /^xai-/.test(v) ? "xai" : /^sk-or-/.test(v) ? "openrouter" : /^AIza/.test(v) ? "gemini" : null;
                    setDraft({ ...draft, apiKey: e.target.value, ...(guess && !draft.editing ? { provider: guess as ProviderId } : {}) });
                  }}
                />
              </label>
              {(draft.provider === "custom" || draft.baseUrl) && (
                <label className="block text-sm sm:col-span-2" data-help={t("form.baseUrlHelp")}>
                  <span className="label">{t("form.baseUrl")}</span>
                  <input className="input w-full" name="baseUrl" dir="ltr" placeholder={p.baseUrl ?? "https://ai.example.com/v1"} value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} />
                </label>
              )}
              <label className="block text-sm sm:col-span-2" data-help={t("form.modelHelp")}>
                <span className="label">{t("form.model")}</span>
                <input className="input w-full" name="model" dir="ltr" required value={draft.model} placeholder={p.example.model ? t("form.modelExample", { model: p.example.model }) : ""} onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
              </label>
            </div>
            <details className="rounded-md border border-white/10 px-3 py-2">
              <summary className="cursor-pointer text-sm text-surface-300">{t("form.more")}</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["chatModel", "form.chatModel", "form.chatModelHelp", ""],
                    ["visionModel", "form.visionModel", "form.visionModelHelp", ""],
                    ["speechModel", "form.speechModel", "form.speechModelHelp", p.example.speech ?? ""],
                    ["voice", "form.voice", "form.speechModelHelp", p.example.voice ?? ""],
                    ["embedModel", "form.embedModel", "form.embedModelHelp", p.example.embed ?? ""],
                  ] as const
                ).map(([key, label, help, example]) => (
                  <label key={key} className="block text-sm" data-help={t(help)}>
                    <span className="label">{t(label)}</span>
                    <input className="input w-full" name={key} dir="ltr" value={draft[key]} placeholder={example ? t("form.modelExample", { model: example }) : ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
                  </label>
                ))}
              </div>
            </details>
            {connections.length > 0 && !draft.editing && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.isDefault} onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })} />
                {t("form.makeDefault")}
              </label>
            )}
            {tests.draft && <p role="status" className={`text-sm ${tests.draft.ok ? "text-emerald-300" : "text-amber-300"}`}>{testText(tests.draft)}</p>}
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary text-sm" disabled={busy !== null}>
                {busy === "save" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
                {busy === "save" ? t("form.saving") : t("form.save")}
              </button>
              <button type="button" className="btn-ghost text-sm" disabled={busy !== null || (!draft.apiKey && !draft.editing) || !draft.model} onClick={() => void testDraft()}>
                {busy === "test:draft" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
                {t("form.test")}
              </button>
              {connections.length > 0 && <button type="button" className="btn-ghost text-sm" onClick={() => { setDraft(null); setError(null); }}>{t("form.cancel")}</button>}
            </div>
          </form>
        )}
        <p className="mt-4 flex items-start gap-2 text-xs text-surface-400"><ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden />{t("page.security")}</p>
      </section>

      <section className="card p-5" aria-labelledby="ai-limits-heading">
        <h2 id="ai-limits-heading" className="font-semibold">{t("limits.title")}</h2>
        <p className="mt-1 text-sm text-surface-400">{t("limits.intro")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="label">{t("limits.perHour")}</span>
            <input className="input w-full" type="number" min={1} max={100000} value={limits.perHour} onChange={(e) => setLimits({ ...limits, perHour: Math.max(1, Number(e.target.value) || 1) })} />
          </label>
          <label className="block text-sm">
            <span className="label">{t("limits.perVisitorHour")}</span>
            <input className="input w-full" type="number" min={1} max={100000} value={limits.perVisitorHour} onChange={(e) => setLimits({ ...limits, perVisitorHour: Math.max(1, Number(e.target.value) || 1) })} />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" className="btn-ghost text-sm" disabled={busy !== null} onClick={() => void saveLimits()}>{t("limits.save")}</button>
          {limitsNote && <span role="status" className="text-xs text-surface-400">{limitsNote}</span>}
        </div>
      </section>
    </div>
  );
}
