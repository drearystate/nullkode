import { ok, partnerRoute, PartnerError } from "@/lib/partner/api";
import { scopedProject } from "@/lib/partner/scope";
import { connectionView, ConnectionInputError, deleteConnection, isPlatformOwner, listConnections, saveConnection, testConnection } from "@/lib/app-ai/connections";
import { projectAiStatus } from "@/lib/app-ai/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * An app's own AI connections ("AI keys", docs/ai-in-apps.md). The key is
 * write-only: POST takes it, every answer shows only `keyHint`.
 */
async function load(ctx: Parameters<Parameters<typeof partnerRoute>[1]>[0], id: string) {
  const project = await scopedProject(ctx.key, id);
  if (!project) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  ctx.audit.userId = project.ownerId;
  ctx.audit.projectId = project.id;
  return project;
}

async function view(projectId: string) {
  const [connections, status] = await Promise.all([listConnections(projectId), projectAiStatus(projectId)]);
  return { connections: connections.map(connectionView), ai: status };
}

export const GET = partnerRoute<{ id: string }>({ permission: "build" }, async (ctx, { id }) => {
  const project = await load(ctx, id);
  return ok(await view(project.id));
});

/** Adds or replaces a connection (by name, default "default"). `test: true` tries it once after saving. */
export const POST = partnerRoute<{ id: string }>({ permission: "build", idempotent: true }, async (ctx, { id }) => {
  const project = await load(ctx, id);
  const b = ctx.body();
  const str = (v: unknown) => (typeof v === "string" ? v : v == null ? null : undefined);
  try {
    const saved = await saveConnection(project.id, {
      name: str(b.name) ?? undefined,
      provider: String(b.provider ?? ""),
      baseUrl: str(b.baseUrl),
      apiKey: str(b.apiKey),
      model: String(b.model ?? ""),
      chatModel: str(b.chatModel),
      visionModel: str(b.visionModel),
      speechModel: str(b.speechModel),
      voice: str(b.voice),
      embedModel: str(b.embedModel),
      isDefault: b.isDefault === true,
    });
    const test = b.test === true ? await testConnection(saved, { platformOwner: await isPlatformOwner(project.owner) }) : null;
    return ok({ connection: connectionView(test ? { ...saved, lastTestAt: new Date(), lastTestOk: test.ok, lastError: test.ok ? null : test.message } : saved), ...(test ? { test: { ok: test.ok, code: test.code, message: test.message } } : {}), ...(await view(project.id)) });
  } catch (err) {
    if (err instanceof ConnectionInputError) throw new PartnerError(400, "invalid_request", err.message);
    throw err;
  }
});

/** Removes a connection: ?name=<name> (or ?id=), default "default". */
export const DELETE = partnerRoute<{ id: string }>({ permission: "build" }, async (ctx, { id }) => {
  const project = await load(ctx, id);
  const which = ctx.query.get("id") || ctx.query.get("name") || "default";
  if (!(await deleteConnection(project.id, which))) throw new PartnerError(404, "not_found", ctx.t("notFound"));
  return ok({ ok: true, ...(await view(project.id)) });
});
