"use client";
import { useState } from "react";
import { Copy, KeyRound, Pencil, RefreshCw, Ban } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

type Permission = "users" | "sso" | "build" | "publish" | "usage";
const PERMISSIONS: Permission[] = ["users", "sso", "build", "publish", "usage"];

export type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  scope: { type: "reseller"; resellerId: string; resellerName: string } | { type: "platform" };
  permissions: Record<Permission, boolean>;
  allowedIps: string[];
  webhookUrl: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  rotatedAt: string | null;
  revokedAt: string | null;
};

async function call(url: string, method: string, body: unknown, fallback: string) {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : fallback);
  return data;
}

const allOn = (): Record<Permission, boolean> => ({ users: true, sso: true, build: true, publish: true, usage: true });

/**
 * Partner API keys: create (the secret is shown once), rotate, revoke, and
 * change permissions, the network rule and the build webhook. Used by Admin
 * → Partner API (any scope) and Reseller → Partner API (its own clients).
 */
export function PartnerKeysManager({
  mode,
  initial,
  resellers = [],
  localUrl,
  publicUrl,
}: {
  mode: "admin" | "reseller";
  initial: KeyRow[];
  resellers?: Array<{ id: string; name: string }>;
  localUrl: string;
  publicUrl: string;
}) {
  const t = useTranslations("partner.keys");
  const tc = useTranslations("common");
  const base = mode === "admin" ? "/api/admin/partner-keys" : "/api/reseller/partner-keys";
  const [rows, setRows] = useState(initial);
  const [form, setForm] = useState({ name: "", scope: mode === "admin" ? "platform" : "own", permissions: allOn(), restrict: false, ips: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string; secret?: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const replace = (row: KeyRow) => setRows((rs) => rs.map((r) => (r.id === row.id ? row : r)));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    setNotice(null);
    try {
      const data = await call(base, "POST", {
        name: form.name,
        ...(mode === "admin" ? (form.scope === "platform" ? { scope: "platform" } : { resellerId: form.scope }) : {}),
        permissions: form.permissions,
        allowedIps: form.restrict ? form.ips : [],
      }, tc("tryAgain"));
      setRows((rs) => [data.key, ...rs]);
      setForm({ ...form, name: "", permissions: allOn(), restrict: false, ips: "" });
      setNotice({ ok: true, text: t("createdOnce"), secret: data.secret });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : tc("tryAgain") });
    } finally {
      setBusy(null);
    }
  }

  async function rotate(row: KeyRow) {
    if (!confirm(t("rotateConfirm", { name: row.name }))) return;
    setBusy(row.id);
    try {
      const data = await call(`${base}/${row.id}/rotate`, "POST", undefined, tc("tryAgain"));
      replace(data.key);
      setNotice({ ok: true, text: t("rotatedOnce", { name: row.name }), secret: data.secret });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : tc("tryAgain") });
    } finally {
      setBusy(null);
    }
  }

  async function revoke(row: KeyRow) {
    if (!confirm(t("revokeConfirm", { name: row.name }))) return;
    setBusy(row.id);
    try {
      const data = await call(`${base}/${row.id}`, "DELETE", undefined, tc("tryAgain"));
      replace(data.key);
      setNotice({ ok: true, text: t("revoked", { name: row.name }) });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : tc("tryAgain") });
    } finally {
      setBusy(null);
    }
  }

  async function save(row: KeyRow, change: Record<string, unknown>) {
    setBusy(row.id);
    try {
      const data = await call(`${base}/${row.id}`, "PATCH", change, tc("tryAgain"));
      replace(data.key);
      setEditing(null);
      setNotice(data.webhookSecret ? { ok: true, text: t("webhookSecretOnce"), secret: data.webhookSecret } : { ok: true, text: t("saved", { name: row.name }) });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : tc("tryAgain") });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="card p-6 text-sm">
        <h2 className="font-semibold">{t("addressesTitle")}</h2>
        <dl className="mt-3 grid gap-2 sm:grid-cols-[max-content_minmax(0,1fr)] sm:gap-x-4">
          <dt className="text-surface-400" data-help={t("localUrlHelp")}>{t("localUrl")}</dt>
          <dd><code dir="ltr" className="break-all">{localUrl}</code></dd>
          <dt className="text-surface-400" data-help={t("publicUrlHelp")}>{t("publicUrl")}</dt>
          <dd><code dir="ltr" className="break-all">{publicUrl}</code></dd>
          <dt className="text-surface-400">{t("spec")}</dt>
          <dd><a dir="ltr" className="break-all text-brand-300 hover:underline" href="/api/partner/v1/openapi.json" target="_blank" rel="noopener noreferrer">/api/partner/v1/openapi.json</a></dd>
        </dl>
      </section>

      <form onSubmit={create} className="card p-6">
        <h2 className="font-semibold">{t("addTitle")}</h2>
        <p className="mt-1 text-sm text-surface-400">{mode === "admin" ? t("addBodyAdmin") : t("addBodyReseller")}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block text-sm" data-help={t("nameHelp")}>
            <span className="label">{t("name")}</span>
            <input className="input w-full" required minLength={2} maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("namePlaceholder")} />
          </label>
          {mode === "admin" && (
            <label className="block text-sm" data-help={t("scopeHelp")}>
              <span className="label">{t("scope")}</span>
              <select className="input w-full" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
                <option value="platform">{t("scopePlatform")}</option>
                {resellers.map((r) => <option key={r.id} value={r.id}>{t("scopeReseller", { name: r.name })}</option>)}
              </select>
            </label>
          )}
        </div>
        <PermissionPicker value={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} />
        <NetworkPicker restrict={form.restrict} ips={form.ips} onChange={(restrict, ips) => setForm({ ...form, restrict, ips })} />
        <div className="mt-4"><button className="btn-primary" disabled={busy === "create"}><KeyRound size={15} /> {busy === "create" ? t("creating") : t("create")}</button></div>
      </form>

      {notice && (
        <div role={notice.ok ? "status" : "alert"} className={`rounded-xl border p-4 text-sm ${notice.ok ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-50" : "border-red-400/30 bg-red-400/10 text-red-100"}`}>
          <p>{notice.text}</p>
          {notice.secret && <SecretBox secret={notice.secret} />}
        </div>
      )}

      <section className="space-y-3" aria-label={t("listTitle")}>
        <h2 className="font-semibold">{t("listTitle")}</h2>
        {rows.length === 0 && <p className="card p-6 text-sm text-surface-400">{t("none")}</p>}
        {rows.map((r) => (
          <KeyCard
            key={r.id}
            row={r}
            mode={mode}
            busy={busy === r.id}
            editing={editing === r.id}
            onEdit={() => setEditing(editing === r.id ? null : r.id)}
            onRotate={() => rotate(r)}
            onRevoke={() => revoke(r)}
            onSave={(change) => save(r, change)}
          />
        ))}
      </section>
    </div>
  );
}

function PermissionPicker({ value, onChange }: { value: Record<Permission, boolean>; onChange: (v: Record<Permission, boolean>) => void }) {
  const t = useTranslations("partner.keys");
  return (
    <fieldset className="mt-4">
      <legend className="label">{t("permissions")}</legend>
      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {PERMISSIONS.map((p) => (
          <label key={p} className="inline-flex items-center gap-2" data-help={t(`perm.${p}Help`)}>
            <input type="checkbox" checked={value[p]} onChange={(e) => onChange({ ...value, [p]: e.target.checked })} />
            {t(`perm.${p}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function NetworkPicker({ restrict, ips, onChange }: { restrict: boolean; ips: string; onChange: (restrict: boolean, ips: string) => void }) {
  const t = useTranslations("partner.keys");
  return (
    <fieldset className="mt-4 text-sm">
      <legend className="label">{t("network")}</legend>
      <div className="mt-1 space-y-2">
        <label className="flex items-start gap-2" data-help={t("networkLocalHelp")}>
          <input type="radio" className="mt-1" checked={!restrict} onChange={() => onChange(false, ips)} />
          <span>{t("networkLocal")}</span>
        </label>
        <label className="flex items-start gap-2" data-help={t("networkListHelp")}>
          <input type="radio" className="mt-1" checked={restrict} onChange={() => onChange(true, ips)} />
          <span>{t("networkList")}</span>
        </label>
        {restrict && (
          <textarea className="input w-full font-mono text-xs" dir="ltr" rows={3} required value={ips} onChange={(e) => onChange(true, e.target.value)} placeholder="203.0.113.10, 198.51.100.0/24" aria-label={t("networkListLabel")} />
        )}
      </div>
    </fieldset>
  );
}

function KeyCard({ row, mode, busy, editing, onEdit, onRotate, onRevoke, onSave }: {
  row: KeyRow; mode: "admin" | "reseller"; busy: boolean; editing: boolean;
  onEdit: () => void; onRotate: () => void; onRevoke: () => void; onSave: (change: Record<string, unknown>) => void;
}) {
  const t = useTranslations("partner.keys");
  const format = useFormatter();
  const revoked = Boolean(row.revokedAt);
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });
  return (
    <article className={`card p-5 text-sm ${busy ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{row.name}</p>
          <p className="mt-0.5 text-xs text-surface-400"><code dir="ltr">{row.prefix}…</code></p>
          {mode === "admin" && <p className="mt-1 text-xs text-surface-400">{row.scope.type === "platform" ? t("scopePlatform") : t("scopeReseller", { name: row.scope.resellerName })}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs ${revoked ? "bg-red-400/10 text-red-300" : "bg-emerald-400/10 text-emerald-300"}`}>{revoked ? t("statusRevoked") : t("statusActive")}</span>
          {!revoked && (
            <>
              <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={onEdit} disabled={busy} data-help={t("editHelp")}><Pencil size={14} /> {t("edit")}</button>
              <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={onRotate} disabled={busy} data-help={t("rotateHelp")}><RefreshCw size={14} /> {t("rotate")}</button>
              <button type="button" className="btn-ghost px-2 py-1 text-xs text-red-300" onClick={onRevoke} disabled={busy} data-help={t("revokeHelp")}><Ban size={14} /> {t("revoke")}</button>
            </>
          )}
        </div>
      </div>
      <dl className="mt-3 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[max-content_minmax(0,1fr)]">
        <dt className="text-surface-400">{t("permissions")}</dt>
        <dd>{PERMISSIONS.filter((p) => row.permissions[p]).map((p) => t(`perm.${p}`)).join(" · ") || t("noPermissions")}</dd>
        <dt className="text-surface-400">{t("network")}</dt>
        <dd>{row.allowedIps.length ? <span dir="ltr">{row.allowedIps.join(", ")}</span> : t("networkLocalShort")}</dd>
        <dt className="text-surface-400">{t("webhook")}</dt>
        <dd className="break-all">{row.webhookUrl ? <span dir="ltr">{row.webhookUrl}</span> : t("webhookNone")}</dd>
        <dt className="text-surface-400">{t("created")}</dt>
        <dd>{date(row.createdAt)}{row.rotatedAt ? ` · ${t("rotatedAt", { date: date(row.rotatedAt) })}` : ""}</dd>
        <dt className="text-surface-400">{t("lastUsed")}</dt>
        <dd>{row.lastUsedAt ? date(row.lastUsedAt) : t("never")}</dd>
        {revoked && <><dt className="text-surface-400">{t("revokedAt")}</dt><dd>{date(row.revokedAt!)}</dd></>}
      </dl>
      {editing && !revoked && <KeyEditor row={row} mode={mode} onSave={onSave} />}
    </article>
  );
}

function KeyEditor({ row, mode, onSave }: { row: KeyRow; mode: "admin" | "reseller"; onSave: (change: Record<string, unknown>) => void }) {
  const t = useTranslations("partner.keys");
  const tc = useTranslations("common");
  const [name, setName] = useState(row.name);
  const [permissions, setPermissions] = useState(row.permissions);
  const [restrict, setRestrict] = useState(row.allowedIps.length > 0);
  const [ips, setIps] = useState(row.allowedIps.join(", "));
  const [webhookUrl, setWebhookUrl] = useState(row.webhookUrl ?? "");
  const [newSecret, setNewSecret] = useState(false);
  return (
    <form
      className="mt-4 border-t border-white/10 pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, permissions, allowedIps: restrict ? ips : [], webhookUrl: webhookUrl.trim() || null, ...(newSecret ? { newWebhookSecret: true } : {}) });
      }}
    >
      <label className="block text-sm" data-help={t("nameHelp")}>
        <span className="label">{t("name")}</span>
        <input className="input w-full" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <PermissionPicker value={permissions} onChange={setPermissions} />
      <NetworkPicker restrict={restrict} ips={ips} onChange={(r, v) => { setRestrict(r); setIps(v); }} />
      <label className="mt-4 block text-sm" data-help={mode === "admin" ? t("webhookHelpAdmin") : t("webhookHelp")}>
        <span className="label">{t("webhookUrl")}</span>
        <input className="input w-full" dir="ltr" type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://example.com/hooks/builds" />
      </label>
      {row.webhookUrl && (
        <label className="mt-2 inline-flex items-center gap-2 text-sm" data-help={t("newWebhookSecretHelp")}>
          <input type="checkbox" checked={newSecret} onChange={(e) => setNewSecret(e.target.checked)} /> {t("newWebhookSecret")}
        </label>
      )}
      <div className="mt-4"><button className="btn-primary">{tc("save")}</button></div>
    </form>
  );
}

function SecretBox({ secret }: { secret: string }) {
  const t = useTranslations("partner.keys");
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex gap-2">
      <input readOnly value={secret} onFocus={(e) => e.currentTarget.select()} className="input min-w-0 flex-1 font-mono text-xs" dir="ltr" aria-label={t("secret")} />
      <button type="button" className="btn-ghost shrink-0" onClick={async () => { await navigator.clipboard.writeText(secret).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Copy size={14} /> {copied ? t("copied") : t("copy")}</button>
    </div>
  );
}
