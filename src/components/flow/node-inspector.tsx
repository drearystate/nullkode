"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Node, Edge } from "reactflow";
import { Plus, Trash2, ChevronDown, X } from "lucide-react";
import { friendlyTable } from "./catalog";

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

function effectiveVarName(node: Node): string | null {
  const t = node.data.nkType as string;
  if (t === "set") {
    const n = (node.data.name as string | undefined)?.trim();
    return n || null;
  }
  const custom = (node.data.output as string | undefined)?.trim();
  if (custom) return custom;
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
  edges: Edge[]
): { fromSteps: VarOption[]; hasTrigger: boolean } {
  const upstream = upstreamOf(currentId, nodes, edges);
  const hasTrigger = upstream.some((n) => (n.data.nkType as string) === "trigger");
  const fromSteps: VarOption[] = [];
  for (const n of upstream) {
    const t = n.data.nkType as string;
    if (t === "trigger") continue;
    const varName = effectiveVarName(n);
    if (!varName) continue;
    const label = (n.data.label as string) || t;
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
  const varOptions = useMemo(
    () => buildVarOptions(node.id, nodes, edges),
    [node.id, nodes, edges]
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-surface-500">Step</div>
          <div className="font-semibold truncate">{(node.data.label as string) ?? t}</div>
        </div>
        <button className="btn-danger text-xs shrink-0" onClick={onDelete}>
          Delete
        </button>
      </div>

      <Field label="Step name">
        <input
          className="input"
          value={(node.data.label as string) ?? ""}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="What this step does"
        />
      </Field>

      {(t === "query" || t === "insert" || t === "update" || t === "delete") && (
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
          <Field label="When this value">
            <ValueInput
              value={(node.data.left as string) ?? ""}
              onChange={(v) => onChange({ left: v })}
              varOptions={varOptions}
              placeholder="Pick a value from a previous step"
            />
          </Field>
          <Field label="Is">
            <select
              className="input"
              value={(node.data.op as string) ?? "=="}
              onChange={(e) => onChange({ op: e.target.value })}
            >
              <option value="==">equal to</option>
              <option value="!=">not equal to</option>
              <option value=">">greater than</option>
              <option value="<">less than</option>
              <option value=">=">greater than or equal</option>
              <option value="<=">less than or equal</option>
              <option value="contains">contains</option>
              <option value="exists">exists (is not empty)</option>
            </select>
          </Field>
          {node.data.op !== "exists" && (
            <Field label="This value">
              <ValueInput
                value={(node.data.right as string) ?? ""}
                onChange={(v) => onChange({ right: v })}
                varOptions={varOptions}
                placeholder='e.g. "active"'
              />
            </Field>
          )}
          <Hint>Connect the green handle for the true path, red for the false path.</Hint>
        </>
      )}

      {t === "set" && (
        <>
          <Field label="Variable name">
            <input
              className="input"
              value={(node.data.name as string) ?? ""}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. greeting"
            />
          </Field>
          <Field label="Value">
            <ValueInput
              value={(node.data.value as string) ?? ""}
              onChange={(v) => onChange({ value: v })}
              varOptions={varOptions}
              placeholder="Hello there"
            />
          </Field>
        </>
      )}

      {t === "http_request" && (
        <>
          <Field label="Method">
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
          <Field label="URL">
            <ValueInput
              value={(node.data.url as string) ?? ""}
              onChange={(v) => onChange({ url: v })}
              varOptions={varOptions}
              placeholder="https://api.example.com/x"
            />
          </Field>
          {node.data.method !== "GET" && node.data.method !== "DELETE" && (
            <KeyValueBuilder
              label="Body"
              value={parseJsonOrEmpty(node.data.body as string)}
              onChange={(obj) => onChange({ body: JSON.stringify(obj) })}
              varOptions={varOptions}
              emptyHint="Add the fields to send in the request body."
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
          <p className="text-xs text-surface-400">Sends to everyone who turned on notifications for this app. iPhone users need the app added to their home screen.</p>
          <Field label="Title">
            <ValueInput value={(node.data.title as string) ?? ""} onChange={(v) => onChange({ title: v })} varOptions={varOptions} placeholder="Tonight: live music from 7pm" />
          </Field>
          <Field label="Message">
            <ValueTextarea value={(node.data.body as string) ?? ""} onChange={(v) => onChange({ body: v })} varOptions={varOptions} placeholder="Book a table before they're gone." minHeight={90} />
          </Field>
          <Field label="Open this page when tapped (optional)">
            <ValueInput value={(node.data.url as string) ?? ""} onChange={(v) => onChange({ url: v })} varOptions={varOptions} placeholder="/menu" />
          </Field>
        </>
      )}

      {t === "email" && (
        <>
          <Field label="To">
            <ValueInput
              value={(node.data.to as string) ?? ""}
              onChange={(v) => onChange({ to: v })}
              varOptions={varOptions}
              placeholder="recipient@example.com"
            />
          </Field>
          <Field label="From (optional)">
            <input
              className="input"
              value={(node.data.from as string) ?? ""}
              onChange={(e) => onChange({ from: e.target.value })}
              placeholder="you@yourdomain.com"
            />
          </Field>
          <Field label="Subject">
            <ValueInput
              value={(node.data.subject as string) ?? ""}
              onChange={(v) => onChange({ subject: v })}
              varOptions={varOptions}
              placeholder="Your order has shipped"
            />
          </Field>
          <Field label="Message">
            <ValueTextarea
              value={(node.data.body as string) ?? ""}
              onChange={(v) => onChange({ body: v })}
              varOptions={varOptions}
              placeholder="Hi there, thanks for your order..."
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
          <Field label="System instructions (optional)">
            <ValueTextarea
              value={(node.data.system as string) ?? ""}
              onChange={(v) => onChange({ system: v })}
              varOptions={varOptions}
              placeholder="You are a helpful assistant..."
              minHeight={70}
            />
          </Field>
          <Field label="Prompt">
            <ValueTextarea
              value={(node.data.prompt as string) ?? ""}
              onChange={(v) => onChange({ prompt: v })}
              varOptions={varOptions}
              placeholder="Summarize this customer message..."
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
        <Field label="Seconds (0-60)">
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
          <Field label="JSON text to parse">
            <ValueInput
              value={(node.data.input as string) ?? ""}
              onChange={(v) => onChange({ input: v })}
              varOptions={varOptions}
              placeholder="Pick a value that contains JSON text"
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
          <Field label="Password to hash">
            <ValueInput
              value={(node.data.input as string) ?? ""}
              onChange={(v) => onChange({ input: v })}
              varOptions={varOptions}
              placeholder="Pick the password from the request"
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
          <Field label="Password from user">
            <ValueInput
              value={(node.data.plain as string) ?? ""}
              onChange={(v) => onChange({ plain: v })}
              varOptions={varOptions}
              placeholder="Pick the password from the request"
            />
          </Field>
          <Field label="Stored hash">
            <ValueInput
              value={(node.data.hash as string) ?? ""}
              onChange={(v) => onChange({ hash: v })}
              varOptions={varOptions}
              placeholder="Pick the hash from the database row"
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
        <Field label="User ID">
          <ValueInput
            value={(node.data.userId as string) ?? ""}
            onChange={(v) => onChange({ userId: v })}
            varOptions={varOptions}
            placeholder="Pick the user ID from a previous step"
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
          <Field label="First value">
            <ValueInput
              value={(node.data.left as string) ?? ""}
              onChange={(v) => onChange({ left: v })}
              varOptions={varOptions}
              placeholder="e.g. 10"
            />
          </Field>
          <Field label="Operator">
            <select
              className="input"
              value={(node.data.op as string) ?? "+"}
              onChange={(e) => onChange({ op: e.target.value })}
            >
              <option value="+">add (+)</option>
              <option value="-">subtract (−)</option>
              <option value="*">multiply (×)</option>
              <option value="/">divide (÷)</option>
              <option value="%">remainder (%)</option>
            </select>
          </Field>
          <Field label="Second value">
            <ValueInput
              value={(node.data.right as string) ?? ""}
              onChange={(v) => onChange({ right: v })}
              varOptions={varOptions}
              placeholder="e.g. 1.08"
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
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
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
      <div className="absolute top-1.5 right-1.5">
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
        className="h-full px-2 rounded-md border border-surface-700 bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs flex items-center gap-1"
        onClick={() => setOpen((v) => !v)}
        title="Insert a value from the request or a previous step"
      >
        <Plus size={13} />
        <span className="hidden sm:inline">Insert</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 max-h-[360px] overflow-auto rounded-lg border border-surface-700 bg-surface-900 shadow-2xl z-50 p-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-wider text-surface-500">
              Insert value
            </div>
            <button
              className="text-surface-500 hover:text-surface-300"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X size={13} />
            </button>
          </div>

          {varOptions.hasTrigger && (
            <div className="rounded-md bg-surface-950/60 border border-surface-800 p-2">
              <div className="text-[11px] text-surface-400 mb-1">From the request</div>
              <div className="flex gap-1">
                <input
                  className="input flex-1 min-w-0 text-xs h-8"
                  value={triggerPath}
                  onChange={(e) => setTriggerPath(e.target.value)}
                  placeholder="field name (e.g. email)"
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
                  className="px-2 h-8 rounded-md bg-brand-600 hover:bg-brand-500 text-white text-xs disabled:opacity-40"
                  disabled={!triggerPath.trim()}
                  onClick={() => {
                    onInsert(`{{trigger.${triggerPath.trim()}}}`);
                    setTriggerPath("");
                    setOpen(false);
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] text-surface-400 px-1 mb-1">From previous steps</div>
            {varOptions.fromSteps.length === 0 ? (
              <div className="text-[11px] text-surface-500 px-1 py-2">
                No previous steps produce a value yet.
              </div>
            ) : (
              <div className="space-y-0.5">
                {varOptions.fromSteps.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-surface-800 text-xs"
                    onClick={() => {
                      onInsert(v.token);
                      setOpen(false);
                    }}
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
            <div className="text-[11px] text-surface-400 px-1 mb-1">Helpers</div>
            {[
              { label: "Current date & time", token: "{{now}}" },
              { label: "Today’s date", token: "{{now.date}}" },
              { label: "Random ID", token: "{{uuid}}" },
            ].map((h) => (
              <button
                key={h.token}
                type="button"
                className="w-full text-left px-2 py-1.5 rounded hover:bg-surface-800 text-xs text-surface-100"
                onClick={() => {
                  onInsert(h.token);
                  setOpen(false);
                }}
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
  return (
    <details className="group rounded-md border border-surface-800 bg-surface-950/40">
      <summary className="cursor-pointer list-none px-3 py-2 flex items-center justify-between text-xs text-surface-400 hover:text-surface-200">
        <span>Advanced</span>
        <ChevronDown size={14} className="transition group-open:rotate-180" />
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-1">
        <div className="text-[11px] text-surface-500">
          Name used to reference this step’s result elsewhere.
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
// DataNodeFields — query / insert / update / delete
// ────────────────────────────────────────────────────────────────────────────

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
  const dsId = node.data.datasourceId as string | undefined;
  const ds = datasources.find((d) => d.id === dsId);
  const tableName = node.data.table as string | undefined;
  const table = ds?.tables.find((tb) => tb.name === tableName);
  const columns = table?.columns ?? [];
  const writableColumns = columns.filter((c) => !AUTO_COLUMNS.has(c.name.toLowerCase()));

  return (
    <>
      <Field label="Data source">
        <select
          className="input"
          value={dsId ?? ""}
          onChange={(e) =>
            onChange({ datasourceId: e.target.value || undefined, table: undefined })
          }
        >
          <option value="">— choose —</option>
          {datasources.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="List of records">
        {ds ? (
          <select
            className="input"
            value={tableName ?? ""}
            onChange={(e) => onChange({ table: e.target.value || undefined })}
          >
            <option value="">— choose —</option>
            {ds.tables.map((tb) => (
              <option key={tb.name} value={tb.name}>
                {friendlyTable(tb.name)}
              </option>
            ))}
          </select>
        ) : (
          <input className="input" disabled placeholder="Pick a data source first" />
        )}
      </Field>

      {(t === "query" || t === "update" || t === "delete") && tableName && (
        <div>
          <div className="label">
            {t === "query" ? "Find rows where" : t === "update" ? "Update rows where" : "Delete rows where"}
          </div>
          <WhereBuilder
            where={(node.data.where as Record<string, string> | undefined) ?? {}}
            columns={columns}
            varOptions={varOptions}
            onChange={(w) => onChange({ where: w })}
          />
          {t === "query" && (
            <Hint>
              Leave empty to return all rows. Multiple conditions must all match.
            </Hint>
          )}
          {t === "delete" && (
            <Hint>
              A condition is required to delete — otherwise the step will fail.
            </Hint>
          )}
        </div>
      )}

      {(t === "insert" || t === "update") && tableName && (
        <div>
          <div className="label">{t === "insert" ? "New row values" : "Set these fields"}</div>
          <ValuesForm
            values={(node.data.values as Record<string, string> | undefined) ?? {}}
            columns={writableColumns}
            varOptions={varOptions}
            onChange={(v) => onChange({ values: v })}
            optional={t === "update"}
          />
        </div>
      )}

      {!tableName && (ds || !dsId) && (
        <Hint>Pick a list of records to set up this step.</Hint>
      )}

      <OutputVariableAdvanced
        value={(node.data.output as string) ?? ""}
        defaultName={IMPLICIT_OUTPUT[t] ?? "result"}
        onChange={(v) => onChange({ output: v })}
      />
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
        This table has no columns yet. Add fields to the table first.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <div className="text-[11px] text-surface-500">No conditions — will match all rows.</div>
      )}
      {rows.map(([key, val]) => (
        <div key={key} className="flex gap-1.5 items-stretch">
          <select
            className="input flex-1 min-w-0"
            value={key}
            onChange={(e) => renameKey(key, e.target.value)}
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
              placeholder="value"
            />
          </div>
          <button
            type="button"
            className="px-1.5 rounded-md border border-surface-800 text-surface-500 hover:text-red-400 hover:border-red-900"
            onClick={() => removeRow(key)}
            title="Remove condition"
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
      >
        <Plus size={12} /> Add condition
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
        This table has no editable columns.
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
                ? "leave blank to keep current value"
                : c.type === "bool"
                ? "true or false"
                : c.type === "int" || c.type === "float"
                ? "a number"
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
        label="Respond with"
        value={fields}
        onChange={setFields}
        varOptions={varOptions}
        emptyHint="Pick what to send back to the caller. Each row becomes a field in the response."
      />
      <Hint>The caller gets a success response by default. Add a branch step earlier in the flow if you need to return an error.</Hint>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// KeyValueBuilder — generic user-defined key/value list
// ────────────────────────────────────────────────────────────────────────────

function KeyValueBuilder({
  label,
  value,
  onChange,
  varOptions,
  emptyHint,
}: {
  label: string;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  varOptions: { fromSteps: VarOption[]; hasTrigger: boolean };
  emptyHint?: string;
}) {
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
    <div>
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
              placeholder="name"
            />
            <span className="self-center text-surface-500 text-xs px-0.5">:</span>
            <div className="flex-[1.4] min-w-0">
              <ValueInput
                value={v}
                onChange={(nv) => setVal(k, nv)}
                varOptions={varOptions}
                placeholder="value"
              />
            </div>
            <button
              type="button"
              className="px-1.5 rounded-md border border-surface-800 text-surface-500 hover:text-red-400 hover:border-red-900"
              onClick={() => removeRow(k)}
              title="Remove"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-xs text-brand-300 hover:text-brand-200 flex items-center gap-1"
          onClick={addRow}
        >
          <Plus size={12} /> Add field
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
  return (
    <>
      <Field label="Google Sheet data source">
        <select
          className="input"
          value={(node.data.datasourceId as string) ?? ""}
          onChange={(e) => onChange({ datasourceId: e.target.value || undefined })}
        >
          <option value="">— choose —</option>
          {datasources.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Sheet tab name">
        <input
          className="input"
          value={(node.data.sheet as string) ?? ""}
          onChange={(e) => onChange({ sheet: e.target.value })}
          placeholder="Sheet1"
        />
      </Field>
      {t === "sheets_append" && (
        <KeyValueBuilder
          label="Row values"
          value={parseJsonOrEmpty(node.data.values as string)}
          onChange={(obj) => onChange({ values: JSON.stringify(obj) })}
          varOptions={varOptions}
          emptyHint="Add one field per column header in the sheet."
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
  edges: Edge[]
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
      label: (n.data.label as string) || t,
      sourceType: t,
    });
  }
  return { vars: out, hasTrigger };
}

const JS_SNIPPETS: Array<{ label: string; description: string; code: string }> = [
  {
    label: "Filter rows",
    description: "Keep only rows matching a condition",
    code: `const active = (vars.rows || []).filter(r => r.status === 'active');\nreturn active;`,
  },
  {
    label: "Map to a new shape",
    description: "Transform each row into a smaller object",
    code: `return (vars.rows || []).map(r => ({\n  id: r.id,\n  name: r.full_name,\n}));`,
  },
  {
    label: "Sum a column",
    description: "Add up numbers across all rows",
    code: `const total = (vars.rows || []).reduce((s, r) => s + Number(r.amount || 0), 0);\nreturn total;`,
  },
  {
    label: "Format a string",
    description: "Build a message from the trigger payload",
    code: `return \`Hi \${trigger.name}, your order #\${trigger.orderId} is confirmed.\`;`,
  },
  {
    label: "Current timestamp",
    description: "Get the current time as an ISO string",
    code: `return new Date().toISOString();`,
  },
  {
    label: "Split name into parts",
    description: "Turn a full name into first/last fields",
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { vars: jsVars, hasTrigger } = useMemo(
    () => jsVarsFromUpstream(node.id, nodes, edges),
    [node.id, nodes, edges]
  );
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
        <div className="font-medium text-amber-100 mb-0.5">Heads up</div>
        In code, use <code className="font-mono text-amber-100">vars.x</code> and{" "}
        <code className="font-mono text-amber-100">trigger.x</code> directly — not
        the <code className="font-mono text-amber-100">{"{{vars.x}}"}</code> syntax
        used in other steps.
      </div>

      <Field label="JavaScript">
        <textarea
          ref={textareaRef}
          className="input font-mono text-[11px] leading-snug"
          rows={14}
          spellCheck={false}
          value={code}
          onChange={(e) => onChange({ code: e.target.value })}
          placeholder={`// You can use:\n//   vars    — object of flow variables (read/write)\n//   trigger — the incoming request payload (read-only)\n// Whatever you return is stored in the output variable below.\n\nreturn { ok: true };`}
        />
      </Field>

      <div>
        <div className="label">Available values</div>
        {jsVars.length === 0 && !hasTrigger ? (
          <div className="text-[11px] text-surface-500">
            No previous steps yet — connect this step after something that produces a value.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {hasTrigger && (
              <button
                type="button"
                className="px-2 py-0.5 rounded-md border border-surface-800 bg-surface-950/60 hover:bg-surface-800 text-[11px] font-mono text-surface-200"
                onClick={() => insertAtCursor("trigger")}
                title="Insert the request payload"
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
        <Hint>Click a chip to insert it at the cursor.</Hint>
      </div>

      <details className="group rounded-md border border-surface-800 bg-surface-950/40">
        <summary className="cursor-pointer list-none px-3 py-2 flex items-center justify-between text-xs text-surface-300 hover:text-surface-100">
          <span>Examples</span>
          <ChevronDown size={14} className="transition group-open:rotate-180" />
        </summary>
        <div className="px-2 pb-2 pt-0.5 space-y-1">
          {JS_SNIPPETS.map((s) => (
            <button
              key={s.label}
              type="button"
              className="w-full text-left px-2 py-1.5 rounded hover:bg-surface-800 text-xs"
              onClick={() => insertAtCursor(s.code)}
            >
              <div className="text-surface-100">{s.label}</div>
              <div className="text-[10px] text-surface-500">{s.description}</div>
            </button>
          ))}
        </div>
      </details>

      <details className="group rounded-md border border-surface-800 bg-surface-950/40">
        <summary className="cursor-pointer list-none px-3 py-2 flex items-center justify-between text-xs text-surface-300 hover:text-surface-100">
          <span>How this works</span>
          <ChevronDown size={14} className="transition group-open:rotate-180" />
        </summary>
        <div className="px-3 pb-3 pt-0.5 text-[11px] text-surface-400 leading-relaxed space-y-1.5">
          <p>
            Your code runs on the server inside a locked-down sandbox. It has no
            network, no file system, no <code className="font-mono">require</code>{" "}
            or <code className="font-mono">import</code>, and no access to other
            flows.
          </p>
          <p>
            Read from <code className="font-mono">vars.someName</code> to use a
            previous step&apos;s output. Assign to{" "}
            <code className="font-mono">vars.newName</code> to create a variable
            later steps can read. Whatever you{" "}
            <code className="font-mono">return</code> is stored in the output
            variable shown below.
          </p>
          <p>
            <code className="font-mono">trigger</code> is a frozen copy of the
            incoming request — read-only. Console logs are discarded.
          </p>
          <p>
            Scripts are killed after 3 seconds. If your code throws, the whole
            flow fails with your error message.
          </p>
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
