"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

export type DS = {
  id: string;
  name: string;
  kind: string;
  tables: { id: string; name: string; fields: { name: string; type: string }[] }[];
};

const KIND_LABEL: Record<string, string> = {
  POSTGRES_INTERNAL: "Built-in Postgres",
  POSTGRES_EXTERNAL: "External Postgres",
  GOOGLE_SHEETS: "Google Sheets",
};

/** The technical side of data: where it's stored, and making new tables. */
export function AdvancedPanel({ projectId, datasources }: { projectId: string; datasources: DS[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "internal" | "sheets" | "external">("idle");
  const [name, setName] = useState("");
  const [extUrl, setExtUrl] = useState("");
  const [sheetId, setSheetId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function createSource(kind: string, config: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/datasources`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, kind, config }),
    });
    if (res.ok) {
      setName("");
      setMode("idle");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't add that data source.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold">Add a place to store data</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <button onClick={() => setMode("internal")} className="card p-5 text-left hover:border-brand-500 transition">
            <div className="font-semibold">Built-in Postgres</div>
            <p className="text-sm text-surface-400 mt-1">We create an isolated schema inside our Postgres. Zero config.</p>
          </button>
          <button onClick={() => setMode("external")} className="card p-5 text-left hover:border-brand-500 transition">
            <div className="font-semibold">External Postgres</div>
            <p className="text-sm text-surface-400 mt-1">Bring your own database with a connection string.</p>
          </button>
          <button onClick={() => setMode("sheets")} className="card p-5 text-left hover:border-brand-500 transition">
            <div className="font-semibold">Google Sheets</div>
            <p className="text-sm text-surface-400 mt-1">Use a spreadsheet as your database. Great for simple apps.</p>
          </button>
        </div>
      </div>

      {mode !== "idle" && (
        <div className="card p-5 space-y-3">
          <input className="input" placeholder="Name (e.g. Main DB)" value={name} onChange={(e) => setName(e.target.value)} />
          {mode === "external" && (
            <input
              className="input font-mono text-xs"
              placeholder="postgresql://user:pass@host:5432/db"
              value={extUrl}
              onChange={(e) => setExtUrl(e.target.value)}
            />
          )}
          {mode === "sheets" && (
            <>
              <input className="input" placeholder="Google Sheets spreadsheet ID" value={sheetId} onChange={(e) => setSheetId(e.target.value)} />
              <input
                className="input"
                placeholder="Google API key (for read-only public sheets)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </>
          )}
          <div className="flex gap-2">
            <button
              className="btn-primary"
              disabled={!name.trim()}
              onClick={() => {
                if (mode === "internal") createSource("POSTGRES_INTERNAL", {});
                else if (mode === "external") createSource("POSTGRES_EXTERNAL", { connectionString: extUrl });
                else if (mode === "sheets") createSource("GOOGLE_SHEETS", { spreadsheetId: sheetId, apiKey });
              }}
            >
              Create
            </button>
            <button className="btn-ghost" onClick={() => setMode("idle")}>
              Cancel
            </button>
          </div>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        </div>
      )}

      <div>
        <h3 className="font-semibold">Your data sources</h3>
        {datasources.length === 0 ? (
          <p className="text-sm text-surface-500 mt-2">No data sources yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {datasources.map((d) => (
              <DataSourceCard key={d.id} projectId={projectId} ds={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DataSourceCard({ projectId, ds }: { projectId: string; ds: DS }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [tableName, setTableName] = useState("");
  const [fields, setFields] = useState([{ name: "title", type: "text" }]);
  const [error, setError] = useState<string | null>(null);

  async function createTable() {
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/datasources`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ _action: "create_table", datasourceId: ds.id, name: tableName, fields }),
    });
    if (res.ok) {
      setTableName("");
      setFields([{ name: "title", type: "text" }]);
      setCreating(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't create that table. Use letters, numbers and underscores in names.");
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{ds.name}</div>
          <div className="text-xs text-surface-500 mt-0.5">{KIND_LABEL[ds.kind] ?? ds.kind}</div>
        </div>
        {ds.kind === "POSTGRES_INTERNAL" && !creating && (
          <button className="btn-ghost" onClick={() => setCreating(true)}>
            New table
          </button>
        )}
      </div>

      {creating && (
        <div className="mt-4 space-y-3 border-t border-surface-800 pt-4">
          <input className="input" placeholder="table name (e.g. posts)" value={tableName} onChange={(e) => setTableName(e.target.value)} />
          {fields.map((f, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="column name"
                value={f.name}
                onChange={(e) => {
                  const next = [...fields];
                  next[i] = { ...f, name: e.target.value };
                  setFields(next);
                }}
              />
              <select
                className="input w-32"
                value={f.type}
                onChange={(e) => {
                  const next = [...fields];
                  next[i] = { ...f, type: e.target.value };
                  setFields(next);
                }}
              >
                {["text", "int", "float", "bool", "timestamp", "json"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              {fields.length > 1 && (
                <button className="btn-ghost" aria-label="Remove column" onClick={() => setFields(fields.filter((_, j) => j !== i))}>
                  <X size={14} aria-hidden />
                </button>
              )}
            </div>
          ))}
          <button className="inline-flex items-center gap-1 text-sm text-brand-400" onClick={() => setFields([...fields, { name: "", type: "text" }])}>
            <Plus size={14} aria-hidden /> Add column
          </button>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={createTable}>
              Create table
            </button>
            <button className="btn-ghost" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        </div>
      )}

      {ds.tables.length > 0 && (
        <div className="mt-4 border-t border-surface-800 pt-4 space-y-2">
          {ds.tables.map((t) => (
            <div key={t.id} className="text-sm">
              <span className="font-mono text-surface-200">{t.name}</span>
              <span className="text-surface-500 ml-2">({t.fields.map((f) => `${f.name}:${f.type}`).join(", ")})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
