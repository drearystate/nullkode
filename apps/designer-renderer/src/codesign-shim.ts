/**
 * window.codesign shim.
 *
 * Replaces the Electron preload bridge (apps/desktop/src/preload/index.ts in
 * upstream). Every `ipcRenderer.invoke('codesign:...')` is rewritten to a
 * POST to /api/designer/ipc/<namespace>/<method>, and every
 * `ipcRenderer.on('codesign:...')` listener is fed from a single SSE channel
 * at /api/designer/stream.
 *
 * Designed so the renderer doesn't know it's not in Electron.
 */

const IPC_ROOT = "/api/designer/ipc";
const STREAM_PATH = "/api/designer/stream";

async function call<T>(method: string, args: unknown = {}): Promise<T> {
  const path = method.replace(/\./g, "/");
  const res = await fetch(`${IPC_ROOT}/${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args ?? {}),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {}
    throw new Error(`codesign.${method}: ${msg}`);
  }
  // Long-running handlers (designer "generate") commit a 200 status before
  // they know the outcome, then write whitespace heartbeats followed by the
  // final JSON. If that final JSON carries an `error` envelope, treat it as
  // a failure even though the HTTP status was 200. Strictly additive — no
  // current success response carries an `error` field.
  const body = (await res.json()) as T;
  const maybeErr = body as unknown as { error?: unknown };
  if (maybeErr && typeof maybeErr.error === "string") {
    throw new Error(`codesign.${method}: ${maybeErr.error}`);
  }
  return body;
}

// ── SSE multiplexer ──────────────────────────────────────────────────
type Listener = (event: unknown) => void;
const subscribers = new Map<string, Set<Listener>>();
let sse: EventSource | null = null;

function ensureSse(): void {
  if (sse) return;
  try {
    sse = new EventSource(STREAM_PATH, { withCredentials: true });
    sse.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data) as { channel: string };
        const set = subscribers.get(data.channel);
        if (!set) return;
        for (const cb of set) cb(data);
      } catch {}
    };
    sse.onerror = () => {
      // EventSource auto-reconnects; leave it.
    };
  } catch (err) {
    console.error("designer SSE failed", err);
  }
}

function on(channel: string, cb: Listener): () => void {
  ensureSse();
  let set = subscribers.get(channel);
  if (!set) {
    set = new Set();
    subscribers.set(channel, set);
  }
  set.add(cb);
  return () => {
    set!.delete(cb);
  };
}

// ── API surface (matches preload's `api` object) ─────────────────────
//
// Methods that returned Electron Promise<void> for no-ops on the desktop
// shell return Promise<void> here too. Methods that need a native dialog
// (pickInputFiles, etc.) are replaced with browser-native equivalents.

const api = {
  // top-level
  detectProvider: (key: string) => call<string | null>("detectProvider", { key }),
  doneVerify: (artifact: string) =>
    call<{ errors: Array<{ message: string }> }>("doneVerify", { artifact }),
  generate: (payload: Record<string, unknown>) => call("generate", payload),
  cancelGeneration: (generationId: string) =>
    call("cancelGeneration", { generationId }),
  generationStatus: () => call("generationStatus"),
  generateTitle: (prompt: string) => call<string>("generateTitle", { prompt }),
  applyComment: (payload: Record<string, unknown>) => call("applyComment", payload),
  pickInputFiles: async (): Promise<unknown[]> => {
    // Use HTML <input type=file multiple>. Returns array shaped roughly
    // like LocalInputFile but only with what the browser can give us.
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.style.display = "none";
      document.body.appendChild(input);
      input.onchange = async () => {
        const files = Array.from(input.files ?? []);
        const out: unknown[] = [];
        for (const f of files) {
          const buf = await f.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let bin = "";
          for (const b of bytes) bin += String.fromCharCode(b);
          out.push({
            schemaVersion: 1,
            name: f.name,
            path: f.name,
            size: f.size,
            mediaType: f.type || "application/octet-stream",
            dataBase64: btoa(bin),
          });
        }
        document.body.removeChild(input);
        resolve(out);
      };
      input.click();
    });
  },
  pickDesignSystemDirectory: () => call("pickDesignSystemDirectory"),
  clearDesignSystem: () => call("clearDesignSystem"),
  export: (payload: Record<string, unknown>) => call("export", payload),
  checkForUpdates: () => call("checkForUpdates"),
  downloadUpdate: () => call("downloadUpdate"),
  installUpdate: () => call("installUpdate"),
  onUpdateAvailable: (_cb: Listener) => () => {},

  clarify: {
    askQuestions: (prompt: string) =>
      call<{ questions: Array<{ id: string; label: string; options?: string[] }> }>(
        "clarify.askQuestions",
        { prompt },
      ),
  },
  me: {
    get: () =>
      call<{
        id: string;
        email: string;
        name: string;
        role: "USER" | "ADMIN";
        avatarUrl: string | null;
        brand?: { name: string; logoUrl: string | null; iconUrl: string | null };
        links: {
          dashboard: string;
          projects: string;
          billing: string;
          admin: string | null;
          logout: string;
        };
      }>("me.get"),
  },
  // One-way hand-over of a design's app to the page builder (asks first in
  // SwitchToBuilderDialog). Returns where to open the app next.
  builder: {
    switch: (designId: string) =>
      call<{ projectId: string; alreadyMoved: boolean; appUrl: string; editUrl: string }>(
        "builder.switch",
        { designId },
      ),
  },
  locale: {
    getSystem: () => call<string>("locale.getSystem"),
    getCurrent: () => call<string>("locale.getCurrent"),
    set: (locale: string) => call<string>("locale.set", { locale }),
  },
  preferences: {
    get: () => call("preferences.get"),
    update: (patch: Record<string, unknown>) => call("preferences.update", { patch }),
  },
  memory: {
    getUser: () => call("memory.getUser"),
    updateUser: (content: string) => call("memory.updateUser", { content }),
    openUserMemory: () => call("memory.openUserMemory"),
    consolidateUserMemoryNow: () => call("memory.consolidateUserMemoryNow"),
    clearUserMemoryCandidates: () => call("memory.clearUserMemoryCandidates"),
  },
  imageGeneration: {
    get: () => call("imageGeneration.get"),
    update: (patch: Record<string, unknown>) => call("imageGeneration.update", { patch }),
  },
  codexOAuth: {
    status: () => call("codexOAuth.status"),
    login: () => call("codexOAuth.login"),
    cancelLogin: () => call("codexOAuth.cancelLogin"),
    logout: () => call("codexOAuth.logout"),
  },
  onboarding: {
    getState: () => call("onboarding.getState"),
    validateKey: (input: Record<string, unknown>) => call("onboarding.validateKey", input),
    saveKey: (input: Record<string, unknown>) => call("onboarding.saveKey", input),
    skip: () => call("onboarding.skip"),
  },
  settings: {
    listProviders: () => call("settings.listProviders"),
    addProvider: (input: Record<string, unknown>) => call("settings.addProvider", input),
    deleteProvider: (provider: string) => call("settings.deleteProvider", { provider }),
    setActiveProvider: (input: Record<string, unknown>) =>
      call("settings.setActiveProvider", input),
    getPaths: () => call("settings.getPaths"),
    chooseStorageFolder: (kind: string) => call("settings.chooseStorageFolder", { kind }),
    openFolder: (path: string) => call("settings.openFolder", { path }),
    openTemplatesFolder: () => call("settings.openTemplatesFolder"),
    resetOnboarding: () => call("settings.resetOnboarding"),
    toggleDevtools: () => call("settings.toggleDevtools"),
    validateKey: (input: Record<string, unknown>) => call("settings.validateKey", input),
  },
  config: {
    setProviderAndModels: (input: Record<string, unknown>) =>
      call("config.setProviderAndModels", input),
    addProvider: (input: Record<string, unknown>) => call("config.addProvider", input),
    updateProvider: (input: Record<string, unknown>) => call("config.updateProvider", input),
    removeProvider: (id: string) => call("config.removeProvider", { id }),
    setActiveProviderAndModel: (input: Record<string, unknown>) =>
      call("config.setActiveProviderAndModel", input),
    testEndpoint: (input: Record<string, unknown>) => call("config.testEndpoint", input),
    listEndpointModels: (input: Record<string, unknown>) =>
      call("config.listEndpointModels", input),
    detectExternalConfigs: () => call("config.detectExternalConfigs"),
    importCodexConfig: () => call("config.importCodexConfig"),
    importClaudeCodeConfig: () => call("config.importClaudeCodeConfig"),
    importGeminiConfig: () => call("config.importGeminiConfig"),
    importOpencodeConfig: () => call("config.importOpencodeConfig"),
  },
  connection: {
    test: (input: Record<string, unknown>) => call("connection.test", input),
    testActive: () => call("connection.testActive"),
    testProvider: (providerId: string) => call("connection.testProvider", { providerId }),
  },
  models: {
    list: (input: Record<string, unknown>) => call("models.list", input),
    listForProvider: (providerId: string) =>
      call("models.listForProvider", { providerId }),
  },
  ollama: {
    probe: (baseUrl?: string) =>
      call("ollama.probe", baseUrl !== undefined ? { baseUrl } : {}),
  },
  files: {
    list: (designId: string) => call("files.list", { designId }),
    listDir: (designId: string, path = ".") => call("files.listDir", { designId, path }),
    read: (designId: string, path: string) => call("files.read", { designId, path }),
    preview: (designId: string, path: string) => call("files.preview", { designId, path }),
    thumbnail: (designId: string, path: string) =>
      call("files.thumbnail", { designId, path }),
    write: (designId: string, path: string, content: string) =>
      call("files.write", { designId, path, content }),
    importToWorkspace: (input: Record<string, unknown>) =>
      call("files.importToWorkspace", input),
    subscribe: (designId: string) => call("files.subscribe", { designId }),
    unsubscribe: (designId: string) => call("files.unsubscribe", { designId }),
    onChanged: (cb: (event: { schemaVersion: 1; designId: string }) => void) =>
      on("files:changed", (ev) => {
        const e = ev as { designId: string };
        cb({ schemaVersion: 1, designId: e.designId });
      }),
  },
  snapshots: {
    listDesigns: () => call("snapshots.listDesigns"),
    createDesign: (name: string, workspacePath?: string | null) =>
      call("snapshots.createDesign", {
        name,
        ...(workspacePath !== undefined ? { workspacePath } : {}),
      }),
    getDesign: (id: string) => call("snapshots.getDesign", { id }),
    renameDesign: (id: string, name: string) =>
      call("snapshots.renameDesign", { id, name }),
    setThumbnail: (id: string, thumbnailText: string | null) =>
      call("snapshots.setThumbnail", { id, thumbnailText }),
    softDeleteDesign: (id: string) => call("snapshots.softDeleteDesign", { id }),
    duplicateDesign: (id: string, name: string) =>
      call("snapshots.duplicateDesign", { id, name }),
    list: (designId: string) => call("snapshots.list", { designId }),
    get: (id: string) => call("snapshots.get", { id }),
    create: (input: Record<string, unknown>) => call("snapshots.create", input),
    delete: (id: string) => call("snapshots.delete", { id }),
    pickWorkspaceFolder: () => call("snapshots.pickWorkspaceFolder"),
    updateWorkspace: (designId: string, workspacePath: string, migrateFiles: boolean) =>
      call("snapshots.updateWorkspace", { designId, workspacePath, migrateFiles }),
    openWorkspaceFolder: (designId: string) =>
      call("snapshots.openWorkspaceFolder", { designId }),
    checkWorkspaceFolder: (designId: string) =>
      call("snapshots.checkWorkspaceFolder", { designId }),
    updatePreview: (designId: string, previewMode: string, previewUrl?: string | null) =>
      call("snapshots.updatePreview", {
        designId,
        previewMode,
        previewUrl: previewUrl ?? null,
      }),
    detectPreview: (designId: string) => call("snapshots.detectPreview", { designId }),
  },
  chat: {
    list: (designId: string) => call("chat.list", { designId }),
    append: (input: Record<string, unknown>) => call("chat.append", input),
    seedFromSnapshots: (designId: string) =>
      call("chat.seedFromSnapshots", { designId }),
    updateToolStatus: (input: Record<string, unknown>) =>
      call("chat.updateToolStatus", input),
    onAgentEvent: (cb: (ev: unknown) => void) =>
      on("agent:event", (raw) => {
        const e = raw as { payload?: unknown };
        if (e.payload) cb(e.payload);
      }),
  },
  comments: {
    add: (input: Record<string, unknown>) => call("comments.add", input),
    list: (designId: string, snapshotId?: string) =>
      call("comments.list", { designId, ...(snapshotId !== undefined ? { snapshotId } : {}) }),
    listPendingEdits: (designId: string) =>
      call("comments.listPendingEdits", { designId }),
    update: (designId: string, id: string, patch: Record<string, unknown>) =>
      call("comments.update", { designId, id, patch }),
    remove: (designId: string, id: string) =>
      call("comments.remove", { designId, id }),
    markApplied: (designId: string, ids: string[], snapshotId: string) =>
      call("comments.markApplied", { designId, ids, snapshotId }),
  },
  diagnostics: {
    log: (entry: Record<string, unknown>) => call("diagnostics.log", entry),
    recordRendererError: (input: Record<string, unknown>) =>
      call("diagnostics.recordRendererError", input),
    openLogFolder: () => call("diagnostics.openLogFolder"),
    exportDiagnostics: () => call("diagnostics.exportDiagnostics"),
    showItemInFolder: (path: string) => call("diagnostics.showItemInFolder", { path }),
    listEvents: (input: Record<string, unknown>) =>
      call("diagnostics.listEvents", input),
    reportEvent: (input: Record<string, unknown>) =>
      call("diagnostics.reportEvent", input),
    isFingerprintRecentlyReported: (fingerprint: string) =>
      call("diagnostics.isFingerprintRecentlyReported", { fingerprint }),
  },
  openExternal: (url: string) => {
    // In cloud mode, just open in a new browser tab.
    window.open(url, "_blank", "noopener,noreferrer");
    return Promise.resolve();
  },
  ask: {
    pending: () => call("ask.pending"),
    onRequest: (cb: (req: unknown) => void) => on("ask:request", cb),
    resolve: (requestId: string, result: Record<string, unknown>) =>
      call("ask.resolve", { requestId, ...result }),
  },
};

// Install on window before the renderer boots.
declare global {
  interface Window {
    codesign?: typeof api;
  }
}
window.codesign = api;
ensureSse();

export {};
