import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { NativeInputNode, NativeNode } from "../spec";
import { Channel, matches, Store } from "./kit";
import { filtersChanged } from "./bus";

/**
 * Page and form scopes: what the web runtime finds through the DOM
 * (document.querySelectorAll('[data-nk-bind-flow]'), form.elements,
 * closest('[data-nk-row-id]')) the engine keeps in React contexts.
 */

/* ── Page ──────────────────────────────────────────────────────────────── */

/** A bound widget on the page that can load its data again (lists; charts can register too). */
export type BoundHandle = {
  node: Pick<NativeNode, "tag" | "id" | "cls" | "nk">;
  /** Loads again; `filters` (data-nk-filter values) are kept for later loads, like the web's el.__nkFilters. */
  refresh: (filters?: Record<string, string>) => Promise<void>;
};

type FilterField = { key: string; value: string };

/** One page of the app: its bound lists, its filter controls, its loose fields. */
export class PageScope {
  /** The page address's query (?id=3): flows of bound lists get it, data-nk-qs-field fields take from it. */
  readonly query: Record<string, string>;
  private bound = new Set<BoundHandle>();

  constructor(query?: string) {
    this.query = queryObject(query);
  }

  private filters = new Map<number, FilterField>();
  /** Fields outside any form (filters, radio groups). */
  readonly fields: FieldHost = new FieldHost(null);
  /** What tapping a <label> does to its field (focus, tick, open), by the field's fieldId. */
  private activators = new Map<string, () => void>();
  /** Checkboxes' and radios' state by fieldId: their labels' looks follow it (variants "checked:<fieldId>"). */
  readonly checks = new Store<Record<string, boolean>>({});

  setChecked(fieldId: string, checked: boolean): void {
    const cur = this.checks.get();
    if (cur[fieldId] !== checked) this.checks.set({ ...cur, [fieldId]: checked });
  }

  registerField(fieldId: string, activate: () => void): () => void {
    this.activators.set(fieldId, activate);
    return () => {
      if (this.activators.get(fieldId) === activate) this.activators.delete(fieldId);
    };
  }

  /** A <label> was tapped: its field takes the tap, as in the browser. */
  activateField(fieldId: string): void {
    this.activators.get(fieldId)?.();
  }

  register(h: BoundHandle): () => void {
    this.bound.add(h);
    return () => {
      this.bound.delete(h);
    };
  }

  /** Every bound list on the page loads again (after a form was sent, an inline edit, pull to refresh). */
  async refreshAll(): Promise<void> {
    await Promise.all([...this.bound].map((h) => h.refresh().catch(() => {})));
  }

  setFilter(id: number, key: string, value: string | null): void {
    if (value === null) this.filters.delete(id);
    else this.filters.set(id, { key, value });
  }

  /** The web's gatherFilters(): every filter control's non-empty value. */
  filterValues(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const f of this.filters.values()) if (f.value) out[f.key] = f.value;
    return out;
  }

  /** A filter changed: its targets (data-nk-target, else every bound list and chart) load with all filter values. */
  applyFilters(target?: string): void {
    const values = this.filterValues();
    for (const h of this.bound) {
      if (target ? matches(h.node, target) : true) void h.refresh(values).catch(() => {});
    }
    // Charts and calendars (behaviours of their own) listen here.
    filtersChanged.emit({ target: target || undefined, values });
  }
}

/** "?id=3&x=y" as an object; values still holding a {placeholder} (old links) are left out, like the web's queryStringAsObject. */
export function queryObject(query?: string): Record<string, string> {
  const out: Record<string, string> = {};
  const q = (query ?? "").replace(/^\?/, "");
  if (!q) return out;
  for (const part of q.split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    const dec = (s: string) => {
      try {
        return decodeURIComponent(s.replace(/\+/g, " "));
      } catch {
        return s;
      }
    };
    const k = dec(eq < 0 ? part : part.slice(0, eq));
    const v = dec(eq < 0 ? "" : part.slice(eq + 1));
    if (k && !/^\{\w+\}$/.test(v)) out[k] = v;
  }
  return out;
}

const PageCtx = createContext<PageScope | null>(null);
let fallbackPage: PageScope | null = null;

export function PageScopeProvider({ scope, children }: { scope: PageScope; children: ReactNode }) {
  return <PageCtx.Provider value={scope}>{children}</PageCtx.Provider>;
}

export function usePageScope(): PageScope {
  return useContext(PageCtx) ?? (fallbackPage ??= new PageScope());
}

/* ── Fields and forms ──────────────────────────────────────────────────── */

export type PickedFile = { uri: string; name: string; type: string; size?: number; file?: Blob };

/** What a field adds to the form when it is sent (FormData semantics). */
export type FieldEntry = { name: string; value: string } | { name: string; file: PickedFile };

export type FieldReg = {
  node: NativeInputNode;
  /** The entries this field sends ([] for an unchecked box, a disabled field…). */
  entries: () => FieldEntry[];
  /** "" when valid; else the reason in the app's language (the browser's constraint validation). */
  validate: () => string;
  /** Mark it invalid (or valid again) and bring it into view. */
  showInvalid: (invalid: boolean, focus?: boolean) => void;
  /** form.reset(): back to the value it had when the page opened. */
  reset: () => void;
};

let fieldSeq = 0;
export function nextFieldId(): number {
  return ++fieldSeq;
}

/** Where fields register: a form, or the page for loose fields. Also groups radio buttons by name. */
export class FieldHost {
  private regs = new Map<number, FieldReg>();
  /** A radio button was chosen: the others with its name let go. */
  readonly radio = new Channel<{ name: string; id: number }>();
  /** Fill the field named `name` (scanners, other behaviours). */
  readonly fill = new Channel<{ name: string; value: string }>();
  constructor(readonly form: NativeNode | null) {}

  register(id: number, reg: FieldReg): () => void {
    this.regs.set(id, reg);
    return () => {
      this.regs.delete(id);
    };
  }

  /** Registered fields in page order (registration order follows the page). */
  list(): FieldReg[] {
    return [...this.regs.values()];
  }
}

export type Feedback = { text: string; kind: "error" | "success" | "pending" };

/** A data-nk-form's state: its fields, what it says, whether it is sending. */
export class FormScope extends FieldHost {
  /** When the form appeared (the spam trap's _nk_t). */
  readonly shownAt = Date.now();
  readonly sending = new Store<boolean>(false);
  /** The [data-nk-error] (or added) message and the [data-nk-success] one, as the web's nkShowFeedback. */
  readonly feedback = new Store<{ error: Feedback | null; success: Feedback | null }>({ error: null, success: null });
  /** Bumped by reset(): fields go back to their first values. */
  readonly resets = new Store<number>(0);
  submit: (submitter?: NativeNode) => void = () => {};

  constructor(form: NativeNode, readonly hasSuccessEl: boolean) {
    super(form);
  }

  show(text: string, kind: Feedback["kind"]): void {
    const f = { text, kind };
    if (kind === "success" && this.hasSuccessEl) this.feedback.set({ error: null, success: f });
    else this.feedback.set({ error: f, success: null });
  }

  reset(): void {
    this.resets.set(this.resets.get() + 1);
  }
}

const FieldCtx = createContext<FieldHost | null>(null);

export function FieldHostProvider({ host, children }: { host: FieldHost; children: ReactNode }) {
  return <FieldCtx.Provider value={host}>{children}</FieldCtx.Provider>;
}

/** The form a field belongs to, or the page's loose-field host. */
export function useFieldHost(): FieldHost {
  const page = usePageScope();
  return useContext(FieldCtx) ?? page.fields;
}

/** The data-nk-form around this node, if any. */
export function useFormScope(): FormScope | null {
  const h = useContext(FieldCtx);
  return h instanceof FormScope ? h : null;
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/* ── Ancestors (closest()) ─────────────────────────────────────────────── */

/** The nearest data-nk-row-id / data-nk-update-flow above a node (the web's el.closest(…)). */
export type Ancestry = { rowId?: string; updateFlow?: string };

const AncestryCtx = createContext<Ancestry>({});

export function AncestryProvider({ value, children }: { value: Ancestry; children: ReactNode }) {
  const up = useContext(AncestryCtx);
  return <AncestryCtx.Provider value={{ rowId: value.rowId ?? up.rowId, updateFlow: value.updateFlow ?? up.updateFlow }}>{children}</AncestryCtx.Provider>;
}

export function useAncestry(): Ancestry {
  return useContext(AncestryCtx);
}
