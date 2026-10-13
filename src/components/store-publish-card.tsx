"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Send, TriangleAlert } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { viewerTimeZone } from "@/components/data/format";
import { SectionTitle, type EngineBuild } from "@/components/native-studio";

/**
 * "Publish to stores" on the Mobile app page: connect the owner's Google Play
 * developer account and send a Google Play build to a track, or add it to
 * their own F-Droid repository (src/lib/store-publish, API under
 * /api/store-accounts and /api/projects/[id]/native/publish).
 */

type Account = { id: string; kind: "oauth" | "service_account"; label: string; lastUsedAt: string | null; lastError: string | null };
type Repo = { name: string; description: string; address: string; fingerprint: string; addLink: string; appLink: string; pageUrl: string };
type Release = {
  id: string;
  store: "google_play" | "fdroid";
  account: string | null;
  versionCode: number;
  versionName: string;
  track: string | null;
  releaseStatus: string | null;
  userFraction: number | null;
  status: "running" | "done" | "error";
  step: string | null;
  error: string | null;
  errorCode: string | null;
  result: { draftOnly?: boolean; notSentForReview?: boolean } | null;
  createdAt: string;
};
type Data = { accounts: Account[]; googleSignIn: boolean; repo: Repo | null; fdroidVersions: Array<{ versionCode: number; versionName: string }>; releases: Release[] };

const TRACKS = ["internal", "alpha", "beta", "production"] as const;
const KNOWN_ERRORS = new Set([
  "appNotFound", "forbidden", "apiDisabled", "signInExpired", "badKey", "notAKey", "versionUsed", "wrongKey", "packageMismatch", "network",
  "noBuild", "badBuild", "noRepo", "badApk", "signFailed", "keyMissing", "restarted", "busy",
]);

export function StorePublishCard({
  projectId,
  appId,
  appName,
  appDescription,
  builds,
  published,
  ownerActions,
}: {
  projectId: string;
  appId: string;
  appName: string;
  appDescription: string;
  /** The app's Google Play builds (finished ones can be sent). */
  builds: EngineBuild[];
  published: boolean;
  /** False while an admin acts as the owner: store accounts stay owner-only. */
  ownerActions: boolean;
}) {
  const t = useTranslations("storePublish");
  const [data, setData] = useState<Data | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const ready = useMemo(() => builds.filter((b) => b.kind === "release" && b.status === "done"), [builds]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/native/publish`).catch(() => null);
    const next = res?.ok ? ((await res.json().catch(() => null)) as Data | null) : null;
    if (next) setData(next);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Back from "Sign in with Google": ?play=connected (or what went wrong).
  useEffect(() => {
    const url = new URL(window.location.href);
    const outcome = url.searchParams.get("play");
    if (!outcome) return;
    setNotice({ ok: outcome === "connected", text: t(`oauth.${["connected", "cancelled", "expired", "noScope"].includes(outcome) ? outcome : "failed"}`) });
    url.searchParams.delete("play");
    window.history.replaceState(null, "", url.toString());
    document.getElementById("nk-publish")?.scrollIntoView({ block: "start" });
  }, [t]);

  // Poll while something is being sent.
  const running = data?.releases.some((r) => r.status === "running") ?? false;
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => void load(), 3000);
    return () => window.clearTimeout(timer);
  }, [running, data, load]);

  return (
    <section className="card p-6 space-y-5 scroll-mt-24" id="nk-publish" aria-labelledby="nk-publish-title">
      <SectionTitle id="nk-publish-title" icon={<Send size={18} />} title={t("title")} help={t("titleHelp")} intro={t("intro")} />

      {notice && (
        <p role="status" className={`rounded-lg border p-3 text-sm ${notice.ok ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-300" : "border-amber-500/40 bg-amber-500/5 text-amber-200"}`}>
          {notice.text}
        </p>
      )}
      {!published ? (
        <p className="text-sm text-surface-400">{t("publishFirst")}</p>
      ) : ready.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-surface-300">{t("buildFirst")}</p>
      ) : null}
      {!ownerActions && <p className="text-sm text-surface-500">{t("ownerOnly")}</p>}

      {!data ? (
        <p className="text-sm text-surface-500">{t("loading")}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <GooglePlayPanel projectId={projectId} appId={appId} data={data} builds={ready} ownerActions={ownerActions} onChange={load} />
          <FdroidPanel projectId={projectId} appName={appName} appDescription={appDescription} data={data} builds={ready} ownerActions={ownerActions} onChange={load} />
        </div>
      )}

      {data && data.releases.length > 0 && <History releases={data.releases} />}
    </section>
  );
}

/* ── Google Play ──────────────────────────────────────────────────── */

function GooglePlayPanel({ projectId, appId, data, builds, ownerActions, onChange }: { projectId: string; appId: string; data: Data; builds: EngineBuild[]; ownerActions: boolean; onChange: () => Promise<void> }) {
  const t = useTranslations("storePublish.play");
  const te = useTranslations("storePublish");
  const [accountId, setAccountId] = useState("");
  const [buildId, setBuildId] = useState("");
  const [track, setTrack] = useState<(typeof TRACKS)[number]>("internal");
  const [mode, setMode] = useState<"completed" | "inProgress" | "draft">("completed");
  const [percent, setPercent] = useState(10);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string; detail?: string } | null>(null);
  const [showKey, setShowKey] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const account = data.accounts.find((a) => a.id === accountId) ?? data.accounts[data.accounts.length - 1] ?? null;
  const build = builds.find((b) => b.buildId === buildId) ?? builds[0] ?? null;
  const running = data.releases.some((r) => r.status === "running");

  const errorOf = async (res: Response | null) => {
    const body = res ? ((await res.json().catch(() => ({}))) as { error?: string; detail?: string; code?: string }) : {};
    return { ok: false, text: body.error || te("failed"), detail: body.detail && body.detail !== body.error ? body.detail : undefined };
  };

  async function signIn() {
    setBusy("signin");
    setMessage(null);
    const res = await fetch("/api/store-accounts/google/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId }) }).catch(() => null);
    const body = res?.ok ? ((await res.json().catch(() => null)) as { url?: string } | null) : null;
    if (body?.url) {
      window.location.assign(body.url);
      return;
    }
    setMessage(await errorOf(res));
    setBusy(null);
  }

  async function uploadKey(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy("key");
    setMessage(null);
    const form = new FormData();
    form.set("key", file);
    const res = await fetch("/api/store-accounts", { method: "POST", body: form }).catch(() => null);
    if (res?.ok) {
      const body = (await res.json()) as { account: Account };
      setAccountId(body.account.id);
      setShowKey(false);
      setMessage({ ok: true, text: t("keySaved", { email: body.account.label }) });
      await onChange();
    } else {
      setMessage(await errorOf(res));
    }
    setBusy(null);
  }

  async function disconnect(a: Account) {
    if (!window.confirm(t("disconnectConfirm", { account: a.label }))) return;
    setBusy("disconnect");
    await fetch(`/api/store-accounts?id=${encodeURIComponent(a.id)}`, { method: "DELETE" }).catch(() => null);
    setAccountId("");
    await onChange();
    setBusy(null);
  }

  async function check() {
    if (!account) return;
    setBusy("check");
    setMessage(null);
    const res = await fetch(`/api/projects/${projectId}/native/publish/check`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accountId: account.id }) }).catch(() => null);
    setMessage(res?.ok ? { ok: true, text: t("checkOk", { app: appId }) } : await errorOf(res));
    setBusy(null);
  }

  async function send() {
    if (!account || !build) return;
    if (track === "production" && mode === "completed" && !window.confirm(t("productionConfirm"))) return;
    setBusy("send");
    setMessage(null);
    const res = await fetch(`/api/projects/${projectId}/native/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        store: "google_play",
        accountId: account.id,
        buildId: build.buildId,
        track,
        releaseStatus: mode,
        ...(mode === "inProgress" ? { userFraction: Math.min(99, Math.max(1, percent)) / 100 } : {}),
        notes,
      }),
    }).catch(() => null);
    if (res?.ok) {
      setMessage({ ok: true, text: t("sending") });
      setNotes("");
    } else {
      setMessage(await errorOf(res));
    }
    await onChange();
    setBusy(null);
  }

  return (
    <div className="rounded-xl border border-white/10 p-5 space-y-4">
      <div>
        <h3 className="font-semibold">Google Play</h3>
        <p className="mt-1 text-sm text-surface-400">{t("intro")}</p>
      </div>

      {data.accounts.length > 0 && (
        <ul className="space-y-2">
          {data.accounts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 break-all font-medium text-surface-100" dir="ltr">{a.label}</span>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-surface-400">{a.kind === "oauth" ? t("viaGoogle") : t("viaKey")}</span>
              {a.lastError && <span className="text-xs text-amber-300" title={a.lastError}>{t("needsAttention")}</span>}
              {ownerActions && (
                <button className="ms-auto text-xs text-surface-400 hover:text-red-300" onClick={() => void disconnect(a)} disabled={busy !== null} data-help={t("disconnectHelp")}>
                  {t("disconnect")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {ownerActions && (
        <div className="flex flex-wrap gap-2">
          {data.googleSignIn && (
            <button className={data.accounts.length ? "btn-ghost text-sm" : "btn-primary"} onClick={() => void signIn()} disabled={busy !== null} data-help={t("signInHelp")}>
              {busy === "signin" ? t("opening") : data.accounts.length ? t("addAnother") : t("signIn")}
            </button>
          )}
          <button className={data.googleSignIn || data.accounts.length ? "btn-ghost text-sm" : "btn-primary"} onClick={() => setShowKey((s) => !s)} disabled={busy !== null} data-help={t("useKeyHelp")}>
            {t("useKey")}
          </button>
        </div>
      )}

      {showKey && ownerActions && (
        <form className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm" onSubmit={uploadKey}>
          <ol className="list-decimal space-y-1.5 ps-5 text-surface-300">
            <li>{t("keyStep1")}</li>
            <li>{t("keyStep2")}</li>
            <li>{t("keyStep3")}</li>
            <li>{t("keyStep4")}</li>
          </ol>
          <input ref={fileRef} type="file" accept=".json,application/json" required className="input" aria-label={t("keyFile")} data-help={t("keyFileHelp")} />
          <button className="btn-primary" disabled={busy !== null}>{busy === "key" ? t("checkingKey") : t("saveKey")}</button>
        </form>
      )}

      {account && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {data.accounts.length > 1 && (
              <label className="block text-sm sm:col-span-2">
                <span className="label">{t("account")}</span>
                <select className="input" value={account.id} onChange={(e) => setAccountId(e.target.value)}>
                  {data.accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </label>
            )}
            <BuildSelect builds={builds} value={build?.buildId ?? ""} onChange={setBuildId} />
            <label className="block text-sm">
              <span className="label" data-help={t("trackHelp")}>{t("track")}</span>
              <select className="input" value={track} onChange={(e) => setTrack(e.target.value as (typeof TRACKS)[number])}>
                {TRACKS.map((k) => (
                  <option key={k} value={k}>{t(`tracks.${k}`)}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="label" data-help={t("modeHelp")}>{t("mode")}</span>
              <select className="input" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                <option value="completed">{t("modes.completed")}</option>
                <option value="inProgress">{t("modes.inProgress")}</option>
                <option value="draft">{t("modes.draft")}</option>
              </select>
            </label>
            {mode === "inProgress" && (
              <label className="block text-sm">
                <span className="label">{t("percent")}</span>
                <input className="input" type="number" min={1} max={99} value={percent} onChange={(e) => setPercent(Number(e.target.value) || 10)} />
              </label>
            )}
            <label className="block text-sm sm:col-span-2">
              <span className="label">{t("notes")}</span>
              <textarea className="input min-h-[70px] w-full" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} data-help={t("notesHelp")} />
            </label>
          </div>
          {ownerActions && (
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => void send()} disabled={busy !== null || running || !build} data-help={t("sendHelp")}>
                {busy === "send" ? t("starting") : t("send")}
              </button>
              <button className="btn-ghost text-sm" onClick={() => void check()} disabled={busy !== null} data-help={t("checkHelp")}>
                {busy === "check" ? t("checking") : t("check")}
              </button>
            </div>
          )}
        </div>
      )}

      {message && <Message message={message} />}

      <p className="flex items-start gap-2 text-xs text-surface-500">
        <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
        <span>{t("firstUpload", { app: appId })}</span>
      </p>
    </div>
  );
}

/* ── F-Droid ──────────────────────────────────────────────────────── */

function FdroidPanel({
  projectId,
  appName,
  appDescription,
  data,
  builds,
  ownerActions,
  onChange,
}: {
  projectId: string;
  appName: string;
  appDescription: string;
  data: Data;
  builds: EngineBuild[];
  ownerActions: boolean;
  onChange: () => Promise<void>;
}) {
  const t = useTranslations("storePublish.fdroid");
  const te = useTranslations("storePublish");
  const [name, setName] = useState("");
  const [buildId, setBuildId] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState(appDescription);
  const [whatsNew, setWhatsNew] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string; detail?: string } | null>(null);
  const build = builds.find((b) => b.buildId === buildId) ?? builds[0] ?? null;
  const running = data.releases.some((r) => r.status === "running");
  const repo = data.repo;

  const errorOf = async (res: Response | null) => {
    const body = res ? ((await res.json().catch(() => ({}))) as { error?: string; detail?: string }) : {};
    return { ok: false, text: body.error || te("failed"), detail: body.detail && body.detail !== body.error ? body.detail : undefined };
  };

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    setMessage(null);
    const res = await fetch("/api/store-accounts/fdroid", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }).catch(() => null);
    if (res?.ok) {
      setMessage({ ok: true, text: t("created") });
      await onChange();
    } else {
      setMessage(await errorOf(res));
    }
    setBusy(null);
  }

  async function add() {
    if (!build) return;
    setBusy("add");
    setMessage(null);
    const res = await fetch(`/api/projects/${projectId}/native/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ store: "fdroid", buildId: build.buildId, summary, description, whatsNew }),
    }).catch(() => null);
    if (res?.ok) {
      setMessage({ ok: true, text: t("adding") });
      setWhatsNew("");
    } else {
      setMessage(await errorOf(res));
    }
    await onChange();
    setBusy(null);
  }

  async function remove() {
    if (!window.confirm(t("removeConfirm", { app: appName }))) return;
    setBusy("remove");
    const res = await fetch(`/api/projects/${projectId}/native/publish/fdroid`, { method: "DELETE" }).catch(() => null);
    setMessage(res?.ok ? { ok: true, text: t("removed") } : await errorOf(res));
    await onChange();
    setBusy(null);
  }

  return (
    <div className="rounded-xl border border-white/10 p-5 space-y-4">
      <div>
        <h3 className="font-semibold">F-Droid</h3>
        <p className="mt-1 text-sm text-surface-400">{t("intro")}</p>
      </div>

      {!repo ? (
        ownerActions ? (
          <form className="space-y-3" onSubmit={create}>
            <label className="block text-sm">
              <span className="label">{t("repoName")}</span>
              <input className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("repoNamePlaceholder")} />
            </label>
            <button className="btn-primary" disabled={busy !== null} data-help={t("createHelp")}>{busy === "create" ? t("creating") : t("create")}</button>
          </form>
        ) : null
      ) : (
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-surface-500">{t("repo")}</div>
            <div className="mt-1 font-medium text-surface-100">{repo.name}</div>
          </div>
          <CopyField label={t("address")} value={repo.addLink} help={t("addressHelp")} />
          <CopyField label={t("fingerprint")} value={repo.fingerprint} help={t("fingerprintHelp")} />
          <div className="flex flex-wrap gap-3">
            <a href={repo.pageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-400 hover:underline" data-help={t("pageHelp")}>
              {t("page")} <ExternalLink size={13} aria-hidden />
            </a>
            <a href={repo.appLink} className="inline-flex items-center gap-1 text-brand-400 hover:underline" data-help={t("openInAppHelp")}>
              {t("openInApp")}
            </a>
          </div>
          <p className="text-surface-400">
            {data.fdroidVersions.length ? t("inRepo", { versions: data.fdroidVersions.map((v) => `${v.versionName} (${v.versionCode})`).join(", ") }) : t("notInRepo")}
          </p>

          <div className="grid gap-3 border-t border-white/10 pt-4">
            <BuildSelect builds={builds} value={build?.buildId ?? ""} onChange={setBuildId} />
            <label className="block">
              <span className="label">{t("summary")}</span>
              <input className="input" maxLength={80} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={t("summaryPlaceholder")} />
            </label>
            <label className="block">
              <span className="label">{t("description")}</span>
              <textarea className="input min-h-[70px] w-full" maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label className="block">
              <span className="label">{t("whatsNew")}</span>
              <textarea className="input min-h-[50px] w-full" maxLength={500} value={whatsNew} onChange={(e) => setWhatsNew(e.target.value)} />
            </label>
          </div>
          {ownerActions && (
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => void add()} disabled={busy !== null || running || !build} data-help={t("addHelp")}>
                {busy === "add" ? te("play.starting") : t("add")}
              </button>
              {data.fdroidVersions.length > 0 && (
                <button className="btn-ghost text-sm" onClick={() => void remove()} disabled={busy !== null || running} data-help={t("removeHelp")}>
                  {t("remove")}
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-surface-500">{t("signingNote")}</p>
        </div>
      )}

      {message && <Message message={message} />}

      <details className="text-xs text-surface-500">
        <summary className="cursor-pointer text-surface-400 hover:text-surface-200">{t("officialSummary")}</summary>
        <p className="mt-2">{t("official")}</p>
      </details>
    </div>
  );
}

/* ── Shared bits ──────────────────────────────────────────────────── */

function BuildSelect({ builds, value, onChange }: { builds: EngineBuild[]; value: string; onChange: (id: string) => void }) {
  const t = useTranslations("storePublish");
  const format = useFormatter();
  return (
    <label className="block text-sm">
      <span className="label" data-help={t("buildHelp")}>{t("build")}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)} disabled={!builds.length}>
        {!builds.length && <option value="">{t("noBuilds")}</option>}
        {builds.map((b) => (
          <option key={b.buildId} value={b.buildId} suppressHydrationWarning>
            {t("buildOption", {
              version: b.version,
              build: String(b.versionCode),
              date: format.dateTime(new Date(b.finishedAt ?? b.startedAt), { dateStyle: "medium", timeStyle: "short", timeZone: viewerTimeZone() }),
            })}
          </option>
        ))}
      </select>
    </label>
  );
}

function CopyField({ label, value, help }: { label: string; value: string; help: string }) {
  const t = useTranslations("storePublish");
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-surface-500" data-help={help}>{label}</div>
      <div className="mt-1 flex items-start gap-2">
        <code className="min-w-0 flex-1 break-all font-mono text-xs text-surface-300" dir="ltr">{value}</code>
        <button
          type="button"
          className="shrink-0 text-surface-400 hover:text-surface-100"
          aria-label={t("copy")}
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
        </button>
      </div>
    </div>
  );
}

function Message({ message }: { message: { ok: boolean; text: string; detail?: string } }) {
  return (
    <div role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-300" : "text-red-300"}`}>
      <p>{message.text}</p>
      {message.detail && <p className="mt-1 break-words text-xs text-surface-500" dir="ltr">{message.detail}</p>}
    </div>
  );
}

function History({ releases }: { releases: Release[] }) {
  const t = useTranslations("storePublish");
  const format = useFormatter();
  return (
    <div className="border-t border-white/10 pt-4">
      <h3 className="text-sm font-semibold text-surface-200">{t("history.title")}</h3>
      <ul className="mt-3 space-y-3">
        {releases.map((r) => {
          const where = r.store === "fdroid" ? t("history.fdroid") : t("history.play", { track: r.track ? t(`play.tracks.${r.track}`) : "" });
          return (
            <li key={r.id} className="text-sm">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-surface-100">{where}</span>
                <span className="text-surface-400">{t("history.version", { version: r.versionName, build: String(r.versionCode) })}</span>
                <span className="text-xs text-surface-500" suppressHydrationWarning>
                  {format.dateTime(new Date(r.createdAt), { dateStyle: "medium", timeStyle: "short", timeZone: viewerTimeZone() })}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    r.status === "done" ? "bg-emerald-500/10 text-emerald-300" : r.status === "error" ? "bg-red-500/10 text-red-300" : "bg-brand-500/10 text-brand-300"
                  }`}
                >
                  {r.status === "running" ? t(`history.steps.${r.step && ["connecting", "uploading", "track", "committing", "adding"].includes(r.step) ? r.step : "connecting"}`) : t(`history.${r.status}`)}
                </span>
              </div>
              {r.status === "done" && r.store === "google_play" && (
                <p className="mt-1 text-xs text-surface-400">
                  {r.result?.draftOnly
                    ? t("history.draftOnly")
                    : r.releaseStatus === "draft"
                      ? t("history.draft")
                      : r.releaseStatus === "inProgress"
                        ? t("history.rollout", { percent: String(Math.round((r.userFraction ?? 0) * 100)) })
                        : t("history.released")}
                  {r.result?.notSentForReview ? ` ${t("history.notSentForReview")}` : ""}
                </p>
              )}
              {r.status === "error" && (
                <p className="mt-1 text-xs text-red-300">
                  {r.errorCode && KNOWN_ERRORS.has(r.errorCode) ? t(`api.errors.${r.errorCode}`) : r.error}
                  {r.errorCode && KNOWN_ERRORS.has(r.errorCode) && r.error ? <span className="mt-0.5 block text-surface-500" dir="ltr">{r.error}</span> : null}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
