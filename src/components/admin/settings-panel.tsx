"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

type SettingsResponse = {
  settings: Record<string, unknown>;
  env: {
    OPENAI_API_KEY_set: boolean;
    AI_PROVIDER: string | null;
    ADMIN_EMAILS: string | null;
    AI_MAX_OUTPUT_TOKENS: string | null;
    STRIPE_SECRET_KEY_set: boolean;
    STRIPE_WEBHOOK_SECRET_set: boolean;
    STRIPE_PRICE_STARTER_set: boolean;
    STRIPE_PRICE_PRO_set: boolean;
    STRIPE_PRICE_TEAM_set: boolean;
  };
};

type TestResult = { ok: boolean; message: string; latencyMs: number; provider: string };

export type PlanLimitsForUI = {
  maxProjects: number | null;
  maxPublished: number | null;
  maxPagesPerProject: number | null;
  maxCustomDomains: number | null;
  aiActionsPerMonth: number | null;
  scheduledFlows: boolean;
};

type PlanKey = "FREE" | "STARTER" | "PRO" | "TEAM";
const PLAN_ORDER: PlanKey[] = ["FREE", "STARTER", "PRO", "TEAM"];
const NUMERIC_FIELDS: Array<keyof PlanLimitsForUI> = [
  "maxProjects",
  "maxPublished",
  "maxPagesPerProject",
  "maxCustomDomains",
  "aiActionsPerMonth",
];

const KEYS = {
  AI_PROVIDER: "ai.provider",
  AI_OPENAI_API_KEY: "ai.openai.apiKey",
  AI_OPENAI_MODEL_SCAFFOLD: "ai.openai.model.scaffold",
  AI_OPENAI_MODEL_EDIT: "ai.openai.model.edit",
  AI_CLAUDE_MODEL: "ai.claude.model",
  AI_CLAUDE_BIN: "ai.claude.bin",
  AI_VISION: "ai.vision",
  AI_BUILD_POLICY: "ai.buildPolicy",
  PLAN_LIMITS: "plans.limits",
};

export function SettingsPanel({
  initialPlanLimits,
  defaultPlanLimits,
}: {
  initialPlanLimits: Record<PlanKey, PlanLimitsForUI>;
  defaultPlanLimits: Record<PlanKey, PlanLimitsForUI>;
}) {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [provider, setProvider] = useState<"openai" | "claude-cli">("openai");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiKeySet, setOpenaiKeySet] = useState(false);
  const [openaiKeyMask, setOpenaiKeyMask] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [jsonMode, setJsonMode] = useState("json");
  const [maxTokens, setMaxTokens] = useState("");
  const [contextWindow, setContextWindow] = useState("");
  const [reasoning, setReasoning] = useState("auto");
  const [scaffoldModel, setScaffoldModel] = useState("");
  const [editModel, setEditModel] = useState("");
  const [claudeModel, setClaudeModel] = useState("");
  const [claudeBin, setClaudeBin] = useState("");
  const [vision, setVision] = useState("auto");
  const [buildPolicy, setBuildPolicy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [planLimits, setPlanLimits] = useState<Record<PlanKey, PlanLimitsForUI>>(() =>
    clonePlanLimits(initialPlanLimits),
  );
  const [planSaving, setPlanSaving] = useState(false);
  const [planSavedAt, setPlanSavedAt] = useState<number | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const t = useTranslations("admin.settings");
  const tp = useTranslations("admin.plans");
  const tc = useTranslations("common");
  const format = useFormatter();

  // These sections render after the settings load, so a link like #plans
  // can't scroll on its own.
  const loaded = Boolean(data);
  useEffect(() => {
    if (loaded && (location.hash === "#ai" || location.hash === "#plans")) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [loaded]);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d: SettingsResponse) => {
        setData(d);
        const s = d.settings;
        const p = (s[KEYS.AI_PROVIDER] as string) || (d.env.AI_PROVIDER === "claude-cli" || d.env.AI_PROVIDER === "claude" ? "claude-cli" : "openai");
        setProvider(p as "openai" | "claude-cli");
        setOpenaiKeySet(Boolean(s[`${KEYS.AI_OPENAI_API_KEY}.set`]) || d.env.OPENAI_API_KEY_set);
        setOpenaiKeyMask((s[KEYS.AI_OPENAI_API_KEY] as string) || (d.env.OPENAI_API_KEY_set ? t("fromEnv") : ""));
        setBaseUrl((s["ai.baseUrl"] as string) || "");
        // Mirror the server default so a first save doesn't change behaviour:
        // strict schema on OpenAI, plain JSON mode on other endpoints.
        const url = (s["ai.baseUrl"] as string) || "";
        setJsonMode((s["ai.jsonMode"] as string) || (!url || url.includes("api.openai.com") ? "schema" : "json"));
        setMaxTokens(s["ai.maxOutputTokens"] ? String(s["ai.maxOutputTokens"]) : "");
        setContextWindow(s["ai.contextWindow"] ? String(s["ai.contextWindow"]) : "");
        setReasoning((s["ai.reasoning"] as string) || "auto");
        setScaffoldModel((s[KEYS.AI_OPENAI_MODEL_SCAFFOLD] as string) || "");
        setEditModel((s[KEYS.AI_OPENAI_MODEL_EDIT] as string) || "");
        setClaudeModel((s[KEYS.AI_CLAUDE_MODEL] as string) || "");
        setClaudeBin((s[KEYS.AI_CLAUDE_BIN] as string) || "");
        setVision((s[KEYS.AI_VISION] as string) || "auto");
        setBuildPolicy(s[KEYS.AI_BUILD_POLICY] !== false);
      });
  }, [t]);

  async function save() {
    setSaving(true);
    setSavedAt(null);
    const payload: Record<string, string | number | boolean | null> = {
      "ai.baseUrl": baseUrl,
      "ai.jsonMode": jsonMode,
      "ai.maxOutputTokens": maxTokens.trim() ? Number(maxTokens) : null,
      "ai.contextWindow": contextWindow.trim() ? Number(contextWindow) : null,
      "ai.reasoning": reasoning,
      [KEYS.AI_PROVIDER]: provider,
      [KEYS.AI_OPENAI_MODEL_SCAFFOLD]: scaffoldModel,
      [KEYS.AI_OPENAI_MODEL_EDIT]: editModel,
      [KEYS.AI_CLAUDE_MODEL]: claudeModel,
      [KEYS.AI_CLAUDE_BIN]: claudeBin,
      [KEYS.AI_VISION]: vision,
      [KEYS.AI_BUILD_POLICY]: buildPolicy,
    };
    if (openaiKey.trim().length > 0) payload[KEYS.AI_OPENAI_API_KEY] = openaiKey.trim();
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setSavedAt(Date.now());
      setOpenaiKey("");
      // refresh redacted view
      const d: SettingsResponse = await fetch("/api/admin/settings").then((r) => r.json());
      setData(d);
      setOpenaiKeySet(Boolean(d.settings[`${KEYS.AI_OPENAI_API_KEY}.set`]) || d.env.OPENAI_API_KEY_set);
      setOpenaiKeyMask((d.settings[KEYS.AI_OPENAI_API_KEY] as string) || (d.env.OPENAI_API_KEY_set ? t("fromEnv") : ""));
    }
  }

  async function test(prov: "openai" | "claude-cli") {
    setTesting(prov);
    setTestResult(null);
    // Test what's on screen: save it first.
    await save();
    const res = await fetch("/api/admin/settings/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: prov }),
    });
    const data: TestResult = await res.json();
    setTestResult(data);
    setTesting(null);
  }

  if (!data) {
    return <div className="text-sm text-surface-400">{t("loading")}</div>;
  }

  return (
    <div className="space-y-10">
      <Section id="ai" title={t("aiTitle")} help={t("aiHelp")} subtitle={t("aiSubtitle")}>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <ProviderCard
              label="OpenAI"
              help={t("openaiHelp")}
              description={t("openaiDescription")}
              active={provider === "openai"}
              onSelect={() => setProvider("openai")}
            />
            <ProviderCard
              label={t("cliLabel")}
              help={t("cliHelp")}
              description={t("cliDescription")}
              active={provider === "claude-cli"}
              onSelect={() => setProvider("claude-cli")}
            />
          </div>

          {provider === "openai" && (
            <div className="rounded-lg border border-surface-700 bg-surface-900 p-4 space-y-3">
              <Field label={t("apiKey")} help={t("apiKeyHelp")}>
                <input
                  type="password"
                  className="form-input"
                  placeholder={openaiKeySet ? t("apiKeyStored", { mask: openaiKeyMask }) : "sk-..."}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                />
                <p className="text-xs text-surface-400 mt-1">
                  {openaiKeySet
                    ? t("apiKeySet")
                    : t("apiKeyNone")}
                </p>
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label={t("baseUrl")} help={t("baseUrlHelp")} hint={t("baseUrlHint")}>
                  <input className="input" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
                </Field>
                <Field label={t("jsonSupport")} help={t("jsonSupportHelp")} hint={t("jsonSupportHint")}>
                  <select className="input" value={jsonMode} onChange={e => setJsonMode(e.target.value)}><option value="json">{t("jsonMode")}</option><option value="schema">{t("jsonSchema")}</option><option value="text">{t("jsonText")}</option></select>
                </Field>
                <Field label={t("contextSize")} help={t("contextSizeHelp")} hint={t("contextSizeHint")}>
                  <input className="input" type="number" min={2048} step={1024} placeholder={t("autoDetect")} value={contextWindow} onChange={e => setContextWindow(e.target.value)} />
                </Field>
                <Field label={t("thinking")} help={t("thinkingHelp")} hint={t("thinkingHint")}>
                  <select className="input" value={reasoning} onChange={e => setReasoning(e.target.value)}><option value="auto">{t("thinkingAuto")}</option><option value="off">{t("thinkingOff")}</option><option value="on">{t("thinkingOn")}</option></select>
                </Field>
                <Field label={t("maxTokens")} help={t("maxTokensHelp")} hint={t("maxTokensHint")}>
                  <input className="input" type="number" min={512} max={32768} placeholder={data?.env.AI_MAX_OUTPUT_TOKENS ? t("maxTokensServer", { n: data.env.AI_MAX_OUTPUT_TOKENS }) : t("noLimit")} value={maxTokens} onChange={e => setMaxTokens(e.target.value)} />
                </Field>
                <Field label={t("scaffoldModel")} help={t("scaffoldModelHelp")} hint={t("modelHint")}>
                  <input
                    className="form-input"
                    placeholder="gpt-6-luna"
                    value={scaffoldModel}
                    onChange={(e) => setScaffoldModel(e.target.value)}
                  />
                </Field>
                <Field label={t("editModel")} help={t("editModelHelp")} hint={t("modelHint")}>
                  <input
                    className="form-input"
                    placeholder="gpt-6-luna"
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                  />
                </Field>
              </div>
              <div>
                <button
                  className="btn btn-secondary"
                  data-help={t("testHelp")}
                  onClick={() => test("openai")}
                  disabled={testing !== null}
                >
                  {testing === "openai" ? t("testing") : t("test")}
                </button>
              </div>
            </div>
          )}

          {provider === "claude-cli" && (
            <div className="rounded-lg border border-surface-700 bg-surface-900 p-4 space-y-3">
              <p className="text-sm text-surface-300">
                {t("cliNote")}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label={t("cliModel")} help={t("cliModelHelp")} hint={t("cliModelHint")}>
                  <input
                    className="form-input"
                    placeholder={t("cliModelPlaceholder")}
                    value={claudeModel}
                    onChange={(e) => setClaudeModel(e.target.value)}
                  />
                </Field>
                <Field label={t("cliBin")} help={t("cliBinHelp")} hint={t("cliBinHint")}>
                  <input
                    className="form-input"
                    placeholder="/usr/local/bin/…"
                    value={claudeBin}
                    onChange={(e) => setClaudeBin(e.target.value)}
                  />
                </Field>
              </div>
              <div>
                <button
                  className="btn btn-secondary"
                  data-help={t("cliTestHelp")}
                  onClick={() => test("claude-cli")}
                  disabled={testing !== null}
                >
                  {testing === "claude-cli" ? t("testing") : t("cliTest")}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-surface-700 bg-surface-900 p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={t("vision")} help={t("visionHelp")} hint={t("visionHint")}>
                <select className="input" value={vision} onChange={(e) => setVision(e.target.value)}>
                  <option value="auto">{t("visionAuto")}</option>
                  <option value="on">{t("visionOn")}</option>
                  <option value="off">{t("visionOff")}</option>
                </select>
              </Field>
              <div data-help={t("buildPolicyHelp")}>
                <label className="flex items-start gap-2 text-sm text-surface-200">
                  <input type="checkbox" className="mt-1" checked={buildPolicy} onChange={(e) => setBuildPolicy(e.target.checked)} />
                  <span>
                    <span className="font-medium">{t("buildPolicy")}</span>
                    <span className="mt-1 block text-xs text-surface-400">{t("buildPolicyHint")}</span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          {testResult && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                testResult.ok
                  ? "border-emerald-700 bg-emerald-900/20 text-emerald-100"
                  : "border-red-700 bg-red-900/20 text-red-100"
              }`}
            >
              <strong>{testResult.ok ? t("testOk") : t("testFailed")}</strong> — {testResult.message}
              <span className="text-surface-400"> {t("latency", { ms: format.number(testResult.latencyMs) })}</span>
            </div>
          )}


          <div className="flex items-center gap-3 pt-2">
            <button onClick={save} disabled={saving} className="btn btn-primary" data-help={t("saveAiHelp")}>
              {saving ? tc("saving") : t("saveChanges")}
            </button>
            {savedAt && <span className="text-sm text-emerald-400">{tc("saved")}</span>}
          </div>
        </div>
      </Section>

      <Section
        id="plans"
        title={t("plansTitle")}
        help={t("plansHelp")}
        subtitle={t("plansSubtitle")}
      >
        <div className="overflow-x-auto rounded-lg border border-surface-700">
          <table className="w-full text-sm">
            <thead className="bg-surface-900 text-surface-400 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-3 py-2 text-start">{t("limit")}</th>
                {PLAN_ORDER.map((k) => (
                  <th key={k} className="px-3 py-2 text-start">{tp(k)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NUMERIC_FIELDS.map((field) => (
                <tr key={field} className="border-t border-surface-800">
                  <td className="px-3 py-2 text-surface-200 text-sm whitespace-nowrap" data-help={t(`limitHelp.${field}`)}>{t(`limitLabel.${field}`)}</td>
                  {PLAN_ORDER.map((plan) => {
                    const v = planLimits[plan][field] as number | null;
                    const unlimited = v === null;
                    return (
                      <td key={plan} className="px-3 py-2 align-top">
                        <div className="flex flex-col gap-1">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            className="form-input w-24"
                            aria-label={t("limitAria", { plan: tp(plan), field: t(`limitLabel.${field}`) })}
                            disabled={unlimited}
                            value={unlimited ? "" : String(v ?? 0)}
                            onChange={(e) => updateNumericField(setPlanLimits, plan, field, e.target.value)}
                          />
                          <label className="text-[11px] text-surface-400 flex items-center gap-1">
                            <input
                              type="checkbox"
                              aria-label={t("limitUnlimitedAria", { plan: tp(plan), field: t(`limitLabel.${field}`) })}
                              checked={unlimited}
                              onChange={(e) => toggleUnlimited(setPlanLimits, plan, field, e.target.checked)}
                            />
                            {t("unlimited")}
                          </label>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t border-surface-800">
                <td className="px-3 py-2 text-surface-200 text-xs" data-help={t("limitHelp.scheduledFlows")}>{t("limitLabel.scheduledFlows")}</td>
                {PLAN_ORDER.map((plan) => (
                  <td key={plan} className="px-3 py-2 align-top">
                    <label className="text-xs text-surface-300 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={planLimits[plan].scheduledFlows}
                        onChange={(e) =>
                          setPlanLimits((prev) => ({
                            ...prev,
                            [plan]: { ...prev[plan], scheduledFlows: e.target.checked },
                          }))
                        }
                      />
                      {t("enabled")}
                    </label>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-3 pt-3">
          <button
            onClick={async () => {
              setPlanSaving(true);
              setPlanError(null);
              setPlanSavedAt(null);
              const res = await fetch("/api/admin/settings", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ [KEYS.PLAN_LIMITS]: planLimits }),
              });
              setPlanSaving(false);
              if (res.ok) {
                setPlanSavedAt(Date.now());
              } else {
                setPlanError((await res.text().catch(() => "")) || t("saveFailed"));
              }
            }}
            disabled={planSaving}
            className="btn btn-primary"
            data-help={t("savePlansHelp")}
          >
            {planSaving ? tc("saving") : t("savePlans")}
          </button>
          <button
            onClick={() => {
              setPlanLimits(clonePlanLimits(defaultPlanLimits));
              setPlanSavedAt(null);
              setPlanError(null);
            }}
            disabled={planSaving}
            className="btn btn-secondary"
            data-help={t("resetHelp")}
          >
            {t("reset")}
          </button>
          {planSavedAt && <span className="text-sm text-emerald-400">{tc("saved")}</span>}
          {planError && <span className="text-sm text-red-400">{planError}</span>}
        </div>
      </Section>

    </div>
  );
}

function Section({ id, title, subtitle, help, children }: { id?: string; title: string; subtitle?: string; help?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-40">
      <h2 className="text-lg font-semibold" data-help={help}>{title}</h2>
      {subtitle && <p className="text-sm text-surface-400 mt-1">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ProviderCard({
  label,
  description,
  help,
  active,
  onSelect,
}: {
  label: string;
  description: string;
  help?: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      type="button"
      data-help={help}
      className={`text-start rounded-lg border p-4 transition ${
        active
          ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500"
          : "border-surface-700 bg-surface-900 hover:border-surface-600"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">{label}</span>
        <span className={`h-3 w-3 rounded-full ${active ? "bg-indigo-400" : "bg-surface-600"}`}></span>
      </div>
      <p className="mt-2 text-xs text-surface-400">{description}</p>
    </button>
  );
}

function Field({
  label,
  hint,
  help,
  children,
}: {
  label: string;
  hint?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block" data-help={help}>
      <span className="text-sm text-surface-200 block mb-1">{label}</span>
      {children}
      {hint && <span className="text-xs text-surface-500 block mt-1">{hint}</span>}
    </label>
  );
}

function clonePlanLimits(src: Record<PlanKey, PlanLimitsForUI>): Record<PlanKey, PlanLimitsForUI> {
  const out = {} as Record<PlanKey, PlanLimitsForUI>;
  for (const p of PLAN_ORDER) out[p] = { ...src[p] };
  return out;
}

function updateNumericField(
  setter: React.Dispatch<React.SetStateAction<Record<PlanKey, PlanLimitsForUI>>>,
  plan: PlanKey,
  field: keyof PlanLimitsForUI,
  raw: string,
) {
  const n = raw === "" ? 0 : Math.max(0, Math.floor(Number(raw)));
  if (!Number.isFinite(n)) return;
  setter((prev) => ({ ...prev, [plan]: { ...prev[plan], [field]: n } }));
}

function toggleUnlimited(
  setter: React.Dispatch<React.SetStateAction<Record<PlanKey, PlanLimitsForUI>>>,
  plan: PlanKey,
  field: keyof PlanLimitsForUI,
  unlimited: boolean,
) {
  setter((prev) => ({
    ...prev,
    [plan]: { ...prev[plan], [field]: unlimited ? null : 0 },
  }));
}
