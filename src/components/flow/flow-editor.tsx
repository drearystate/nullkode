"use client";
import { createContext, useCallback, useContext, useMemo, useState, useEffect, useRef } from "react";
import { X, Search, MousePointer2, Workflow, History, CalendarClock } from "lucide-react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
  type Connection,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { useTranslations } from "next-intl";
import { nanoid } from "nanoid";
import type { FlowGraph } from "@/lib/flow/types";
import { NodeInspector } from "./node-inspector";
import { ActivityPanel } from "./activity-panel";
import { CATEGORY_LABELS, NODE_CATALOG, stepLabel } from "./catalog";
import { FlowEnabledSwitch } from "./flow-enabled-switch";

type DSColumn = { name: string; type: string };
type DSTable = { name: string; columns: DSColumn[] };
type DS = { id: string; name: string; kind: string; tables: DSTable[] };

const DeleteNodeCtx = createContext<(id: string) => void>(() => {});

type Props = {
  projectId: string;
  flowId: string;
  flowName: string;
  httpPath: string;
  /** Whether the flow runs at all (false: paused). */
  enabled?: boolean;
  /** Runs on a schedule (changes what pausing means). */
  scheduled?: boolean;
  initialGraph: FlowGraph;
  datasources: DS[];
  /** Open on the Activity tab (links from the Problems card). */
  initialTab?: "design" | "activity" | "schedule";
  /** Runs from the app with a problem in the last 24 hours, for the tab's badge. */
  problemCount?: number;
  /** When the flow runs (the schedule picker), shown in its own tab. */
  schedulePanel?: React.ReactNode;
};

type Tab = "design" | "activity" | "schedule";

export function FlowEditor(props: Props) {
  const t = useTranslations("flows");
  const tc = useTranslations("common");
  const [nodes, setNodes] = useState<Node[]>(
    (props.initialGraph?.nodes ?? []).map((n) => ({
      id: n.id,
      type: "nkNode",
      position: n.position ?? { x: 100, y: 100 },
      data: { ...n.data, nkType: n.type },
    }))
  );
  const [edges, setEdges] = useState<Edge[]>(
    (props.initialGraph?.edges ?? []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
      markerEnd: { type: MarkerType.ArrowClosed },
    }))
  );
  const [stepSearch, setStepSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [testOut, setTestOut] = useState<string>("");
  const [tab, setTab] = useState<Tab>(props.initialTab === "schedule" && !props.schedulePanel ? "design" : props.initialTab ?? "design");
  const [activityKey, setActivityKey] = useState(0);
  const [enabled, setEnabled] = useState(props.enabled ?? true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // What's already saved, so opening the flow (or selecting/resizing steps)
  // doesn't send a save or flash "Saving…"; only real edits do.
  const lastSaved = useRef<string | null>(null);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selected) ?? null,
    [nodes, selected]
  );

  const onNodesChange = useCallback(
    (ch: NodeChange[]) => setNodes((ns) => applyNodeChanges(ch, ns)),
    []
  );
  const onEdgesChange = useCallback(
    (ch: EdgeChange[]) => setEdges((es) => applyEdgeChanges(ch, es)),
    []
  );
  const onConnect = useCallback(
    (c: Connection) =>
      setEdges((es) =>
        addEdge({ ...c, id: nanoid(8), markerEnd: { type: MarkerType.ArrowClosed } }, es)
      ),
    []
  );

  function addNode(type: string) {
    const entry = NODE_CATALOG.find((c) => c.type === type);
    if (!entry) return;
    setNodes((ns) => [
      ...ns,
      {
        id: nanoid(8),
        type: "nkNode",
        position: { x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 },
        data: { label: entry.label, nkType: type, ...entry.defaults },
      },
    ]);
  }

  function updateNodeData(id: string, patch: Record<string, unknown>) {
    setNodes((ns) =>
      ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
    );
  }

  const deleteNodeRef = useRef(deleteNode);
  deleteNodeRef.current = deleteNode;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const tabRef = useRef(tab);
  tabRef.current = tab;

  function deleteNode(id: string) {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    setSelected((cur) => (cur === id ? null : cur));
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Steps are hidden behind the Activity tab; never delete one unseen.
        if (tabRef.current !== "design") return;
        const el = e.target as HTMLElement | null;
        const tag = el?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
        // Read the selection from a ref — deleting from inside a setSelected
        // updater would set other state during a state update.
        if (selectedRef.current) deleteNodeRef.current(selectedRef.current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const graph: FlowGraph = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.nkType,
        position: n.position,
        data: Object.fromEntries(
          Object.entries(n.data).filter(([k]) => k !== "nkType")
        ),
      })) as FlowGraph["nodes"],
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
      })),
    };
    const body = JSON.stringify({ graph });
    if (lastSaved.current === null) { lastSaved.current = body; return; }
    if (body === lastSaved.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setStatus("saving");
      try {
        const res = await fetch(`/api/projects/${props.projectId}/flows/${props.flowId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body,
        });
        if (res.ok) lastSaved.current = body;
        setStatus(res.ok ? "saved" : "error");
      } catch {
        setStatus("error");
      }
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [nodes, edges, props.projectId, props.flowId]);

  async function testRun() {
    // /api/run turns paused flows away for everyone, the owner included.
    if (!enabled) {
      setTestOut(t("editor.pausedTest"));
      return;
    }
    setTestOut(t("editor.running"));
    try {
      const res = await fetch(`/api/run/${props.flowId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ test: true }),
      });
      const body = await res.text();
      setTestOut(`${res.status}\n${body}`);
    } catch (e) {
      setTestOut(String(e));
    }
    // The test run is stored too; show it in Activity.
    setActivityKey((k) => k + 1);
  }

  const nodeTypes = useMemo(() => ({ nkNode: NkNodeView }), []);

  return (
    <div className="studio-flow-editor h-[calc(100dvh-127px)] flex">
      {/* Canvas colours (edges, handles, dots, minimap) for both themes. Dark
          keeps React Flow's defaults the studio has always shown. */}
      <style>{`
        .studio-flow-editor {
          --nk-flow-edge: #b1b1b7; --nk-flow-edge-active: #555555; --nk-flow-dot: #232336;
          --nk-flow-handle: #1a192b; --nk-flow-handle-ring: #ffffff;
          --nk-flow-mini-node: #e2e2e2; --nk-flow-mask: rgb(10 10 20 / 0.6);
        }
        [data-theme="light"] .studio-flow-editor {
          --nk-flow-edge: rgb(var(--c-surface-500)); --nk-flow-edge-active: rgb(var(--c-surface-200)); --nk-flow-dot: rgb(var(--c-surface-600));
          --nk-flow-handle: rgb(var(--c-surface-900)); --nk-flow-handle-ring: rgb(var(--c-surface-400));
          --nk-flow-mini-node: rgb(var(--c-surface-700)); --nk-flow-mask: rgb(var(--c-surface-800) / 0.6);
        }
        .studio-flow-editor .react-flow__edge-path, .studio-flow-editor .react-flow__connection-path { stroke: var(--nk-flow-edge); }
        .studio-flow-editor .react-flow__edge.selected .react-flow__edge-path,
        .studio-flow-editor .react-flow__edge:focus .react-flow__edge-path,
        .studio-flow-editor .react-flow__edge:focus-visible .react-flow__edge-path { stroke: var(--nk-flow-edge-active); }
        .studio-flow-editor .react-flow__handle { background: var(--nk-flow-handle); border-color: var(--nk-flow-handle-ring); }
        .studio-flow-editor .react-flow__background pattern circle { fill: var(--nk-flow-dot); }
        .studio-flow-editor .react-flow__minimap-node { fill: var(--nk-flow-mini-node); }
        .studio-flow-editor .react-flow__minimap-mask { fill: var(--nk-flow-mask); }
      `}</style>
      <aside className="w-64 border-e border-surface-800 bg-surface-900 overflow-y-auto">
        <div className="p-3 border-b border-surface-800">
          <div className="text-xs text-surface-500 uppercase tracking-wider">{t("editor.flow")}</div>
          <div className="font-semibold">{props.flowName}</div>
          <details className="mt-2 text-[11px] text-surface-400"><summary className="cursor-pointer" data-help={t("editor.webAddressHelp")}>{t("editor.webAddress")}</summary><code dir="ltr" className="mt-2 block break-all text-start">/api/run/{props.flowId}</code></details>
        </div>
        <div className="p-3">
          <div className="text-xs uppercase tracking-wider text-surface-400 mb-2" data-help={t("editor.addStepHelp")}>
            {t("editor.addStep")}
          </div>
          <label className="studio-search mb-4"><Search size={14} /><input aria-label={t("editor.searchLabel")} data-help={t("editor.searchHelp")} placeholder={t("editor.searchPlaceholder")} value={stepSearch} onChange={(e) => setStepSearch(e.target.value)} /></label>
          {Object.entries(groupByCategory(NODE_CATALOG.filter((c) => `${c.label} ${t(`catalog.${c.type}.label`)} ${c.category} ${t(`categories.${CATEGORY_LABELS[c.category]}`)}`.toLowerCase().includes(stepSearch.toLowerCase())))).map(([cat, items]) => (
            <div key={cat} className="mb-4">
              <div className="text-[10px] text-surface-500 uppercase tracking-[0.12em] font-semibold mb-1.5">
                {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ? t(`categories.${CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}`) : cat}
              </div>
              <div className="grid gap-1.5">
                {items.map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.type}
                      className="group flex items-center gap-2.5 text-start px-2.5 py-2 rounded-lg hover:bg-surface-800 text-sm border border-surface-800 hover:border-surface-700 transition"
                      onClick={() => addNode(c.type)}
                      data-help={t(`catalog.${c.type}.help`)}
                    >
                      <span
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-950 border border-surface-800 group-hover:border-surface-700 ${c.iconColor}`}
                      >
                        <Icon size={15} strokeWidth={2} />
                      </span>
                      <span className="text-surface-100">{t(`catalog.${c.type}.label`)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex-1 min-w-0 relative">
        <div className="studio-segmented absolute start-3 top-3 z-30 bg-surface-950/90" role="tablist" aria-label={t("editor.tabsLabel")}>
          <button type="button" role="tab" id="flow-tab-design" aria-selected={tab === "design"} aria-controls="flow-panel-design" data-help={t("editor.tabStepsHelp")} className={`inline-flex items-center gap-1.5 ${tab === "design" ? "active" : ""}`} onClick={() => setTab("design")}>
            <Workflow size={13} aria-hidden />{t("editor.tabSteps")}
          </button>
          <button type="button" role="tab" id="flow-tab-activity" aria-selected={tab === "activity"} aria-controls="flow-panel-activity" data-help={t("editor.tabActivityHelp")} className={`inline-flex items-center gap-1.5 ${tab === "activity" ? "active" : ""}`} onClick={() => setTab("activity")}>
            <History size={13} aria-hidden />{t("editor.tabActivity")}
            {props.problemCount ? <span className="ms-0.5 rounded-full bg-amber-400/20 px-1.5 text-[10px] font-semibold text-amber-200" aria-label={t("editor.problemsBadge", { count: props.problemCount })}>{props.problemCount > 99 ? "99+" : props.problemCount}</span> : null}
          </button>
          {props.schedulePanel ? (
            <button type="button" role="tab" id="flow-tab-schedule" aria-selected={tab === "schedule"} aria-controls="flow-panel-schedule" data-help={t("editor.tabScheduleHelp")} className={`inline-flex items-center gap-1.5 ${tab === "schedule" ? "active" : ""}`} onClick={() => setTab("schedule")}>
              <CalendarClock size={13} aria-hidden />{t("editor.tabSchedule")}
            </button>
          ) : null}
        </div>
        {tab === "activity" && (
          <div id="flow-panel-activity" role="tabpanel" aria-labelledby="flow-tab-activity" className="absolute inset-0 z-20 overflow-y-auto bg-surface-950">
            <ActivityPanel projectId={props.projectId} flowId={props.flowId} refreshKey={activityKey} />
          </div>
        )}
        {tab === "schedule" && props.schedulePanel && (
          <div id="flow-panel-schedule" role="tabpanel" aria-labelledby="flow-tab-schedule" className="absolute inset-0 z-20 overflow-y-auto bg-surface-950">
            <div className="mx-auto max-w-xl px-5 pb-10 pt-16">{props.schedulePanel}</div>
          </div>
        )}
        <div className="absolute top-3 end-3 z-30 flex items-center gap-2">
          <span className="text-xs text-surface-400">
            {status === "saving" ? tc("saving") : status === "saved" ? t("editor.saved") : status === "error" ? t("editor.saveFailed") : ""}
          </span>
          <span className="rounded-md border border-surface-800 bg-surface-950/90 px-2 py-1.5">
            <FlowEnabledSwitch projectId={props.projectId} flowId={props.flowId} enabled={enabled} scheduled={props.scheduled} onChange={setEnabled} />
          </span>
          <button className="btn-ghost" onClick={testRun} data-help={t("editor.testRunHelp")}>
            {t("editor.testRun")}
          </button>
        </div>
        {/* The canvas stays left-to-right in every language: React Flow places
            steps and their connections by absolute coordinates. */}
        <div id="flow-panel-design" role="tabpanel" aria-labelledby="flow-tab-design" className="h-full" dir="ltr" aria-hidden={tab !== "design"} inert={tab !== "design"}>
        <DeleteNodeCtx.Provider value={deleteNode}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelected(n.id)}
            onPaneClick={() => setSelected(null)}
            nodeTypes={nodeTypes}
            defaultMarkerColor="var(--nk-flow-edge)"
            fitView
          >
            <Background color="var(--nk-flow-dot)" gap={18} />
            <MiniMap pannable zoomable maskColor="var(--nk-flow-mask)" nodeColor="var(--nk-flow-mini-node)" />
            <Controls />
          </ReactFlow>
        </DeleteNodeCtx.Provider>
        </div>

        {testOut && tab === "design" && (
          <pre dir="ltr" className="absolute bottom-3 start-3 end-3 max-h-40 overflow-auto bg-surface-950/90 border border-surface-800 rounded-lg p-3 text-xs font-mono text-surface-200">
{testOut}
          </pre>
        )}
      </div>

      <aside className="w-80 border-s border-surface-800 bg-surface-900 overflow-y-auto">
        {selectedNode ? (
          <NodeInspector
            node={selectedNode}
            nodes={nodes}
            edges={edges}
            datasources={props.datasources}
            onChange={(patch) => updateNodeData(selectedNode.id, patch)}
            onDelete={() => deleteNode(selectedNode.id)}
          />
        ) : (
          <div className="px-6 py-12 text-center text-sm text-surface-400"><MousePointer2 size={28} strokeWidth={1.3} className="mx-auto mb-4 text-brand-300" /><h2 className="font-medium text-surface-100">{t("editor.emptyTitle")}</h2><p className="mt-3 text-xs leading-relaxed">{t("editor.emptyBody")}</p></div>
        )}
      </aside>
    </div>
  );
}

function groupByCategory(catalog: typeof NODE_CATALOG) {
  const out: Record<string, typeof NODE_CATALOG> = {};
  for (const c of catalog) {
    (out[c.category] ??= []).push(c);
  }
  return out;
}

function NkNodeView({ id, data, selected }: { id: string; data: Record<string, unknown>; selected: boolean }) {
  const deleteNode = useContext(DeleteNodeCtx);
  const t = useTranslations("flows");
  const entry = NODE_CATALOG.find((c) => c.type === (data.nkType as string));
  const Icon = entry?.icon;
  return (
    <div
      className={`relative rounded-xl border bg-surface-900 text-surface-100 min-w-[180px] shadow-xl shadow-black/40 [[data-theme=light]_&]:shadow-black/10 ${
        selected ? "border-brand-500" : "border-surface-700"
      }`}
    >
      {selected && (
        <button
          className="absolute -top-2.5 -right-2.5 z-10 h-5 w-5 rounded-full bg-[#dc2626] hover:bg-[#ef4444] text-fixed-white flex items-center justify-center shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            deleteNode(id);
          }}
          title={t("editor.deleteStep")}
          aria-label={t("editor.deleteStep")}
          data-help={t("editor.deleteStepHelp")}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      )}
      <div className="flex items-center gap-2.5 px-3 py-2 border-b border-surface-800 bg-surface-800/60 rounded-t-xl">
        {Icon ? (
          <span
            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-950 border border-surface-800 ${
              entry?.iconColor ?? "text-surface-200"
            }`}
          >
            <Icon size={13} strokeWidth={2.25} />
          </span>
        ) : (
          <span className="h-2 w-2 rounded-full bg-surface-500" />
        )}
        <span className="text-sm font-medium truncate">
          {stepLabel(data.nkType as string, data.label, t)}
        </span>
      </div>
      <div className="px-3 py-2 text-[11px] text-surface-400 truncate">
        {entry?.summary(data, t) ?? ""}
      </div>
      <Handles type={data.nkType as string} />
    </div>
  );
}

function Handles({ type }: { type: string }) {
  const t = useTranslations("flows.editor");
  if (type === "trigger") {
    return <Handle type="source" position={Position.Right} data-help={t("handleOut")} />;
  }
  if (type === "response") {
    return <Handle type="target" position={Position.Left} data-help={t("handleIn")} />;
  }
  if (type === "branch") {
    return (
      <>
        <Handle type="target" position={Position.Left} data-help={t("handleIn")} />
        <Handle id="true" type="source" position={Position.Right} style={{ top: "35%" }} data-help={t("handleTrue")} />
        <Handle id="false" type="source" position={Position.Right} style={{ top: "65%" }} data-help={t("handleFalse")} />
      </>
    );
  }
  return (
    <>
      <Handle type="target" position={Position.Left} data-help={t("handleIn")} />
      <Handle type="source" position={Position.Right} data-help={t("handleOut")} />
    </>
  );
}
