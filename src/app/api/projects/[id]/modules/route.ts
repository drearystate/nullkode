import { z } from "zod";
import { db } from "@/lib/db";
import { ownedProject } from "@/lib/guard";
import { json } from "@/lib/utils";
import { MODULE_REGISTRY, getModule, listModuleSummaries } from "@/lib/modules/registry";
import { computeProvidedCapabilities, installModule, UnmetRequirementsError } from "@/lib/modules/install";
import { installedModules } from "@/lib/modules/installed";
import { emailEnabled } from "@/lib/mailer";
import { catalogFor } from "@/lib/catalog-server";
import type { ModuleCapability, ModuleDefinition } from "@/lib/modules/types";
import { joinList, localeOf, requestErrorsT, type ErrT } from "@/lib/errors-i18n";
import { flowsUseAi } from "@/lib/app-ai/detect";
import { projectAiStatus } from "@/lib/app-ai/status";
import { translator } from "@/lib/ai/i18n";
import { withoutPrivateSettings } from "@/lib/sharing/redact";
import { noteEdit } from "@/lib/sharing/audit";

const InstallBody = z.object({
  moduleId: z.string().min(1),
  config: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  skipPages: z.boolean().optional(),
  /** Starting rows per feature table (a premade block's sample items). */
  seed: z.record(z.array(z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))).max(50)).optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id, "view");
  if ("error" in r) return r.error;
  return json({ modules: listModuleSummaries(), installed: await installedModules(id) });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await ownedProject(id, "edit");
  if ("error" in r) return r.error;

  const t = await requestErrorsT(r.user);
  const parsed = InstallBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: t("common.invalidInput") }, { status: 400 });

  const module = getModule(parsed.data.moduleId);
  if (!module) return json({ error: t("modules.notFound") }, { status: 404 });

  const blocked = await missingRequirements(id, module, t);
  if (blocked) return json(blocked, { status: 409 });

  try {
    const result = await installModule({
      projectId: id,
      module,
      // Private keys (a Stripe secret, an SMS token…) are the owner's to enter, never an editor's.
      config: withoutPrivateSettings(r.role, parsed.data.config),
      skipPages: parsed.data.skipPages,
      seed: seedFor(module, parsed.data.seed),
      // Checked above, in plain words, counting the server's email settings
      // and the capabilities a feature brings itself.
      allowUnmetRequirements: true,
    });
    // The page list after the install, in the editor's order, so the editor
    // can show the new pages without a reload.
    await noteEdit("app", id, r.user.id, "modules.install", { subjectId: module.id, label: module.id });
    const pages = await db.page.findMany({
      where: { projectId: id },
      orderBy: [{ isHome: "desc" }, { createdAt: "asc" }],
      select: { id: true, title: true, slug: true, isHome: true },
    });
    // A feature with AI steps: published apps use the person's own AI key (docs/ai-in-apps.md).
    const ai = module.provides?.includes("ai") || flowsUseAi(module.flows) ? await projectAiStatus(id).catch(() => null) : null;
    const aiNotice = ai?.needsKey ? translator(localeOf(t), "ai")("aiApps.moduleNotice") : undefined;
    return json({
      ok: true,
      ...(aiNotice ? { aiNotice } : {}),
      moduleId: module.id,
      name: catalogFor(localeOf(t)).moduleName(module),
      firstPageId: result.firstPageId,
      flowIds: Object.fromEntries(result.flowIds),
      pageIds: Object.fromEntries(result.pageIds),
      pages,
      installed: await installedModules(id),
    });
  } catch (err) {
    if (err instanceof UnmetRequirementsError) {
      return json({ ...needsFeatures(err.unmet, t), unmet: err.unmet }, { status: 409 });
    }
    return json(
      { error: err instanceof Error ? err.message : t("modules.installFailed") },
      { status: 500 }
    );
  }
}

/**
 * Starting rows limited to the feature's own tables and columns: column
 * names become SQL identifiers when the rows are added.
 */
function seedFor(
  module: ModuleDefinition,
  seed: Record<string, Array<Record<string, string | number | boolean | null>>> | undefined
): Record<string, Array<Record<string, unknown>>> | undefined {
  if (!seed) return undefined;
  const out: Record<string, Array<Record<string, unknown>>> = {};
  for (const t of module.tables) {
    const rows = seed[t.name];
    if (!rows) continue;
    const columns = new Set(t.fields.map((f) => f.name));
    out[t.name] = rows.map((row) => Object.fromEntries(Object.entries(row).filter(([k]) => columns.has(k))));
  }
  return out;
}

/** Capabilities that come from the server's settings, not from another feature. */
const SERVER_CAPABILITIES = new Set<ModuleCapability>(["email"]);

/**
 * What stops this feature being added, in plain words, or null. A feature's
 * own capabilities count (the chat helper brings the AI it needs), and email
 * comes from the server's settings rather than another feature.
 */
async function missingRequirements(projectId: string, module: ModuleDefinition, t: ErrT) {
  const requires = module.requires ?? [];
  if (requires.length === 0) return null;
  const provided = await computeProvidedCapabilities(projectId);
  const own = new Set(module.provides ?? []);
  const missing = requires.filter((c) => !provided.has(c) && !own.has(c));
  if (missing.some((c) => !SERVER_CAPABILITIES.has(c))) return { ...needsFeatures(missing, t), unmet: missing };
  if (missing.includes("email") && !emailEnabled()) {
    return {
      error: t("modules.needsEmail"),
      needs: [],
      unmet: missing,
    };
  }
  return null;
}

/** "This needs Sign-in and accounts first.", naming the features to add. */
function needsFeatures(caps: ModuleCapability[], t: ErrT) {
  const needs: Array<{ id: string; name: string }> = [];
  for (const cap of caps) {
    if (SERVER_CAPABILITIES.has(cap)) continue;
    // The plain sign-in feature for sign-in; otherwise the first feature
    // that brings the capability.
    const provider =
      (cap === "auth-session" || cap === "auth-users" ? getModule("auth") : undefined) ??
      MODULE_REGISTRY.find((m) => m.provides?.includes(cap));
    if (provider && !needs.some((n) => n.id === provider.id)) needs.push({ id: provider.id, name: catalogFor(localeOf(t)).moduleName(provider) });
  }
  const names = needs.map((n) => n.name);
  const locale = localeOf(t);
  const list =
    names.length === 0
      ? t("modules.anotherFeature")
      : locale === "en"
        ? names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
        : joinList(names, locale);
  const email = caps.includes("email") && !emailEnabled();
  return { error: t(email ? "modules.needsFeaturesAndEmail" : "modules.needsFeatures", { list }), needs };
}
