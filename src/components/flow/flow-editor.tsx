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
import { nanoid } from "nanoid";
import type { FlowGraph } from "@/lib/flow/types";
import { NodeInspector } from "./node-inspector";
import { ActivityPanel } from "./activity-panel";
import { CATEGORY_LABELS, NODE_CATALOG } from "./catalog";
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
      setTestOut("This automation is paused. Turn it on to test it.");
      return;
    }
    setTestOut("Running...");
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
      <aside className="w-64 border-r border-surface-800 bg-surface-900 overflow-y-auto">
        <div className="p-3 border-b border-surface-800">
          <div className="text-xs text-surface-500 uppercase tracking-wider">Flow</div>
          <div className="font-semibold">{props.flowName}</div>
          <details className="mt-2 text-[11px] text-surface-400"><summary className="cursor-pointer" data-help="The web address other services or your own code can call to start this automation. You only need it if you’re connecting something outside the studio.">Web address (for developers)</summary><code className="mt-2 block break-all">/api/run/{props.flowId}</code></details>
        </div>
        <div className="p-3">
          <div className="text-xs uppercase tracking-wider text-surface-400 mb-2" data-help="The things your automation can do. Click one to add it, then drag from its right edge to the next step to set the order they run in.">
            Add step
          </div>
          <label className="studio-search mb-4"><Search size={14} /><input aria-label="Search flow steps" data-help="Type a word, like “email” or “save”, to find a step fast." placeholder="Find a step…" value={stepSearch} onChange={(e) => setStepSearch(e.target.value)} /></label>
          {Object.entries(groupByCategory(NODE_CATALOG.filter((c) => `${c.label} ${c.category} ${CATEGORY_LABELS[c.category]}`.toLowerCase().includes(stepSearch.toLowerCase())))).map(([cat, items]) => (
            <div key={cat} className="mb-4">
              <div className="text-[10px] text-surface-500 uppercase tracking-[0.12em] font-semibold mb-1.5">
                {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat}
              </div>
              <div className="grid gap-1.5">
                {items.map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.type}
                      className="group flex items-center gap-2.5 text-left px-2.5 py-2 rounded-lg hover:bg-surface-800 text-sm border border-surface-800 hover:border-surface-700 transition"
                      onClick={() => addNode(c.type)}
                      data-help={c.help}
                    >
                      <span
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-950 border border-surface-800 group-hover:border-surface-700 ${c.iconColor}`}
                      >
                        <Icon size={15} strokeWidth={2} />
                      </span>
                      <span className="text-surface-100">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex-1 min-w-0 relative">
        <div className="studio-segmented absolute left-3 top-3 z-30 bg-surface-950/90" role="tablist" aria-label="Flow views">
          <button type="button" role="tab" id="flow-tab-design" aria-selected={tab === "design"} aria-controls="flow-panel-design" data-help="Build the automation: add steps and connect them in the order they should run." className={`inline-flex items-center gap-1.5 ${tab === "design" ? "active" : ""}`} onClick={() => setTab("design")}>
            <Workflow size={13} aria-hidden />Steps
          </button>
          <button type="button" role="tab" id="flow-tab-activity" aria-selected={tab === "activity"} aria-controls="flow-panel-activity" data-help="See each time this automation ran, whether it worked, and what people sent when something went wrong." className={`inline-flex items-center gap-1.5 ${tab === "activity" ? "active" : ""}`} onClick={() => setTab("activity")}>
            <History size={13} aria-hidden />Activity
            {props.problemCount ? <span className="ml-0.5 rounded-full bg-amber-400/20 px-1.5 text-[10px] font-semibold text-amber-200" aria-label={`${props.problemCount} with a problem in the last 24 hours`}>{props.problemCount > 99 ? "99+" : props.problemCount}</span> : null}
          </button>
          {props.schedulePanel ? (
            <button type="button" role="tab" id="flow-tab-schedule" aria-selected={tab === "schedule"} aria-controls="flow-panel-schedule" data-help="Choose whether this runs when your app uses it or by itself at set times, like every morning." className={`inline-flex items-center gap-1.5 ${tab === "schedule" ? "active" : ""}`} onClick={() => setTab("schedule")}>
              <CalendarClock size={13} aria-hidden />Schedule
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
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          <span className="text-xs text-surface-400">
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Save failed" : ""}
          </span>
          <span className="rounded-md border border-surface-800 bg-surface-950/90 px-2 py-1.5">
            <FlowEnabledSwitch projectId={props.projectId} flowId={props.flowId} enabled={enabled} scheduled={props.scheduled} onChange={setEnabled} />
          </span>
          <button className="btn-ghost" onClick={testRun} data-help="Runs this automation once right now, using your latest saved changes, and shows the result below. It really does its steps (saving, emailing and so on), and it shows up in Activity.">
            Test run
          </button>
        </div>
        <div id="flow-panel-design" role="tabpanel" aria-labelledby="flow-tab-design" className="h-full" aria-hidden={tab !== "design"} inert={tab !== "design"}>
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
            fitView
          >
            <Background color="#232336" gap={18} />
            <MiniMap pannable zoomable maskColor="rgba(10,10,20,0.6)" />
            <Controls />
          </ReactFlow>
        </DeleteNodeCtx.Provider>
        </div>

        {testOut && tab === "design" && (
          <pre className="absolute bottom-3 left-3 right-3 max-h-40 overflow-auto bg-surface-950/90 border border-surface-800 rounded-lg p-3 text-xs font-mono text-surface-200">
{testOut}
          </pre>
        )}
      </div>

      <aside className="w-80 border-l border-surface-800 bg-surface-900 overflow-y-auto">
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
          <div className="px-6 py-12 text-center text-sm text-surface-400"><MousePointer2 size={28} strokeWidth={1.3} className="mx-auto mb-4 text-brand-300" /><h2 className="font-medium text-surface-100">Every step has a purpose.</h2><p className="mt-3 text-xs leading-relaxed">Select a step to adjust what it does. Add more from the left, then connect them in the order they should run.</p></div>
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
  const entry = NODE_CATALOG.find((c) => c.type === (data.nkType as string));
  const Icon = entry?.icon;
  return (
    <div
      className={`relative rounded-xl border bg-surface-900 text-surface-100 min-w-[180px] shadow-xl shadow-black/40 ${
        selected ? "border-brand-500" : "border-surface-700"
      }`}
    >
      {selected && (
        <button
          className="absolute -top-2.5 -right-2.5 z-10 h-5 w-5 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            deleteNode(id);
          }}
          title="Delete step"
          aria-label="Delete step"
          data-help="Removes this step and its connections. You can also press Delete on your keyboard."
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
          {(data.label as string) ?? entry?.label ?? (data.nkType as string)}
        </span>
      </div>
      <div className="px-3 py-2 text-[11px] text-surface-400 truncate">
        {entry?.summary(data) ?? ""}
      </div>
      <Handles type={data.nkType as string} />
    </div>
  );
}

function Handles({ type }: { type: string }) {
  if (type === "trigger") {
    return <Handle type="source" position={Position.Right} data-help="Drag from here to the next step to choose what runs after this one." />;
  }
  if (type === "response") {
    return <Handle type="target" position={Position.Left} data-help="Where the previous step connects in." />;
  }
  if (type === "branch") {
    return (
      <>
        <Handle type="target" position={Position.Left} data-help="Where the previous step connects in." />
        <Handle id="true" type="source" position={Position.Right} style={{ top: "35%" }} data-help="Top dot: drag from here to the step that should run when the check is true." />
        <Handle id="false" type="source" position={Position.Right} style={{ top: "65%" }} data-help="Bottom dot: drag from here to the step that should run when the check is not true." />
      </>
    );
  }
  return (
    <>
      <Handle type="target" position={Position.Left} data-help="Where the previous step connects in." />
      <Handle type="source" position={Position.Right} data-help="Drag from here to the next step to choose what runs after this one." />
    </>
  );
}
