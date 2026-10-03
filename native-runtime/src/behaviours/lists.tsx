import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator } from "react-native";
import { NavigationContext } from "@react-navigation/native";
import type { NativeInputNode, NativeNode, NativeStyle, NativeViewNode } from "../spec";
import type { Behaviour, InnerRender, RenderExtras } from "../render/behaviours";
import { useRender } from "../render/context";
import { listRows, runFlow } from "./net";
import { themeOf, tr } from "./kit";
import { emptyLine, fillNode, fillOptions, findAll, findEmpty, findTemplate, rowCard, type Row } from "./rows";
import { AncestryProvider, usePageScope } from "./scope";
import { ChoiceSheet } from "./sheet";

/**
 * Bound data, the native twin of the web runtime's bindFlow, kanban boards
 * and sortable lists (RUNTIME_JS sections 2, 11, 13):
 *
 *   data-nk-bind-flow="<id>" (or -ref)  rows from the flow, one copy of the row template each
 *     body: the page address's query (?id=3), data-nk-arg-<name> values, data-nk-filter values
 *     data-nk-empty / data-nk-empty-text  the empty state;  data-nk-refresh="<ms>"  loads again every ms
 *     a <select> gets one option per row
 *   data-nk-kanban (data-nk-update-flow, data-nk-status-field) with data-nk-column columns
 *     cards (data-nk-row-id): touch and hold → "Move to …" (sends { id, <status>: column })
 *   data-nk-sortable (data-nk-reorder-flow): touch and hold an item → move up/down/top/bottom
 *     (sends { order: [{ id, position }] })
 *
 * Phones have no drag and drop between columns of a web page; the same
 * moves are offered from a sheet (and as screen-reader actions).
 */

/* ── Focus (polling only while the screen shows) ───────────────────────── */

function useScreenFocused(): boolean {
  const nav = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => (nav ? nav.isFocused() : true));
  useEffect(() => {
    if (!nav) return;
    const a = nav.addListener("focus", () => setFocused(true));
    const b = nav.addListener("blur", () => setFocused(false));
    return () => {
      a();
      b();
    };
  }, [nav]);
  return focused;
}

/* ── Reordering ────────────────────────────────────────────────────────── */

type Move = "top" | "up" | "down" | "bottom";

function moved(order: number[], pos: number, how: Move): number[] {
  const out = order.slice();
  const [it] = out.splice(pos, 1);
  const to = how === "top" ? 0 : how === "bottom" ? out.length : how === "up" ? Math.max(0, pos - 1) : Math.min(out.length, pos + 1);
  out.splice(to, 0, it);
  return out;
}

/** Long-press menu and screen-reader actions for one item of a sortable list. */
function useReorder(count: number, version: unknown, onChange: (order: number[]) => void) {
  const ctx = useRender();
  const [order, setOrder] = useState<number[]>(() => Array.from({ length: count }, (_, i) => i));
  const [menu, setMenu] = useState<number | null>(null);
  useEffect(() => {
    setOrder(Array.from({ length: count }, (_, i) => i));
  }, [count, version]);
  const apply = (pos: number, how: Move) => {
    const next = moved(order, pos, how);
    setOrder(next);
    onChange(next);
  };
  const app = ctx.app;
  const labels: Record<Move, string> = {
    top: tr(app, "native.moveTop", "Move to the top"),
    up: tr(app, "native.moveUp", "Move up"),
    down: tr(app, "native.moveDown", "Move down"),
    bottom: tr(app, "native.moveBottom", "Move to the bottom"),
  };
  const extras = (pos: number): RenderExtras => ({
    onLongPress: () => setMenu(pos),
    hint: tr(app, "native.reorderHint", "Touch and hold to move"),
    actions: (["up", "down", "top", "bottom"] as Move[])
      .filter((m) => ((m === "up" || m === "top") && pos > 0) || ((m === "down" || m === "bottom") && pos < order.length - 1))
      .map((m) => ({ name: m, label: labels[m], run: () => apply(pos, m) })),
  });
  const sheet = (
    <ChoiceSheet
      app={app}
      visible={menu !== null}
      title={tr(app, "native.moveTo", "Move to")}
      choices={
        menu === null
          ? []
          : (["top", "up", "down", "bottom"] as Move[]).map((m) => ({
              key: m,
              label: labels[m],
              disabled: ((m === "up" || m === "top") && menu === 0) || ((m === "down" || m === "bottom") && menu === order.length - 1),
            }))
      }
      onPick={(c) => {
        const pos = menu;
        setMenu(null);
        if (pos !== null) apply(pos, c.key as Move);
      }}
      onClose={() => setMenu(null)}
    />
  );
  return { order, extras, sheet };
}

function reorderFlow(node: NativeNode): string | undefined {
  return node.nk?.["data-nk-reorder-flow"] || node.nk?.["data-nk-reorder-flow-ref"] || undefined;
}

/** Sends the new order like the web: { order: [{ id, position }] } for items with a row id. */
function postOrder(ctx: ReturnType<typeof useRender>, flowId: string | undefined, items: NativeNode[]): void {
  if (!flowId) return;
  const order: { id: string; position: number }[] = [];
  items.forEach((n, idx) => {
    const id = n.nk?.["data-nk-row-id"];
    if (id && !/\{\w+\}/.test(id)) order.push({ id, position: idx });
  });
  void runFlow(ctx, flowId, { order });
}

/* ── Bound lists ───────────────────────────────────────────────────────── */

/** data-nk-arg-<name>="value": fixed values sent to the flow. */
function argsOf(nk: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(nk ?? {})) if (k.startsWith("data-nk-arg-")) out[k.slice("data-nk-arg-".length)] = v;
  return out;
}

const SIZE_KEYS = ["width", "flex", "flexGrow", "flexShrink", "flexBasis", "minWidth", "maxWidth"];

/** An empty box the size of a grid item, so a last row that isn't full keeps its items' size. */
function spacer(item: NativeNode): NativeNode {
  const st: NativeStyle = {};
  for (const k of SIZE_KEYS) if (item.style?.[k] !== undefined) st[k] = item.style[k];
  return { type: "view", tag: "#spacer", style: st, children: [], a11y: { hidden: true } };
}

function BoundList({ node, flowId, inner }: { node: NativeNode; flowId: string; inner: InnerRender }) {
  const ctx = useRender();
  const page = usePageScope();
  const app = ctx.app;
  const isSelect = node.type === "input" && node.inputType === "select";
  const tpl = useMemo(() => (isSelect ? null : findTemplate(node)), [node, isSelect]);
  const [st, setSt] = useState<{ rows: Row[] | null; failed: boolean; v: number }>({ rows: null, failed: false, v: 0 });
  const filters = useRef<Record<string, string>>({});
  const seq = useRef(0);
  const live = useRef(ctx);
  live.current = ctx;

  const load = useCallback(
    async (f?: Record<string, string>) => {
      if (f) filters.current = f;
      const n = ++seq.current;
      const body = { ...page.query, ...argsOf(node.nk), ...filters.current };
      const res = await runFlow(live.current, flowId, body);
      if (n !== seq.current) return;
      // No answer: keep what is shown (the first time, say so).
      if (res.network) {
        setSt((s) => (s.rows ? s : { ...s, failed: true }));
        return;
      }
      setSt((s) => ({ rows: listRows(res), failed: false, v: s.v + 1 }));
    },
    [flowId, node, page],
  );

  useEffect(() => {
    void load();
    return page.register({ node, refresh: load });
  }, [load, node, page]);

  // data-nk-refresh="<ms>": live lists load again, while their screen shows.
  const every = parseInt(node.nk?.["data-nk-refresh"] || "0", 10);
  const focused = useScreenFocused();
  useEffect(() => {
    if (!(every > 0) || !focused) return;
    const t = setInterval(() => void load(), Math.max(every, 1000));
    return () => clearInterval(t);
  }, [every, focused, load]);

  const sortable = Boolean(node.nk && "data-nk-sortable" in node.nk);
  const rows = st.rows;
  const filled = useMemo(() => (rows ? rows.map((r) => (tpl ? fillNode(tpl.item, r, app) : rowCard(r, app))) : []), [rows, tpl, app]);
  const reorder = useReorder(filled.length, st.v, (order) => postOrder(ctx, reorderFlow(node), order.map((i) => filled[i])));
  const selectNode = useMemo(() => (isSelect && rows ? ({ ...node, options: fillOptions(node as NativeInputNode, rows, app) } as NativeNode) : null), [isSelect, rows, node, app]);

  if (!rows) {
    if (isSelect) return <>{inner(node)}</>;
    if (st.failed) return <>{inner({ ...(node as NativeViewNode), children: [emptyLine(tr(app, "native.listFailed", "This couldn't be loaded. Check your connection and pull down to try again."), app)] } as NativeNode)}</>;
    return <>{inner({ ...(node as NativeViewNode), children: [] } as NativeNode, undefined, { extra: <ActivityIndicator key="nk-loading" style={{ paddingVertical: 24 }} color={themeOf(app).muted} accessibilityLabel={tr(app, "native.loading", "Loading")} /> })}</>;
  }
  if (isSelect) return <>{inner(selectNode!)}</>;
  if (!("children" in node)) return <>{inner(node)}</>;

  if (!rows.length) {
    const own = findEmpty(node);
    const text = node.nk?.["data-nk-empty-text"] || tr(app, "nothingHere", "Nothing here yet.");
    return <>{inner({ ...(node as NativeViewNode), children: [own ?? emptyLine(text, app)] } as NativeNode)}</>;
  }

  const order = sortable && reorder.order.length === filled.length ? reorder.order : filled.map((_, i) => i);
  const item = (i: number, pos: number) => <Fragment key={`${st.v}:${i}`}>{inner(filled[i], undefined, sortable ? reorder.extras(pos) : undefined)}</Fragment>;
  let kids: ReactNode[];
  const grid = node.type === "view" ? node.grid : undefined;
  if (grid && grid.columns > 1 && tpl) {
    // A CSS grid: rows of `columns` items, laid out like the compiler's #row boxes.
    const rowStyle: NativeStyle = tpl.rowBox?.style ?? { flexDirection: "row", columnGap: grid.columnGap };
    kids = [];
    for (let j = 0; j * grid.columns < order.length; j++) {
      const part = order.slice(j * grid.columns, (j + 1) * grid.columns);
      const cells = part.map((i, k) => item(i, j * grid.columns + k));
      for (let s = part.length; s < grid.columns; s++) cells.push(<Fragment key={`sp${s}`}>{inner(spacer(tpl.item))}</Fragment>);
      kids.push(<Fragment key={`${st.v}:r${j}`}>{inner({ type: "view", tag: "#row", style: { ...rowStyle, ...(j > 0 && !tpl.rowBox ? { marginTop: grid.rowGap } : {}) }, children: [] }, undefined, { extra: cells })}</Fragment>);
    }
  } else kids = order.map((i, pos) => item(i, pos));

  return (
    <>
      {inner({ ...(node as NativeViewNode), children: [] } as NativeNode, undefined, { extra: kids })}
      {sortable ? reorder.sheet : null}
    </>
  );
}

/* ── Sortable (without a flow of its own) ──────────────────────────────── */

function SortableList({ node, inner }: { node: NativeViewNode; inner: InnerRender }) {
  const ctx = useRender();
  const items = node.children;
  const reorder = useReorder(items.length, node, (order) => postOrder(ctx, reorderFlow(node), order.map((i) => items[i])));
  return (
    <>
      {inner({ ...node, children: [] }, undefined, {
        extra: reorder.order.map((i, pos) => <Fragment key={i}>{inner(items[i], undefined, reorder.extras(pos))}</Fragment>),
      })}
      {reorder.sheet}
    </>
  );
}

/* ── Kanban ────────────────────────────────────────────────────────────── */

type Column = { value: string; label: string };
type Kanban = {
  columns: Column[];
  /** Cards moved here (row id → column), drawn in their new column until the board loads again. */
  moved: Map<string, string>;
  cards: Map<string, NativeNode>;
  move: (rowId: string, to: string) => void;
};

const KanbanCtx = createContext<Kanban | null>(null);
const ColumnCtx = createContext<string | null>(null);

function firstText(n: NativeNode): string {
  if (n.nk && "data-nk-row-id" in n.nk) return "";
  if (n.type === "text") return n.runs.map((r) => (r.text ?? "") + (r.runs ?? []).map((x) => x.text ?? "").join("")).join("").trim();
  if ("children" in n && Array.isArray(n.children)) for (const c of n.children) {
    const t = firstText(c);
    if (t) return t;
  }
  return "";
}

function KanbanBoard({ node, inner }: { node: NativeNode; inner: InnerRender }) {
  const ctx = useRender();
  const page = usePageScope();
  const [movedMap, setMoved] = useState<Map<string, string>>(new Map());
  const columns = useMemo(() => findAll(node, "data-nk-column").map((c) => ({ value: c.nk!["data-nk-column"], label: firstText(c) || c.nk!["data-nk-column"] })), [node]);
  const cards = useMemo(() => {
    const m = new Map<string, NativeNode>();
    for (const c of findAll(node, "data-nk-row-id")) {
      const id = c.nk!["data-nk-row-id"];
      if (id && !/\{\w+\}/.test(id) && !("data-nk-column" in c.nk!)) m.set(id, c);
    }
    return m;
  }, [node]);
  const flowId = node.nk?.["data-nk-update-flow"] || node.nk?.["data-nk-update-flow-ref"] || node.nk?.["data-nk-bind-flow"];
  const statusField = node.nk?.["data-nk-status-field"] || "status";
  const live = useRef(ctx);
  live.current = ctx;
  const api = useMemo<Kanban>(
    () => ({
      columns,
      moved: movedMap,
      cards,
      move: (rowId, to) => {
        setMoved((m) => new Map(m).set(rowId, to));
        if (!flowId) return;
        void runFlow(live.current, flowId, { id: rowId, [statusField]: to }).then((r) => {
          // Columns filled by flows show the card where the server now has it.
          if (!r.network && !cards.has(rowId)) void page.refreshAll();
        });
      },
    }),
    [columns, movedMap, cards, flowId, statusField, page],
  );
  return <KanbanCtx.Provider value={api}>{inner(node)}</KanbanCtx.Provider>;
}

/** The node without the cards that moved to another column. */
function without(node: NativeNode, gone: (id: string) => boolean): NativeNode {
  if (!("children" in node) || !Array.isArray(node.children)) return node;
  const kids = node.children.filter((c) => !(c.nk?.["data-nk-row-id"] && gone(c.nk["data-nk-row-id"]))).map((c) => without(c, gone));
  return { ...node, children: kids } as NativeNode;
}

function KanbanColumn({ node, inner }: { node: NativeNode; inner: InnerRender }) {
  const k = useContext(KanbanCtx);
  const me = node.nk?.["data-nk-column"] ?? "";
  const shown = useMemo(() => {
    if (!k || !k.moved.size || !("children" in node)) return node;
    const here = new Set(findAll(node, "data-nk-row-id").map((c) => c.nk!["data-nk-row-id"]));
    const pruned = without(node, (id) => k.moved.has(id) && k.moved.get(id) !== me) as NativeViewNode;
    const incoming = [...k.moved].filter(([id, col]) => col === me && !here.has(id) && k.cards.has(id)).map(([id]) => k.cards.get(id)!);
    return incoming.length ? { ...pruned, children: [...pruned.children, ...incoming] } : pruned;
  }, [k, node, me]);
  if (!k) return <>{inner(node)}</>;
  return <ColumnCtx.Provider value={me}>{inner(shown)}</ColumnCtx.Provider>;
}

/** A card / row (data-nk-row-id): the row inline edits inside belong to; on a board, movable. */
function RowHolder({ node, inner }: { node: NativeNode; inner: InnerRender }) {
  const ctx = useRender();
  const k = useContext(KanbanCtx);
  const column = useContext(ColumnCtx);
  const [menu, setMenu] = useState(false);
  const rowId = node.nk?.["data-nk-row-id"];
  const id = rowId && !/\{\w+\}/.test(rowId) ? rowId : undefined;
  const updateFlow = node.nk?.["data-nk-update-flow"] || node.nk?.["data-nk-update-flow-ref"] || undefined;
  const card = Boolean(k && id && !(node.nk && "data-nk-column" in node.nk));
  const app = ctx.app;
  const here = (id && k?.moved.get(id)) ?? column;
  const extras: RenderExtras | undefined = card
    ? {
        onLongPress: () => setMenu(true),
        hint: tr(app, "native.reorderHint", "Touch and hold to move"),
        actions: k!.columns.filter((c) => c.value !== here).map((c) => ({ name: `move-${c.value}`, label: tr(app, "native.moveToColumn", "Move to {column}", { column: c.label }), run: () => k!.move(id!, c.value) })),
      }
    : undefined;
  return (
    <AncestryProvider value={{ rowId: id, updateFlow }}>
      {inner(node, undefined, extras)}
      {card ? (
        <ChoiceSheet
          app={app}
          visible={menu}
          title={tr(app, "native.moveTo", "Move to")}
          choices={k!.columns.map((c) => ({ key: c.value, label: c.label, selected: c.value === here }))}
          onPick={(c) => {
            setMenu(false);
            if (c.key !== here) k!.move(id!, c.key);
          }}
          onClose={() => setMenu(false)}
        />
      ) : null}
    </AncestryProvider>
  );
}

function UpdateFlowHolder({ node, inner }: { node: NativeNode; inner: InnerRender }) {
  return <AncestryProvider value={{ updateFlow: node.nk?.["data-nk-update-flow"] || node.nk?.["data-nk-update-flow-ref"] || undefined }}>{inner(node)}</AncestryProvider>;
}

/* ── Registry ──────────────────────────────────────────────────────────── */

/** Calendars, calendar sources and charts share data-nk-bind-flow but draw themselves (behaviours/calendar, chart). */
function ownWidget(node: NativeNode): boolean {
  const nk = node.nk ?? {};
  return "data-nk-calendar" in nk || "data-nk-calendar-source" in nk || "data-nk-chart" in nk;
}

function bindList(value: string, node: NativeNode, inner: InnerRender): ReactNode {
  const flowId = node.nk?.["data-nk-bind-flow"] || node.nk?.["data-nk-bind-flow-ref"] || value;
  if (ownWidget(node) || !flowId || /\{\w+\}/.test(flowId)) return inner(node);
  return <BoundList node={node} flowId={flowId} inner={inner} />;
}

export const LIST_BEHAVIOURS: Behaviour[] = [
  { attr: "data-nk-kanban", phase: 2, priority: 60, render: (_v, node, _ctx, inner) => <KanbanBoard node={node} inner={inner} /> },
  { attr: "data-nk-bind-flow", phase: 2, priority: 40, render: (v, node, _ctx, inner) => bindList(v, node, inner) },
  { attr: "data-nk-bind-flow-ref", phase: 2, priority: 40, render: (v, node, _ctx, inner) => (node.nk?.["data-nk-bind-flow"] ? inner(node) : bindList(v, node, inner)) },
  {
    attr: "data-nk-sortable",
    phase: 2,
    priority: 35,
    // A bound list sorts its own rows.
    render: (_v, node, _ctx, inner) => (node.type === "view" && !node.nk?.["data-nk-bind-flow"] && !node.nk?.["data-nk-bind-flow-ref"] ? <SortableList node={node} inner={inner} /> : inner(node)),
  },
  { attr: "data-nk-column", phase: 2, priority: 33, render: (_v, node, _ctx, inner) => <KanbanColumn node={node} inner={inner} /> },
  { attr: "data-nk-row-id", phase: 2, priority: 30, render: (_v, node, _ctx, inner) => <RowHolder node={node} inner={inner} /> },
  { attr: "data-nk-update-flow", phase: 2, priority: 29, render: (_v, node, _ctx, inner) => <UpdateFlowHolder node={node} inner={inner} /> },
  // A flow reference never turned into an id (the web's nkResolveRefs): /api/run accepts the name.
  { attr: "data-nk-update-flow-ref", phase: 2, priority: 29, render: (_v, node, _ctx, inner) => <UpdateFlowHolder node={node} inner={inner} /> },
];

