import { useContext, useMemo, useRef, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeNode, NativeTextNode, NativeTextRun, NativeViewNode } from "../spec";
import type { Behaviour, InnerRender, InnerRunRender } from "../render/behaviours";
import { followHref } from "../render/behaviours";
import { useRender, type RenderContext } from "../render/context";
import { toStyle } from "../render/style";
import { runFlow } from "./net";
import { formExtraFields, formSucceeded } from "./bus";
import { openFlowRedirect } from "./cart";
import { GateCtx, sessionNow, sessionSettled } from "./auth";
import { themeOf, tr } from "./kit";
import { findAll } from "./rows";
import { FieldHostProvider, FormScope, useAncestry, useFormScope, usePageScope, useStore, type Feedback, type PickedFile } from "./scope";

/**
 * Forms bound to flows, the native twin of the web runtime's nkSubmit
 * (RUNTIME_JS "1. Forms bound to flows"):
 *
 *   <form data-nk-form data-nk-flow="<id>">      sends its fields to /api/run/<id>
 *     data-nk-flow-ref="<name>"                  a flow named by its short name (the server resolves it)
 *     data-nk-pending-text="Sending…"            shown while it sends
 *     data-nk-success-text="Thanks!"             instead of "Done."
 *     data-nk-message-field="answer"             show that field of the answer instead
 *     [data-nk-error] / [data-nk-success]        where the outcome is shown (else a box after the form)
 *
 * The fields are checked first like a browser does (required, email, url,
 * number, min/max, minlength/maxlength, pattern) with the app's wording;
 * the spam trap (_nk_hp empty, _nk_t = when the form appeared) goes with
 * every form; forms with chosen files go as multipart. Afterwards: the
 * flow's redirect, or the form is reset, the message shown and the page's
 * bound lists load again. Inline editing (data-nk-inline-edit) is here too.
 */

/* ── Sending ───────────────────────────────────────────────────────────── */

/** A flow's own error ("Wrong password") when it is a short sentence; else a plain apology (nkErrorText). */
function errorText(ctx: RenderContext, body: unknown): string {
  const e = body && typeof body === "object" ? (body as { error?: unknown }).error : null;
  if (typeof e === "string") {
    const s = e.trim();
    if (s && s.length <= 200 && s !== "Flow not found or disabled") return s;
  }
  return tr(ctx.app, "sendFailed", "Sorry, that didn't send. Please try again.");
}

/** The flow's message, or the field named by data-nk-message-field (nkMessageText). */
function messageText(form: NativeNode, body: unknown): string {
  const key = form.nk?.["data-nk-message-field"] || "message";
  const m = body && typeof body === "object" ? (body as Record<string, unknown>)[key] : null;
  return typeof m === "string" || typeof m === "number" ? String(m) : "";
}

type Collected = {
  json: Record<string, unknown>;
  files: { name: string; file: PickedFile }[];
  strings: [string, string][];
  /** File fields with nothing chosen: the browser still sends them (an empty file part, or {} in JSON). */
  emptyFiles: string[];
};

/** What the form sends, as the web's new FormData(form) + its checkbox rule. */
function collect(scope: FormScope, ctx: RenderContext): Collected {
  const json: Record<string, unknown> = {};
  const strings: [string, string][] = [];
  const files: { name: string; file: PickedFile }[] = [];
  const emptyFiles: string[] = [];
  const counts = new Map<string, number>();
  for (const r of scope.list()) if (r.node.name) counts.set(r.node.name, (counts.get(r.node.name) ?? 0) + 1);
  for (const r of scope.list()) {
    const name = r.node.name;
    if (!name || name === "_nk_hp" || name === "_nk_t") continue;
    const entries = r.entries();
    // An empty file field: the web's FormData has an empty file for it, which
    // its JSON body writes as {} (JSON.stringify of a File).
    if (r.node.inputType === "file" && !entries.length && !r.node.disabled) {
      emptyFiles.push(name);
      json[name] = {};
      continue;
    }
    for (const e of entries) {
      if ("file" in e) {
        files.push({ name: e.name, file: e.file });
        continue;
      }
      strings.push([e.name, e.value]);
      // A lone checkbox sends its value (or "true"); several fields with one name: the last one.
      json[e.name] = r.node.inputType === "checkbox" && counts.get(name) === 1 ? e.value || "true" : e.value;
    }
  }
  // Fields other behaviours add (the cart's items and total on a checkout form).
  for (const [k, v] of Object.entries(formExtraFields(scope.form!, ctx))) {
    json[k] = v;
    strings.push([k, v]);
  }
  // The spam trap: a field people never fill in and when the form appeared.
  json._nk_hp = "";
  json._nk_t = String(scope.shownAt);
  strings.push(["_nk_hp", ""], ["_nk_t", String(scope.shownAt)]);
  return { json, files, strings, emptyFiles };
}

function multipart(c: Collected): FormData {
  const fd = new FormData();
  for (const [k, v] of c.strings) fd.append(k, v);
  for (const { name, file } of c.files) {
    if (Platform.OS === "web" && file.file) fd.append(name, file.file as Blob, file.name);
    // React Native's FormData sends { uri, name, type } as the file's bytes.
    else fd.append(name, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  }
  // Empty file fields: an empty file without a name, like the browser's.
  for (const name of c.emptyFiles) {
    if (Platform.OS === "web") fd.append(name, new Blob([], { type: "application/octet-stream" }), "");
    else fd.append(name, { uri: "data:application/octet-stream;base64,", name: "", type: "application/octet-stream" } as unknown as Blob);
  }
  return fd;
}

/** Follows a flow's { redirect }: one of the app's pages natively, an outside page (payment) in the browser. */
export function followRedirect(to: string, ctx: RenderContext): void {
  if (/^https?:\/\//i.test(to) && !to.startsWith(`${ctx.app.base}/`) && to !== ctx.app.base) {
    void openFlowRedirect(to, ctx);
    return;
  }
  followHref(to, ctx);
}

async function send(scope: FormScope, flowId: string, ctx: RenderContext, refreshAll: () => Promise<void>, inGate: boolean): Promise<void> {
  const form = scope.form!;
  // The browser's check first: the first problem is shown (and its field marked), nothing is sent.
  const regs = scope.list();
  let first: { reg: (typeof regs)[number]; msg: string } | null = null;
  for (const r of regs) {
    const msg = r.validate();
    r.showInvalid(Boolean(msg), false);
    if (msg && !first) first = { reg: r, msg };
  }
  if (first) {
    first.reg.showInvalid(true, true);
    const label = first.reg.node.label?.replace(/[\s*:]+$/, "");
    scope.show(label ? tr(ctx.app, "native.fieldNamed", "{label}: {message}", { label, message: first.msg }) : first.msg, "error");
    return;
  }
  scope.sending.set(true);
  scope.show(form.nk?.["data-nk-pending-text"] || "", "pending");
  try {
    const data = collect(scope, ctx);
    const res = await runFlow(ctx, flowId, data.files.length ? multipart(data) : data.json);
    if (res.network) {
      scope.show(tr(ctx.app, "sendFailedOffline", "Sorry, that didn't send. Please check your connection and try again."), "error");
      return;
    }
    const body = res.body as Record<string, unknown>;
    if (!res.ok || (body && body.error)) {
      scope.show(errorText(ctx, body), "error");
      return;
    }
    // Signed in or out by this flow (log in, sign up, verify a code, log out).
    if (res.session) await sessionSettled();
    formSucceeded(form, body, ctx);
    // The log-in page shown in a members-only page's place: that page now shows itself.
    if (inGate && res.session === "set" && sessionNow().signedIn) return;
    if (body && typeof body.redirect === "string" && body.redirect) {
      followRedirect(body.redirect, ctx);
      return;
    }
    scope.reset();
    scope.show(messageText(form, body) || form.nk?.["data-nk-success-text"] || tr(ctx.app, "done", "Done."), "success");
    await refreshAll();
  } finally {
    scope.sending.set(false);
  }
}

/* ── Components ────────────────────────────────────────────────────────── */

function isSubmit(n: NativeNode): boolean {
  return n.type === "button" && n.buttonType === "submit";
}

/** Submit and reset buttons of this form (not of a form inside it) get a marker the button behaviours below key on. */
function markButtons(node: NativeNode, top = true): NativeNode {
  if (!top && node.nk && "data-nk-form" in node.nk) return node;
  let out = node;
  if (node.type === "button" && (isSubmit(node) || node.buttonType === "reset")) {
    out = { ...node, nk: { ...(node.nk ?? {}), [isSubmit(node) ? "data-nk-native-submit" : "data-nk-native-reset"]: "" } };
  }
  if ("children" in out && Array.isArray(out.children)) {
    const kids = out.children.map((c) => markButtons(c, false));
    if (kids.some((k, i) => k !== (out as NativeViewNode).children[i])) out = { ...out, children: kids } as NativeNode;
  }
  if (out.type === "text") {
    const runs = (list: NativeTextRun[]): NativeTextRun[] => list.map((r) => (r.node ? { ...r, node: markButtons(r.node, false) } : r.runs ? { ...r, runs: runs(r.runs) } : r));
    out = { ...out, runs: runs(out.runs) };
  }
  return out;
}

function NkForm({ node, inner }: { node: NativeNode; inner: InnerRender }) {
  const ctx = useRender();
  const page = usePageScope();
  const flowId = node.nk?.["data-nk-flow"] || node.nk?.["data-nk-flow-ref"] || "";
  const hasErrorEl = useMemo(() => findAll(node, "data-nk-error", (n) => Boolean(n.nk && "data-nk-form" in n.nk)).length > 0, [node]);
  const hasSuccessEl = useMemo(() => findAll(node, "data-nk-success", (n) => Boolean(n.nk && "data-nk-form" in n.nk)).length > 0, [node]);
  const scope = useMemo(() => new FormScope(node, hasSuccessEl), [node, hasSuccessEl]);
  const inGate = useContext(GateCtx);
  const live = useRef({ ctx, page, inGate });
  live.current = { ctx, page, inGate };
  scope.submit = () => {
    if (!flowId || scope.sending.get()) return;
    void send(scope, flowId, live.current.ctx, () => live.current.page.refreshAll(), live.current.inGate);
  };
  const marked = useMemo(() => markButtons(node), [node]);
  return (
    <FieldHostProvider host={scope}>
      {inner(marked)}
      {hasErrorEl ? null : <AutoFeedback scope={scope} />}
    </FieldHostProvider>
  );
}

/** The box the web runtime adds after a form without a [data-nk-error] of its own (data-nk-auto). */
function AutoFeedback({ scope }: { scope: FormScope }) {
  const ctx = useRender();
  const fb = useStore(scope.feedback).error;
  if (!fb?.text) return null;
  return <FeedbackBox app={ctx} feedback={fb} />;
}

function FeedbackBox({ app: ctx, feedback }: { app: RenderContext; feedback: Feedback }) {
  const th = themeOf(ctx.app);
  const edge = feedback.kind === "error" ? th.danger : feedback.kind === "success" ? th.success : th.border;
  return (
    <View
      style={{ marginTop: 12, paddingVertical: 9, paddingHorizontal: 13, borderStartWidth: 4, borderColor: edge, borderRadius: Math.min(10, th.radius), backgroundColor: tint(edge) }}
      accessibilityRole={feedback.kind === "error" ? "alert" : "text"}
      accessibilityLiveRegion={feedback.kind === "error" ? "assertive" : "polite"}
      testID="nk-form-feedback"
    >
      <Text style={{ color: th.text, fontSize: 15, lineHeight: 22 }}>{feedback.text}</Text>
    </View>
  );
}

/** A 10% tint of a colour (the web's color-mix(in srgb, edge 10%, transparent)). */
function tint(color: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (m) return `#${m[1]}1a`;
  const r = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(color);
  if (r) return `rgba(${r[1]}, ${r[2]}, ${r[3]}, 0.1)`;
  return "transparent";
}

/** A [data-nk-error] / [data-nk-success] element of a form: shows the form's outcome. */
function FeedbackEl({ node, inner, which }: { node: NativeNode; inner: InnerRender; which: "error" | "success" }) {
  const ctx = useRender();
  const form = useFormScope();
  const state = useStore(form?.feedback ?? EMPTY_FEEDBACK);
  const fb = which === "error" ? state.error : state.success;
  if (!form || !fb?.text) return <>{inner(node)}</>;
  if (node.nk && "data-nk-auto" in node.nk) return <FeedbackBox app={ctx} feedback={fb} />;
  const th = themeOf(ctx.app);
  const color = fb.kind === "error" ? th.danger : fb.kind === "success" ? th.success : th.muted;
  const own = node.type === "text" ? node.runs[0]?.style : undefined;
  const base = (node.type === "text" ? node.style : undefined) ?? {};
  const text: NativeTextNode = {
    type: "text",
    tag: "#text",
    style: { fontSize: (base.fontSize as number) ?? 15, ...(own ?? {}), color },
    runs: [{ text: fb.text }],
    a11y: { role: fb.kind === "error" ? "alert" : "text" },
  };
  if (node.type === "text") return <>{inner({ ...text, ...pick(node, ["id", "cls", "nk", "style"]), hidden: false, style: { ...(node.style ?? {}), color } } as NativeNode)}</>;
  return <>{inner({ ...(node as NativeViewNode), hidden: false, children: [text] } as NativeNode)}</>;
}

function pick<T extends object>(o: T, keys: (keyof T)[]): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) if (o[k] !== undefined) out[k] = o[k];
  return out;
}

const EMPTY_FEEDBACK = new (class {
  get = () => ({ error: null, success: null });
  subscribe = () => () => {};
})() as unknown as import("./kit").Store<{ error: Feedback | null; success: Feedback | null }>;

/** A form's submit button: sends the form; disabled while it sends. */
function SubmitButton({ node, inner, reset }: { node: NativeNode; inner: InnerRender; reset?: boolean }) {
  const form = useFormScope();
  const sending = useStore(form?.sending ?? NOT_SENDING);
  if (!form) return <>{inner(node)}</>;
  if (reset) return <>{inner(node, () => form.reset())}</>;
  const shown = sending ? ({ ...node, disabled: true, style: { ...(node.style ?? {}), opacity: 0.65 } } as NativeNode) : node;
  return <>{inner(shown, sending ? undefined : () => form.submit(node))}</>;
}

const NOT_SENDING = new (class {
  get = () => false;
  subscribe = () => () => {};
})() as unknown as import("./kit").Store<boolean>;

/* ── Inline edit ───────────────────────────────────────────────────────── */

function plain(runs: NativeTextRun[]): string {
  return runs.map((r) => (r.text ?? "") + (r.runs ? plain(r.runs) : "")).join("");
}

/** Saves an inline edit like the web: { id, <field>: value } to the update flow, then lists load again. */
async function saveEdit(ctx: RenderContext, flowId: string, rowId: string, field: string, value: string, refreshAll: () => Promise<void>): Promise<boolean> {
  const res = await runFlow(ctx, flowId, { id: rowId, [field]: value });
  if (res.network) return false;
  await refreshAll();
  return true;
}

function useEditTarget(nk: Record<string, string> | undefined) {
  const up = useAncestry();
  const flowId = nk?.["data-nk-update-flow"] || nk?.["data-nk-update-flow-ref"] || up.updateFlow;
  const rowId = nk?.["data-nk-row-id"] || up.rowId;
  const ok = Boolean(flowId && rowId && !/\{\w+\}/.test(rowId ?? "") && !/\{\w+\}/.test(flowId ?? ""));
  return ok ? { flowId: flowId!, rowId: rowId! } : null;
}

/** <h3 data-nk-inline-edit="name">: tap to edit in place, saved when the field loses focus. */
function InlineEdit({ node, field, inner }: { node: NativeTextNode; field: string; inner: InnerRender }) {
  const ctx = useRender();
  const page = usePageScope();
  const target = useEditTarget(node.nk);
  const current = useMemo(() => plain(node.runs).trim(), [node]);
  const [shown, setShown] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const done = useRef(false);
  if (!target) return <>{inner(node)}</>;
  const text = shown ?? current;
  if (!editing) {
    const view: NativeNode = shown === null ? node : { ...node, runs: [{ text: shown, ...(node.runs[0]?.style ? { style: node.runs[0].style } : {}) }] };
    return (
      <>
        {inner({ ...view, a11y: { ...(node.a11y ?? {}), role: "button" } } as NativeNode, () => {
          done.current = false;
          setDraft(text);
          setEditing(true);
        })}
      </>
    );
  }
  const th = themeOf(ctx.app);
  const st = toStyle({ ...(node.style ?? {}), ...(node.runs[0]?.style ?? {}) }, node.vh, ctx);
  const finish = async () => {
    if (done.current) return;
    done.current = true;
    const next = draft.trim();
    setEditing(false);
    setShown(next || text);
    if (next === text || !next && !text) return;
    const ok = await saveEdit(ctx, target.flowId, target.rowId, field, next, () => page.refreshAll());
    if (!ok) setShown(text);
  };
  return (
    <TextInput
      autoFocus
      underlineColorAndroid="transparent"
      value={draft}
      onChangeText={setDraft}
      onBlur={() => void finish()}
      onSubmitEditing={() => void finish()}
      submitBehavior="blurAndSubmit"
      returnKeyType="done"
      selectTextOnFocus
      accessibilityLabel={tr(ctx.app, "native.edit", "Edit")}
      testID={`nk-inline-${field}`}
      style={[st as never, { borderWidth: 1, borderColor: th.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: th.surface, color: th.text }]}
    />
  );
}

/** <span data-nk-inline-edit> inside a sentence: tap opens a small editor. */
function InlineEditRun({ run, field, inner }: { run: NativeTextRun; field: string; inner: InnerRunRender }) {
  const ctx = useRender();
  const page = usePageScope();
  const target = useEditTarget(run.nk);
  const current = (run.text ?? "") + (run.runs ? plain(run.runs) : "");
  const [shown, setShown] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  if (!target) return <>{inner(run)}</>;
  const text = (shown ?? current).trim();
  const th = themeOf(ctx.app);
  const close = async (save: boolean) => {
    setOpen(false);
    const next = draft.trim();
    if (!save || next === text) return;
    setShown(next || text);
    const ok = await saveEdit(ctx, target.flowId, target.rowId, field, next, () => page.refreshAll());
    if (!ok) setShown(text);
  };
  return (
    <>
      {inner({ ...run, ...(shown !== null ? { text: shown, runs: undefined } : {}) }, () => {
        setDraft(text);
        setOpen(true);
      })}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => void close(false)}>
        <View style={sheet.backdrop}>
          <View style={[sheet.box, { backgroundColor: th.surface, borderRadius: th.radius }]}>
            <TextInput autoFocus underlineColorAndroid="transparent" value={draft} onChangeText={setDraft} onSubmitEditing={() => void close(true)} style={[sheet.input, { borderColor: th.primary, color: th.text }]} testID={`nk-inline-${field}`} />
            <View style={sheet.buttons}>
              <Pressable onPress={() => void close(false)} accessibilityRole="button" style={sheet.button}>
                <Text style={{ color: th.muted, fontSize: 16 }}>{tr(ctx.app, "native.cancel", "Cancel")}</Text>
              </Pressable>
              <Pressable onPress={() => void close(true)} accessibilityRole="button" style={[sheet.button, { backgroundColor: th.primary, borderRadius: th.radius }]}>
                <Text style={{ color: "#fff", fontSize: 16 }}>{tr(ctx.app, "native.save", "Save")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const sheet = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 24 },
  box: { padding: 18, gap: 14 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 17 },
  buttons: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  button: { paddingHorizontal: 16, paddingVertical: 9 },
});

/* ── Registry ──────────────────────────────────────────────────────────── */

export const FORM_BEHAVIOURS: Behaviour[] = [
  {
    attr: "data-nk-form",
    phase: 2,
    priority: 50,
    render: (_value, node, _ctx, inner) => <NkForm node={node} inner={inner} />,
  },
  {
    attr: "data-nk-native-submit",
    phase: 2,
    priority: 5,
    render: (_value, node, _ctx, inner) => <SubmitButton node={node} inner={inner} />,
  },
  {
    attr: "data-nk-native-reset",
    phase: 2,
    priority: 5,
    render: (_value, node, _ctx, inner) => <SubmitButton node={node} inner={inner} reset />,
  },
  {
    attr: "data-nk-error",
    phase: 2,
    priority: 20,
    reveals: true,
    render: (_value, node, _ctx, inner) => <FeedbackEl node={node} inner={inner} which="error" />,
  },
  {
    attr: "data-nk-success",
    phase: 2,
    priority: 20,
    reveals: true,
    render: (_value, node, _ctx, inner) => <FeedbackEl node={node} inner={inner} which="success" />,
  },
  {
    attr: "data-nk-inline-edit",
    phase: 2,
    priority: 10,
    render: (value, node, _ctx, inner) => (node.type === "text" ? <InlineEdit node={node} field={value} inner={inner} /> : inner(node)),
    renderRun: (value, run, _ctx, inner) => <InlineEditRun run={run} field={value} inner={inner} />,
  },
];
