"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

export type DS = {
  id: string;
  name: string;
  kind: string;
  tables: { id: string; name: string; fields: { name: string; type: string }[] }[];
};

/** Message keys (data.advanced.*) for each kind of data source. */
const KIND_LABEL: Record<string, "kindInternal" | "kindExternal" | "kindSheets"> = {
  POSTGRES_INTERNAL: "kindInternal",
  POSTGRES_EXTERNAL: "kindExternal",
  GOOGLE_SHEETS: "kindSheets",
};

/** The technical side of data: where it's stored, and making new tables. */
export function AdvancedPanel({ projectId, datasources }: { projectId: string; datasources: DS[] }) {
  const router = useRouter();
  const t = useTranslations("data.advanced");
  const tc = useTranslations("common");
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
      setError(data.error || t("addSourceError"));
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold" data-help={t("addSourceHelp")}>{t("addSource")}</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <button onClick={() => setMode("internal")} className="card p-5 text-start hover:border-brand-500 transition" data-help={t("internalHelp")}>
            <div className="font-semibold">{t("kindInternal")}</div>
            <p className="text-sm text-surface-400 mt-1">{t("internalBody")}</p>
          </button>
          <button onClick={() => setMode("external")} className="card p-5 text-start hover:border-brand-500 transition" data-help={t("externalHelp")}>
            <div className="font-semibold">{t("kindExternal")}</div>
            <p className="text-sm text-surface-400 mt-1">{t("externalBody")}</p>
          </button>
          <button onClick={() => setMode("sheets")} className="card p-5 text-start hover:border-brand-500 transition" data-help={t("sheetsHelp")}>
            <div className="font-semibold">{t("kindSheets")}</div>
            <p className="text-sm text-surface-400 mt-1">{t("sheetsBody")}</p>
          </button>
        </div>
      </div>

      {mode !== "idle" && (
        <div className="card p-5 space-y-3">
          <input className="input" placeholder={t("namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} data-help={t("nameHelp")} />
          {mode === "external" && (
            <input
              className="input font-mono text-xs"
              dir="ltr"
              placeholder="postgresql://user:pass@host:5432/db"
              data-help={t("connectionHelp")}
              value={extUrl}
              onChange={(e) => setExtUrl(e.target.value)}
            />
          )}
          {mode === "sheets" && (
            <>
              <input className="input" placeholder={t("sheetIdPlaceholder")} value={sheetId} onChange={(e) => setSheetId(e.target.value)} data-help={t("sheetIdHelp")} />
              <input
                className="input"
                placeholder={t("apiKeyPlaceholder")}
                data-help={t("apiKeyHelp")}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </>
          )}
          <div className="flex gap-2">
            <button
              className="btn-primary"
              disabled={!name.trim()}
              data-help={t("createHelp")}
              onClick={() => {
                if (mode === "internal") createSource("POSTGRES_INTERNAL", {});
                else if (mode === "external") createSource("POSTGRES_EXTERNAL", { connectionString: extUrl });
                else if (mode === "sheets") createSource("GOOGLE_SHEETS", { spreadsheetId: sheetId, apiKey });
              }}
            >
              {t("create")}
            </button>
            <button className="btn-ghost" onClick={() => setMode("idle")}>
              {tc("cancel")}
            </button>
          </div>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        </div>
      )}

      <div>
        <h3 className="font-semibold" data-help={t("sourcesHelp")}>{t("sources")}</h3>
        {datasources.length === 0 ? (
          <p className="text-sm text-surface-500 mt-2">{t("noSources")}</p>
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
  const t = useTranslations("data.advanced");
  const tc = useTranslations("common");
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
      setError(data.error || t("createTableError"));
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{ds.name}</div>
          <div className="text-xs text-surface-500 mt-0.5">{KIND_LABEL[ds.kind] ? t(KIND_LABEL[ds.kind]) : ds.kind}</div>
        </div>
        {ds.kind === "POSTGRES_INTERNAL" && !creating && (
          <button className="btn-ghost" onClick={() => setCreating(true)} data-help={t("newTableHelp")}>
            {t("newTable")}
          </button>
        )}
      </div>

      {creating && (
        <div className="mt-4 space-y-3 border-t border-surface-800 pt-4">
          <input className="input" placeholder={t("tableNamePlaceholder")} value={tableName} onChange={(e) => setTableName(e.target.value)} data-help={t("tableNameHelp")} />
          {fields.map((f, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input flex-1"
                placeholder={t("columnNamePlaceholder")}
                data-help={t("columnNameHelp")}
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
                data-help={t("columnTypeHelp")}
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
                <button className="btn-ghost" aria-label={t("removeColumn")} data-help={t("removeColumnHelp")} onClick={() => setFields(fields.filter((_, j) => j !== i))}>
                  <X size={14} aria-hidden />
                </button>
              )}
            </div>
          ))}
          <button className="inline-flex items-center gap-1 text-sm text-brand-400" onClick={() => setFields([...fields, { name: "", type: "text" }])} data-help={t("addColumnHelp")}>
            <Plus size={14} aria-hidden /> {t("addColumn")}
          </button>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={createTable} data-help={t("createTableHelp")}>
              {t("createTable")}
            </button>
            <button className="btn-ghost" onClick={() => setCreating(false)}>
              {tc("cancel")}
            </button>
          </div>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        </div>
      )}

      {ds.tables.length > 0 && (
        <div className="mt-4 border-t border-surface-800 pt-4 space-y-2">
          {ds.tables.map((tb) => (
            <div key={tb.id} className="text-sm">
              <span className="font-mono text-surface-200">{tb.name}</span>
              <span className="text-surface-500 ms-2"><span dir="ltr">({tb.fields.map((f) => `${f.name}:${f.type}`).join(", ")})</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
