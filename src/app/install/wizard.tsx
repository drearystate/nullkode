"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type Step = "admin" | "ai" | "brand" | "done";

interface BrandForm {
  appName: string;
  tagline: string;
  colorPrimary: string;
  colorAccent: string;
  logoDataUrl: string | null;
  faviconDataUrl: string | null;
}

export function InstallWizard({ ownerSignedIn = false }: { ownerSignedIn?: boolean }) {
  const router = useRouter();
  const t = useTranslations("install");
  const [step, setStep] = useState<Step>(ownerSignedIn ? "ai" : "admin");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Step 1: admin user ────────────────────────────────────────────
  const [setupToken, setSetupToken] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // ── Step 2: AI provider ───────────────────────────────────────────
  const [aiProvider, setAiProvider] = useState<"openai" | "claude-cli" | "skip">(
    "openai",
  );
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [aiModel, setAiModel] = useState("gpt-6-luna");
  const [openaiKey, setOpenaiKey] = useState("");
  const [claudeBin, setClaudeBin] = useState("");

  // ── Step 3: brand ─────────────────────────────────────────────────
  const [brand, setBrand] = useState<BrandForm>({
    appName: "Nullkode",
    tagline: t("defaultTagline"),
    colorPrimary: "#843dff",
    colorAccent: "#06b6d4",
    logoDataUrl: null,
    faviconDataUrl: null,
  });

  async function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function submitAdmin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/install/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: setupToken.trim(),
          name: adminName.trim(),
          email: adminEmail.trim(),
          password: adminPassword,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? t("adminFailed"));
      setStep("ai");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitAi(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/install/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          baseUrl: aiBaseUrl.trim() || undefined,
          model: aiModel.trim() || undefined,
          openaiKey: aiProvider === "openai" ? openaiKey.trim() : undefined,
          claudeBin: aiProvider === "claude-cli" ? claudeBin.trim() : undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? t("aiFailed"));
      setStep("brand");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitBrand(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/install/brand", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(brand),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? t("brandFailed"));
      const finish = await fetch("/api/install/finish", { method: "POST" });
      if (!finish.ok) throw new Error(t("finishFailed"));
      setStep("done");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12">
      <header className="mb-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-surface-500">
          {t("eyebrow")}
        </div>
        <h1
          className="mt-3 text-white"
          style={{
            fontSize: "clamp(36px, 4vw, 48px)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            paddingBottom: "0.1em",
          }}
        >
          {t("title")}
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-surface-300">
          {t("intro")}
        </p>
      </header>

      <StepProgress step={step} labels={{ admin: t("stepAdmin"), ai: t("stepAi"), brand: t("stepBrand"), done: t("stepDone") }} />

      <div className="mt-8 rounded-xl border border-surface-800 bg-surface-900 p-7">
        {step === "admin" && (
          <form onSubmit={submitAdmin} className="space-y-5">
            <h2 className="text-xl font-semibold tracking-tight">{t("adminTitle")}</h2>
            <p className="text-sm text-surface-300">
              {t("adminBody")}
            </p>
            <Field label={t("setupCode")} value={setupToken} onChange={setSetupToken} required />
            <p className="text-xs text-surface-400">{t("setupCodeHint")}</p>
            <Field
              label={t("name")}
              value={adminName}
              onChange={setAdminName}
              autoComplete="name"
              required
            />
            <Field
              label={t("email")}
              type="email"
              value={adminEmail}
              onChange={setAdminEmail}
              autoComplete="email"
              required
            />
            <Field
              label={t("password")}
              type="password"
              value={adminPassword}
              onChange={setAdminPassword}
              autoComplete="new-password"
              required
            />
            <SubmitRow busy={submitting} label={t("continue")} busyLabel={t("working")} error={error} />
          </form>
        )}

        {step === "ai" && (
          <form onSubmit={submitAi} className="space-y-5">
            <h2 className="text-xl font-semibold tracking-tight">{t("aiTitle")}</h2>
            <p className="text-sm text-surface-300">
              {t("aiBody")}
            </p>
            <div className="space-y-2">
              {(["openai", "claude-cli", "skip"] as const).map((p) => (
                <label
                  key={p}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                    aiProvider === p
                      ? "border-brand-500 bg-brand-500/5"
                      : "border-surface-800 hover:border-surface-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="ai"
                    value={p}
                    checked={aiProvider === p}
                    onChange={() => setAiProvider(p)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">
                      {t(`provider.${p}`)}
                    </div>
                    <div className="mt-0.5 text-xs text-surface-400">
                      {t(`providerHelp.${p}`)}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {aiProvider === "openai" && <><Field label={t("baseUrl")} value={aiBaseUrl} onChange={setAiBaseUrl} /><Field label={t("modelId")} value={aiModel} onChange={setAiModel} required /><p className="text-xs text-surface-400">{t("localHint")}</p></>}
            {aiProvider === "openai" && (
              <Field
                label={t("apiKey")}
                type="password"
                value={openaiKey}
                onChange={setOpenaiKey}
                placeholder="sk-..."
              />
            )}
            {aiProvider === "claude-cli" && (
              <Field
                label={t("cliPath")}
                value={claudeBin}
                onChange={setClaudeBin}
                placeholder="/usr/local/bin/…"
              />
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("admin")}
                className="text-sm text-surface-400 hover:text-white"
              >
                <span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {t("back")}
              </button>
              <SubmitRow busy={submitting} label={t("continue")} busyLabel={t("working")} error={error} inline />
            </div>
          </form>
        )}

        {step === "brand" && (
          <form onSubmit={submitBrand} className="space-y-5">
            <h2 className="text-xl font-semibold tracking-tight">
              {t("brandTitle")}
            </h2>
            <p className="text-sm text-surface-300">
              {t("brandBody", { app: "Nullkode" })}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("appName")}
                value={brand.appName}
                onChange={(v) => setBrand((b) => ({ ...b, appName: v }))}
              />
              <Field
                label={t("tagline")}
                value={brand.tagline}
                onChange={(v) => setBrand((b) => ({ ...b, tagline: v }))}
              />
              <ColorField
                label={t("primary")}
                value={brand.colorPrimary}
                onChange={(v) => setBrand((b) => ({ ...b, colorPrimary: v }))}
              />
              <ColorField
                label={t("accent")}
                value={brand.colorAccent}
                onChange={(v) => setBrand((b) => ({ ...b, colorAccent: v }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FileField
                label={t("logo")}
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                preview={brand.logoDataUrl}
                onPick={async (f) => {
                  if (f.size > 200_000) {
                    setError(t("logoSize"));
                    return;
                  }
                  const dataUrl = await readFileAsDataUrl(f);
                  setBrand((b) => ({ ...b, logoDataUrl: dataUrl }));
                }}
                onClear={() => setBrand((b) => ({ ...b, logoDataUrl: null }))}
              />
              <FileField
                label={t("favicon")}
                accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
                preview={brand.faviconDataUrl}
                onPick={async (f) => {
                  if (f.size > 200_000) {
                    setError(t("faviconSize"));
                    return;
                  }
                  const dataUrl = await readFileAsDataUrl(f);
                  setBrand((b) => ({ ...b, faviconDataUrl: dataUrl }));
                }}
                onClear={() => setBrand((b) => ({ ...b, faviconDataUrl: null }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep("ai")}
                className="text-sm text-surface-400 hover:text-white"
              >
                <span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {t("back")}
              </button>
              <SubmitRow busy={submitting} label={t("finish")} busyLabel={t("working")} error={error} inline />
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="py-10 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald-500/20">
              <svg
                className="h-7 w-7 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">{t("doneTitle")}</h2>
            <p className="mt-2 text-sm text-surface-400">{t("doneBody")}</p>
          </div>
        )}
      </div>

      <footer className="mt-8 text-center text-[11px] text-surface-500">
        {t.rich("footer", { app: "Nullkode", mono: (c) => <span className="font-mono" dir="ltr">{c}</span> })}
      </footer>
    </div>
  );
}

function StepProgress({ step, labels }: { step: Step; labels: Record<Step, string> }) {
  const steps: { key: Step; label: string }[] = [
    { key: "admin", label: labels.admin },
    { key: "ai", label: labels.ai },
    { key: "brand", label: labels.brand },
    { key: "done", label: labels.done },
  ];
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <ol className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-surface-500">
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            className={`inline-grid h-6 w-6 place-items-center rounded-full border text-[10px] ${
              i === idx
                ? "border-brand-500 bg-brand-500/10 text-white"
                : i < idx
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                  : "border-surface-700 text-surface-500"
            }`}
          >
            {i + 1}
          </span>
          <span className={i === idx ? "text-surface-200" : ""}>{s.label}</span>
          {i < steps.length - 1 && <span className="text-surface-700">/</span>}
        </li>
      ))}
    </ol>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-surface-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        className="mt-1.5 w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-white placeholder:text-surface-500 focus:border-brand-400 focus:outline-none"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-surface-300">{label}</span>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-surface-700 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 font-mono text-sm text-white focus:border-brand-400 focus:outline-none"
        />
      </div>
    </label>
  );
}

function FileField({
  label,
  accept,
  preview,
  onPick,
  onClear,
}: {
  label: string;
  accept: string;
  preview: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const t = useTranslations("install");
  return (
    <div>
      <span className="block text-[12px] font-medium text-surface-300">{label}</span>
      <div className="mt-1.5 flex items-center gap-3 rounded-lg border border-dashed border-surface-700 bg-surface-950 p-3">
        {preview ? (
          <img
            src={preview}
            alt=""
            className="h-12 w-12 rounded bg-surface-800 object-contain"
          />
        ) : (
          <div className="grid h-12 w-12 place-items-center rounded bg-surface-800 text-[10px] text-surface-500">
            {t("empty")}
          </div>
        )}
        <label className="cursor-pointer rounded-md border border-surface-700 px-3 py-1.5 text-xs text-surface-200 hover:bg-surface-800">
          {preview ? t("replace") : t("upload")}
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
            }}
          />
        </label>
        {preview && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-surface-400 hover:text-white"
          >
            {t("remove")}
          </button>
        )}
      </div>
    </div>
  );
}

function SubmitRow({
  busy,
  label,
  busyLabel,
  error,
  inline,
}: {
  busy: boolean;
  label: string;
  busyLabel: string;
  error: string | null;
  inline?: boolean;
}) {
  return (
    <div className={inline ? "flex items-center gap-3" : "space-y-2"}>
      {error && <div className="text-sm text-red-400">{error}</div>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-fixed-white hover:bg-brand-400 disabled:opacity-40"
      >
        {busy ? busyLabel : label}
      </button>
    </div>
  );
}
