"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Node, Edge } from "reactflow";
import { Plus, Trash2, ChevronDown, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { friendlyTable, stepLabel, type FlowsT } from "./catalog";

type DSColumn = { name: string; type: string };
type DSTable = { name: string; columns: DSColumn[] };
type DS = { id: string; name: string; kind: string; tables: DSTable[] };

type Props = {
  node: Node;
  nodes: Node[];
  edges: Edge[];
  datasources: DS[];
  onChange: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
};

const AUTO_COLUMNS = new Set(["id", "created_at", "updated_at"]);

// Steps that produce a variable, with the implicit name the runtime uses when
// the user hasn't set a custom output. Keep this aligned with runtime.ts.
const IMPLICIT_OUTPUT: Record<string, string> = {
  query: "rows",
  insert: "inserted",
  update: "updated",
  delete: "deleted",
  sheets_read: "rows",
  http_request: "response",
  ai_prompt: "ai",
  parse_json: "parsed",
  math: "result",
  hash_password: "hash",
  verify_password: "verified",
  get_session: "session",
  set_session: "session",
  custom_js: "result",
  lookup: "rows",
  check_role: "roleOk",
  bulk_insert: "inserted",
  bulk_update: "updated",
  bulk_delete: "deleted",
  aggregate: "aggregated",
};

// Steps that work on one table of a database (not a Google Sheet).
const DATA_STEPS = new Set(["query", "insert", "update", "delete", "aggregate", "bulk_insert", "bulk_update", "bulk_delete"]);

function effectiveVarName(node: Node): string | null {
  const t = node.data.nkType as string;
  if (t === "set") {
    const n = (node.data.name as string | undefined)?.trim();
    return n || null;
  }
  const custom = (node.data.output as string | undefined)?.trim();
  if (custom) return custom;
  // A lookup adds the details to the list it was given, under the same name.
  if (t === "lookup") return (node.data.sourceVar as string | undefined)?.trim() || IMPLICIT_OUTPUT.lookup;
  return IMPLICIT_OUTPUT[t] ?? null;
}

function upstreamOf(nodeId: string, nodes: Node[], edges: Edge[]): Node[] {
  const visited = new Set<string>();
  const queue: string[] = [nodeId];
  const out: Node[] = [];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const e of edges) {
      if (e.target === cur && !visited.has(e.source)) {
        visited.add(e.source);
        const n = nodes.find((x) => x.id === e.source);
        if (n) {
          out.push(n);
          queue.push(e.source);
        }
      }
    }
  }
  return out;
}

type VarOption = { label: string; token: string; hint?: string };

function buildVarOptions(
  currentId: string,
  nodes: Node[],
  edges: Edge[],
  tr: FlowsT
): { fromSteps: VarOption[]; hasTrigger: boolean } {
  const upstream = upstreamOf(currentId, nodes, edges);
  const hasTrigger = upstream.some((n) => (n.data.nkType as string) === "trigger");
  const fromSteps: VarOption[] = [];
  for (const n of upstream) {
    const t = n.data.nkType as string;
    if (t === "trigger") continue;
    const varName = effectiveVarName(n);
    if (!varName) continue;
    const label = stepLabel(t, n.data.label, tr);
    fromSteps.push({
      label,
      token: `{{vars.${varName}}}`,
      hint: varName,
    });
  }
  return { fromSteps, hasTrigger };
}

export function NodeInspector({ node, nodes, edges, datasources, onChange, onDelete }: Props) {
  const t = node.data.nkType as string;
  const tr = useTranslations("flows");
  const tc = useTranslations("common");
  const varOptions = useMemo(
    () => buildVarOptions(node.id, nodes, edges, tr),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node.id, nodes, edges]
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-surface-500">{tr("inspector.step")}</div>
          <div className="font-semibold truncate">{stepLabel(t, node.data.label, tr)}</div>
        </div>
        <button className="btn-danger text-xs shrink-0" onClick={onDelete} data-help={tr("inspector.deleteHelp")}>
          {tc("delete")}
        </button>
      </div>

      <Field label={tr("inspector.fields.stepName.label")} help={tr("inspector.fields.stepName.help")}>
        <input
          className="input"
          value={(node.data.label as string) ?? ""}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder={tr("inspector.placeholders.stepName")}
        />
      </Field>

      {DATA_STEPS.has(t) && (
        <DataNodeFields
          node={node}
          datasources={datasources.filter((d) => d.kind !== "GOOGLE_SHEETS")}
          varOptions={varOptions}
          onChange={onChange}
        />
      )}

      {(t === "sheets_read" || t === "sheets_append") && (
        <SheetsFields
          node={node}
          datasources={datasources.filter((d) => d.kind === "GOOGLE_SHEETS")}
          varOptions={varOptions}
          onChange={onChange}
        />
      )}

      {t === "branch" && (
        <>
          <Field label={tr("inspector.fields.whenThisValue.label")} help={tr("inspector.fields.whenThisValue.help")}>
            <ValueInput
              value={(node.data.left as string) ?? ""}
              onChange={(v) => onChange({ left: v })}
              varOptions={varOptions}
              placeholder={tr("inspector.placeholders.pickValue")}
            />
          </Field>
          <Field label={tr("inspector.fields.is.label")} help={tr("inspector.fields.is.help")}>
            <select
              className="input"
              value={(node.data.op as string) ?? "=="}
              onChange={(e) => onChange({ op: e.target.value })}
            >
              <option value="==">{tr("inspector.ops.eq")}</option>
              <option value="!=">{tr("inspector.ops.ne")}</option>
              <option value=">">{tr("inspector.ops.gt")}</option>
              <option value="<">{tr("inspector.ops.lt")}</option>
              <option value=">=">{tr("inspector.ops.gte")}</option>
              <option value="<=">{tr("inspector.ops.lte")}</option>
              <option value="contains">{tr("inspector.ops.contains")}</option>
              <option value="exists">{tr("inspector.ops.exists")}</option>
            </select>
          </Field>
          {node.data.op !== "exists" && (
            <Field label={tr("inspector.fields.thisValue.label")} help={tr("inspector.fields.thisValue.help")}>
              <ValueInput
                value={(node.data.right as string) ?? ""}
                onChange={(v) => onChange({ right: v })}
                varOptions={varOptions}
                placeholder={tr("inspector.placeholders.egActive")}
              />
            </Field>
          )}
          <Hint>{tr("inspector.branchHint")}</Hint>
        </>
      )}

      {t === "set" && (
        <>
          <Field label={tr("inspector.fields.variableName.label")} help={tr("inspector.fields.variableName.help")}>
            <input
              className="input"
              value={(node.data.name as string) ?? ""}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={tr("inspector.placeholders.egGreeting")}
            />
          </Field>
          <Field label={tr("inspector.fields.value.label")} help={tr("inspector.fields.value.help")}>
            <ValueInput
              value={(node.data.value as string) ?? ""}
              onChange={(v) => onChange({ value: v })}
              varOptions={varOptions}
              placeholder={tr("inspector.placeholders.helloThere")}
            />
          </Field>
        </>
      )}

      {t === "http_request" && (
        <>
          <Field label={tr("inspector.fields.method.label")} help={tr("inspector.fields.method.help")}>
            <select
              className="input"
              value={(node.data.method as string) ?? "GET"}
              onChange={(e) => onChange({ method: e.target.value })}
            >
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label={tr("inspector.fields.url.label")} help={tr("inspector.fields.url.help")}>
            <ValueInput
              value={(node.data.url as string) ?? ""}
              onChange={(v) => onChange({ url: v })}
              varOptions={varOptions}
              placeholder="https://api.example.com/x"
            />
          </Field>
          {node.data.method !== "GET" && node.data.method !== "DELETE" && (
            <KeyValueBuilder
              label={tr("inspector.body")}
              help={tr("inspector.bodyHelp")}
              value={parseJsonOrEmpty(node.data.body as string)}
              onChange={(obj) => onChange({ body: JSON.stringify(obj) })}
              varOptions={varOptions}
              emptyHint={tr("inspector.bodyEmpty")}
            />
          )}
          <OutputVariableAdvanced
            value={(node.data.output as string) ?? ""}
            defaultName={IMPLICIT_OUTPUT.http_request}
            onChange={(v) => onChange({ output: v })}
          />
        </>
      )}

      {t === "response" && (
        <ResponseFields
          node={node}
          varOptions={varOptions}
          onChange={onChange}
        />
      )}

      {t === "send_push" && (
        <>
          <p className="text-xs text-surface-400">{tr("inspector.pushIntro")}</p>
          <Field label={tr("inspector.fields.pushTitle.label")} help={tr("inspector.fields.pushTitle.help")}>
            <ValueInput value={(node.data.title as string) ?? ""} onChange={(v) => onChange({ title: v })} varOptions={varOptions} placeholder={tr("inspector.placeholders.pushTitle")} />
          </Field>
          <Field label={tr("inspector.fields.pushMessage.label")} help={tr("inspector.fields.pushMessage.help")}>
            <ValueTextarea value={(node.data.body as string) ?? ""} onChange={(v) => onChange({ body: v })} varOptions={varOptions} placeholder={tr("inspector.placeholders.pushMessage")} minHeight={90} />
          </Field>
          <Field label={tr("inspector.fields.pushUrl.label")} help={tr("inspector.fields.pushUrl.help")}>
            <ValueInput value={(node.data.url as string) ?? ""} onChange={(v) => onChange({ url: v })} varOptions={varOptions} placeholder="/menu" />
          </Field>
        </>
      )}

      {t === "email" && (
        <>
          <Field label={tr("inspector.fields.emailTo.label")} help={tr("inspector.fields.emailTo.help")}>
            <ValueInput
              value={(node.data.to as string) ?? ""}
              onChange={(v) => onChange({ to: v })}
              varOptions={varOptions}
              placeholder="recipient@example.com"
            />
          </Field>
          <Field label={tr("inspector.fields.emailFrom.label")} help={tr("inspector.fields.emailFrom.help")}>
            <input
              className="input"
              value={(node.data.from as string) ?? ""}
              onChange={(e) => onChange({ from: e.target.value })}
              placeholder="you@yourdomain.com"
            />
          </Field>
          <Field label={tr("inspector.fields.emailSubject.label")} help={tr("inspector.fields.emailSubject.help")}>
            <ValueInput
              value={(node.data.subject as string) ?? ""}
              onChange={(v) => onChange({ subject: v })}
              varOptions={varOptions}
              placeholder={tr("inspector.placeholders.emailSubject")}
            />
          </Field>
          <Field label={tr("inspector.fields.emailMessage.label")} help={tr("inspector.fields.emailMessage.help")}>
            <ValueTextarea
              value={(node.data.body as string) ?? ""}
              onChange={(v) => onChange({ body: v })}
              varOptions={varOptions}
              placeholder={tr("inspector.placeholders.emailBody")}
              minHeight={140}
            />
          </Field>
          <OutputVariableAdvanced
            value={(node.data.output as string) ?? ""}
            defaultName="sent"
            onChange={(v) => onChange({ output: v })}
          />
        </>
      )}

      {t === "ai_prompt" && (
        <>
          <Field label={tr("inspector.fields.aiSystem.label")} help={tr("inspector.fields.aiSystem.help")}>
            <ValueTextarea
              value={(node.data.system as string) ?? ""}
              onChange={(v) => onChange({ system: v })}
              varOptions={varOptions}
              placeholder={tr("inspector.placeholders.aiSystem")}
              minHeight={70}
            />
          </Field>
          <Field label={tr("inspector.fields.aiPrompt.label")} help={tr("inspector.fields.aiPrompt.help")}>
            <ValueTextarea
              value={(node.data.prompt as string) ?? ""}
              onChange={(v) => onChange({ prompt: v })}
              varOptions={varOptions}
              placeholder={tr("inspector.placeholders.aiPrompt")}
              minHeight={100}
            />
          </Field>
          <OutputVariableAdvanced
            value={(node.data.output as string) ?? ""}
            defaultName={IMPLICIT_OUTPUT.ai_prompt}
            onChange={(v) => onChange({ output: v })}
          />
        </>
      )}

      {t === "delay" && (
        <Field label={tr("inspector.fields.seconds.label")} help={tr("inspector.fields.seconds.help")}>
          <input
            className="input"
            type="number"
            min={0}
            max={60}
            value={(node.data.seconds as number) ?? 0}
            onChange={(e) => onChange({ seconds: Number(e.target.value) })}
          />
        </Field>
      )}

      {t === "parse_json" && (
        <>
          <Field label={tr("inspector.fields.jsonInput.label")} help={tr("inspector.fields.jsonInput.help")}>
            <ValueInput
              value={(node.data.input as string) ?? ""}
              onChange={(v) => onChange({ input: v })}
              varOptions={varOptions}
              placeholder={tr("inspector.placeholders.jsonInput")}
            />
          </Field>
          <OutputVariableAdvanced
            value={(node.data.output as string) ?? ""}
            defaultName={IMPLICIT_OUTPUT.parse_json}
            onChange={(v) => onChange({ output: v })}
          />
        </>
      )}

      {t === "hash_password" && (
        <>
          <Field label={tr("inspector.fields.hashInput.label")} help={tr("inspector.fields.hashInput.help")}>
            <ValueInput
              value={(node.data.input as string) ?? ""}
              onChange={(v) => onChange({ input: v })}
              varOptions={varOptions}
              placeholder={tr("inspector.placeholders.passwordFromRequest")}
            />
          </Field>
          <OutputVariableAdvanced
            value={(node.data.output as string) ?? ""}
            defaultName={IMPLICIT_OUTPUT.hash_password}
            onChange={(v) => onChange({ output: v })}
          />
        </>
      )}

      {t === "verify_password" && (
        <>
          <Field label={tr("inspector.fields.plainPassword.label")} help={tr("inspector.fields.plainPassword.help")}>
            <ValueInput
              value={(node.data.plain as string) ?? ""}
              onChange={(v) => onChange({ plain: v })}
              varOptions={varOptions}
              placeholder={tr("inspector.placeholders.passwordFromRequest")}
            />
          </Field>
          <Field label={tr("inspector.fields.storedHash.label")} help={tr("inspector.fields.storedHash.help")}>
            <ValueInput
              value={(node.data.hash as string) ?? ""}
              onChange={(v) => onChange({ hash: v })}
              varOptions={varOptions}
              placeholder={tr("inspector.placeholders.hashFromRow")}
            />
          </Field>
          <OutputVariableAdvanced
            value={(node.data.output as string) ?? ""}
            defaultName={IMPLICIT_OUTPUT.verify_password}
            onChange={(v) => onChange({ output: v })}
          />
        </>
      )}

      {t === "set_session" && (
        <Field label={tr("inspector.fields.userId.label")} help={tr("inspector.fields.userId.help")}>
          <ValueInput
            value={(node.data.userId as string) ?? ""}
            onChange={(v) => onChange({ userId: v })}
            varOptions={varOptions}
            placeholder={tr("inspector.placeholders.userIdFromStep")}
          />
        </Field>
      )}

      {t === "get_session" && (
        <OutputVariableAdvanced
          value={(node.data.output as string) ?? ""}
          defaultName={IMPLICIT_OUTPUT.get_session}
          onChange={(v) => onChange({ output: v })}
        />
      )}

      {t === "math" && (
        <>
          <Field label={tr("inspector.fields.firstValue.label")} help={tr("inspector.fields.firstValue.help")}>
            <ValueInput
              value={(node.data.left as string) ?? ""}
              onChange={(v) => onChange({ left: v })}
              varOptions={varOptions}
              placeholder={tr("inspector.placeholders.eg10")}
            />
          </Field>
          <Field label={tr("inspector.fields.operator.label")} help={tr("inspector.fields.operator.help")}>
            <select
              className="input"
              value={(node.data.op as string) ?? "+"}
              onChange={(e) => onChange({ op: e.target.value })}
            >
              <option value="+">{tr("inspector.math.add")}</option>
              <option value="-">{tr("inspector.math.subtract")}</option>
              <option value="*">{tr("inspector.math.multiply")}</option>
              <option value="/">{tr("inspector.math.divide")}</option>
              <option value="%">{tr("inspector.math.remainder")}</option>
            </select>
          </Field>
          <Field label={tr("inspector.fields.secondValue.label")} help={tr("inspector.fields.secondValue.help")}>
            <ValueInput
              value={(node.data.right as string) ?? ""}
              onChange={(v) => onChange({ right: v })}
              varOptions={varOptions}
              placeholder={tr("inspector.placeholders.eg108")}
            />
          </Field>
          <OutputVariableAdvanced
            value={(node.data.output as string) ?? ""}
            defaultName={IMPLICIT_OUTPUT.math}
            onChange={(v) => onChange({ output: v })}
          />
        </>
      )}

      {t === "custom_js" && (
        <CustomJsFields
          node={node}
          nodes={nodes}
          edges={edges}
          onChange={onChange}
        />
      )}

      {t === "lookup" && (
        <LookupFields
          node={node}
          nodes={nodes}
          edges={edges}
          datasources={datasources.filter((d) => d.kind !== "GOOGLE_SHEETS")}
          varOptions={varOptions}
          onChange={onChange}
        />
      )}

      {t === "check_role" && (
        <CheckRoleFields
          node={node}
          nodes={nodes}
          edges={edges}
          varOptions={varOptions}
          onChange={onChange}
        />
      )}

      {t === "clear_session" && (
        <p className="text-xs text-surface-400 leading-relaxed" data-help={tr("inspector.clearSessionHelp")}>
          {tr("inspector.clearSession")}
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────────────────────

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div data-help={help}>
      <div className="label">{label}</div>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] text-surface-500 leading-relaxed">{children}</div>
  );
}

/**
 * Picks the result of an earlier step by its name (vars.<name>), for steps
 * that take a whole list rather than a {{value}} in text.
 */
function StepResultSelect({
  value,
  onChange,
  varOptions,
}: {
  value: string;
  onChange: (v: string) => void;
  varOptions: { fromSteps: VarOption[]; hasTrigger: boolean };
}) {
  const tr = useTranslations("flows");
  const names = varOptions.fromSteps.filter((o) => o.hint);
  const known = names.some((o) => o.hint === value);
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{tr("inspector.choose")}</option>
      {value && !known && <option value={value}>{value}</option>}
      {names.map((o, i) => (
        <option key={`${o.token}-${i}`} value={o.hint}>
          {o.label} ({o.hint})
        </option>
      ))}
    </select>
  );
}

function parseJsonOrEmpty(s: string | undefined): Record<string, string> {
  if (!s) return {};
  try {
    const v = JSON.parse(s);
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out: Record<string, string> = {};
      for (const [k, val] of Object.entries(v)) {
        out[k] = typeof val === "string" ? val : JSON.stringify(val);
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  return {};
}

// ────────────────────────────────────────────────────────────────────────────
// ValueInput — text input with an "Insert value" picker
// ────────────────────────────────────────────────────────────────────────────

function ValueInput({
  value,
  onChange,
  varOptions,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  varOptions: { fromSteps: VarOption[]; hasTrigger: boolean };
  placeholder?: string;
}) {
  return (
    <div className="flex gap-1.5 items-stretch">
      <input
        className="input flex-1 min-w-0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <ValuePicker
        onInsert={(token) => onChange(appendToken(value, token))}
        varOptions={varOptions}
      />
    </div>
  );
}

function ValueTextarea({
  value,
  onChange,
  varOptions,
  placeholder,
  minHeight = 80,
}: {
  value: string;
  onChange: (v: string) => void;
  varOptions: { fromSteps: VarOption[]; hasTrigger: boolean };
  placeholder?: string;
  minHeight?: number;
}) {
  return (
    <div className="relative">
      <textarea
        className="input w-full"
        style={{ minHeight }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <div className="absolute top-1.5 end-1.5">
        <ValuePicker
          onInsert={(token) => onChange(appendToken(value, token))}
          varOptions={varOptions}
        />
      </div>
    </div>
  );
}

function appendToken(current: string, token: string): string {
  if (!current) return token;
  const needsSpace = !/\s$/.test(current);
  return `${current}${needsSpace ? " " : ""}${token}`;
}

function ValuePicker({
  onInsert,
  varOptions,
}: {
  onInsert: (token: string) => void;
  varOptions: { fromSteps: VarOption[]; hasTrigger: boolean };
}) {
  const [open, setOpen] = useState(false);
  const tr = useTranslations("flows");
  const tc = useTranslations("common");
  const [triggerPath, setTriggerPath] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="h-full px-2 rounded-md border border-surface-700 bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs flex items-center gap-1 whitespace-nowrap"
        onClick={() => setOpen((v) => !v)}
        title={tr("inspector.insertTitle")}
        aria-label={tr("inspector.insertLabel")}
        data-help={tr("inspector.insertHelp")}
      >
        <Plus size={13} />
        <span className="hidden sm:inline">{tr("inspector.insert")}</span>
      </button>
      {open && (
        <div className="absolute end-0 top-full mt-1 w-64 max-h-[360px] overflow-auto rounded-lg border border-surface-700 bg-surface-900 shadow-2xl z-50 p-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-wider text-surface-500">
              {tr("inspector.insertValue")}
            </div>
            <button
              className="text-surface-500 hover:text-surface-300"
              onClick={() => setOpen(false)}
              type="button"
              aria-label={tc("close")}
              data-help={tr("inspector.closeHelp")}
            >
              <X size={13} />
            </button>
          </div>

          {varOptions.hasTrigger && (
            <div className="rounded-md bg-surface-950/60 border border-surface-800 p-2" data-help={tr("inspector.fromRequestHelp")}>
              <div className="text-[11px] text-surface-400 mb-1">{tr("inspector.fromRequest")}</div>
              <div className="flex gap-1">
                <input
                  className="input flex-1 min-w-0 text-xs h-8"
                  value={triggerPath}
                  onChange={(e) => setTriggerPath(e.target.value)}
                  placeholder={tr("inspector.placeholders.fieldName")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && triggerPath.trim()) {
                      onInsert(`{{trigger.${triggerPath.trim()}}}`);
                      setTriggerPath("");
                      setOpen(false);
                    }
                  }}
                />
                <button
                  type="button"
                  className="px-2 h-8 rounded-md bg-[#7919ff] hover:bg-brand-500 text-fixed-white text-xs disabled:opacity-40"
                  disabled={!triggerPath.trim()}
                  onClick={() => {
                    onInsert(`{{trigger.${triggerPath.trim()}}}`);
                    setTriggerPath("");
                    setOpen(false);
                  }}
                >
                  {tr("inspector.add")}
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] text-surface-400 px-1 mb-1">{tr("inspector.fromSteps")}</div>
            {varOptions.fromSteps.length === 0 ? (
              <div className="text-[11px] text-surface-500 px-1 py-2">
                {tr("inspector.noSteps")}
              </div>
            ) : (
              <div className="space-y-0.5">
                {varOptions.fromSteps.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    className="w-full text-start px-2 py-1.5 rounded hover:bg-surface-800 text-xs"
                    onClick={() => {
                      onInsert(v.token);
                      setOpen(false);
                    }}
                    data-help={tr("inspector.fromStepHelp")}
                  >
                    <div className="text-surface-100 truncate">{v.label}</div>
                    {v.hint && (
                      <div className="text-[10px] text-surface-500 truncate font-mono">
                        {v.hint}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-surface-800 pt-2">
            <div className="text-[11px] text-surface-400 px-1 mb-1">{tr("inspector.helpers")}</div>
            {[
              { label: tr("inspector.helper.now"), token: "{{now}}", help: tr("inspector.helper.nowHelp") },
              { label: tr("inspector.helper.date"), token: "{{now.date}}", help: tr("inspector.helper.dateHelp") },
              { label: tr("inspector.helper.uuid"), token: "{{uuid}}", help: tr("inspector.helper.uuidHelp") },
            ].map((h) => (
              <button
                key={h.token}
                type="button"
                className="w-full text-start px-2 py-1.5 rounded hover:bg-surface-800 text-xs text-surface-100"
                onClick={() => {
                  onInsert(h.token);
                  setOpen(false);
                }}
                data-help={h.help}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// OutputVariableAdvanced — collapsed disclosure
// ────────────────────────────────────────────────────────────────────────────

function OutputVariableAdvanced({
  value,
  defaultName,
  onChange,
}: {
  value: string;
  defaultName: string;
  onChange: (v: string) => void;
}) {
  const tr = useTranslations("flows");
  return (
    <details className="group rounded-md border border-surface-800 bg-surface-950/40" data-help={tr("inspector.outputHelp")}>
      <summary className="cursor-pointer list-none px-3 py-2 flex items-center justify-between text-xs text-surface-400 hover:text-surface-200">
        <span>{tr("inspector.advanced")}</span>
        <ChevronDown size={14} className="transition group-open:rotate-180" />
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-1">
        <div className="text-[11px] text-surface-500">
          {tr("inspector.outputName")}
        </div>
        <input
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={defaultName}
        />
      </div>
    </details>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// DataNodeFields — query / insert / update / delete, the "many rows" steps
// and "Count or add up records"
// ────────────────────────────────────────────────────────────────────────────

// Steps that pick which records they work on (label and tip: flows.inspector.where.<type>).
const WHERE_STEPS = new Set(["query", "update", "delete", "bulk_update", "bulk_delete", "aggregate"]);

const AGGREGATE_RE = /^(COUNT|SUM|AVG|MIN|MAX)\(\s*(\*|[a-zA-Z_][a-zA-Z0-9_]*)\s*\)$/i;
const NUMBER_TYPES = new Set(["int", "float"]);

function DataNodeFields({
  node,
  datasources,
  varOptions,
  onChange,
}: {
  node: Node;
  datasources: DS[];
  varOptions: { fromSteps: VarOption[]; hasTrigger: boolean };
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const t = node.data.nkType as string;
  const tr = useTranslations("flows");
  const dsId = node.data.datasourceId as string | undefined;
  const ds = datasources.find((d) => d.id === dsId);
  const tableName = node.data.table as string | undefined;
  const table = ds?.tables.find((tb) => tb.name === tableName);
  const columns = table?.columns ?? [];
  const writableColumns = columns.filter((c) => !AUTO_COLUMNS.has(c.name.toLowerCase()));
  const whereText = WHERE_STEPS.has(t) ? { label: tr(`inspector.where.${t}.label`), help: tr(`inspector.where.${t}.help`) } : null;

  return (
    <>
      <Field label={tr("inspector.fields.dataSource.label")} help={tr("inspector.fields.dataSource.help")}>
        <select
          className="input"
          value={dsId ?? ""}
          onChange={(e) =>
            onChange({ datasourceId: e.target.value || undefined, table: undefined })
          }
        >
          <option value="">{tr("inspector.choose")}</option>
          {datasources.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label={tr("inspector.fields.table.label")} help={tr("inspector.fields.table.help")}>
        {ds ? (
          <select
            className="input"
            value={tableName ?? ""}
            onChange={(e) => onChange({ table: e.target.value || undefined })}
          >
            <option value="">{tr("inspector.choose")}</option>
            {ds.tables.map((tb) => (
              <option key={tb.name} value={tb.name}>
                {friendlyTable(tb.name)}
              </option>
            ))}
          </select>
        ) : (
          <input className="input" disabled placeholder={tr("inspector.placeholders.pickSourceFirst")} />
        )}
      </Field>

      {t === "bulk_insert" && (
        <Field label={tr("inspector.fields.rowsToAdd.label")} help={tr("inspector.fields.rowsToAdd.help")}>
          <StepResultSelect
            value={(node.data.rowsVar as string) ?? ""}
            onChange={(v) => onChange({ rowsVar: v || undefined })}
            varOptions={varOptions}
          />
          <Hint>{tr("inspector.bulkInsertHint")}</Hint>
        </Field>
      )}

      {t === "aggregate" && tableName && (
        <AggregateFields node={node} columns={columns} onChange={onChange} />
      )}

      {whereText && tableName && (
        <div data-help={whereText.help}>
          <div className="label">{whereText.label}</div>
          <WhereBuilder
            where={(node.data.where as Record<string, string> | undefined) ?? {}}
            columns={columns}
            varOptions={varOptions}
            onChange={(w) => onChange({ where: w })}
          />
          {(t === "query" || t === "aggregate") && (
            <Hint>{t === "query" ? tr("inspector.queryEmptyHint") : tr("inspector.aggregateEmptyHint")}</Hint>
          )}
          {(t === "delete" || t === "bulk_delete") && (
            <Hint>{tr("inspector.deleteNeedsCondition")}</Hint>
          )}
          {t === "bulk_update" && (
            <Hint>{tr("inspector.updateNeedsCondition")}</Hint>
          )}
        </div>
      )}

      {t === "aggregate" && tableName && (
        <AggregateGrouping node={node} columns={columns} onChange={onChange} />
      )}

      {(t === "insert" || t === "update" || t === "bulk_update") && tableName && (
        <div data-help={t === "insert" ? tr("inspector.insertValuesHelp") : tr("inspector.updateValuesHelp")}>
          <div className="label">{t === "insert" ? tr("inspector.newRowValues") : tr("inspector.setFields")}</div>
          <ValuesForm
            values={(node.data.values as Record<string, string> | undefined) ?? {}}
            columns={writableColumns}
            varOptions={varOptions}
            onChange={(v) => onChange({ values: v })}
            optional={t !== "insert"}
          />
        </div>
      )}

      {!tableName && (ds || !dsId) && (
        <Hint>{tr("inspector.pickTable")}</Hint>
      )}

      <OutputVariableAdvanced
        value={(node.data.output as string) ?? ""}
        defaultName={IMPLICIT_OUTPUT[t] ?? "result"}
        onChange={(v) => onChange({ output: v })}
      />
    </>
  );
}

/** "Count or add up records": what to work out, and of which column. */
function AggregateFields({
  node,
  columns,
  onChange,
}: {
  node: Node;
  columns: DSColumn[];
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const tr = useTranslations("flows");
  const m = AGGREGATE_RE.exec(String(node.data.aggregate ?? "COUNT(*)").trim());
  const fn = m ? m[1].toUpperCase() : "COUNT";
  const col = m && m[2] !== "*" ? m[2] : "";
  const names = [...new Set(["id", ...columns.map((c) => c.name)])];
  const firstNumber = columns.find((c) => NUMBER_TYPES.has(c.type))?.name ?? "id";

  function setFn(next: string) {
    onChange({ aggregate: next === "COUNT" ? "COUNT(*)" : `${next}(${col || firstNumber})` });
  }

  return (
    <>
      <Field label={tr("inspector.fields.whatToWorkOut.label")} help={tr("inspector.fields.whatToWorkOut.help")}>
        <select className="input" value={fn} onChange={(e) => setFn(e.target.value)}>
          <option value="COUNT">{tr("inspector.agg.count")}</option>
          <option value="SUM">{tr("inspector.agg.sum")}</option>
          <option value="AVG">{tr("inspector.agg.avg")}</option>
          <option value="MIN">{tr("inspector.agg.min")}</option>
          <option value="MAX">{tr("inspector.agg.max")}</option>
        </select>
      </Field>
      {fn !== "COUNT" && (
        <Field label={tr("inspector.fields.ofColumn.label")} help={tr("inspector.fields.ofColumn.help")}>
          <select className="input" value={col || firstNumber} onChange={(e) => onChange({ aggregate: `${fn}(${e.target.value})` })}>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
      )}
    </>
  );
}

/** "Count or add up records": one total, or one per group. */
function AggregateGrouping({
  node,
  columns,
  onChange,
}: {
  node: Node;
  columns: DSColumn[];
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const tr = useTranslations("flows");
  const groupBy = (node.data.groupBy as string | undefined) ?? "";
  const orderBy = ((node.data.orderBy as string | undefined) ?? "").trim() || "value desc";
  const limit = node.data.limit as number | undefined;
  const out = ((node.data.output as string | undefined) ?? "").trim() || IMPLICIT_OUTPUT.aggregate;

  return (
    <>
      <Field label={tr("inspector.fields.groupBy.label")} help={tr("inspector.fields.groupBy.help")}>
        <select
          className="input"
          value={groupBy}
          onChange={(e) => onChange({ groupBy: e.target.value || undefined, orderBy: undefined })}
        >
          <option value="">{tr("inspector.oneTotal")}</option>
          {columns.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      {groupBy && (
        <>
          <Field label={tr("inspector.fields.orderGroups.label")} help={tr("inspector.fields.orderGroups.help")}>
            <select className="input" value={orderBy} onChange={(e) => onChange({ orderBy: e.target.value })}>
              <option value="value desc">{tr("inspector.biggestFirst")}</option>
              <option value="value asc">{tr("inspector.smallestFirst")}</option>
              <option value={`${groupBy} asc`}>{tr("inspector.byAsc", { column: groupBy })}</option>
              <option value={`${groupBy} desc`}>{tr("inspector.byDesc", { column: groupBy })}</option>
            </select>
          </Field>
          <Field label={tr("inspector.fields.groupLimit.label")} help={tr("inspector.fields.groupLimit.help")}>
            <input
              className="input"
              type="number"
              min={1}
              max={1000}
              value={limit ?? 100}
              onChange={(e) =>
                onChange({ limit: e.target.value === "" ? undefined : Math.max(1, Math.min(1000, Math.round(Number(e.target.value)) || 1)) })
              }
            />
          </Field>
        </>
      )}
      <Hint>
        {groupBy
          ? tr("inspector.groupedResult", { column: groupBy })
          : tr("inspector.singleResult", { token: `{{vars.${out}.0.value}}` })}
      </Hint>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// WhereBuilder — visual rule builder for equality conditions
// ────────────────────────────────────────────────────────────────────────────

function WhereBuilder({
  where,
  columns,
  varOptions,
  onChange,
}: {
  where: Record<string, string>;
  columns: DSColumn[];
  varOptions: { fromSteps: VarOption[]; hasTrigger: boolean };
  onChange: (w: Record<string, string>) => void;
}) {
  const tr = useTranslations("flows");
  const rows = Object.entries(where);

  function addRow() {
    const used = new Set(rows.map(([k]) => k));
    const firstFree = columns.find((c) => !used.has(c.name))?.name ?? columns[0]?.name ?? "";
    if (!firstFree) return;
    onChange({ ...where, [firstFree]: "" });
  }

  function removeRow(key: string) {
    const next = { ...where };
    delete next[key];
    onChange(next);
  }

  function renameKey(oldKey: string, newKey: string) {
    if (oldKey === newKey || !newKey) return;
    // Preserve insertion order
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(where)) {
      next[k === oldKey ? newKey : k] = v;
    }
    onChange(next);
  }

  function setValue(key: string, value: string) {
    onChange({ ...where, [key]: value });
  }

  if (columns.length === 0) {
    return (
      <div className="text-[11px] text-surface-500 px-1 py-2">
        {tr("inspector.noColumns")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <div className="text-[11px] text-surface-500">{tr("inspector.noConditions")}</div>
      )}
      {rows.map(([key, val]) => (
        <div key={key} className="flex gap-1.5 items-stretch">
          <select
            className="input flex-1 min-w-0"
            value={key}
            onChange={(e) => renameKey(key, e.target.value)}
            data-help={tr("inspector.columnHelp")}
          >
            {columns.map((c) => (
              <option
                key={c.name}
                value={c.name}
                disabled={c.name !== key && key in where && c.name in where}
              >
                {c.name}
              </option>
            ))}
          </select>
          <span className="self-center text-surface-500 text-xs px-0.5">=</span>
          <div className="flex-[1.4] min-w-0">
            <ValueInput
              value={val}
              onChange={(v) => setValue(key, v)}
              varOptions={varOptions}
              placeholder={tr("inspector.placeholders.value")}
            />
          </div>
          <button
            type="button"
            className="px-1.5 rounded-md border border-surface-800 text-surface-500 hover:text-red-400 hover:border-red-900"
            onClick={() => removeRow(key)}
            title={tr("inspector.removeCondition")}
            aria-label={tr("inspector.removeCondition")}
            data-help={tr("inspector.removeConditionHelp")}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-xs text-brand-300 hover:text-brand-200 flex items-center gap-1"
        onClick={addRow}
        disabled={rows.length >= columns.length}
        data-help={tr("inspector.addConditionHelp")}
      >
        <Plus size={12} /> {tr("inspector.addCondition")}
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ValuesForm — column-based fields for insert / update
// ────────────────────────────────────────────────────────────────────────────

function ValuesForm({
  values,
  columns,
  varOptions,
  onChange,
  optional,
}: {
  values: Record<string, string>;
  columns: DSColumn[];
  varOptions: { fromSteps: VarOption[]; hasTrigger: boolean };
  onChange: (v: Record<string, string>) => void;
  optional: boolean;
}) {
  const tr = useTranslations("flows");
  function setField(col: string, v: string) {
    const next = { ...values };
    if (v === "" && optional) {
      delete next[col];
    } else {
      next[col] = v;
    }
    onChange(next);
  }

  if (columns.length === 0) {
    return (
      <div className="text-[11px] text-surface-500 px-1 py-2">
        {tr("inspector.noEditableColumns")}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {columns.map((c) => (
        <div key={c.name}>
          <div className="flex items-baseline justify-between mb-0.5">
            <div className="text-[11px] text-surface-300">{c.name}</div>
            <div className="text-[10px] text-surface-500 font-mono">{c.type}</div>
          </div>
          <ValueInput
            value={values[c.name] ?? ""}
            onChange={(v) => setField(c.name, v)}
            varOptions={varOptions}
            placeholder={
              optional
                ? tr("inspector.placeholders.keepCurrent")
                : c.type === "bool"
                ? tr("inspector.placeholders.trueOrFalse")
                : c.type === "int" || c.type === "float"
                ? tr("inspector.placeholders.aNumber")
                : c.type === "timestamp"
                ? "{{now}}"
                : ""
            }
          />
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ResponseFields — friendly response body builder
// ────────────────────────────────────────────────────────────────────────────

function ResponseFields({
  node,
  varOptions,
  onChange,
}: {
  node: Node;
  varOptions: { fromSteps: VarOption[]; hasTrigger: boolean };
  onChange: (patch: Record<string, unknown>) => void;
}) {
  // If a legacy response node has a raw body string but no bodyFields yet,
  // parse the body into bodyFields on first view so the form can round-trip.
  const tr = useTranslations("flows");
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (hydratedFor.current === node.id) return;
    hydratedFor.current = node.id;
    const bf = node.data.bodyFields as Record<string, string> | undefined;
    const body = node.data.body as string | undefined;
    if (!bf && body) {
      const parsed = parseJsonOrEmpty(body);
      if (Object.keys(parsed).length > 0) {
        onChange({ bodyFields: parsed });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  const fields = (node.data.bodyFields as Record<string, string> | undefined) ?? {};

  function setFields(next: Record<string, string>) {
    const body = JSON.stringify(next);
    onChange({ bodyFields: next, body });
  }

  return (
    <>
      <KeyValueBuilder
        label={tr("inspector.respondWith")}
        help={tr("inspector.respondWithHelp")}
        value={fields}
        onChange={setFields}
        varOptions={varOptions}
        emptyHint={tr("inspector.respondEmpty")}
      />
      <Hint>{tr("inspector.respondHint")}</Hint>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// KeyValueBuilder — generic user-defined key/value list
// ────────────────────────────────────────────────────────────────────────────

function KeyValueBuilder({
  label,
  help,
  value,
  onChange,
  varOptions,
  emptyHint,
}: {
  label: string;
  help?: string;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  varOptions: { fromSteps: VarOption[]; hasTrigger: boolean };
  emptyHint?: string;
}) {
  const tr = useTranslations("flows");
  const rows = Object.entries(value);

  function addRow() {
    let name = "field";
    let i = 1;
    while (name in value) {
      i += 1;
      name = `field${i}`;
    }
    onChange({ ...value, [name]: "" });
  }

  function removeRow(key: string) {
    const next = { ...value };
    delete next[key];
    onChange(next);
  }

  function renameKey(oldKey: string, newKey: string) {
    if (oldKey === newKey) return;
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(value)) {
      next[k === oldKey ? newKey : k] = v;
    }
    onChange(next);
  }

  function setVal(key: string, v: string) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div data-help={help}>
      <div className="label">{label}</div>
      <div className="space-y-2">
        {rows.length === 0 && emptyHint && (
          <div className="text-[11px] text-surface-500">{emptyHint}</div>
        )}
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-1.5 items-stretch">
            <input
              className="input flex-1 min-w-0"
              value={k}
              onChange={(e) => renameKey(k, e.target.value)}
              placeholder={tr("inspector.placeholders.name")}
            />
            <span className="self-center text-surface-500 text-xs px-0.5">:</span>
            <div className="flex-[1.4] min-w-0">
              <ValueInput
                value={v}
                onChange={(nv) => setVal(k, nv)}
                varOptions={varOptions}
                placeholder={tr("inspector.placeholders.value")}
              />
            </div>
            <button
              type="button"
              className="px-1.5 rounded-md border border-surface-800 text-surface-500 hover:text-red-400 hover:border-red-900"
              onClick={() => removeRow(k)}
              title={tr("inspector.remove")}
              aria-label={tr("inspector.remove")}
              data-help={tr("inspector.removeRowHelp")}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-xs text-brand-300 hover:text-brand-200 flex items-center gap-1"
          onClick={addRow}
          data-help={tr("inspector.addFieldHelp")}
        >
          <Plus size={12} /> {tr("inspector.addField")}
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SheetsFields — Google Sheets (unchanged layout, friendlier value inputs)
// ────────────────────────────────────────────────────────────────────────────

function SheetsFields({
  node,
  datasources,
  varOptions,
  onChange,
}: {
  node: Node;
  datasources: DS[];
  varOptions: { fromSteps: VarOption[]; hasTrigger: boolean };
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const t = node.data.nkType as string;
  const tr = useTranslations("flows");
  return (
    <>
      <Field label={tr("inspector.fields.sheetSource.label")} help={tr("inspector.fields.sheetSource.help")}>
        <select
          className="input"
          value={(node.data.datasourceId as string) ?? ""}
          onChange={(e) => onChange({ datasourceId: e.target.value || undefined })}
        >
          <option value="">{tr("inspector.choose")}</option>
          {datasources.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={tr("inspector.fields.sheetTab.label")} help={tr("inspector.fields.sheetTab.help")}>
        <input
          className="input"
          value={(node.data.sheet as string) ?? ""}
          onChange={(e) => onChange({ sheet: e.target.value })}
          placeholder="Sheet1"
        />
      </Field>
      {t === "sheets_append" && (
        <KeyValueBuilder
          label={tr("inspector.rowValues")}
          help={tr("inspector.rowValuesHelp")}
          value={parseJsonOrEmpty(node.data.values as string)}
          onChange={(obj) => onChange({ values: JSON.stringify(obj) })}
          varOptions={varOptions}
          emptyHint={tr("inspector.rowValuesEmpty")}
        />
      )}
      <OutputVariableAdvanced
        value={(node.data.output as string) ?? ""}
        defaultName={IMPLICIT_OUTPUT.sheets_read ?? "rows"}
        onChange={(v) => onChange({ output: v })}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// CustomJsFields — JS editor with variable chips, snippets, and sandbox help
// ────────────────────────────────────────────────────────────────────────────

type JsVar = { codeRef: string; label: string; sourceType: string };

function jsVarsFromUpstream(
  currentId: string,
  nodes: Node[],
  edges: Edge[],
  tr: FlowsT
): { vars: JsVar[]; hasTrigger: boolean } {
  const upstream = upstreamOf(currentId, nodes, edges);
  const hasTrigger = upstream.some((n) => (n.data.nkType as string) === "trigger");
  const out: JsVar[] = [];
  for (const n of upstream) {
    const t = n.data.nkType as string;
    if (t === "trigger") continue;
    const varName = effectiveVarName(n);
    if (!varName) continue;
    out.push({
      codeRef: `vars.${varName}`,
      label: stepLabel(t, n.data.label, tr),
      sourceType: t,
    });
  }
  return { vars: out, hasTrigger };
}

// Each snippet's name and description: flows.inspector.snippets.<key>.
const JS_SNIPPETS: Array<{ key: string; code: string }> = [
  {
    key: "filter",
    code: `const active = (vars.rows || []).filter(r => r.status === 'active');\nreturn active;`,
  },
  {
    key: "map",
    code: `return (vars.rows || []).map(r => ({\n  id: r.id,\n  name: r.full_name,\n}));`,
  },
  {
    key: "sum",
    code: `const total = (vars.rows || []).reduce((s, r) => s + Number(r.amount || 0), 0);\nreturn total;`,
  },
  {
    key: "format",
    code: `return \`Hi \${trigger.name}, your order #\${trigger.orderId} is confirmed.\`;`,
  },
  {
    key: "timestamp",
    code: `return new Date().toISOString();`,
  },
  {
    key: "split",
    code: `const [first, ...rest] = String(trigger.name || '').split(' ');\nreturn { first, last: rest.join(' ') };`,
  },
];

function CustomJsFields({
  node,
  nodes,
  edges,
  onChange,
}: {
  node: Node;
  nodes: Node[];
  edges: Edge[];
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const tr = useTranslations("flows");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { vars: jsVars, hasTrigger } = useMemo(
    () => jsVarsFromUpstream(node.id, nodes, edges, tr),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node.id, nodes, edges]
  );
  const code_ = (c: React.ReactNode) => <code className="font-mono" dir="ltr">{c}</code>;
  const code = (node.data.code as string) ?? "";

  function insertAtCursor(text: string) {
    const el = textareaRef.current;
    if (!el) {
      onChange({ code: code + (code.endsWith("\n") || !code ? "" : "\n") + text });
      return;
    }
    const start = el.selectionStart ?? code.length;
    const end = el.selectionEnd ?? code.length;
    const next = code.slice(0, start) + text + code.slice(end);
    onChange({ code: next });
    // Restore focus after React re-renders.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + text.length;
      el.setSelectionRange(caret, caret);
    });
  }

  return (
    <>
      <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-2.5 text-[11px] text-amber-200/90 leading-relaxed">
        <div className="font-medium text-amber-100 mb-0.5">{tr("inspector.js.headsUp")}</div>
        {tr.rich("inspector.js.syntax", {
          vars: "vars.x",
          trigger: "trigger.x",
          template: "{{vars.x}}",
          code: (c) => <code className="font-mono text-amber-100" dir="ltr">{c}</code>,
        })}
      </div>

      <Field label={tr("inspector.fields.javascript.label")} help={tr("inspector.fields.javascript.help")}>
        <textarea
          ref={textareaRef}
          className="input font-mono text-[11px] leading-snug"
          dir="ltr"
          rows={14}
          spellCheck={false}
          value={code}
          onChange={(e) => onChange({ code: e.target.value })}
          placeholder={`// You can use:\n//   vars    — object of flow variables (read/write)\n//   trigger — the incoming request payload (read-only)\n// Whatever you return is stored in the output variable below.\n\nreturn { ok: true };`}
        />
      </Field>

      <div data-help={tr("inspector.js.availableHelp")}>
        <div className="label">{tr("inspector.js.available")}</div>
        {jsVars.length === 0 && !hasTrigger ? (
          <div className="text-[11px] text-surface-500">
            {tr("inspector.js.noSteps")}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {hasTrigger && (
              <button
                type="button"
                className="px-2 py-0.5 rounded-md border border-surface-800 bg-surface-950/60 hover:bg-surface-800 text-[11px] font-mono text-surface-200"
                onClick={() => insertAtCursor("trigger")}
                title={tr("inspector.js.insertTrigger")}
              >
                trigger
              </button>
            )}
            {jsVars.map((v) => (
              <button
                key={v.codeRef}
                type="button"
                className="px-2 py-0.5 rounded-md border border-surface-800 bg-surface-950/60 hover:bg-surface-800 text-[11px] font-mono text-surface-200"
                onClick={() => insertAtCursor(v.codeRef)}
                title={`${v.label} (${v.sourceType})`}
              >
                {v.codeRef}
              </button>
            ))}
          </div>
        )}
        <Hint>{tr("inspector.js.chipHint")}</Hint>
      </div>

      <details className="group rounded-md border border-surface-800 bg-surface-950/40">
        <summary className="cursor-pointer list-none px-3 py-2 flex items-center justify-between text-xs text-surface-300 hover:text-surface-100" data-help={tr("inspector.js.examplesHelp")}>
          <span>{tr("inspector.js.examples")}</span>
          <ChevronDown size={14} className="transition group-open:rotate-180" />
        </summary>
        <div className="px-2 pb-2 pt-0.5 space-y-1">
          {JS_SNIPPETS.map((s) => (
            <button
              key={s.key}
              type="button"
              className="w-full text-start px-2 py-1.5 rounded hover:bg-surface-800 text-xs"
              onClick={() => insertAtCursor(s.code)}
            >
              <div className="text-surface-100">{tr(`inspector.snippets.${s.key}.label`)}</div>
              <div className="text-[10px] text-surface-500">{tr(`inspector.snippets.${s.key}.description`)}</div>
            </button>
          ))}
        </div>
      </details>

      <details className="group rounded-md border border-surface-800 bg-surface-950/40">
        <summary className="cursor-pointer list-none px-3 py-2 flex items-center justify-between text-xs text-surface-300 hover:text-surface-100" data-help={tr("inspector.js.howHelp")}>
          <span>{tr("inspector.js.how")}</span>
          <ChevronDown size={14} className="transition group-open:rotate-180" />
        </summary>
        <div className="px-3 pb-3 pt-0.5 text-[11px] text-surface-400 leading-relaxed space-y-1.5">
          <p>{tr.rich("inspector.js.how1", { require: "require", import: "import", code: code_ })}</p>
          <p>{tr.rich("inspector.js.how2", { read: "vars.someName", write: "vars.newName", return: "return", code: code_ })}</p>
          <p>{tr.rich("inspector.js.how3", { trigger: "trigger", code: code_ })}</p>
          <p>{tr("inspector.js.how4")}</p>
        </div>
      </details>

      <OutputVariableAdvanced
        value={(node.data.output as string) ?? ""}
        defaultName={IMPLICIT_OUTPUT.custom_js ?? "result"}
        onChange={(v) => onChange({ output: v })}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// LookupFields — add details from another table to each record in a list
// ────────────────────────────────────────────────────────────────────────────

function LookupFields({
  node,
  nodes,
  edges,
  datasources,
  varOptions,
  onChange,
}: {
  node: Node;
  nodes: Node[];
  edges: Edge[];
  datasources: DS[];
  varOptions: { fromSteps: VarOption[]; hasTrigger: boolean };
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const tr = useTranslations("flows");
  const dsId = node.data.datasourceId as string | undefined;
  const ds = datasources.find((d) => d.id === dsId);
  const lookupTable = node.data.lookupTable as string | undefined;
  const lookupColumns = ds?.tables.find((tb) => tb.name === lookupTable)?.columns ?? [];
  const sourceVar = ((node.data.sourceVar as string | undefined) ?? "").trim();
  // The columns of the list being added to, when an earlier step found it in a table.
  const sourceStep = sourceVar ? upstreamOf(node.id, nodes, edges).find((n) => effectiveVarName(n) === sourceVar && n.data.table) : undefined;
  const sourceColumns = sourceStep
    ? datasources.find((d) => d.id === sourceStep.data.datasourceId)?.tables.find((tb) => tb.name === sourceStep.data.table)?.columns ?? []
    : [];
  const listId = `lookup-cols-${node.id}`;

  return (
    <>
      <Field label={tr("inspector.fields.lookupSource.label")} help={tr("inspector.fields.lookupSource.help")}>
        <StepResultSelect
          value={sourceVar}
          onChange={(v) => onChange({ sourceVar: v || undefined })}
          varOptions={varOptions}
        />
      </Field>
      <Field label={tr("inspector.fields.lookupPointer.label")} help={tr("inspector.fields.lookupPointer.help")}>
        <input
          className="input"
          list={listId}
          value={(node.data.sourceField as string) ?? ""}
          onChange={(e) => onChange({ sourceField: e.target.value || undefined })}
          placeholder="id"
        />
        <datalist id={listId}>
          {sourceColumns.map((c) => (
            <option key={c.name} value={c.name} />
          ))}
        </datalist>
      </Field>
      <Field label={tr("inspector.fields.lookupDataSource.label")} help={tr("inspector.fields.lookupDataSource.help")}>
        <select
          className="input"
          value={dsId ?? ""}
          onChange={(e) => onChange({ datasourceId: e.target.value || undefined, lookupTable: undefined })}
        >
          <option value="">{tr("inspector.choose")}</option>
          {datasources.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={tr("inspector.fields.lookupIn.label")} help={tr("inspector.fields.lookupIn.help")}>
        {ds ? (
          <select
            className="input"
            value={lookupTable ?? ""}
            onChange={(e) => onChange({ lookupTable: e.target.value || undefined })}
          >
            <option value="">{tr("inspector.choose")}</option>
            {ds.tables.map((tb) => (
              <option key={tb.name} value={tb.name}>
                {friendlyTable(tb.name)}
              </option>
            ))}
          </select>
        ) : (
          <input className="input" disabled placeholder={tr("inspector.placeholders.pickSourceFirst")} />
        )}
      </Field>
      {lookupTable && (
        <Field label={tr("inspector.fields.lookupMatch.label")} help={tr("inspector.fields.lookupMatch.help")}>
          <select
            className="input"
            value={(node.data.lookupField as string) ?? "id"}
            onChange={(e) => onChange({ lookupField: e.target.value })}
          >
            {[...new Set(["id", ...lookupColumns.map((c) => c.name)])].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label={tr("inspector.fields.lookupAs.label")} help={tr("inspector.fields.lookupAs.help")}>
        <input
          className="input"
          value={(node.data.as as string) ?? ""}
          onChange={(e) => onChange({ as: e.target.value || undefined })}
          placeholder="lookup"
        />
      </Field>
      <OutputVariableAdvanced
        value={(node.data.output as string) ?? ""}
        defaultName={sourceVar || IMPLICIT_OUTPUT.lookup}
        onChange={(v) => onChange({ output: v })}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// CheckRoleFields — does the signed-in person have a role?
// ────────────────────────────────────────────────────────────────────────────

function CheckRoleFields({
  node,
  nodes,
  edges,
  varOptions,
  onChange,
}: {
  node: Node;
  nodes: Node[];
  edges: Edge[];
  varOptions: { fromSteps: VarOption[]; hasTrigger: boolean };
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const tr = useTranslations("flows");
  const source = ((node.data.source as string | undefined) ?? "").trim();
  const out = ((node.data.output as string | undefined) ?? "").trim() || IMPLICIT_OUTPUT.check_role;
  const readsSession = !source || source === "session.role";
  const hasWhoIsSignedIn = upstreamOf(node.id, nodes, edges).some(
    (n) => (n.data.nkType as string) === "get_session" && effectiveVarName(n) === "session"
  );

  return (
    <>
      <Field label={tr("inspector.fields.roleNeeded.label")} help={tr("inspector.fields.roleNeeded.help")}>
        <ValueInput
          value={(node.data.role as string) ?? ""}
          onChange={(v) => onChange({ role: v })}
          varOptions={varOptions}
          placeholder="admin"
        />
      </Field>
      <Field label={tr("inspector.fields.roleSource.label")} help={tr("inspector.fields.roleSource.help")}>
        <input
          className="input"
          value={(node.data.source as string) ?? ""}
          onChange={(e) => onChange({ source: e.target.value || undefined })}
          placeholder="session.role"
        />
      </Field>
      {readsSession && !hasWhoIsSignedIn && (
        <Hint>{tr("inspector.rolePassHint")}</Hint>
      )}
      <Hint>
        {tr("inspector.roleResult", { name: out, token: `{{vars.${out}}}` })}
      </Hint>
      <OutputVariableAdvanced
        value={(node.data.output as string) ?? ""}
        defaultName={IMPLICIT_OUTPUT.check_role}
        onChange={(v) => onChange({ output: v })}
      />
    </>
  );
}
