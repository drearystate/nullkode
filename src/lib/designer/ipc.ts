// Single dispatcher for window.codesign IPC. Every method the renderer can
// call lives in `HANDLERS`, keyed by "<namespace>.<method>" (or "method"
// for top-level methods). The catch-all API route invokes by name.
//
// Cloud constraints vs the desktop app:
//   - Methods that need a native dialog (pickInputFiles, pickWorkspaceFolder,
//     pickDesignSystemDirectory) return "not supported" — the renderer is
//     expected to use HTML <input> file pickers; we ship those replacements
//     in the shim.
//   - File-system-touching methods (openLogFolder, openExternal,
//     showItemInFolder, toggleDevtools, openWorkspaceFolder) no-op.
//   - check-for-updates / install-update no-op (cloud is always up to date).

import type { User } from "@prisma/client";
import * as designs from "./designs";
import * as files from "./files";
import * as snapshots from "./snapshots";
import * as chat from "./chat";
import * as comments from "./comments";
import * as memory from "./memory";
import * as providers from "./providers";
import * as prefs from "./preferences";
import * as imageGen from "./image-gen";
import * as codex from "./codex-oauth";
import * as exporter from "./exporter";
import { cancelGeneration, generationStatus } from "./jobs";
import { activeJobs } from "./active-jobs";
import { runCompatibleAgent } from "./compatible-agent";
import { getAIProvider, getClaudeModel, getDesignerEngine } from "../settings";
import { aiQuotaProblem, recordAiUsage } from "../ai-quota";
import { getAIModel } from "../ai/client";
import { runClaudeAgent } from "./claude-agent";
import { askClarifyingQuestions } from "./clarify";
import { startSweeper } from "./sweeper";
import { assertDesignerCanChange, switchDesignToBuilder } from "./pages-mirror";
import { getRequestBrand } from "../reseller";

// Boot the background maintenance sweeper on first IPC dispatch import.
// Idempotent (singleton via globalThis flag), so dev hot-reload won't
// stack timers.
// Started only for authenticated runtime requests, never during image builds.
import { db } from "../db";
import { nanoid } from "nanoid";

type Handler = (user: User, args: Record<string, unknown>) => Promise<unknown>;

/** Name + logo the Designer header shows. Falls back to a neutral name. */
async function designerBrand(user: User): Promise<{ name: string; logoUrl: string | null; iconUrl: string | null }> {
  try {
    const { brand } = await getRequestBrand(user);
    return {
      name: brand.appName,
      logoUrl: brand.logoWideDataUrl ?? null,
      iconUrl: brand.logoDataUrl ?? null,
    };
  } catch {
    return { name: "", logoUrl: null, iconUrl: null };
  }
}

function requireAdmin(user: User): void {
  if (user.role !== "ADMIN") {
    throw new Error("admin only");
  }
}

function s(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== "string") throw new Error(`missing string: ${key}`);
  return v;
}
function maybeS(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key];
  return typeof v === "string" ? v : undefined;
}

export const HANDLERS: Record<string, Handler> = {
  // ─── clarify ─── 0–3 quick questions before the main agent run ──
  "clarify.askQuestions": async (_user, args) =>
    askClarifyingQuestions(s(args, "prompt")),

  // ─── me ─── current user, for the merged top bar ────────────────
  "me.get": async (user) => ({
    id: user.id,
    email: user.email,
    name: user.name ?? user.email.split("@")[0],
    role: user.role,
    avatarUrl: user.avatarUrl,
    // White-label: the Designer shows whichever brand this person sees
    // everywhere else (their reseller's, or the platform's).
    brand: await designerBrand(user),
    links: {
      dashboard: "/dashboard",
      projects: "/dashboard",
      billing: "/billing",
      admin: user.role === "ADMIN" ? "/admin" : null,
      logout: "/api/auth/logout",
    },
  }),

  // ─── locale ─────────────────────────────────────────────────────
  "locale.getSystem": async () => "en",
  "locale.getCurrent": async (user) => (await prefs.getPreferences(user.id)).locale,
  "locale.set": async (user, args) =>
    (await prefs.setPreferences(user.id, { locale: s(args, "locale") })).locale,

  // ─── preferences ────────────────────────────────────────────────
  "preferences.get": async (user) => prefs.getPreferences(user.id),
  "preferences.update": async (user, args) =>
    prefs.setPreferences(user.id, args.patch as Partial<prefs.Preferences>),

  // ─── memory ─────────────────────────────────────────────────────
  "memory.getUser": async (user) => memory.getUserMemory(user.id),
  "memory.updateUser": async (user, args) =>
    memory.updateUserMemory(user.id, s(args, "content")),
  "memory.openUserMemory": async () => {
    /* no-op in cloud */
  },
  "memory.consolidateUserMemoryNow": async (user) =>
    memory.consolidateUserMemoryNow(user.id),
  "memory.clearUserMemoryCandidates": async (user) =>
    memory.clearUserMemoryCandidates(user.id),

  // ─── imageGeneration ── admin only; non-admins see settings ─────
  "imageGeneration.get": async (user) => imageGen.getImageGen(user.id),
  "imageGeneration.update": async (user, args) => {
    requireAdmin(user);
    return imageGen.updateImageGen(
      user.id,
      args.patch as Partial<imageGen.ImageGenerationSettingsView> & { apiKey?: string },
    );
  },

  // ─── codexOAuth (stubbed) ───────────────────────────────────────
  "codexOAuth.status": async (user) => codex.getStatus(user.id),
  "codexOAuth.login": async (user) => codex.login(user.id),
  "codexOAuth.cancelLogin": async (user) => codex.cancelLogin(user.id),
  "codexOAuth.logout": async (user) => codex.logout(user.id),

  // ─── settings ───────────────────────────────────────────────────
  // Admin-only mutations. Reads return a stable "AI (admin-managed)"
  // entry for non-admins so the renderer's Settings view doesn't crash.
  "settings.listProviders": async (user) => {
    if (user.role === "ADMIN") return providers.listProviders(user.id);
    return [
      {
        schemaVersion: 1,
        id: "claude-cli",
        name: "AI (admin-managed)",
        wire: "anthropic",
        baseUrl: "",
        defaultModel: "admin-managed",
        httpHeaders: null,
        queryParams: null,
        envKey: null,
        reasoningLevel: null,
        isActive: true,
        hasKey: true,
        apiKeyMasked: "managed by admin",
      },
    ];
  },
  "settings.addProvider": async (user, args) => {
    requireAdmin(user);
    await providers.addProviderShortlist(user.id, {
      provider: s(args, "provider") as providers.SupportedOnboardingProvider,
      apiKey: s(args, "apiKey"),
      modelPrimary: s(args, "modelPrimary"),
      baseUrl: maybeS(args, "baseUrl"),
      setAsActive: true,
    });
    return providers.listProviders(user.id);
  },
  "settings.deleteProvider": async (user, args) => {
    requireAdmin(user);
    await providers.removeProvider(user.id, s(args, "provider"));
    return providers.listProviders(user.id);
  },
  "settings.setActiveProvider": async (user, args) => {
    requireAdmin(user);
    return providers.setActiveProvider(user.id, s(args, "provider"), s(args, "modelPrimary"));
  },
  "settings.getPaths": async () => ({
    schemaVersion: 1,
    config: "cloud://config",
    workspaces: "cloud://workspaces",
    templates: "cloud://templates",
    diagnostics: "cloud://diagnostics",
  }),
  "settings.chooseStorageFolder": async () => ({
    schemaVersion: 1,
    config: "cloud://config",
    workspaces: "cloud://workspaces",
    templates: "cloud://templates",
    diagnostics: "cloud://diagnostics",
  }),
  "settings.openFolder": async () => {
    /* no-op */
  },
  "settings.openTemplatesFolder": async () => {
    /* no-op */
  },
  "settings.resetOnboarding": async (user) => {
    requireAdmin(user);
    await db.designerProvider.deleteMany({ where: { userId: user.id } });
    await prefs.setPreferences(user.id, {
      activeProviderId: null,
      activeModelPrimary: null,
    });
  },
  "settings.toggleDevtools": async () => {
    /* no-op */
  },
  "settings.validateKey": async (_user, args) =>
    providers.validateKey({
      provider: s(args, "provider") as providers.SupportedOnboardingProvider,
      apiKey: s(args, "apiKey"),
      baseUrl: maybeS(args, "baseUrl"),
    }),

  // ─── onboarding ─────────────────────────────────────────────────
  // Cloud Designer is powered by admin-configured Claude CLI. Onboarding
  // is always "complete" from the user's perspective — they never need to
  // add a provider themselves.
  "onboarding.getState": async () => ({
    hasKey: true,
    provider: await getAIProvider(),
    modelPrimary: await getAIProvider() === "claude-cli" ? await getClaudeModel() : await getAIModel("scaffold"),
    baseUrl: null,
    designSystem: null,
  }),
  "onboarding.validateKey": async (_user, args) =>
    providers.validateKey({
      provider: s(args, "provider") as providers.SupportedOnboardingProvider,
      apiKey: s(args, "apiKey"),
      baseUrl: maybeS(args, "baseUrl"),
    }),
  "onboarding.saveKey": async (user, args) =>
    providers.addProviderShortlist(user.id, {
      provider: s(args, "provider") as providers.SupportedOnboardingProvider,
      apiKey: s(args, "apiKey"),
      modelPrimary: s(args, "modelPrimary"),
      baseUrl: maybeS(args, "baseUrl"),
      setAsActive: true,
    }),
  "onboarding.skip": async (user) => providers.computeOnboardingState(user.id),

  // ─── config (v1 provider mgmt) ── admin only ────────────────────
  "config.setProviderAndModels": async (user, args) => {
    requireAdmin(user);
    return providers.addProviderShortlist(user.id, {
      provider: s(args, "provider") as providers.SupportedOnboardingProvider,
      apiKey: s(args, "apiKey"),
      modelPrimary: s(args, "modelPrimary"),
      baseUrl: maybeS(args, "baseUrl"),
      setAsActive: args.setAsActive === true,
    });
  },
  "config.addProvider": async (user, args) => {
    requireAdmin(user);
    return providers.addCustomProvider(user.id, args as Parameters<typeof providers.addCustomProvider>[1]);
  },
  "config.updateProvider": async (user, args) => {
    requireAdmin(user);
    return providers.updateProvider(user.id, args as Parameters<typeof providers.updateProvider>[1]);
  },
  "config.removeProvider": async (user, args) => {
    requireAdmin(user);
    return providers.removeProvider(user.id, s(args, "id"));
  },
  "config.setActiveProviderAndModel": async (user, args) => {
    requireAdmin(user);
    return providers.setActiveProvider(user.id, s(args, "provider"), s(args, "modelPrimary"));
  },
  "config.testEndpoint": async (_user, args) => {
    const url = `${s(args, "baseUrl").replace(/\/$/, "")}/models`;
    try {
      const res = await fetch(url, {
        headers: { authorization: `Bearer ${s(args, "apiKey")}` },
      });
      return { ok: res.ok, status: res.status };
    } catch (err) {
      return {
        ok: false,
        status: 0,
        error: err instanceof Error ? err.message : "network",
      };
    }
  },
  "config.listEndpointModels": async (_user, args) =>
    providers.listEndpointModels({
      wire: s(args, "wire") as providers.WireApi,
      baseUrl: s(args, "baseUrl"),
      apiKey: s(args, "apiKey"),
    }),
  "config.detectExternalConfigs": async () => ({
    schemaVersion: 1,
    codex: { detected: false },
    claudeCode: { detected: false },
    gemini: { detected: false },
    opencode: { detected: false },
  }),
  "config.importCodexConfig": async (user) => providers.computeOnboardingState(user.id),
  "config.importClaudeCodeConfig": async (user) => providers.computeOnboardingState(user.id),
  "config.importGeminiConfig": async (user) => providers.computeOnboardingState(user.id),
  "config.importOpencodeConfig": async (user) => providers.computeOnboardingState(user.id),

  // ─── connection / models / ollama ───────────────────────────────
  "connection.test": async (_user, args) => {
    const provider = s(args, "provider");
    const apiKey = s(args, "apiKey");
    const baseUrl = s(args, "baseUrl");
    const res = await providers.validateKey({
      provider: provider as providers.SupportedOnboardingProvider,
      apiKey,
      baseUrl,
    });
    if (res.ok) return { ok: true, modelCount: res.modelCount };
    return { ok: false, code: res.code, message: res.message };
  },
  "connection.testActive": async (user) => {
    const active = await providers.getActiveProvider(user.id);
    if (!active) return { ok: false, code: "network", message: "no active provider" };
    const decrypted = await providers.getDecryptedApiKey(user.id, active.id);
    return providers.validateKey({
      provider: active.id as providers.SupportedOnboardingProvider,
      apiKey: decrypted ?? "",
      baseUrl: active.baseUrl,
    });
  },
  "connection.testProvider": async (user, args) => {
    const id = s(args, "providerId");
    const list = await providers.listProviders(user.id);
    const p = list.find((x) => x.id === id);
    if (!p) return { ok: false, code: "network", message: "provider not found" };
    const key = (await providers.getDecryptedApiKey(user.id, id)) ?? "";
    return providers.validateKey({
      provider: p.id as providers.SupportedOnboardingProvider,
      apiKey: key,
      baseUrl: p.baseUrl,
    });
  },
  "models.list": async (_user, args) =>
    providers.listEndpointModels({
      wire: "openai-chat",
      baseUrl: s(args, "baseUrl"),
      apiKey: s(args, "apiKey"),
    }),
  "models.listForProvider": async (user, args) => {
    const id = s(args, "providerId");
    const list = await providers.listProviders(user.id);
    const p = list.find((x) => x.id === id);
    if (!p) return { ok: false, error: "provider not found" };
    const key = (await providers.getDecryptedApiKey(user.id, id)) ?? "";
    return providers.listEndpointModels({ wire: p.wire, baseUrl: p.baseUrl, apiKey: key });
  },
  "ollama.probe": async (_user, args) => {
    const baseUrl = maybeS(args, "baseUrl") ?? "http://localhost:11434";
    try {
      const res = await fetch(`${baseUrl}/api/tags`);
      if (!res.ok) return { ok: false, code: "http", message: `HTTP ${res.status}` };
      const j = (await res.json()) as { models?: Array<{ name: string }> };
      return { ok: true, models: (j.models ?? []).map((m) => m.name) };
    } catch (err) {
      return {
        ok: false,
        code: "network",
        message: err instanceof Error ? err.message : "probe failed",
      };
    }
  },

  // ─── files (virtual workspace) ──────────────────────────────────
  "files.list": async (_user, args) => files.listFiles(s(args, "designId")),
  "files.listDir": async (_user, args) =>
    files.listDir(s(args, "designId"), maybeS(args, "path") ?? "."),
  "files.read": async (_user, args) =>
    files.readFile(s(args, "designId"), s(args, "path")),
  "files.write": async (_user, args) =>
    files.writeFile(s(args, "designId"), s(args, "path"), s(args, "content")),
  "files.preview": async () => ({ schemaVersion: 1, ok: false, error: "preview not supported" }),
  "files.thumbnail": async () => ({ schemaVersion: 1, ok: false, error: "thumbnail not supported" }),
  "files.importToWorkspace": async () => [], // TODO: implement via base64 inputs
  "files.subscribe": async () => ({ ok: true }),
  "files.unsubscribe": async () => ({ ok: true }),

  // ─── snapshots / designs ────────────────────────────────────────
  "snapshots.listDesigns": async (user) => designs.listDesigns(user.id),
  "snapshots.createDesign": async (user, args) =>
    designs.createDesign(user.id, s(args, "name"), maybeS(args, "workspacePath") ?? null),
  "snapshots.getDesign": async (user, args) => designs.getDesign(user.id, s(args, "id")),
  "snapshots.renameDesign": async (user, args) =>
    designs.renameDesign(user.id, s(args, "id"), s(args, "name")),
  "snapshots.setThumbnail": async (user, args) =>
    designs.setThumbnail(
      user.id,
      s(args, "id"),
      typeof args.thumbnailText === "string" ? args.thumbnailText : null,
    ),
  "snapshots.softDeleteDesign": async (user, args) =>
    designs.softDeleteDesign(user.id, s(args, "id")),
  "snapshots.duplicateDesign": async (user, args) =>
    designs.duplicateDesign(user.id, s(args, "id"), s(args, "name")),
  "snapshots.list": async (user, args) =>
    snapshots.listSnapshots(user.id, s(args, "designId")),
  "snapshots.get": async (user, args) => snapshots.getSnapshot(user.id, s(args, "id")),
  "snapshots.create": async (user, args) =>
    snapshots.createSnapshot(user.id, args as unknown as snapshots.SnapshotCreateInput),
  "snapshots.delete": async (user, args) =>
    snapshots.deleteSnapshot(user.id, s(args, "id")),
  "snapshots.pickWorkspaceFolder": async () => null,
  "snapshots.updateWorkspace": async (user, args) =>
    designs.getDesign(user.id, s(args, "designId")),
  "snapshots.openWorkspaceFolder": async () => {
    /* no-op */
  },
  "snapshots.checkWorkspaceFolder": async () => ({ exists: false }),
  "snapshots.updatePreview": async (user, args) =>
    designs.updatePreview(
      user.id,
      s(args, "designId"),
      s(args, "previewMode") as Parameters<typeof designs.updatePreview>[2],
      typeof args.previewUrl === "string" ? args.previewUrl : null,
    ),
  "snapshots.detectPreview": async () => ({ schemaVersion: 1, mode: "managed-file", url: null }),

  // ─── builder ── one-way hand-over to the page builder ────────────
  "builder.switch": async (user, args) => {
    const designId = s(args, "designId");
    const out = await switchDesignToBuilder(user.id, designId);
    return {
      projectId: out.projectId,
      alreadyMoved: out.alreadyMoved,
      appUrl: `/projects/${out.projectId}`,
      editUrl: out.pageId ? `/projects/${out.projectId}/pages/${out.pageId}/edit` : `/projects/${out.projectId}`,
    };
  },

  // ─── chat ───────────────────────────────────────────────────────
  "chat.list": async (user, args) => chat.listChat(user.id, s(args, "designId")),
  "chat.append": async (user, args) =>
    chat.appendChat(user.id, args as unknown as chat.ChatAppendInput),
  "chat.seedFromSnapshots": async (user, args) =>
    chat.seedFromSnapshots(user.id, s(args, "designId")),
  "chat.updateToolStatus": async (user, args) =>
    chat.updateToolStatus(user.id, args as Parameters<typeof chat.updateToolStatus>[1]),

  // ─── comments ───────────────────────────────────────────────────
  "comments.add": async (user, args) =>
    comments.addComment(user.id, args as unknown as comments.CommentCreateInput),
  "comments.list": async (user, args) =>
    comments.listComments(user.id, s(args, "designId"), maybeS(args, "snapshotId")),
  "comments.listPendingEdits": async (user, args) =>
    comments.listPendingEdits(user.id, s(args, "designId")),
  "comments.update": async (user, args) =>
    comments.updateComment(
      user.id,
      s(args, "designId"),
      s(args, "id"),
      args.patch as Parameters<typeof comments.updateComment>[3],
    ),
  "comments.remove": async (user, args) =>
    comments.removeComment(user.id, s(args, "designId"), s(args, "id")),
  "comments.markApplied": async (user, args) =>
    comments.markApplied(
      user.id,
      s(args, "designId"),
      args.ids as string[],
      s(args, "snapshotId"),
    ),

  // ─── diagnostics ────────────────────────────────────────────────
  "diagnostics.log": async () => {
    /* swallow renderer diagnostics for now */
  },
  "diagnostics.recordRendererError": async () => ({ schemaVersion: 1, eventId: null }),
  "diagnostics.openLogFolder": async () => {
    /* no-op */
  },
  "diagnostics.exportDiagnostics": async () => "",
  "diagnostics.showItemInFolder": async () => {
    /* no-op */
  },
  "diagnostics.listEvents": async () => ({ schemaVersion: 1, events: [], nextCursor: null }),
  "diagnostics.reportEvent": async () => ({ schemaVersion: 1, issueUrl: null, error: "not supported" }),
  "diagnostics.isFingerprintRecentlyReported": async () => ({ schemaVersion: 1, reported: false }),

  // ─── ask (mid-turn agent questions) ─────────────────────────────
  "ask.pending": async () => [],
  "ask.resolve": async () => {
    /* TODO: route into agent's askBridge */
  },

  // ─── top-level methods ──────────────────────────────────────────
  "detectProvider": async (_user, args) => {
    const key = s(args, "key");
    if (key.startsWith("sk-ant-")) return "anthropic";
    if (key.startsWith("sk-")) return "openai";
    return null;
  },
  "doneVerify": async () => ({ errors: [] }),
  "generate": async (user, args) => {
    const generationId = s(args, "generationId");
    const designId = s(args, "designId");
    const prompt = s(args, "prompt");
    // One editor per app: a design whose app moved to the page builder
    // can't be changed by AI any more (make a copy to keep designing).
    await assertDesignerCanChange(designId);
    // Agent is powered by the Claude Code CLI — it handles its own
    // multi-turn tool use (Read/Edit/Write/Bash) inside the design's
    // projected tmpdir. We don't need a provider row.
    if ([...activeJobs.values()].includes(designId)) throw new Error("This design is already building.");
    const quotaProblem = await aiQuotaProblem(user);
    if (quotaProblem) throw new Error(quotaProblem);
    await recordAiUsage(user.id, "designer");
    activeJobs.set(generationId, designId);
    try { return await (await getDesignerEngine() === "claude-cli" ? runClaudeAgent : runCompatibleAgent)({
      userId: user.id,
      designId,
      generationId,
      prompt,
    }); } finally { activeJobs.delete(generationId); }
  },
  "cancelGeneration": async (user, args) => {
    const id = s(args, "generationId");
    if (!(await db.designerGenerationJob.findFirst({ where: { id, userId: user.id } }))) throw new Error("Build not found.");
    return cancelGeneration(id);
  },
  "generationStatus": async (user) => generationStatus(user.id),
  "generateTitle": async (_user, args) => {
    // Cheap title: first 6 words of prompt.
    const prompt = s(args, "prompt");
    const words = prompt.split(/\s+/).slice(0, 6).join(" ");
    return words.length > 50 ? words.slice(0, 47) + "..." : words;
  },
  "applyComment": async () => {
    throw new Error("applyComment not yet implemented in cloud mode");
  },
  "pickInputFiles": async () => {
    // Renderer is expected to use HTML <input type=file> instead.
    return [];
  },
  "pickDesignSystemDirectory": async (user) =>
    providers.computeOnboardingState(user.id),
  "clearDesignSystem": async (user) => {
    await prefs.setPreferences(user.id, { designSystemJson: null });
    return providers.computeOnboardingState(user.id);
  },
  "export": async (user, args) => {
    const designId = s(args, "designId");
    const format = s(args, "format") as exporter.ExportFormat;
    return exporter.exportDesign(user.id, designId, format);
  },
  "checkForUpdates": async () => ({ ok: true, updateAvailable: false }),
  "downloadUpdate": async () => ({ ok: false }),
  "installUpdate": async () => ({ ok: false }),
  "openExternal": async () => {
    // No-op server-side. The renderer shim uses window.open() instead.
  },
};

// Used by the dev tools / unknown-call fallback.
export const KNOWN_METHODS = Object.keys(HANDLERS);

void nanoid; // keep import warm for future use

// These calls configure or probe the operator's AI infrastructure.
for (const method of ["settings.validateKey", "models.list", "models.listForProvider", "connection.test", "connection.testActive", "connection.testProvider", "ollama.probe", "config.testEndpoint", "config.listEndpointModels", "onboarding.validateKey", "onboarding.saveKey"]) {
  const handler = HANDLERS[method];
  if (handler) HANDLERS[method] = async (user, args) => { requireAdmin(user); return handler(user, args); };
}
