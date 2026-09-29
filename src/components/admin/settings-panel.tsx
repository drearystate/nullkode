"use client";

import { useEffect, useState } from "react";

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
const FIELD_LABELS: Record<keyof PlanLimitsForUI, string> = {
  maxProjects: "Apps",
  maxPublished: "Published apps",
  maxPagesPerProject: "Pages per app",
  maxCustomDomains: "Custom domains",
  aiActionsPerMonth: "AI actions / month",
  scheduledFlows: "Scheduled workflows",
};
const FIELD_HELP: Record<keyof PlanLimitsForUI, string> = {
  maxProjects: "How many apps someone on this plan can have in total, live or not.",
  maxPublished: "How many of their apps can be live on the web at the same time.",
  maxPagesPerProject: "The most pages a single app can have.",
  maxCustomDomains: "How many of their own web addresses (like shop.theirbusiness.com) they can connect, across all their apps.",
  aiActionsPerMonth: "How many times a month they can ask the AI to build or change something. The count starts again each month.",
  scheduledFlows: "Whether workflows can run on a timer, like every hour. Turning it off stops scheduled workflows on that plan from running.",
};

const KEYS = {
  AI_PROVIDER: "ai.provider",
  AI_OPENAI_API_KEY: "ai.openai.apiKey",
  AI_OPENAI_MODEL_SCAFFOLD: "ai.openai.model.scaffold",
  AI_OPENAI_MODEL_EDIT: "ai.openai.model.edit",
  AI_CLAUDE_MODEL: "ai.claude.model",
  AI_CLAUDE_BIN: "ai.claude.bin",
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
        setOpenaiKeyMask((s[KEYS.AI_OPENAI_API_KEY] as string) || (d.env.OPENAI_API_KEY_set ? "(from .env)" : ""));
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
      });
  }, []);

  async function save() {
    setSaving(true);
    setSavedAt(null);
    const payload: Record<string, string | number | null> = {
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
      setOpenaiKeyMask((d.settings[KEYS.AI_OPENAI_API_KEY] as string) || (d.env.OPENAI_API_KEY_set ? "(from .env)" : ""));
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
    return <div className="text-sm text-surface-400">Loading settings…</div>;
  }

  return (
    <div className="space-y-10">
      <Section id="ai" title="AI Provider" help="Chooses the AI that builds new apps and makes edits for everyone on the platform, including resellers and their clients." subtitle="Pick which engine builds new apps and answers in-editor edits.">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <ProviderCard
              label="OpenAI"
              help="Use OpenAI, or an AI service or model on your own server that works the same way (OpenAI-compatible). You'll set its address, model name and usually a secret key."
              description="OpenAI or any OpenAI-compatible server, including local models. Set the endpoint and model below."
              active={provider === "openai"}
              onSelect={() => setProvider("openai")}
            />
            <ProviderCard
              label="Command-line AI agent"
              help="Use a command-line AI tool installed on this server and signed in to its own subscription, instead of paying per use with a secret key."
              description="Uses a locally installed, signed-in CLI subscription instead of per-token API billing."
              active={provider === "claude-cli"}
              onSelect={() => setProvider("claude-cli")}
            />
          </div>

          {provider === "openai" && (
            <div className="rounded-lg border border-surface-700 bg-surface-900 p-4 space-y-3">
              <Field label="OpenAI / compatible API key" help="The secret key from your AI provider's account. It's kept hidden; leave the box empty to keep the key already saved.">
                <input
                  type="password"
                  className="form-input"
                  placeholder={openaiKeySet ? `Stored: ${openaiKeyMask} — leave blank to keep` : "sk-..."}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                />
                <p className="text-xs text-surface-400 mt-1">
                  {openaiKeySet
                    ? "A key is configured. Enter a new value to replace it, or leave blank to keep the current one."
                    : "No key configured — add one or set OPENAI_API_KEY in .env."}
                </p>
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="API base URL" help="The web address of your AI service. Leave it empty to use OpenAI itself, or enter your own server's address to use a model you run yourself." hint="Empty = OpenAI. Local server example: http://host.docker.internal:11434/v1">
                  <input className="input" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
                </Field>
                <Field label="JSON support" help="How strictly the AI is asked to answer in the fixed format the builder reads. If builds fail with format errors on your AI service, try a looser option." hint="Use JSON mode for compatible servers; text mode if JSON mode is unsupported.">
                  <select className="input" value={jsonMode} onChange={e => setJsonMode(e.target.value)}><option value="json">JSON mode</option><option value="schema">Strict JSON schema</option><option value="text">Prompt only</option></select>
                </Field>
                <Field label="Model context size (tokens)" help="How much text the model can read at once. Leave it empty to detect it automatically. Small models get shorter instructions so they still work." hint="Leave blank to detect it automatically (use Test connection to see the result). Models under 24K get compact prompts.">
                  <input className="input" type="number" min={2048} step={1024} placeholder="Auto-detect" value={contextWindow} onChange={e => setContextWindow(e.target.value)} />
                </Field>
                <Field label="Model thinking" help="Whether a “thinking” model may reason at length before it answers. Off is fastest; On may give better results but builds can take much longer." hint="Reasoning models (e.g. Qwen3) can spend minutes thinking before they answer. Automatic turns it off for local servers so builds stay fast.">
                  <select className="input" value={reasoning} onChange={e => setReasoning(e.target.value)}><option value="auto">Automatic</option><option value="off">Off — fastest</option><option value="on">On — let the model think</option></select>
                </Field>
                <Field label="Maximum output tokens per call" help="Caps how long each AI reply can be (a token is roughly ¾ of a word). Leave it empty for no limit. Small models on your own server may need a cap." hint="Leave blank for no limit. Set one (e.g. 8192) for small local models.">
                  <input className="input" type="number" min={512} max={32768} placeholder={data?.env.AI_MAX_OUTPUT_TOKENS ? `${data.env.AI_MAX_OUTPUT_TOKENS} (set on the server)` : "No limit"} value={maxTokens} onChange={e => setMaxTokens(e.target.value)} />
                </Field>
                <Field label="Scaffold model" help="The exact model name used to build new apps from a description. Leave it empty for the default; for a service other than OpenAI you must enter it." hint="Empty = use code default">
                  <input
                    className="form-input"
                    placeholder="gpt-6-luna"
                    value={scaffoldModel}
                    onChange={(e) => setScaffoldModel(e.target.value)}
                  />
                </Field>
                <Field label="Edit model" help="The exact model name used for AI edits in the page editor. Leave it empty for the default; for a service other than OpenAI you must enter it." hint="Empty = use code default">
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
                  data-help="Saves the settings above, then sends a short test message to your AI service and shows whether it replied, how fast, and how much text the model can read."
                  onClick={() => test("openai")}
                  disabled={testing !== null}
                >
                  {testing === "openai" ? "Testing…" : "Test connection"}
                </button>
              </div>
            </div>
          )}

          {provider === "claude-cli" && (
            <div className="rounded-lg border border-surface-700 bg-surface-900 p-4 space-y-3">
              <p className="text-sm text-surface-300">
                The command-line AI tool must be installed on this server and signed in, once, as the user that runs
                this platform (or the dedicated runner account, if one is configured). See docs/deploy/plesk.md.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Model" help="Which model the command-line AI tool should use, by its short name or full ID." hint="The tool's short model name or full ID">
                  <input
                    className="form-input"
                    placeholder="Model name"
                    value={claudeModel}
                    onChange={(e) => setClaudeModel(e.target.value)}
                  />
                </Field>
                <Field label="Binary path" help="Where the command-line AI tool is installed on this server. Leave it empty to let the server find it by itself." hint="Empty = $PATH lookup">
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
                  data-help="Saves these settings, then checks that the command-line AI tool on this server starts, is signed in and replies."
                  onClick={() => test("claude-cli")}
                  disabled={testing !== null}
                >
                  {testing === "claude-cli" ? "Testing…" : "Test the AI agent"}
                </button>
              </div>
            </div>
          )}

          {testResult && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                testResult.ok
                  ? "border-emerald-700 bg-emerald-900/20 text-emerald-100"
                  : "border-red-700 bg-red-900/20 text-red-100"
              }`}
            >
              <strong>{testResult.ok ? "OK" : "Failed"}</strong> — {testResult.message}
              <span className="text-surface-400"> ({testResult.latencyMs}ms)</span>
            </div>
          )}


          <div className="flex items-center gap-3 pt-2">
            <button onClick={save} disabled={saving} className="btn btn-primary" data-help="Saves the AI settings. They apply to everyone on the platform, including resellers and their clients.">
              {saving ? "Saving…" : "Save changes"}
            </button>
            {savedAt && <span className="text-sm text-emerald-400">Saved.</span>}
          </div>
        </div>
      </Section>

      <Section
        id="plans"
        title="Plans & limits"
        help="Sets what your direct customers get on each plan; resellers set their own for their clients. Lowering a limit never deletes anything, it only stops people adding more."
        subtitle="What each plan includes. Tick unlimited for no limit. Reset returns a plan to the built-in defaults. You (and resellers) are never limited."
      >
        <div className="overflow-x-auto rounded-lg border border-surface-700">
          <table className="w-full text-sm">
            <thead className="bg-surface-900 text-surface-400 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Limit</th>
                {PLAN_ORDER.map((k) => (
                  <th key={k} className="px-3 py-2 text-left">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NUMERIC_FIELDS.map((field) => (
                <tr key={field} className="border-t border-surface-800">
                  <td className="px-3 py-2 text-surface-200 text-sm whitespace-nowrap" data-help={FIELD_HELP[field]}>{FIELD_LABELS[field]}</td>
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
                            aria-label={`${plan.charAt(0) + plan.slice(1).toLowerCase()}: ${FIELD_LABELS[field]}`}
                            disabled={unlimited}
                            value={unlimited ? "" : String(v ?? 0)}
                            onChange={(e) => updateNumericField(setPlanLimits, plan, field, e.target.value)}
                          />
                          <label className="text-[11px] text-surface-400 flex items-center gap-1">
                            <input
                              type="checkbox"
                              aria-label={`${plan.charAt(0) + plan.slice(1).toLowerCase()}: ${FIELD_LABELS[field]} unlimited`}
                              checked={unlimited}
                              onChange={(e) => toggleUnlimited(setPlanLimits, plan, field, e.target.checked)}
                            />
                            unlimited
                          </label>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t border-surface-800">
                <td className="px-3 py-2 text-surface-200 text-xs" data-help={FIELD_HELP.scheduledFlows}>Scheduled workflows</td>
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
                      enabled
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
                setPlanError((await res.text().catch(() => "")) || "Save failed");
              }
            }}
            disabled={planSaving}
            className="btn btn-primary"
            data-help="Saves the limits for all four plans. They apply to your direct customers straight away."
          >
            {planSaving ? "Saving…" : "Save plan limits"}
          </button>
          <button
            onClick={() => {
              setPlanLimits(clonePlanLimits(defaultPlanLimits));
              setPlanSavedAt(null);
              setPlanError(null);
            }}
            disabled={planSaving}
            className="btn btn-secondary"
            data-help="Fills in the built-in standard limits. Nothing changes until you press Save plan limits."
          >
            Reset to the standard limits
          </button>
          {planSavedAt && <span className="text-sm text-emerald-400">Saved.</span>}
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
      className={`text-left rounded-lg border p-4 transition ${
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
