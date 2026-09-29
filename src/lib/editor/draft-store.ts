/**
 * A copy of the page being edited, kept in this browser (IndexedDB) until
 * the server confirms it has the edits. If the tab closes or the phone drops
 * the page before a save lands, the editor finds the copy next time and
 * offers to restore it. It never restores on its own.
 *
 * Browser storage can be missing or blocked (private windows, strict
 * settings); every call here then quietly does nothing.
 */

export type PageDraft = {
  /** `${projectId}:${pageId}` */
  key: string;
  projectId: string;
  pageId: string;
  html: string;
  css: string;
  /** When the copy was taken (this browser's clock, ms). */
  savedAt: number;
  /** The server's updatedAt for the copy this editor last loaded or saved. */
  baseUpdatedAt: string | null;
  /** contentKey() of that server copy. */
  baseKey?: string;
};

const DB_NAME = "nk-editor";
const STORE = "drafts";
/** Copies older than this are cleared out. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "key" });
      };
      req.onsuccess = () => {
        const db = req.result;
        // Another tab upgrading the database closes this connection.
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | null> {
  try {
    const db = await openDb();
    if (!db) return null;
    return await new Promise<T | null>((resolve) => {
      try {
        const tx = db.transaction(STORE, mode);
        const req = work(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req ? (req.result as T) : null);
        tx.onerror = () => resolve(null);
        tx.onabort = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export const draftKey = (projectId: string, pageId: string) => `${projectId}:${pageId}`;

/** Keeps the latest copy of the page. */
export async function saveDraft(draft: Omit<PageDraft, "key">): Promise<void> {
  await run("readwrite", (store) => store.put({ ...draft, key: draftKey(draft.projectId, draft.pageId) }));
}

export async function loadDraft(projectId: string, pageId: string): Promise<PageDraft | null> {
  const found = await run<PageDraft | undefined>("readonly", (store) => store.get(draftKey(projectId, pageId)));
  return found && typeof found.html === "string" ? found : null;
}

/**
 * Removes the copy once the server has the edits. With `upTo`, a copy taken
 * after that moment (newer edits) is kept.
 */
export async function clearDraft(projectId: string, pageId: string, upTo?: number): Promise<void> {
  await run("readwrite", (store) => {
    const key = draftKey(projectId, pageId);
    if (upTo === undefined) {
      store.delete(key);
      return;
    }
    const req = store.get(key);
    req.onsuccess = () => {
      const found = req.result as PageDraft | undefined;
      if (found && found.savedAt <= upTo) store.delete(key);
    };
  });
}

/**
 * Whether the copy was taken after the server's version: the server copy
 * hasn't changed since the one the editor started from, or the copy is
 * simply more recent.
 */
export function draftIsNewer(draft: PageDraft, serverUpdatedAt: string | null | undefined): boolean {
  if (!serverUpdatedAt) return true;
  if (draft.baseUpdatedAt && draft.baseUpdatedAt === serverUpdatedAt) return true;
  const server = Date.parse(serverUpdatedAt);
  return Number.isNaN(server) || draft.savedAt > server;
}

/** Clears out copies nobody came back for. */
export async function pruneDrafts(now = Date.now()): Promise<void> {
  await run("readwrite", (store) => {
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      const d = cursor.value as PageDraft;
      if (!d || typeof d.savedAt !== "number" || now - d.savedAt > MAX_AGE_MS) cursor.delete();
      cursor.continue();
    };
  });
}

/**
 * A short fingerprint of a page's content that ignores what the server
 * rewrites on its own (the shared menu, the page's settings markers) and
 * how the same page happens to be written out (attribute order, entities,
 * whitespace): the editor writes a picture as src-then-alt after one kind
 * of load and alt-then-src after another.
 */
export function contentKey(html: string, css: string): string {
  return `${hash(canonicalHtml(html))}.${hash(css.replace(/\s+/g, ""))}`;
}

function canonicalHtml(html: string): string {
  if (typeof DOMParser === "undefined") {
    return html
      .replace(/<nav\b[^>]*\bdata-nk-nav\b[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("nav[data-nk-nav]").forEach((n) => n.remove());
  const out: string[] = [];
  const walk = (node: Node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const attrs = Array.from(el.attributes, (a) => `${a.name}=${JSON.stringify(a.value)}`).sort().join(" ");
        out.push(`<${el.tagName.toLowerCase()} ${attrs}>`);
        walk(el);
        out.push("</>");
      } else if (child.nodeType === Node.TEXT_NODE) {
        const text = (child.nodeValue ?? "").replace(/\s+/g, " ");
        if (text.trim()) out.push(text);
      }
      // Comments (the page's settings markers among them) don't count.
    });
  };
  walk(doc.head);
  walk(doc.body);
  return out.join("");
}

/** cyrb53: a quick, well-spread 53-bit string hash. */
function hash(s: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/*
 * The copy sent as a tab closed can't clear the browser copy afterwards
 * (the page is gone). Its fingerprint is noted here instead, synchronously,
 * so the next visit can tell that save arrived and drop the browser copy.
 */
const sentKey = (projectId: string, pageId: string) => `nk-editor-sent:${draftKey(projectId, pageId)}`;

export function noteSentOnClose(projectId: string, pageId: string, key: string): void {
  try {
    localStorage.setItem(sentKey(projectId, pageId), key);
  } catch {
    /* storage blocked */
  }
}

/** The fingerprint noted as the tab last closed (then forgotten). */
export function takeSentOnClose(projectId: string, pageId: string): string | null {
  try {
    const k = sentKey(projectId, pageId);
    const v = localStorage.getItem(k);
    if (v !== null) localStorage.removeItem(k);
    return v;
  } catch {
    return null;
  }
}
